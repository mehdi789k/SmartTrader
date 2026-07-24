"""
پیکربندی برنامه و متغیرهای محیطی
Application configuration using Pydantic Settings
"""
from pydantic import Field
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    """تنظیمات محیطی برای Smart-Tred"""
    SECRET_KEY: str = Field("change-this-in-production", env="SECRET_KEY")
    ALGORITHM: str = Field("HS256", env="ALGORITHM")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(30, env="ACCESS_TOKEN_EXPIRE_MINUTES")

    # Database
    DATABASE_URL: str = Field(
        "postgresql+asyncpg://smarttred:smarttredpass@timescaledb:5432/smarttred_db",
        env="DATABASE_URL",
    )

    # App
    API_HOST: str = Field("0.0.0.0", env="API_HOST")
    API_PORT: int = Field(8000, env="API_PORT")
    DEBUG: bool = Field(True, env="DEBUG")

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
    }

settings = Settings()
