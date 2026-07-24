"""
خدمة اتصال متاتریدر5 - MetaTrader5 Connection Service
"""
import json
import logging
import os
import subprocess
import time
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional, Dict, List, Any

from .capital_management import (
    RiskAssessment,
    RiskManagementConfig,
    compute_breakeven_price,
)


def normalize_symbol(symbol: str) -> str:
    """Normalize MT5 symbol names across common suffix variants used by LiteFinance and MetaTrader."""
    if not symbol:
        return ""

    normalized = str(symbol).strip()
    upper_value = normalized.upper()
    if upper_value.endswith('_L'):
        base = normalized[:-2].upper()
        return f"{base}_l"
    if upper_value.endswith('.L'):
        base = normalized[:-2].upper()
        return f"{base}.l"
    if upper_value.endswith('_l'):
        base = normalized[:-2].upper()
        return f"{base}_l"
    if upper_value.endswith('.l'):
        base = normalized[:-2].upper()
        return f"{base}.l"
    return normalized.upper()


def get_symbol_candidates(symbol: str) -> List[str]:
    """Return potential MT5 symbol spellings for a user-entered symbol."""
    if not symbol:
        return []

    raw = str(symbol).strip()
    normalized = normalize_symbol(raw)

    candidates: List[str] = []
    def add(candidate: str) -> None:
        if candidate and candidate not in candidates:
            candidates.append(candidate)

    add(normalized)

    if normalized.endswith('_l'):
        base = normalized[:-2]
        add(f"{base}_L")
        add(f"{base}.l")
        add(f"{base}.L")
        add(base)
        add(base.lower())
        add(base.upper())
    elif normalized.endswith('.l'):
        base = normalized[:-2]
        add(f"{base}.L")
        add(f"{base}_l")
        add(f"{base}_L")
        add(base)
        add(base.lower())
        add(base.upper())
    else:
        add(normalized.upper())
        add(normalized.lower())
        add(f"{normalized}_l")
        add(f"{normalized}.l")
        add(f"{normalized}_L")
        add(f"{normalized}.L")

    add(raw)
    return candidates


def format_manual_trade_error(error: str, symbol: Optional[str] = None) -> str:
    """Convert MT5 trade errors into clearer messages for the UI."""
    message = (error or '').strip()
    if not message:
        return 'درخواست باز کردن پوزیشن به MT5 موفقیت‌آمیز نبود. لطفاً اتصال MT5 و وضعیت حساب را بررسی کنید.'

    normalized = message.lower()

    if 'symbol tick not available' in normalized or 'tick not available' in normalized:
        symbol_label = f' برای نماد {normalize_symbol(symbol)}' if symbol else ''
        return (
            f'قیمت لحظه‌ای{symbol_label} در MT5 در دسترس نیست. '
            'لطفاً نماد معتبر و فعال را انتخاب کنید یا یک نماد دیگری با قیمت لحظه‌ای در دسترس امتحان کنید.'
        )

    if 'symbol not found' in normalized or 'invalid symbol' in normalized or 'symbol not available' in normalized:
        symbol_label = f' {symbol}' if symbol else ''
        return (
            f'نماد{symbol_label} در MT5 شناخته نشد. '
            'از نمادهای موجود در ترمینال یا نمادی با قیمت لحظه‌ای فعال استفاده کنید.'
        )

    if 'autotrading' in normalized or 'auto trading' in normalized or 'trade disabled' in normalized:
        return (
            'عملیات در MT5 رد شد زیرا AutoTrading روی حساب یا ترمینال غیرفعال است. '
            'در MetaTrader 5 از مسیر Tools > Options > AutoTrading گزینه Allow automated trading را فعال کنید و مطمئن شوید حساب شما مجاز به معامله است.'
        )

    if 'not connected' in normalized:
        return 'اتصال به MT5 برقرار نیست. لطفاً اتصال ترمینال و حساب را بررسی کنید.'

    return f'درخواست باز کردن پوزیشن به MT5 رد شد: {message}'


try:
    from ..config import settings
except ImportError:
    from config import settings

mt5 = None
logger = logging.getLogger(__name__)

def _get_mt5():
    global mt5
    if mt5 is None:
        try:
            import MetaTrader5 as mt5_module
            mt5 = mt5_module
        except Exception as exc:
            raise RuntimeError(
                f"MetaTrader5 package import failed: {exc}. "
                "Install MetaTrader5 and ensure compatible numpy version."
            ) from exc
    return mt5

@dataclass
class MT5Account:
    login: int
    password: str
    server: str

@dataclass
class AccountInfo:
    login: int
    name: str
    server: str
    currency: str
    balance: float
    equity: float
    margin: float
    free_margin: float
    margin_level: float
    profit: float
    connected: bool

