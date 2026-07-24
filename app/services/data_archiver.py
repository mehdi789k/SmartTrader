"""
سرویس آرشیو داده‌ها به Parquet و بازیابی آنها
"""
from datetime import datetime, timedelta
from typing import Optional
import logging
from pathlib import Path

import pandas as pd
from ..core.database import AsyncSessionLocal
from ..db import models as db_models

logger = logging.getLogger(__name__)
ARCHIVE_DIR = Path('archive')
ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)


async def archive_to_parquet(symbol: str, timeframe: str, days_old: int = 30) -> Optional[Path]:
    """آرشیو داده‌های قدیمی‌تر از `days_old` به فایل Parquet و حذف از DB"""
    cutoff = datetime.utcnow() - timedelta(days=days_old)
    async with AsyncSessionLocal() as session:
        # query using raw SQL for simplicity
        sql = """
        SELECT time, symbol, timeframe, open, high, low, close, tick_volume, real_volume
        FROM ohlcv_data
        WHERE symbol = :symbol AND timeframe = :timeframe AND time < :cutoff
        ORDER BY time ASC
        """
        try:
            res = await session.execute(sql, {'symbol': symbol.upper(), 'timeframe': timeframe.upper(), 'cutoff': cutoff})
        except Exception as e:
            logger.error('Archive query failed: %s', e)
            return None
        rows = res.fetchall()
        if not rows:
            return None
        df = pd.DataFrame(rows, columns=[c for c in res.keys()])
        # write parquet partitioned by year/month
        year = cutoff.year
        month = cutoff.month
        target = ARCHIVE_DIR / f"{symbol.upper()}_{timeframe.upper()}_{year}_{month}.parquet"
        try:
            df.to_parquet(target, index=False)
        except Exception as e:
            logger.error('Failed to write parquet: %s', e)
            return None
        # delete archived rows
        del_sql = "DELETE FROM ohlcv_data WHERE symbol = :symbol AND timeframe = :timeframe AND time < :cutoff"
        try:
            await session.execute(del_sql, {'symbol': symbol.upper(), 'timeframe': timeframe.upper(), 'cutoff': cutoff})
            await session.commit()
        except Exception as e:
            await session.rollback()
            logger.error('Failed to delete archived rows: %s', e)
            return None
        return target


def load_from_parquet(symbol: str, timeframe: str, year: int, month: int):
    target = ARCHIVE_DIR / f"{symbol.upper()}_{timeframe.upper()}_{year}_{month}.parquet"
    if not target.exists():
        return None
    try:
        df = pd.read_parquet(target)
        return df
    except Exception as e:
        logger.error('Failed to load parquet %s: %s', target, e)
        return None


async def cleanup_old_data(days_old: int = 30) -> int:
    cutoff = datetime.utcnow() - timedelta(days=days_old)
    async with AsyncSessionLocal() as session:
        try:
            res = await session.execute("DELETE FROM ohlcv_data WHERE time < :cutoff", {'cutoff': cutoff})
            await session.commit()
            # rowcount may be unavailable for some drivers; return 0 when unknown
            return getattr(res, 'rowcount', 0) or 0
        except Exception as e:
            await session.rollback()
            logger.error('Cleanup failed: %s', e)
            return 0
