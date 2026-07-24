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
    terminal_launched: Optional[bool] = None

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