class MT5Service:
    """خدمات اتصال و دریافت اطلاعات متاتریدر5"""

    def __init__(self):
        self.connected = False
        self.login_id: Optional[int] = None
        self.account_login: Optional[int] = None
        self.server: Optional[str] = None
        self.password: Optional[str] = None
        self.current_account: Optional[AccountInfo] = None
        self.last_error: Optional[str] = None

    def _find_mt5_terminal_candidates(self) -> List[str]:
        """Find plausible MetaTrader 5 terminal executable locations on this machine."""
        discovered: List[str] = []
        seen = set()

        def add_path(path: Optional[str]) -> None:
            if not path:
                return
            expanded = os.path.expandvars(os.path.expanduser(path.strip()))
            if not expanded:
                return
            normalized = os.path.normcase(os.path.normpath(expanded))
            if normalized not in seen:
                seen.add(normalized)
                discovered.append(expanded)

        configured_path = (settings.MT5_PATH or "").strip()
        if configured_path:
            add_path(configured_path)

        roots = []
        for env_key in ("ProgramFiles", "ProgramFiles(x86)", "ProgramW6432", "LOCALAPPDATA", "APPDATA"):
            value = os.getenv(env_key)
            if value:
                roots.append(value)

        roots.extend([
            r"C:\Program Files\MetaTrader 5",
            r"C:\Program Files\LiteFinance MT5 Terminal",
            os.path.expanduser(r"~\AppData\Roaming\MetaQuotes\Terminal"),
        ])

        for root in roots:
            if not root:
                continue
            add_path(root)
            if os.path.isdir(root):
                for current_root, _, files in os.walk(root):
                    for filename in files:
                        if filename.lower() in {"terminal64.exe", "terminal.exe", "mt5.exe"}:
                            add_path(os.path.join(current_root, filename))

        return discovered

    def launch_terminal(self) -> bool:
        """Open the MetaTrader 5 terminal executable automatically on Windows."""
        terminal_path = None
        for candidate in self._find_mt5_terminal_candidates():
            if os.path.isfile(candidate):
                terminal_path = candidate
                break

        if not terminal_path:
            terminal_path = (settings.MT5_PATH or "").strip()

        if not terminal_path:
            logger.warning("MT5 terminal path is not configured")
            return False

        if not os.path.exists(terminal_path):
            logger.warning(f"MT5 terminal executable not found: {terminal_path}")
            return False

        try:
            if os.name == "nt":
                os.startfile(terminal_path)
            else:
                subprocess.Popen([terminal_path], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            logger.info(f"MetaTrader terminal launched: {terminal_path}")
            return True
        except Exception as exc:
            logger.error(f"Failed to launch MetaTrader terminal: {exc}")
            return False

    @property
    def login(self) -> Optional[int]:
        return self.login_id

    def _initialize_mt5(self, init_timeout: int) -> bool:
        mt5 = _get_mt5()
        candidate_paths = self._find_mt5_terminal_candidates()
        candidate_paths.extend([None])

        last_error = None
        for path in candidate_paths:
            try:
                if mt5.initialize(path=path, timeout=init_timeout):
                    self.last_error = None
                    return True
            except Exception as exc:
                last_error = str(exc)
            last_error = mt5.last_error() if hasattr(mt5, 'last_error') else last_error
            self.last_error = last_error
            time.sleep(1)

        logger.error(f"MT5 initialization failed: {last_error}")
        return False

    def connect(self, login: int, password: str, server: str) -> bool:
        """
        اتصال به متاتریدر5
        Connect to MetaTrader5
        """
        try:
            logger.info('Starting MT5 connection attempt for login=%s server=%s', login, server)
            mt5 = _get_mt5()

            if self.connected and self.account_login == login and self.server == server and self.password == password:
                logger.info('Reusing existing MT5 connection')
                try:
                    terminal_info = mt5.terminal_info()
                    if terminal_info is not None:
                        logger.info(f"Reusing existing MT5 connection for account: {login}")
                        return True
                except Exception:
                    pass

            if self.connected:
                mt5.shutdown()
                self.connected = False
                self.account_login = None
                self.server = None
                self.password = None

            self.launch_terminal()
            time.sleep(2)

            init_timeout = settings.MT5_TIMEOUT or 5000
            logger.info('Initializing MT5 with timeout=%s', init_timeout)
            if not self._initialize_mt5(init_timeout):
                logger.error('MT5 initialization failed')
                return False

            logger.info('Attempting MT5 login')
            authorized = mt5.login(login, password=password, server=server)
            logger.info('MT5 login result=%s last_error=%s', authorized, mt5.last_error() if hasattr(mt5, 'last_error') else None)
            if not authorized:
                logger.error(f"MT5 login failed: {mt5.last_error()}")
                mt5.shutdown()
                return False

            self.connected = True
            self.account_login = login
            self.server = server
            self.password = password
            logger.info(f"Successfully connected to MT5 account: {login}")
            return True

        except Exception as e:
            logger.error(f"MT5 connection error: {str(e)}")
            return False

    def login(self, login: int, password: str, server: str) -> Dict[str, Any]:
        if self.connect(login, password, server):
            return {"success": True, "message": "Connected", "terminal_launched": self.launch_terminal()}

        detail = self.last_error or "لطفاً مطمئن شوید ترمینال MT5 نصب و در حال اجرا است، مسیر آن درست است و اطلاعات حساب/سرور صحیح‌اند."
        return {
            "success": False,
            "message": f"اتصال به MT5 برقرار نشد. {detail}",
            "terminal_launched": False,
        }

    def logout(self) -> Dict[str, Any]:
        if not self.connected:
            return {"success": False, "message": "Not connected"}

        self.disconnect()
        return {"success": True, "message": "Logged out"}

    def is_connected(self) -> bool:
        return self.connected

    def get_account_info(self) -> Optional[Dict[str, Any]]:
        """
        دریافت اطلاعات حساب
        Get account information
        """
        if not self.connected:
            return None

        try:
            mt5 = _get_mt5()
            account_info = mt5.account_info()
            if account_info is None:
                logger.error(f"Failed to get account info: {mt5.last_error()}")
                return None

            def get_attr(name, default=None):
                return getattr(account_info, name, default)

            login_value = get_attr('login', 0)
            name_value = get_attr('name', '') or ''
            server_value = get_attr('server', '') or ''
            currency_value = get_attr('currency', 'USD') or 'USD'
            balance_value = get_attr('balance', 0.0) or 0.0
            equity_value = get_attr('equity', balance_value) or balance_value
            margin_value = get_attr('margin', 0.0) or 0.0
            free_margin_value = get_attr('margin_free', get_attr('marginFree', 0.0)) or 0.0
            margin_level_value = get_attr('margin_level', get_attr('marginLevel', 0.0)) or 0.0
            if margin_value > 0 and margin_level_value == 0:
                margin_level_value = (get_attr('margin_level', 0.0) or 0.0)
            profit_value = get_attr('profit', 0.0) or 0.0

            info = AccountInfo(
                login=login_value,
                name=name_value,
                server=server_value,
                currency=currency_value,
                balance=float(balance_value),
                equity=float(equity_value),
                margin=float(margin_value),
                free_margin=float(free_margin_value),
                margin_level=float(margin_level_value),
                profit=float(profit_value),
                connected=True
            )
            self.current_account = info
            return asdict(info)

        except Exception as e:
            logger.error(f"Error getting account info: {str(e)}")
            return None

    def get_positions(self) -> List[Dict[str, Any]]:
        """
        دریافت لیست پوزیشن‌های باز
        Get list of open positions
        """
        if not self.connected:
            return []

        try:
            mt5 = _get_mt5()
            positions = mt5.positions_get()
            if positions is None:
                return []

            positions_list = []
            for pos in positions:
                positions_list.append({
                    'ticket': pos.ticket,
                    'symbol': pos.symbol,
                    'type': 'BUY' if pos.type == 0 else 'SELL',
                    'volume': pos.volume,
                    'price_open': pos.price_open,
                    'price_current': pos.price_current,
                    'profit': getattr(pos, 'profit', 0),
                    'commission': getattr(pos, 'commission', 0),
                    'time': datetime.fromtimestamp(getattr(pos, 'time', 0), timezone.utc).isoformat()
                })

            return positions_list

        except Exception as e:
            logger.error(f"Error getting positions: {str(e)}")
            return []

    def _format_mt5_error(self, prefix: str, retcode: Any, comment: Optional[str] = None) -> str:
        """Return an ASCII-safe MT5 error message for API/UI consumers."""
        base = f"{prefix}. Retcode: {retcode}" if retcode is not None else prefix
        if comment:
            base = f"{base} | {comment}"

        normalized = f"{retcode} {comment or ''}".lower()
        if retcode in {10027, 10029} or 'autotrading' in normalized or 'auto trading' in normalized or 'trade disabled' in normalized:
            return (
                f"{base}. AutoTrading is disabled in MT5. "
                f"Enable AutoTrading in MetaTrader 5 via Tools > Options > AutoTrading > Allow automated trading, "
                f"and verify that the account permits trading."
            )

        return base

    def close_position(self, ticket: int, deviation: int = 10) -> Dict[str, Any]:
        """
        تلاش برای بستن یک پوزیشن بر اساس تیکت
        Close an open position by ticket id
        """
        if not self.connected:
            return {"success": False, "error": "Not connected to MT5"}

        try:
            mt5 = _get_mt5()
            # Try to find the position by ticket
            positions = mt5.positions_get()
            if positions is None:
                return {"success": False, "error": "No positions available"}

            target = None
            for pos in positions:
                if getattr(pos, 'ticket', None) == ticket:
                    target = pos
                    break

            if target is None:
                return {"success": False, "error": "Position not found"}

            symbol = getattr(target, 'symbol', None)
            volume = getattr(target, 'volume', None)
            pos_type = getattr(target, 'type', None)

            if symbol is None or volume is None or pos_type is None:
                return {"success": False, "error": "Invalid position data"}

            # Determine close order type: if position is BUY (0) we SELL to close, else BUY
            order_type = mt5.ORDER_TYPE_SELL if pos_type == 0 else mt5.ORDER_TYPE_BUY

            tick = mt5.symbol_info_tick(symbol)
            if tick is None:
                return {"success": False, "error": "Symbol tick not available"}

            price = tick.bid if order_type == mt5.ORDER_TYPE_SELL else tick.ask

            request = {
                "action": mt5.TRADE_ACTION_DEAL,
                "symbol": symbol,
                "volume": float(volume),
                "type": order_type,
                "position": int(getattr(target, 'ticket', 0)),
                "price": float(price),
                "deviation": deviation,
                "magic": 0,
                "comment": "Closed via API",
            }

            result = mt5.order_send(request)
            if result is None:
                return {"success": False, "error": "order_send returned None", "retcode": None, "comment": None, "message": "ارسال سفارش بستن به MT5 با موفقیت انجام نشد."}

            # result has retcode and comment
            retcode = getattr(result, 'retcode', None)
            comment = getattr(result, 'comment', None)
            if retcode == getattr(mt5, 'TRADE_RETCODE_DONE', 10009) or retcode == 10009:
                return {"success": True, "ticket": ticket, "order_result": result._asdict() if hasattr(result, '_asdict') else str(result)}

            message = self._format_mt5_error("Close request failed", retcode, comment)
            logger.warning("Close request failed for ticket %s: %s", ticket, message)
            friendly_error = format_manual_trade_error(message, symbol=symbol)
            return {
                "success": False,
                "error": friendly_error,
                "retcode": retcode,
                "comment": comment,
                "message": message,
                "order_result": result._asdict() if hasattr(result, '_asdict') else str(result),
            }

        except Exception as e:
            logger.error(f"Error closing position {ticket}: {str(e)}")
            friendly_error = format_manual_trade_error(str(e), symbol=(symbol or '').strip().upper() if symbol else None)
            return {"success": False, "error": friendly_error, "message": friendly_error}

    def _resolve_symbol(self, symbol: str) -> Optional[str]:
        """Find a valid MT5 symbol name and select it in the terminal."""
        mt5 = _get_mt5()
        candidates = get_symbol_candidates(symbol)
        last_error = None

        for candidate in candidates:
            try:
                if not mt5.symbol_select(candidate, True):
                    logger.warning('symbol_select returned False for %s', candidate)
                    continue

                symbol_info = mt5.symbol_info(candidate)
                tick = mt5.symbol_info_tick(candidate)

                if symbol_info is None and tick is None:
                    continue

                return candidate
            except Exception as exc:
                last_error = str(exc)
                continue

        logger.warning('Symbol resolution failed for %s using candidates %s. last_error=%s', symbol, candidates, last_error)
        return None

    def open_position(
        self,
        symbol: str,
        volume: float,
        order_type: str,
        price: Optional[float] = None,
        sl: Optional[float] = None,
        tp: Optional[float] = None,
        deviation: int = 10,
        risk_assessment: Optional[RiskAssessment] = None,
        risk_config: Optional[RiskManagementConfig] = None,
    ) -> Dict[str, Any]:
        """Open a manual position in MT5 with integrated risk-management checks."""
        if not self.connected:
            return {"success": False, "error": "Not connected to MT5"}

        try:
            mt5 = _get_mt5()
            normalized_symbol = normalize_symbol(symbol)
            if not normalized_symbol:
                return {"success": False, "error": "Symbol is required"}

            if risk_assessment is not None and not risk_assessment.allowed:
                return {
                    "success": False,
                    "error": risk_assessment.reason,
                    "message": risk_assessment.reason,
                    "risk_assessment": risk_assessment.to_dict(),
                }

            if risk_assessment is not None and risk_assessment.adjusted_volume is not None:
                volume = risk_assessment.adjusted_volume

            if volume <= 0:
                return {"success": False, "error": "Volume must be greater than zero"}

            order_type_value = getattr(mt5, 'ORDER_TYPE_BUY', 0)
            if order_type.upper() == 'SELL':
                order_type_value = getattr(mt5, 'ORDER_TYPE_SELL', 1)

            symbol_for_request = self._resolve_symbol(normalized_symbol)
            if not symbol_for_request:
                friendly_error = format_manual_trade_error('Symbol not found', symbol=normalized_symbol)
                return {"success": False, "error": friendly_error, "message": friendly_error}

            if price is None:
                if not mt5.symbol_select(symbol_for_request, True):
                    logger.warning('Failed to select symbol %s before tick lookup', symbol_for_request)
                tick = mt5.symbol_info_tick(symbol_for_request)
                if tick is None:
                    for candidate in get_symbol_candidates(symbol_for_request):
                        if candidate == symbol_for_request:
                            continue
                        if not mt5.symbol_select(candidate, True):
                            logger.warning('Failed to select symbol %s during tick fallback', candidate)
                        tick = mt5.symbol_info_tick(candidate)
                        if tick is not None:
                            symbol_for_request = candidate
                            break

                if tick is None:
                    friendly_error = format_manual_trade_error('Symbol tick not available', symbol=symbol_for_request)
                    return {"success": False, "error": friendly_error, "message": friendly_error}
                price = tick.ask if order_type.upper() != 'SELL' else tick.bid

            breakeven_price = None
            if risk_config is not None and risk_config.enable_break_even and sl is not None and price is not None:
                breakeven_price = compute_breakeven_price(float(price), float(sl), order_type)

            request = {
                "action": mt5.TRADE_ACTION_DEAL,
                "symbol": symbol_for_request,
                "volume": float(volume),
                "type": order_type_value,
                "price": float(price),
                "deviation": deviation,
                "magic": 0,
                "comment": "Opened via API",
            }

            if sl is not None:
                request['sl'] = float(sl)
            if tp is not None:
                request['tp'] = float(tp)

            result = mt5.order_send(request)
            if result is None:
                return {"success": False, "error": "order_send returned None", "retcode": None, "comment": None, "message": "ارسال سفارش باز کردن پوزیشن به MT5 با موفقیت انجام نشد."}

            retcode = getattr(result, 'retcode', None)
            comment = getattr(result, 'comment', None)
            if retcode == getattr(mt5, 'TRADE_RETCODE_DONE', 10009) or retcode == 10009:
                response = {
                    "success": True,
                    "ticket": getattr(result, 'order', None),
                    "order_result": result._asdict() if hasattr(result, '_asdict') else str(result),
                }
                if risk_assessment is not None:
                    response["risk_assessment"] = risk_assessment.to_dict()
                if risk_config is not None:
                    response["risk_config"] = risk_config.to_dict()
                if breakeven_price is not None:
                    response["breakeven_price"] = breakeven_price
                return response

            message = self._format_mt5_error('Open position request failed', retcode, comment)
            logger.warning('Open position request failed: %s', message)
            friendly_error = format_manual_trade_error(message, symbol=normalized_symbol)
            response = {
                "success": False,
                "error": friendly_error,
                "retcode": retcode,
                "comment": comment,
                "message": friendly_error,
                "order_result": result._asdict() if hasattr(result, '_asdict') else str(result),
            }
            if risk_assessment is not None:
                response["risk_assessment"] = risk_assessment.to_dict()
            if risk_config is not None:
                response["risk_config"] = risk_config.to_dict()
            return response
        except Exception as e:
            logger.error(f"Error opening position {symbol}: {str(e)}")
            friendly_error = format_manual_trade_error(str(e), symbol=(symbol or '').strip().upper())
            return {"success": False, "error": friendly_error, "message": friendly_error}

    def get_orders(self) -> List[Dict[str, Any]]:
        """
        دریافت لیست سفارش‌های در انتظار
        Get list of pending orders
        """
        if not self.connected:
            return []

        try:
            mt5 = _get_mt5()
            orders = mt5.orders_get()
            if orders is None:
                return []

            orders_list = []
            for order in orders:
                orders_list.append({
                    'ticket': getattr(order, 'ticket', None),
                    'symbol': getattr(order, 'symbol', ''),
                    'type': getattr(order, 'type', None),
                    'state': getattr(order, 'state', None),
                    'volume_initial': getattr(order, 'volume_initial', None),
                    'volume_current': getattr(order, 'volume_current', None),
                    'price_open': getattr(order, 'price_open', None),
                    'price_current': getattr(order, 'price_current', None),
                    'time_setup': datetime.fromtimestamp(getattr(order, 'time_setup', 0)).isoformat() if getattr(order, 'time_setup', None) else None,
                })

            return orders_list

        except Exception as e:
            logger.error(f"Error getting orders: {str(e)}")
            return []

    def cancel_order(self, ticket: int) -> Dict[str, Any]:
        """
        لغو یک سفارش در انتظار بر اساس تیکت
        Cancel a pending order by ticket id
        """
        if not self.connected:
            return {"success": False, "error": "Not connected to MT5"}

        try:
            mt5 = _get_mt5()
            orders = mt5.orders_get()
            target = None
            if orders is not None:
                for order in orders:
                    if getattr(order, 'ticket', None) == ticket:
                        target = order
                        break

            request = {
                "action": mt5.TRADE_ACTION_REMOVE,
                "order": int(ticket),
                "comment": "Cancelled via API",
            }

            if target is not None:
                request["order"] = int(getattr(target, 'ticket', ticket))

            result = mt5.order_send(request)
            if result is None:
                return {"success": False, "error": "order_send returned None", "retcode": None, "comment": None, "message": "ارسال درخواست لغو سفارش به MT5 با موفقیت انجام نشد."}

            retcode = getattr(result, 'retcode', None)
            comment = getattr(result, 'comment', None)
            if retcode == getattr(mt5, 'TRADE_RETCODE_DONE', 10009) or retcode == 10009:
                return {"success": True, "ticket": ticket, "order_result": result._asdict() if hasattr(result, '_asdict') else str(result)}

            message = self._format_mt5_error("Order cancellation failed", retcode, comment)
            logger.warning("Order cancellation failed for ticket %s: %s", ticket, message)
            return {
                "success": False,
                "error": message,
                "retcode": retcode,
                "comment": comment,
                "message": message,
                "order_result": result._asdict() if hasattr(result, '_asdict') else str(result),
            }
        except Exception as e:
            logger.error(f"Error cancelling order {ticket}: {str(e)}")
            return {"success": False, "error": str(e)}

    def get_trade_history(
        self,
        symbol: str = "",
        start_time: int = 0,
        end_time: int = 0,
        limit: int = 100,
        page: int = 1
    ) -> List[Dict[str, Any]]:
        """
        دریافت تاریخچه معاملات بسته‌شده
        Get closed trade history
        """
        if not self.connected:
            return []

        try:
            mt5 = _get_mt5()

            # MT5 history API expects UTC-aware datetime objects.
            if start_time > 0:
                start_dt = datetime.fromtimestamp(start_time, timezone.utc)
            else:
                start_dt = datetime.now(timezone.utc) - timedelta(days=365)

            if end_time > 0:
                end_dt = datetime.fromtimestamp(end_time, timezone.utc)
            else:
                end_dt = datetime.now(timezone.utc)

            if start_dt > end_dt:
                start_dt, end_dt = end_dt, start_dt

            symbol_filter = symbol.strip().upper() if symbol and isinstance(symbol, str) else None
            symbol_filter_alt = None
            if symbol_filter and not symbol_filter.endswith('_L'):
                symbol_filter_alt = f"{symbol_filter}_L"

            deals = mt5.history_deals_get(start_dt, end_dt)
            if deals is None:
                return []

            filtered_deals = []
            for deal in deals:
                deal_symbol = getattr(deal, 'symbol', '') or ''
                upper_symbol = deal_symbol.upper()
                if symbol_filter:
                    if upper_symbol != symbol_filter and (symbol_filter_alt is None or upper_symbol != symbol_filter_alt):
                        continue

                entry_value = getattr(deal, 'entry', None)
                if entry_value is not None:
                    if hasattr(mt5, 'DEAL_ENTRY_OUT'):
                        if entry_value != getattr(mt5, 'DEAL_ENTRY_OUT'):
                            continue
                    elif entry_value != 1:
                        continue

                filtered_deals.append(deal)

            # Show the newest closed trades first, matching the dashboard history view.
            sorted_deals = sorted(filtered_deals, key=lambda item: getattr(item, 'time', 0), reverse=True)
            start_index = max((page - 1) * limit, 0)
            page_deals = sorted_deals[start_index:start_index + limit]

            deals_list = []
            for deal in page_deals:
                price = getattr(deal, 'price', 0)
                deal_time = datetime.fromtimestamp(getattr(deal, 'time', 0), timezone.utc).isoformat()
                deals_list.append({
                    'ticket': getattr(deal, 'ticket', 0),
                    'symbol': getattr(deal, 'symbol', ''),
                    'type': 'BUY' if getattr(deal, 'type', 0) == 0 else 'SELL',
                    'volume': getattr(deal, 'volume', 0),
                    'price': price,
                    'profit': getattr(deal, 'profit', 0),
                    'commission': getattr(deal, 'commission', 0),
                    'time': deal_time,
                    'close_time': deal_time,
                })

            return deals_list

        except Exception as e:
            logger.error(f"Error getting trade history: {str(e)}")
            return []

    def get_symbols(self, filter_text: str = "") -> List[str]:
        """
        دریافت لیست نمادهای موجود
        Get list of available symbols
        """
        if not self.connected:
            return []

        try:
            mt5 = _get_mt5()
            symbols = mt5.symbols_get()
            if symbols is None:
                return []

            filtered = [
                symbol.name for symbol in symbols
                if not filter_text or filter_text.lower() in str(symbol.name).lower() or filter_text.lower() in str(getattr(symbol, 'description', '')).lower()
            ]
            return filtered

        except Exception as e:
            logger.error(f"Error getting symbols: {str(e)}")
            return []

    def get_tick(self, symbol: str) -> Optional[Dict[str, Any]]:
        """
        دریافت آخرین تیک یک نماد
        Get latest tick for a symbol
        """
        if not self.connected:
            return None

        try:
            mt5 = _get_mt5()
            candidates = get_symbol_candidates(symbol)
            last_error = None
            for candidate in candidates:
                try:
                    if not mt5.symbol_select(candidate, True):
                        last_error = f'symbol_select failed for {candidate}'
                        logger.warning('Failed to select symbol %s for tick retrieval', candidate)
                        continue

                    tick = mt5.symbol_info_tick(candidate)
                except Exception as exc:
                    last_error = str(exc)
                    continue

                if tick is not None:
                    normalized_name = normalize_symbol(candidate)
                    return {
                        'symbol': normalized_name,
                        'bid': tick.bid,
                        'ask': tick.ask,
                        'time': datetime.fromtimestamp(tick.time).isoformat()
                    }

            logger.warning('Tick lookup failed for %s using candidates %s (last_error=%s)', symbol, candidates, last_error)
            return None

        except Exception as e:
            logger.error(f"Error getting tick for {symbol}: {str(e)}")
            return None

    def get_symbol_full_data(self, symbol: str) -> Dict[str, Any]:
        """Collect tick, positions, orders, and history for a requested symbol."""
        if not self.connected:
            return {
                'requested_symbol': symbol,
                'resolved_symbol': None,
                'tick': None,
                'positions': [],
                'orders': [],
                'trade_history': [],
            }

        requested_symbol = (symbol or '').strip()
        resolved_symbol = None
        tick = None
        positions = []
        orders = []
        trade_history = []

        try:
            mt5 = _get_mt5()
            candidates = get_symbol_candidates(requested_symbol)
            preferred_symbol = None
            fallback_symbol = None

            for candidate in candidates:
                try:
                    if not mt5.symbol_select(candidate, True):
                        continue

                    symbol_info = mt5.symbol_info(candidate)
                    if symbol_info is None:
                        continue

                    normalized_candidate = normalize_symbol(candidate)
                    if normalized_candidate.endswith(('_l', '.l')):
                        preferred_symbol = normalized_candidate
                        break

                    fallback_symbol = normalized_candidate
                except Exception:
                    continue

            resolved_symbol = preferred_symbol or fallback_symbol
            if resolved_symbol:
                tick_value = mt5.symbol_info_tick(resolved_symbol)
                if tick_value is not None:
                    tick = {
                        'symbol': resolved_symbol,
                        'bid': getattr(tick_value, 'bid', None),
                        'ask': getattr(tick_value, 'ask', None),
                        'time': datetime.fromtimestamp(getattr(tick_value, 'time', 0), timezone.utc).isoformat(),
                    }

                positions = self.get_positions()
                orders = self.get_orders()
                trade_history = self.get_trade_history(symbol=resolved_symbol)
                positions = [item for item in positions if str(item.get('symbol', '')).upper() == resolved_symbol.upper()]
                orders = [item for item in orders if str(item.get('symbol', '')).upper() == resolved_symbol.upper()]
                trade_history = [item for item in trade_history if str(item.get('symbol', '')).upper() == resolved_symbol.upper()]

                # include symbol properties if available
                symbol_info_obj = mt5.symbol_info(resolved_symbol) if resolved_symbol else None
                symbol_properties = None
                if symbol_info_obj is not None:
                    # use getattr to avoid missing attributes across MT5 builds
                    symbol_properties = {
                        'name': getattr(symbol_info_obj, 'name', resolved_symbol),
                        'path': getattr(symbol_info_obj, 'path', None),
                        'currency_base': getattr(symbol_info_obj, 'currency_base', None),
                        'currency_profit': getattr(symbol_info_obj, 'currency_profit', None),
                        'digits': getattr(symbol_info_obj, 'digits', None),
                        'tick_size': getattr(symbol_info_obj, 'tick_size', None),
                        'tick_value': getattr(symbol_info_obj, 'tick_value', None),
                        'trade_contract_size': getattr(symbol_info_obj, 'trade_contract_size', None),
                        'volume_min': getattr(symbol_info_obj, 'volume_min', None) or getattr(symbol_info_obj, 'lot_min', None),
                        'volume_step': getattr(symbol_info_obj, 'volume_step', None) or getattr(symbol_info_obj, 'lot_step', None),
                        'spread': getattr(symbol_info_obj, 'spread', None),
                    }

                return {
                    'requested_symbol': requested_symbol,
                    'resolved_symbol': resolved_symbol,
                    'tick': tick,
                    'symbol_info': symbol_properties,
                    'positions': positions,
                    'orders': orders,
                    'trade_history': trade_history,
                }
        except Exception as exc:
            logger.error(f"Error collecting symbol data for {requested_symbol}: {str(exc)}")
            return {
                'requested_symbol': requested_symbol,
                'resolved_symbol': resolved_symbol,
                'tick': tick,
                'positions': positions,
                'orders': orders,
                'trade_history': trade_history,
            }

    def save_symbol_data(self, symbol: str, output_path: Optional[str] = None) -> Dict[str, Any]:
        """Persist the full collected data for a symbol to a JSON file."""
        payload = self.get_symbol_full_data(symbol)
        if output_path is None:
            base_dir = Path('logs') / 'symbol_exports'
            base_dir.mkdir(parents=True, exist_ok=True)
            output_path = str(base_dir / f"{(symbol or 'symbol').strip().upper()}.json")

        target_path = Path(output_path)
        target_path.parent.mkdir(parents=True, exist_ok=True)
        target_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8')
        return {'success': True, 'path': str(target_path), 'data': payload}

    def get_symbol_timeframe_data(self, symbol: str, timeframe: str = 'M1', count: int = 100) -> Dict[str, Any]:
        """Extract candles for a selected symbol and timeframe from MetaTrader 5."""
        if not self.connected:
            return {'requested_symbol': symbol, 'resolved_symbol': None, 'timeframe': timeframe, 'candles': []}

        requested_symbol = (symbol or '').strip()
        resolved_symbol = None
        candles = []

        def _build_candles(candle_items: List[Any]) -> List[Dict[str, Any]]:
            def _get(item, name):
                try:
                    return getattr(item, name)
                except Exception:
                    try:
                        return item[name]
                    except Exception:
                        return None

            def to_float(v):
                try:
                    return float(v)
                except Exception:
                    return None

            def to_int(v):
                try:
                    return int(v)
                except Exception:
                    return None

            result = []
            for item in candle_items:
                t = _get(item, 'time')
                try:
                    time_iso = datetime.fromtimestamp(int(t), timezone.utc).isoformat() if t is not None else None
                except Exception:
                    time_iso = None

                result.append({
                    'time': time_iso,
                    'open': to_float(_get(item, 'open')),
                    'high': to_float(_get(item, 'high')),
                    'low': to_float(_get(item, 'low')),
                    'close': to_float(_get(item, 'close')),
                    'tick_volume': to_int(_get(item, 'tick_volume')),
                    'real_volume': to_int(_get(item, 'real_volume')),
                })
            return result

        try:
            mt5 = _get_mt5()
            try:
                logger.debug('MT5 terminal_info: %s', mt5.terminal_info())
            except Exception as _e:
                logger.debug('terminal_info fetch failed: %s', _e)

            try:
                syms = mt5.symbols_get()
                logger.debug('MT5 symbols_get count: %s', len(syms) if syms is not None else 'None')
            except Exception as _e:
                logger.debug('symbols_get failed: %s', _e)

            candidates = get_symbol_candidates(requested_symbol)
            logger.debug('Symbol candidates for %s: %s', requested_symbol, candidates)

            for candidate in candidates:
                try:
                    logger.debug('Trying candidate: %s', candidate)
                    if not mt5.symbol_select(candidate, True):
                        logger.debug('symbol_select returned False for %s', candidate)
                        continue

                    symbol_info = mt5.symbol_info(candidate)
                    logger.debug('symbol_info for %s: %s', candidate, bool(symbol_info))
                    if symbol_info is None:
                        continue

                    resolved_name = getattr(symbol_info, 'name', None) or getattr(symbol_info, 'symbol', None) or candidate
                    candidate_variants = []
                    def add_variant(value):
                        if value and value not in candidate_variants:
                            candidate_variants.append(value)

                    # Prefer normalized MT5 names and known suffix variants before the
                    # raw requested symbol string to improve symbol resolution.
                    for value in (resolved_name, candidate):
                        add_variant(value)
                        add_variant(normalize_symbol(value))

                    for value in get_symbol_candidates(requested_symbol):
                        add_variant(value)
                        add_variant(normalize_symbol(value))

                    add_variant(requested_symbol)

                    timeframe_value = self._resolve_timeframe(timeframe)
                    if timeframe_value is None:
                        timeframe_value = mt5.TIMEFRAME_M1

                    for variant in candidate_variants:
                        try:
                            symbol_name = variant
                            symbol_info_obj = symbol_info if variant == candidate else None

                            if variant and variant != candidate:
                                try:
                                    selected = mt5.symbol_select(variant, True)
                                except StopIteration:
                                    selected = True
                                if not selected:
                                    logger.debug('symbol_select returned False for symbol variant %s', variant)
                                    continue

                                symbol_info_obj = mt5.symbol_info(variant)
                                if symbol_info_obj is None:
                                    logger.debug('symbol_info returned None for symbol variant %s', variant)
                                    continue

                            if symbol_info_obj is not None:
                                symbol_name = getattr(symbol_info_obj, 'name', None) or getattr(symbol_info_obj, 'symbol', None) or symbol_name

                            try:
                                raw_candles = mt5.copy_rates_from_pos(symbol_name, timeframe_value, 0, count)
                            except StopIteration:
                                raw_candles = []

                            candle_items = []
                            if raw_candles is None:
                                candle_items = []
                            elif isinstance(raw_candles, (list, tuple)):
                                candle_items = list(raw_candles)
                            else:
                                try:
                                    candle_items = list(raw_candles)
                                except TypeError:
                                    candle_items = [raw_candles]

                            if candle_items:
                                resolved_symbol = normalize_symbol(symbol_name)
                                candles = _build_candles(candle_items)
                                break
                        except Exception as exc:
                            logger.debug('variant %s raised: %s', variant, exc)
                            continue

                    if resolved_symbol:
                        break
                except Exception as exc:
                    logger.debug('candidate %s raised: %s', candidate, exc)
                    continue

            return {
                'requested_symbol': requested_symbol,
                'resolved_symbol': resolved_symbol,
                'timeframe': timeframe,
                'candles': candles,
            }
        except Exception as exc:
            logger.error(f"Error extracting timeframe data for {requested_symbol}: {str(exc)}")
            return {'requested_symbol': requested_symbol, 'resolved_symbol': resolved_symbol, 'timeframe': timeframe, 'candles': candles}

    def _resolve_timeframe(self, timeframe: str) -> Optional[Any]:
        """Map UI timeframe strings such as M1/M5/M15/H1 to MT5 constants."""
        mt5 = _get_mt5()
        mapping = {
            'M1': getattr(mt5, 'TIMEFRAME_M1', None),
            'M5': getattr(mt5, 'TIMEFRAME_M5', None),
            'M15': getattr(mt5, 'TIMEFRAME_M15', None),
            'M30': getattr(mt5, 'TIMEFRAME_M30', None),
            'H1': getattr(mt5, 'TIMEFRAME_H1', None),
            'H4': getattr(mt5, 'TIMEFRAME_H4', None),
            'D1': getattr(mt5, 'TIMEFRAME_D1', None),
            'W1': getattr(mt5, 'TIMEFRAME_W1', None),
            'MN1': getattr(mt5, 'TIMEFRAME_MN1', None),
        }
        return mapping.get((timeframe or '').strip().upper())

    def save_symbol_timeframe_data(self, symbol: str, timeframe: str = 'M1', count: int = 100, output_path: Optional[str] = None) -> Dict[str, Any]:
        """Persist timeframe candles for a symbol to a JSON file."""
        payload = self.get_symbol_timeframe_data(symbol, timeframe=timeframe, count=count)
        if output_path is None:
            base_dir = Path('logs') / 'symbol_exports'
            base_dir.mkdir(parents=True, exist_ok=True)
            output_path = str(base_dir / f"{(symbol or 'symbol').strip().upper()}_{(timeframe or 'M1').upper()}.json")

        target_path = Path(output_path)
        target_path.parent.mkdir(parents=True, exist_ok=True)
        target_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8')
        return {'success': True, 'path': str(target_path), 'data': payload}

    def disconnect(self) -> None:
        """
        قطع اتصال از متاتریدر5
        Disconnect from MetaTrader5
        """
        if self.connected:
            mt5 = _get_mt5()
            mt5.shutdown()
            self.connected = False
            self.account_login = None
            self.server = None
            self.password = None
            logger.info("Disconnected from MT5")

    shutdown = disconnect

# Global service instance
mt5_service = MT5Service()
