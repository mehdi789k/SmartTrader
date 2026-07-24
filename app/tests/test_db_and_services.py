import asyncio
from datetime import datetime, timedelta
from pathlib import Path

import pytest

from app.core.config import settings
from app.core.database import engine, AsyncSessionLocal
from app.db import models
from app.services.mt5_data_extractor import extract_ohlcv
from app.services.indicator_calculator import calculate_rsi, calculate_macd, calculate_moving_averages


@pytest.mark.asyncio
async def test_database_connection_and_schema():
    # ensure DB engine can connect and can create tables
    async with engine.begin() as conn:
        await conn.run_sync(models.Base.metadata.create_all)
    async with AsyncSessionLocal() as session:
        result = await session.execute('SELECT 1')
        assert result.scalar_one() == 1


@pytest.mark.asyncio
async def test_extract_xauusd_m30():
    # test extraction from MT5 if terminal configured
    # this test expects MetaTrader 5 connection to be available
    symbol = 'XAUUSD'
    timeframe = 'M30'
    count = await extract_ohlcv(symbol, timeframe)
    assert isinstance(count, int)
    assert count >= 0


def test_indicator_calculation_sample():
    now = datetime.utcnow()
    data = [
        {'time': now.isoformat(), 'open': 10, 'high': 12, 'low': 9, 'close': 11, 'tick_volume': 100, 'real_volume': 90},
        {'time': (now + timedelta(minutes=30)).isoformat(), 'open': 11, 'high': 13, 'low': 10, 'close': 12, 'tick_volume': 110, 'real_volume': 105},
        {'time': (now + timedelta(hours=1)).isoformat(), 'open': 12, 'high': 14, 'low': 11, 'close': 13, 'tick_volume': 120, 'real_volume': 115},
    ]

    rsi = calculate_rsi(data, period=2)
    macd = calculate_macd(data)
    ma = calculate_moving_averages(data, periods=[2])

    assert len(rsi) == len(data)
    assert isinstance(macd, dict)
    assert 'macd' in macd
    assert len(ma['ma_2']) == len(data)
