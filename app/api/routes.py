"""
API route definitions for Smart Tred
"""

from datetime import datetime, timedelta, timezone
import time
import traceback

from fastapi import APIRouter, Depends, HTTPException, status, Header, Body, Request
import json
from pathlib import Path
from datetime import datetime
from ..core import token_manager, session_manager, LoginRequest, LoginResponse, AccountInfo
from ..core.capital_management import (
    DEFAULT_SESSION_TEMPLATES,
    RiskManagementConfig,
    evaluate_trade_request,
    is_within_selected_sessions,
    is_within_session,
)
from ..core.mt5_service import mt5_service
from ..config import settings
from ..core.indicators import compute_indicators
from ..core import account_store
import uuid

router = APIRouter()


def _build_risk_config(payload: dict | None) -> RiskManagementConfig:
    """Create a capital management config from request payload values."""
    data = payload or {}
    selected_sessions = data.get('selected_sessions')
    if isinstance(selected_sessions, str):
        selected_sessions = [selected_sessions]
    if not isinstance(selected_sessions, list):
        selected_sessions = ["london", "asia", "new_york"]

    return RiskManagementConfig(
        risk_percent=float(data.get('risk_percent', 1.0) or 1.0),
        max_drawdown_percent=float(data.get('max_drawdown_percent', 5.0) or 5.0),
        max_daily_drawdown_percent=float(data.get('max_daily_drawdown_percent', 3.0) or 3.0),
        max_positions=int(data.get('max_positions', 3) or 3),
        max_position_volume=float(data.get('max_position_volume', 5.0) or 5.0),
        session_start=str(data.get('session_start', '08:00') or '08:00'),
        session_end=str(data.get('session_end', '17:00') or '17:00'),
        enable_break_even=bool(data.get('enable_break_even', True)),
        enable_drawdown_control=bool(data.get('enable_drawdown_control', True)),
        enable_position_limits=bool(data.get('enable_position_limits', True)),
        selected_sessions=selected_sessions,
    )


async def get_current_user(authorization: str = Header(None)):
    """استخراج کاربر جاری از توکن"""
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="توکن ارائه نشده است"
        )

    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="نوع توکن نامعتبر است"
            )

        payload = token_manager.verify_token(token)
        if payload is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="توکن نامعتبر یا منقضی است"
            )

        return payload
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="فرمت توکن نامعتبر است"
        )


@router.get("/api/health")
async def health_check():
    """بررسی سلامتی سرور"""
    return {
        "status": "healthy",
        "message": "Smart Tred API is running"
    }


@router.post("/api/auth/login", response_model=LoginResponse)
async def login(payload: dict = Body(None)):
    """ورود به حساب MetaTrader5

    این مسیر اکنون می‌تواند بدون بدنه فراخوانی شود و از مقادیر موجود در `app/.env` استفاده کند.
    """
    account = None
    password = None
    server = None

    if isinstance(payload, dict):
        account = payload.get('account')
        password = payload.get('password')
        server = payload.get('server')

    # Fallback to settings when any value is missing or empty
    if account in (None, ''):
        account = settings.MT5_LOGIN
    if password in (None, ''):
        password = settings.MT5_PASSWORD
    if server in (None, ''):
        server = settings.MT5_SERVER

    if not account or not password or not server:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="اطلاعات حساب، رمز عبور و سرور باید وارد شوند یا در فایل .env تنظیم شده باشند"
        )

    try:
        account_int = int(account)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="فرمت account باید عددی باشد")

    login_result = mt5_service.login(account_int, str(password), str(server))

    if not login_result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=login_result.get("message", "خطا در ورود")
        )

    access_token = token_manager.create_access_token(
        data={
            "sub": str(account_int),
            "server": str(server),
            "type": "access"
        }
    )

    session_manager.create_session(account_int, server, access_token)

    terminal_launched = bool(login_result.get("terminal_launched", False))
    message = (
        "ورود موفق و MT5 فعال شد"
        if terminal_launched
        else "ورود موفق؛ وضعیت فعال‌سازی MT5 در حال بررسی است"
    )

    return LoginResponse(
        success=True,
        message=message,
        access_token=access_token,
        token_type="bearer",
        terminal_launched=terminal_launched if isinstance(terminal_launched, bool) else bool(terminal_launched)
    )


