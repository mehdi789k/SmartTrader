"""
مدل‌های Pydantic
Pydantic Models for API
"""

from pydantic import BaseModel
from typing import Optional

class LoginRequest(BaseModel):
    """درخواست ورود"""
    account: int
    password: str
    server: str

class LoginResponse(BaseModel):
    """پاسخ ورود"""
    success: bool
    message: str
    access_token: Optional[str] = None
    token_type: str = "bearer"

class RiskManagementConfigModel(BaseModel):
    """پیکربندی مدیریت سرمایه"""
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

class RiskAssessmentModel(BaseModel):
    """ارزیابی یک درخواست معامله"""
    allowed: bool
    reason: str
    adjusted_volume: Optional[float] = None
    breakeven_price: Optional[float] = None
    session_allowed: bool = True
    drawdown_allowed: bool = True

class AccountInfo(BaseModel):
    """اطلاعات حساب"""
    login: int
    server: str
    balance: float
    credit: float
    profit: float
    equity: float
    margin: float
    marginFree: float
    marginLevel: float
    currency: str
    leverage: int
    company: str
    name: str

class Position(BaseModel):
    """موقعیت باز"""
    ticket: int
    symbol: str
    type: str
    volume: float
    priceOpen: float
    priceCurrent: float
    profit: float
    timeOpen: str

class Order(BaseModel):
    """سفارش باز"""
    ticket: int
    symbol: str
    type: str
    volume: float
    priceOpen: float
    priceCurrent: float
    timeSetup: str

class Symbol(BaseModel):
    """نماد"""
    name: str
    description: str
    bid: float
    ask: float
    digits: int

class Tick(BaseModel):
    """تیک"""
    symbol: str
    bid: float
    ask: float
    time: str
