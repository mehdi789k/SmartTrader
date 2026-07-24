"""
سرویس استخراج داده‌ها از MT5 و ذخیره در دیتابیس
"""
from typing import List, Optional
import asyncio
from datetime import datetime, timezone
import logging

from ..core.mt5_service import mt5_service
from ..core.database import AsyncSessionLocal
from ..db import models as db_models

logger = logging.getLogger(__name__)

TIMEFRAMES = ["M1", "M5", "M15", "M30", "H1", "H4", "D1", "W1", "MN1"]


def _parse_iso(ts: Optional[str]) -> Optional[datetime]:
    if not ts:
        return None
    try:
        if ts.endswith('Z'):
            ts = ts.replace('Z', '+00:00')
        return datetime.fromisoformat(ts)
    except Exception:
        return None


async def extract_ohlcv(symbol: str, timeframe: str, start_date: Optional[datetime] = None, end_date: Optional[datetime] = None) -> int:
    """استخراج کندل‌ها از MT5 و ذخیره در جدول `ohlcv_data`.
    بازگشتی: تعداد ردیف‌های درج‌شده
    """
    loop = asyncio.get_running_loop()
    # متد MT5 سرویس synchronous است؛ آن را در threadpool اجرا می‌کنیم
    result = await loop.run_in_executor(None, mt5_service.get_symbol_timeframe_data, symbol, timeframe, 1000)
    candles = result.get('candles', []) if isinstance(result, dict) else []

    # فیلتر زمانی اگر داده شده
    if start_date or end_date:
        filtered = []
        for c in candles:
            t = _parse_iso(c.get('time'))
            if t is None:
                continue
            if start_date and t < start_date:
                continue
            if end_date and t > end_date:
                continue
            filtered.append(c)
        candles = filtered

    if not candles:
        return 0

    async with AsyncSessionLocal() as session:
        inserted = 0
        for c in candles:
            time_val = _parse_iso(c.get('time'))
            if time_val is None:
                continue
            obj = db_models.OHLCVData(
                time=time_val,
                symbol=symbol.upper(),
                timeframe=timeframe.upper(),
                open=c.get('open'),
                high=c.get('high'),
                low=c.get('low'),
                close=c.get('close'),
                tick_volume=c.get('tick_volume'),
                real_volume=c.get('real_volume'),
                spread=None,
            )
            try:
                session.add(obj)
                inserted += 1
            except Exception as e:
                logger.debug('Insert OHLCV error: %s', e)
        try:
            await session.commit()
        except Exception as e:
            await session.rollback()
            logger.error('Failed to commit OHLCV inserts: %s', e)
            return 0

    return inserted


async def extract_all_timeframes(symbol: str) -> dict:
    """استخراج برای تمامی تایم‌فریم‌ها برای یک نماد"""
    out = {}
    for tf in TIMEFRAMES:
        try:
            count = await extract_ohlcv(symbol, tf)
            out[tf] = count
        except Exception as e:
            logger.error('Error extracting %s %s: %s', symbol, tf, e)
            out[tf] = 0
    return out


async def extract_all_symbols() -> dict:
    """استخراج برای تمام نمادهای در دسترس در MT5"""
    loop = asyncio.get_running_loop()
    symbols = await loop.run_in_executor(None, mt5_service.get_symbols)
    results = {}
    if not symbols:
        return results
    for s in symbols:
        try:
            results[s] = await extract_all_timeframes(s)
        except Exception as e:
            logger.error('Error extracting for symbol %s: %s', s, e)
            results[s] = {}
    return results