@router.post("/api/auth/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    """خروج از حساب"""
    mt5_service.logout()

    return {
        "success": True,
        "message": "خروج موفق"
    }


@router.get("/api/auth/config")
async def get_auth_config():
    """Return login defaults from the configured environment values."""
    return {
        "success": True,
        "data": {
            "account": settings.MT5_LOGIN,
            "password": settings.MT5_PASSWORD,
            "server": settings.MT5_SERVER,
        }
    }


@router.get("/api/account/info")
async def get_account_info(current_user: dict = Depends(get_current_user)):
    """دریافت اطلاعات حساب"""
    if not mt5_service.is_connected():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="حساب متصل نیست"
        )

    account_info = mt5_service.get_account_info()

    if account_info is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="حساب متصل نیست یا اطلاعات حساب در MT5 در دسترس نیست"
        )

    return {
        "success": True,
        "data": account_info
    }


# --------------------
# Account management
# --------------------


@router.get("/api/accounts")
async def list_accounts(current_user: dict = Depends(get_current_user)):
    """Return stored accounts (without revealing passwords)."""
    accounts = account_store.load_accounts()
    # hide password in listing
    out = []
    for a in accounts:
        a2 = dict(a)
        if 'password' in a2:
            a2.pop('password')
        out.append(a2)
    return {"success": True, "data": out, "count": len(out)}


@router.post("/api/accounts")
async def create_account(payload: dict = Body(...), current_user: dict = Depends(get_current_user)):
    """Create and store a new account (password will be encrypted at rest)."""
    required = ('login', 'password', 'server')
    for k in required:
        if not payload.get(k):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"{k} is required")

    entry = {
        'id': str(uuid.uuid4()),
        'label': payload.get('label') or f"Account {payload.get('login')}",
        'login': str(payload.get('login')),
        'password': str(payload.get('password')),
        'server': str(payload.get('server')),
        'meta': payload.get('meta', {}),
    }

    added = account_store.add_account(entry)
    out = dict(added)
    out.pop('password', None)
    return {"success": True, "data": out}


@router.put("/api/accounts/{acc_id}")
async def update_account_endpoint(acc_id: str, payload: dict = Body(...), current_user: dict = Depends(get_current_user)):
    updated = account_store.update_account(acc_id, payload)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="account not found")
    out = dict(updated)
    out.pop('password', None)
    return {"success": True, "data": out}


@router.delete("/api/accounts/{acc_id}")
async def delete_account_endpoint(acc_id: str, current_user: dict = Depends(get_current_user)):
    ok = account_store.delete_account(acc_id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="account not found")
    return {"success": True}


@router.post("/api/accounts/{acc_id}/connect")
async def connect_account_endpoint(acc_id: str, current_user: dict = Depends(get_current_user)):
    """Attempt to connect using stored credentials for the account.

    Returns the same structure as `/api/auth/login` when successful.
    """
    acc = account_store.get_account(acc_id)
    if not acc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="account not found")

    try:
        login_int = int(acc.get('login'))
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="invalid login id")

    result = mt5_service.login(login_int, str(acc.get('password') or ''), str(acc.get('server') or ''))
    if not result.get('success'):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=result.get('message') or 'login failed')

    access_token = token_manager.create_access_token(
        data={
            "sub": str(login_int),
            "server": str(acc.get('server') or ''),
            "type": "access"
        }
    )
    session_manager.create_session(login_int, acc.get('server'), access_token)

    return {"success": True, "message": "connected", "access_token": access_token}


@router.get("/api/positions")
async def get_positions(current_user: dict = Depends(get_current_user)):
    """دریافت موقعیت‌های باز"""
    if not mt5_service.is_connected():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="حساب متصل نیست"
        )

    positions = mt5_service.get_positions()

    return {
        "success": True,
        "data": positions,
        "count": len(positions)
    }


@router.post("/api/positions/close")
async def close_position_endpoint(payload: dict = Body(...), current_user: dict = Depends(get_current_user)):
    """بستن پوزیشن بر اساس تیکت"""
    try:
        if not mt5_service.is_connected():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="حساب متصل نیست"
            )

        ticket = payload.get('ticket')
        if not ticket:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="ticket مورد نیاز است")

        # ensure logs directory
        logs_dir = Path("logs")
        logs_dir.mkdir(parents=True, exist_ok=True)
        log_file = logs_dir / "close_history.jsonl"

        # entry before attempting
        pre_entry = {
            "ts": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "user": current_user.get('sub'),
            "action": "close_attempt",
            "ticket": int(ticket),
        }
        with log_file.open('a', encoding='utf-8') as fh:
            fh.write(json.dumps(pre_entry, ensure_ascii=False) + "\n")

            result = mt5_service.close_position(int(ticket))

        post_entry = {
            "ts": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "user": current_user.get('sub'),
            "action": "close_result",
            "ticket": int(ticket),
            "result": result,
        }
        with log_file.open('a', encoding='utf-8') as fh:
            fh.write(json.dumps(post_entry, ensure_ascii=False) + "\n")

        if result.get('success'):
            return {"success": True, "message": "Position closed", "ticket": ticket, "detail": result}

        detail = result.get('message') or result.get('error') or 'Unknown error'
        return {
            "success": False,
            "message": detail,
            "ticket": ticket,
            "detail": result,
        }
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error closing position: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get('/api/positions/close/history')
async def get_close_history(current_user: dict = Depends(get_current_user)):
    """Return the close-operation audit history (JSONL)."""
    logs_dir = Path("logs")
    log_file = logs_dir / "close_history.jsonl"
    if not log_file.exists():
        return {"success": True, "data": [], "count": 0}

    entries = []
    try:
        with log_file.open('r', encoding='utf-8') as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                try:
                    entries.append(json.loads(line))
                except Exception:
                    # ignore malformed lines
                    continue
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"خطا در خواندن تاریخچه: {str(e)}")

    return {"success": True, "data": entries, "count": len(entries)}


@router.get("/api/orders")
async def get_orders(current_user: dict = Depends(get_current_user)):
    """دریافت سفارش‌های باز"""
    if not mt5_service.is_connected():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="حساب متصل نیست"
        )

    orders = mt5_service.get_orders()

    return {
        "success": True,
        "data": orders,
        "count": len(orders)
    }


@router.post("/api/orders/cancel")
async def cancel_order_endpoint(payload: dict = Body(...), current_user: dict = Depends(get_current_user)):
    """لغو یک سفارش در انتظار بر اساس تیکت"""
    try:
        if not mt5_service.is_connected():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="حساب متصل نیست"
            )

        ticket = payload.get('ticket')
        if not ticket:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="ticket مورد نیاز است")

        result = mt5_service.cancel_order(int(ticket))
        if result.get('success'):
            return {"success": True, "message": "Order cancelled", "ticket": ticket, "detail": result}

        detail = result.get('message') or result.get('error') or 'Unknown error'
        return {
            "success": False,
            "message": detail,
            "ticket": ticket,
            "detail": result,
        }
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error canceling order: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


DEFAULT_HISTORY_RANGE_DAYS = 365

@router.get("/api/trade-history")
async def get_trade_history(
    symbol: str = "",
    start_date: str = None,
    end_date: str = None,
    limit: int = 20,
    page: int = 1,
    current_user: dict = Depends(get_current_user)
):
    """دریافت تاریخچه معاملات بسته‌شده"""
    if not mt5_service.is_connected():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="حساب متصل نیست"
        )

    end_ts = int(time.time())
    default_start_ts = int((datetime.now() - timedelta(days=DEFAULT_HISTORY_RANGE_DAYS)).timestamp())
    start_ts = default_start_ts

    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date)
            if start_dt.tzinfo is None:
                start_dt = start_dt.replace(tzinfo=timezone.utc)
            else:
                start_dt = start_dt.astimezone(timezone.utc)
            start_ts = int(start_dt.timestamp())
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="فرمت start_date نامعتبر است. از yyyy-MM-dd یا yyyy-MM-ddTHH:mm:ss±HH:MM استفاده کنید."
            )

    if end_date:
        try:
            if len(end_date) == 10 and end_date.count('-') == 2:
                end_date_obj = datetime.fromisoformat(end_date).replace(tzinfo=timezone.utc)
                end_date_obj = end_date_obj + timedelta(days=1) - timedelta(seconds=1)
            else:
                end_date_obj = datetime.fromisoformat(end_date)
                if end_date_obj.tzinfo is None:
                    end_date_obj = end_date_obj.replace(tzinfo=timezone.utc)
                else:
                    end_date_obj = end_date_obj.astimezone(timezone.utc)
            end_ts = int(end_date_obj.timestamp())
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="فرمت end_date نامعتبر است. از yyyy-MM-dd یا yyyy-MM-ddTHH:mm:ss±HH:MM استفاده کنید."
            )

    if not start_date:
        start_ts = int((datetime.fromtimestamp(end_ts) - timedelta(days=DEFAULT_HISTORY_RANGE_DAYS)).timestamp())

    if start_ts < 0:
        start_ts = default_start_ts

    if start_ts > end_ts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="start_date نمی‌تواند بعد از end_date باشد."
        )

    if page < 1:
        page = 1
    if limit < 1:
        limit = 20

    trade_history = mt5_service.get_trade_history(
        symbol=symbol,
        start_time=start_ts,
        end_time=end_ts,
        limit=limit,
        page=page
    )

    return {
        "success": True,
        "data": trade_history,
        "count": len(trade_history),
        "page": page,
        "limit": limit,
        "symbol": symbol,
        "start_date": start_date,
        "end_date": end_date,
    }


@router.get("/api/symbols")
async def get_symbols(
    filter_text: str = "",
    current_user: dict = Depends(get_current_user)
):
    """دریافت لیست نمادها"""
    if not mt5_service.is_connected():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="حساب متصل نیست"
        )

    symbols = mt5_service.get_symbols(filter_text)

    return {
        "success": True,
        "data": symbols,
        "count": len(symbols)
    }


@router.get("/api/risk-management/config")
async def get_risk_management_config():
    """دریافت پیکربندی پیش‌فرض مدیریت سرمایه"""
    default_config = _build_risk_config({}).to_dict()
    default_config["session_templates"] = DEFAULT_SESSION_TEMPLATES
    return {"success": True, "data": default_config}


@router.post("/api/risk-management/assess")
async def assess_trade_request_endpoint(payload: dict = Body(...)):
    """ارزیابی درخواست معامله قبل از ارسال به MT5"""
    risk_config = _build_risk_config(payload.get('risk_config') if isinstance(payload.get('risk_config'), dict) else payload)
    balance = float(payload.get('balance', 0) or 0)
    equity = float(payload.get('equity', balance) or balance)
    requested_volume = float(payload.get('volume', 0) or 0)
    active_positions = int(payload.get('active_positions', 0) or 0)
    stop_loss_distance = float(payload.get('stop_loss_distance', 0) or 0)
    trading_time = payload.get('trading_time') or datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    assessment = evaluate_trade_request(
        balance=balance,
        equity=equity,
        requested_volume=requested_volume,
        active_positions=active_positions,
        max_positions=risk_config.max_positions,
        risk_percent=risk_config.risk_percent,
        stop_loss_distance=stop_loss_distance,
        max_drawdown_percent=risk_config.max_drawdown_percent,
        max_daily_drawdown_percent=risk_config.max_daily_drawdown_percent,
        max_position_volume=risk_config.max_position_volume,
        session_start=risk_config.session_start,
        session_end=risk_config.session_end,
        trading_time=trading_time,
        enable_drawdown_control=risk_config.enable_drawdown_control,
        enable_position_limits=risk_config.enable_position_limits,
    )

    return {
        "success": True,
        "data": {
            **assessment.to_dict(),
            "config": risk_config.to_dict(),
            "session_is_open": is_within_selected_sessions(trading_time, risk_config.selected_sessions) if risk_config.selected_sessions else is_within_session(trading_time, risk_config.session_start, risk_config.session_end),
        },
    }


@router.post("/api/trading-sessions/validate")
async def validate_trading_session_endpoint(payload: dict = Body(...)):
    """بررسی اینکه زمان جاری در بازه‌ی جلسه معاملاتی قرار دارد یا نه"""
    trading_time = payload.get('trading_time') or datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    session_start = payload.get('session_start', '08:00')
    session_end = payload.get('session_end', '17:00')
    selected_sessions = payload.get('selected_sessions') or ["london", "asia", "new_york"]
    return {
        "success": True,
        "data": {
            "trading_time": trading_time,
            "session_start": session_start,
            "session_end": session_end,
            "selected_sessions": selected_sessions,
            "session_is_open": is_within_selected_sessions(trading_time, selected_sessions),
        },
    }


@router.post("/api/positions/open")
async def open_position_endpoint(payload: dict = Body(...), current_user: dict = Depends(get_current_user)):
    """باز کردن پوزیشن دستی بر اساس نماد و نوع سفارش با کنترل سرمایه"""
    try:
        if not mt5_service.is_connected():
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="حساب متصل نیست")

        symbol = (payload.get('symbol') or '').strip()
        volume = float(payload.get('volume', 0) or 0)
        order_type = (payload.get('type') or '').strip().upper()
        price = payload.get('price')
        sl = payload.get('sl')
        tp = payload.get('tp')
        risk_config = _build_risk_config(payload.get('risk_config') if isinstance(payload.get('risk_config'), dict) else payload)
        trading_time = payload.get('trading_time') or datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        if not symbol or not order_type or volume <= 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="نماد، نوع سفارش و حجم باید وارد شوند")

        balance = float(payload.get('balance', 0) or 0)
        equity = float(payload.get('equity', balance) or balance)
        if balance <= 0:
            account_info = mt5_service.get_account_info()
            if account_info:
                balance = float(account_info.get('balance', 0) or 0)
                equity = float(account_info.get('equity', balance) or balance)

        stop_loss_distance = payload.get('stop_loss_distance')
        if stop_loss_distance is None and price is not None and sl is not None:
            stop_loss_distance = abs(float(price) - float(sl))
        if stop_loss_distance is None:
            stop_loss_distance = 0.0

        assessment = evaluate_trade_request(
            balance=balance,
            equity=equity,
            requested_volume=volume,
            active_positions=int(payload.get('active_positions', 0) or 0),
            max_positions=risk_config.max_positions,
            risk_percent=risk_config.risk_percent,
            stop_loss_distance=float(stop_loss_distance) if stop_loss_distance is not None else 0.0,
            max_drawdown_percent=risk_config.max_drawdown_percent,
            max_daily_drawdown_percent=risk_config.max_daily_drawdown_percent,
            max_position_volume=risk_config.max_position_volume,
            session_start=risk_config.session_start,
            session_end=risk_config.session_end,
            trading_time=trading_time,
            enable_drawdown_control=risk_config.enable_drawdown_control,
            enable_position_limits=risk_config.enable_position_limits,
            selected_sessions=risk_config.selected_sessions,
        )

        if not assessment.allowed:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=assessment.reason)

        result = mt5_service.open_position(
            symbol=symbol,
            volume=assessment.adjusted_volume if assessment.adjusted_volume is not None else volume,
            order_type=order_type,
            price=price,
            sl=sl,
            tp=tp,
            risk_assessment=assessment,
            risk_config=risk_config,
        )
        if result.get('success') and assessment.breakeven_price is not None:
            result['breakeven_price'] = assessment.breakeven_price
        return result
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"خطا در باز کردن پوزیشن: {str(exc)}")


@router.get("/api/tick/{symbol}")
async def get_tick(symbol: str, current_user: dict = Depends(get_current_user)):
    """دریافت آخرین تیک یک نماد"""
    if not mt5_service.is_connected():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="حساب متصل نیست"
        )

    tick = mt5_service.get_tick(symbol)

    if tick is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"نماد {symbol} یافت نشد"
        )

    return {
        "success": True,
        "data": tick
    }


@router.get("/api/symbols/{symbol}/data")
async def get_symbol_data(symbol: str, current_user: dict = Depends(get_current_user)):
    """جمع‌آوری داده‌های کامل یک نماد انتخاب‌شده توسط کاربر"""
    if not mt5_service.is_connected():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="حساب متصل نیست")

    payload = mt5_service.get_symbol_full_data(symbol)
    return {"success": True, "data": payload}


@router.post("/api/symbols/{symbol}/export")
async def export_symbol_data(symbol: str, current_user: dict = Depends(get_current_user)):
    """ذخیره داده‌های منتخب نماد در فایل JSON"""
    if not mt5_service.is_connected():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="حساب متصل نیست")

    output_path = None
    export_dir = Path("logs") / "symbol_exports"
    export_dir.mkdir(parents=True, exist_ok=True)
    output_path = str(export_dir / f"{symbol.strip().upper()}.json")
    result = mt5_service.save_symbol_data(symbol, output_path=output_path)
    return {"success": True, "data": result}


@router.get("/api/symbols/{symbol}/timeframe")
async def get_symbol_timeframe_data(
    symbol: str,
    timeframe: str = 'M1',
    count: int = 100,
    start_date: str | None = None,
    end_date: str | None = None,
    min_volume: int = 0,
    min_price: float | None = None,
    max_price: float | None = None,
    selected_sessions: str | None = None,
    compute_indicators: bool = False,
    apply_indicator_filters: bool = False,
    request: Request = None,
    current_user: dict = Depends(get_current_user)
):
    """دریافت داده‌های تایم‌فریم برای یک نماد انتخاب‌شده"""
    if not mt5_service.is_connected():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="حساب متصل نیست")

    payload = mt5_service.get_symbol_timeframe_data(symbol, timeframe=timeframe, count=count)

    # Apply server-side filters if provided
    try:
        candles = payload.get('candles', []) or []

        def in_session(ts_iso, sessions_list):
            try:
                if not ts_iso:
                    return False
                ts = datetime.fromisoformat(ts_iso)
                hour = ts.hour
                for key in sessions_list:
                    for s in DEFAULT_SESSION_TEMPLATES:
                        if s.get('key') == key:
                            start = s.get('start', 0)
                            end = s.get('end', 24)
                            if start <= end:
                                if hour >= start and hour < end:
                                    return True
                            else:
                                if hour >= start or hour < end:
                                    return True
                return False
            except Exception:
                return False

        sessions_list = []
        if selected_sessions:
            sessions_list = [s.strip() for s in selected_sessions.split(',') if s.strip()]

        filtered = []
        start_ts = None
        end_ts = None
        if start_date:
            try:
                start_ts = datetime.fromisoformat(start_date)
            except Exception:
                start_ts = None
        if end_date:
            try:
                end_ts = datetime.fromisoformat(end_date)
            except Exception:
                end_ts = None

        for c in candles:
            try:
                t_iso = c.get('time')
                if start_ts or end_ts:
                    if not t_iso:
                        continue
                    t = datetime.fromisoformat(t_iso)
                    if start_ts and t < start_ts:
                        continue
                    if end_ts and t > end_ts:
                        continue

                if min_volume and min_volume > 0:
                    vol = int(c.get('tick_volume') or c.get('real_volume') or 0)
                    if vol < int(min_volume):
                        continue

                if min_price is not None:
                    if (c.get('high') is None and c.get('low') is None and c.get('close') is None):
                        continue
                    if float(c.get('close') or c.get('high') or c.get('low')) < float(min_price):
                        continue
                if max_price is not None:
                    if (c.get('high') is None and c.get('low') is None and c.get('close') is None):
                        continue
                    if float(c.get('close') or c.get('high') or c.get('low')) > float(max_price):
                        continue

                if sessions_list:
                    if not in_session(t_iso, sessions_list):
                        continue

                filtered.append(c)
            except Exception:
                continue

        payload['candles'] = filtered
    except Exception:
        pass

    # Optional: compute indicators server-side
    # Optional: compute indicators server-side
    try:
        if compute_indicators:
            # Build options from query params if provided
            q = dict(request.query_params) if request is not None else {}
            opts = {
                'sma_period': int(q.get('filter_sma_period')) if q.get('filter_sma_period') else None,
                'bollinger_period': int(q.get('filter_bollinger_period')) if q.get('filter_bollinger_period') else None,
                'bollinger_std': float(q.get('filter_bollinger_std')) if q.get('filter_bollinger_std') else None,
                'rsi_period': int(q.get('filter_rsi_period')) if q.get('filter_rsi_period') else None,
                'atr_period': int(q.get('filter_atr_period')) if q.get('filter_atr_period') else None,
                'ma_fast': int(q.get('filter_ma_fast')) if q.get('filter_ma_fast') else None,
                'ma_slow': int(q.get('filter_ma_slow')) if q.get('filter_ma_slow') else None,
                'mfi_period': int(q.get('filter_mfi_period')) if q.get('filter_mfi_period') else None,
                'super_atr': int(q.get('filter_super_atr')) if q.get('filter_super_atr') else None,
                'super_mult': float(q.get('filter_super_mult')) if q.get('filter_super_mult') else None,
                'trend_window': int(q.get('filter_trend_window')) if q.get('filter_trend_window') else None,
            }
            # remove None values
            opts = {k: v for k, v in opts.items() if v is not None}
            indicators = compute_indicators(payload.get('candles', []) or [], opts)
            payload['indicators'] = indicators

            # Apply basic indicator-based filters server-side when requested
            if apply_indicator_filters:
                filtered2 = []
                candles2 = payload.get('candles', []) or []
                # helper to parse boolean
                def bool_q(key):
                    val = request.query_params.get(key) if request is not None else None
                    return str(val).lower() in ('1', 'true', 'yes', 'on') if val is not None else False

                q = dict(request.query_params) if request is not None else {}
                for idx, c in enumerate(candles2):
                    try:
                        # close above sma
                        if bool_q('filter_close_above_sma'):
                            sma_arr = indicators.get('sma', [])
                            sma_val = sma_arr[idx] if idx < len(sma_arr) else None
                            if sma_val is None or float(c.get('close') or 0) <= float(sma_val):
                                continue

                        if bool_q('filter_rsi_enabled'):
                            rsi_arr = indicators.get('rsi', [])
                            rsi_val = rsi_arr[idx] if idx < len(rsi_arr) else None
                            level = float(request.query_params.get('filter_rsi_level') or 30)
                            above = str(request.query_params.get('filter_rsi_above') or 'false').lower() in ('1','true','yes')
                            if rsi_val is None: continue
                            if above and not (rsi_val > level): continue
                            if (not above) and not (rsi_val < level): continue

                        if bool_q('filter_heiken_enabled'):
                            # require last n HA closes > opens
                            n = int(request.query_params.get('filter_heiken_consecutive') or 3)
                            ha_close = indicators.get('ha_close', [])
                            ha_open = indicators.get('ha_open', [])
                            ok = True
                            for k in range(n):
                                i = idx - k
                                if i < 0 or i >= len(ha_close): ok = False; break
                                if not (ha_close[i] > ha_open[i]): ok = False; break
                            if not ok: continue

                        if bool_q('filter_mfi_enabled'):
                            mfi_arr = indicators.get('mfi', [])
                            mfi_val = mfi_arr[idx] if idx < len(mfi_arr) else None
                            thr = float(request.query_params.get('filter_mfi_threshold') or 20)
                            if mfi_val is None or not (mfi_val > thr): continue

                        if bool_q('filter_supertrend_enabled'):
                            st = indicators.get('supertrend', [])
                            stv = st[idx] if idx < len(st) else None
                            if stv is not True: continue

                        # pass other filters
                        filtered2.append(c)
                    except Exception:
                        continue

                payload['candles'] = filtered2
    except Exception:
        # indicator computation should not break response
        pass

    return {"success": True, "data": payload}


@router.post("/api/symbols/{symbol}/timeframe/export")
async def export_symbol_timeframe_data(symbol: str, timeframe: str = 'M1', count: int = 100, current_user: dict = Depends(get_current_user)):
    """ذخیره داده‌های تایم‌فریم نماد در فایل JSON"""
    if not mt5_service.is_connected():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="حساب متصل نیست")

    export_dir = Path("logs") / "symbol_exports"
    export_dir.mkdir(parents=True, exist_ok=True)
    output_path = str(export_dir / f"{symbol.strip().upper()}_{timeframe.upper()}.json")
    result = mt5_service.save_symbol_timeframe_data(symbol, timeframe=timeframe, count=count, output_path=output_path)
    return {"success": True, "data": result}


@router.post("/api/symbols/{symbol}/timeframes/export")
async def export_symbol_timeframes_data(symbol: str, payload: dict = Body(...), current_user: dict = Depends(get_current_user)):
    """ذخیره چند تایم‌فریم با داده‌های استخراج‌شده‌ی قبلی در یک درخواست"""
    if not mt5_service.is_connected():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="حساب متصل نیست")

    export_dir = Path("logs") / "symbol_exports"
    export_dir.mkdir(parents=True, exist_ok=True)

    records = payload.get("records") or []
    saved_files = []
    failed_exports = []

    for item in records:
        timeframe = ((item or {}).get("timeframe") or "M1").strip().upper()
        data = (item or {}).get("payload")
        output_path = str(export_dir / f"{symbol.strip().upper()}_{timeframe}.json")
        target_path = Path(output_path)
        target_path.parent.mkdir(parents=True, exist_ok=True)

        try:
            if isinstance(data, dict) and data.get("candles") is not None:
                target_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
                saved_files.append({"timeframe": timeframe, "path": str(target_path)})
            else:
                result = mt5_service.save_symbol_timeframe_data(symbol, timeframe=timeframe, count=300, output_path=str(target_path))
                saved_files.append({"timeframe": timeframe, "path": result.get("path") or str(target_path)})
        except Exception as exc:
            failed_exports.append({"timeframe": timeframe, "detail": str(exc)})

    return {
        "success": True,
        "data": {
            "saved_files": saved_files,
            "failed_exports": failed_exports,
        },
    }


@router.get("/api/status")
async def get_status(current_user: dict = Depends(get_current_user)):
    """دریافت وضعیت اتصال"""
    return {
        "success": True,
        "connected": mt5_service.is_connected(),
        "account": getattr(mt5_service, "account_login", None),
        "server": getattr(mt5_service, "server", None),
    }
