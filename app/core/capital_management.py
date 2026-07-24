"""Capital management helpers for trading operations."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import datetime
from typing import Any, Optional

DEFAULT_SESSION_TEMPLATES = {
    "asia": {"label": "آسیا", "start": "22:00", "end": "08:00", "enabled": True},
    "london": {"label": "لندن", "start": "08:00", "end": "16:00", "enabled": True},
    "new_york": {"label": "نیویورک", "start": "13:00", "end": "21:00", "enabled": True},
}


@dataclass
class RiskManagementConfig:
    """Configuration values that govern capital and session control."""

    risk_percent: float = 1.0
    max_drawdown_percent: float = 5.0
    max_daily_drawdown_percent: float = 3.0
    max_positions: int = 3
    max_position_volume: float = 5.0
    session_start: str = "08:00"
    session_end: str = "17:00"
    enable_break_even: bool = True
    enable_drawdown_control: bool = True
    enable_position_limits: bool = True
    selected_sessions: Optional[list[str]] = None

    def to_dict(self) -> dict[str, Any]:
        data = asdict(self)
        if self.selected_sessions is None:
            data["selected_sessions"] = ["london", "asia", "new_york"]
        return data


@dataclass
class RiskAssessment:
    """Result of validating a new trade request."""

    allowed: bool
    reason: str
    adjusted_volume: Optional[float] = None
    breakeven_price: Optional[float] = None
    session_allowed: bool = True
    drawdown_allowed: bool = True

    def to_dict(self) -> dict[str, Any]:
        return {
            "allowed": self.allowed,
            "reason": self.reason,
            "adjusted_volume": self.adjusted_volume,
            "breakeven_price": self.breakeven_price,
            "session_allowed": self.session_allowed,
            "drawdown_allowed": self.drawdown_allowed,
        }


def calculate_position_size(
    balance: float,
    risk_percent: float,
    stop_loss_distance: float,
) -> float:
    """Calculate a position volume based on account balance and risk percent."""

    if balance <= 0 or risk_percent <= 0 or stop_loss_distance <= 0:
        return 0.0

    risk_amount = balance * (risk_percent / 100.0)
    return round(risk_amount / stop_loss_distance, 2)


def compute_breakeven_price(
    entry_price: float,
    stop_loss: float,
    order_type: str,
) -> float:
    """Return the breakeven level for a trade based on entry and stop-loss."""

    if entry_price <= 0:
        return 0.0

    normalized_type = (order_type or "").upper()
    if normalized_type == "SELL":
        return entry_price if stop_loss >= entry_price else stop_loss
    return entry_price if stop_loss <= entry_price else stop_loss


def _parse_time_window(trading_time: Any) -> datetime:
    if isinstance(trading_time, datetime):
        return trading_time
    if isinstance(trading_time, str):
        try:
            return datetime.fromisoformat(trading_time.replace("Z", "+00:00")).replace(tzinfo=None)
        except ValueError:
            try:
                return datetime.strptime(trading_time, "%H:%M")
            except ValueError:
                return datetime.strptime(trading_time, "%Y-%m-%d %H:%M:%S")
    return datetime.now()


def is_within_session(trading_time: str, session_start: str, session_end: str) -> bool:
    """Check whether a trading timestamp falls inside the configured session window."""

    if not trading_time:
        trading_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    if not session_start or not session_end:
        return True

    current_time = _parse_time_window(trading_time)
    try:
        start_time = datetime.strptime(str(session_start), "%H:%M").time()
        end_time = datetime.strptime(str(session_end), "%H:%M").time()
    except ValueError:
        return True

    current_time_value = current_time.time()
    if start_time <= end_time:
        return start_time <= current_time_value <= end_time
    return current_time_value >= start_time or current_time_value <= end_time


def is_within_selected_sessions(trading_time: Any, selected_sessions: Optional[list[str]] = None) -> bool:
    """Return True when the current time falls inside at least one enabled session."""

    if not selected_sessions:
        selected_sessions = ["london", "asia", "new_york"]

    if not selected_sessions:
        return True

    current_time = _parse_time_window(trading_time)
    current_hour = current_time.strftime("%H:%M")

    for session_key in selected_sessions:
        template = DEFAULT_SESSION_TEMPLATES.get(session_key)
        if not template:
            continue
        start = template["start"]
        end = template["end"]
        if is_within_session(current_hour, start, end):
            return True
    return False


def evaluate_trade_request(
    balance: float,
    equity: float,
    requested_volume: float,
    active_positions: int,
    max_positions: int,
    risk_percent: float,
    stop_loss_distance: float,
    max_drawdown_percent: float = 5.0,
    max_daily_drawdown_percent: float = 3.0,
    max_position_volume: float = 5.0,
    session_start: str = "08:00",
    session_end: str = "17:00",
    trading_time: Optional[str] = None,
    enable_drawdown_control: bool = True,
    enable_position_limits: bool = True,
    selected_sessions: Optional[list[str]] = None,
) -> RiskAssessment:
    """Validate a new trade request against capital-risk and session rules."""

    reasons: list[str] = []
    allowed = True

    if enable_position_limits and max_positions is not None and active_positions >= max_positions:
        allowed = False
        reasons.append("تعداد پوزیشن باز به حد مجاز رسیده است")

    if enable_drawdown_control and balance > 0 and equity > 0:
        drawdown_threshold = balance * (1 - (max_drawdown_percent / 100.0))
        if equity < drawdown_threshold:
            allowed = False
            reasons.append("درآمد/دراوون فعلی از حد مجاز عبور کرده است")

    if max_daily_drawdown_percent and balance > 0:
        daily_drawdown_threshold = balance * (1 - (max_daily_drawdown_percent / 100.0))
        if equity < daily_drawdown_threshold:
            allowed = False
            reasons.append("دراوون روزانه از حد مجاز عبور کرده است")

    if max_position_volume and requested_volume > max_position_volume:
        allowed = False
        reasons.append("حجم درخواستی از حد مجاز حجم پوزیشن بیشتر است")

    session_allowed = is_within_session(
        trading_time or datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        session_start,
        session_end,
    )
    if selected_sessions:
        session_allowed = is_within_selected_sessions(trading_time or datetime.now().strftime("%Y-%m-%d %H:%M:%S"), selected_sessions)
    if not session_allowed:
        allowed = False
        reasons.append("سشن معاملاتی خارج از بازه مجاز است")

    recommended_volume = 0.0
    if risk_percent > 0 and stop_loss_distance > 0:
        recommended_volume = calculate_position_size(balance, risk_percent, stop_loss_distance)

    if recommended_volume > 0 and requested_volume > recommended_volume:
        adjusted_volume = recommended_volume
    else:
        adjusted_volume = requested_volume

    return RiskAssessment(
        allowed=allowed,
        reason="; ".join(reasons) if reasons else "درخواست مجاز است",
        adjusted_volume=adjusted_volume,
        breakeven_price=None,
        session_allowed=session_allowed,
        drawdown_allowed=equity >= balance * (1 - (max_drawdown_percent / 100.0)) if balance > 0 else True,
    )
