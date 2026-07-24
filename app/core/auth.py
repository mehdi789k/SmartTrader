"""
سیستم احراز هویت - Authentication System
"""
from datetime import datetime, timedelta, timezone
from typing import Optional, Any
from uuid import uuid4
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from ..config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class TokenData(BaseModel):
    sub: Optional[str] = None
    server: Optional[str] = None
    type: Optional[str] = None

class TokenManager:
    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None) -> str:
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": expire})
        return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

    def verify_token(self, token: str) -> Optional[dict]:
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            return payload
        except JWTError:
            return None

class SessionManager:
    def __init__(self):
        self.sessions: dict[str, dict[str, Any]] = {}

    def create_session(self, account: int, server: str, access_token: str) -> str:
        session_id = str(uuid4())
        self.sessions[session_id] = {
            "account": account,
            "server": server,
            "access_token": access_token,
            "created_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        }
        return session_id

    def get_session(self, session_id: str) -> Optional[dict[str, Any]]:
        return self.sessions.get(session_id)

    def delete_session(self, session_id: str) -> bool:
        return self.sessions.pop(session_id, None) is not None


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


token_manager = TokenManager()
session_manager = SessionManager()
