"""
Database connection (Async SQLAlchemy)
"""
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from typing import AsyncGenerator
from .config import settings

DATABASE_URL = settings.DATABASE_URL

# Engine and sessionmaker for async DB operations
engine: AsyncEngine = create_async_engine(
    DATABASE_URL,
    echo=False,
    future=True,
    pool_size=20,
    max_overflow=10,
)

AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for FastAPI endpoints: yields an async session"""
    async with AsyncSessionLocal() as session:
        yield session
