"""
تنظیمات اپلیکیشن - Configuration for Smart Tred Application
"""
from pathlib import Path
from typing import Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # JWT & Authentication
    SECRET_KEY: str = "your-secret-key-change-this-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # MetaTrader5
    MT5_PATH: Optional[str] = None  # Auto-detect if None
    MT5_TIMEOUT: int = 5000  # milliseconds
    MT5_LOGIN: Optional[int] = None
    MT5_PASSWORD: Optional[str] = None
    MT5_SERVER: Optional[str] = None

    # API Configuration
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    API_TITLE: str = "Smart Tred API"
    API_DESCRIPTION: str = "Smart Tred FastAPI backend for MetaTrader 5"
    API_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "logs/smarttred.log"

    @property
    def cors_origins_list(self) -> list[str]:
        if isinstance(self.CORS_ORIGINS, str):
            return [item.strip() for item in self.CORS_ORIGINS.split(",") if item.strip()]
        return list(self.CORS_ORIGINS)

    class Config:
        env_file = str((Path(__file__).resolve().parents[1] / ".env"))
        case_sensitive = False
        env_file_encoding = "utf-8"

settings = Settings()
config = settings
