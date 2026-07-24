import asyncio
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT_DIR))

from sqlalchemy import text
from app.core.database import engine, AsyncSessionLocal
from app.db import models
from app.services.mt5_data_extractor import extract_ohlcv
from app.services.indicator_calculator import calculate_rsi, calculate_macd, calculate_moving_averages


async def test_database_connection():
    print('=== Testing database connection ===')
    try:
        async with engine.begin() as conn:
            await conn.run_sync(models.Base.metadata.create_all)
            print('✅ Metadata tables created or already exist')
        async with AsyncSessionLocal() as session:
            result = await session.execute(text('SELECT 1'))
            scalar = result.scalar_one()
            print('✅ Database responded to SELECT 1 ->', scalar)
            return True
    except Exception as exc:
        print('❌ Database connection/test failed:', exc)
        return False


async def test_extract_xauusd_m30():
    print('=== Testing MT5 XAUUSD M30 extraction ===')
    try:
        count = await extract_ohlcv('XAUUSD', 'M30')
        print('✅ Extracted rows count:', count)
        return True
    except Exception as exc:
        print('❌ Extraction failed:', exc)
        return False


def test_indicator_calculation():
    print('=== Testing indicator calculations ===')
    now = datetime.utcnow()
    data = [
        {'time': now.isoformat(), 'open': 10, 'high': 12, 'low': 9, 'close': 11, 'tick_volume': 100, 'real_volume': 90},
        {'time': (now + timedelta(minutes=30)).isoformat(), 'open': 11, 'high': 13, 'low': 10, 'close': 12, 'tick_volume': 110, 'real_volume': 105},
        {'time': (now + timedelta(hours=1)).isoformat(), 'open': 12, 'high': 14, 'low': 11, 'close': 13, 'tick_volume': 120, 'real_volume': 115},
    ]
    try:
        rsi = calculate_rsi(data, period=2)
        macd = calculate_macd(data)
        ma = calculate_moving_averages(data, periods=[2])

        print('RSI:', rsi)
        print('MACD keys:', list(macd.keys()))
        print('MA 2:', ma['ma_2'])
        success = len(rsi) == len(data) and 'macd' in macd and len(ma['ma_2']) == len(data)
        print('✅ Indicator calculation OK' if success else '❌ Indicator calculation returned unexpected results')
        return success
    except Exception as exc:
        print('❌ Indicator calculation failed:', exc)
        return False


async def main():
    # allow DATABASE_URL override for host environment
    db_url = os.environ.get('DATABASE_URL')
    if db_url:
        print('Using DATABASE_URL from environment')
    else:
        print('No DATABASE_URL set; using configured engine URL')

    db_ok = await test_database_connection()
    extract_ok = await test_extract_xauusd_m30()
    indicator_ok = test_indicator_calculation()

    print('\n=== Summary ===')
    print('DB Connection:', 'PASS' if db_ok else 'FAIL')
    print('Extract XAUUSD M30:', 'PASS' if extract_ok else 'FAIL')
    print('Indicator calc:', 'PASS' if indicator_ok else 'FAIL')
    if not all([db_ok, extract_ok, indicator_ok]):
        raise SystemExit(1)


if __name__ == '__main__':
    asyncio.run(main())
