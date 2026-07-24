"""
سرویس بارگذاری داده برای ML
"""
from typing import Optional
from datetime import datetime
import pandas as pd
import logging
from ..core.database import AsyncSessionLocal

logger = logging.getLogger(__name__)


async def load_training_data(symbol: str, timeframe: str, start_date: datetime, end_date: datetime) -> Optional[pd.DataFrame]:
    """بارگذاری داده‌های OHLCV و اندیکاتورها برای آموزش ML به صورت DataFrame"""
    async with AsyncSessionLocal() as session:
        sql = """
        SELECT o.time, o.open, o.high, o.low, o.close, o.tick_volume, o.real_volume,
               i.indicator_name, i.indicator_value, i.weight
        FROM ohlcv_data o
        LEFT JOIN indicators_data i ON o.time = i.time AND o.symbol = i.symbol AND o.timeframe = i.timeframe
        WHERE o.symbol = :symbol AND o.timeframe = :timeframe AND o.time BETWEEN :start_date AND :end_date
        ORDER BY o.time ASC
        """
        try:
            res = await session.execute(sql, {'symbol': symbol.upper(), 'timeframe': timeframe.upper(), 'start_date': start_date, 'end_date': end_date})
        except Exception as e:
            logger.error('Training data query failed: %s', e)
            return None
        rows = res.fetchall()
        if not rows:
            return None
        df = pd.DataFrame(rows, columns=[c for c in res.keys()])
        # pivot indicators into columns
        try:
            df_pivot = df.pivot_table(index=['time','open','high','low','close','tick_volume','real_volume'], columns='indicator_name', values='indicator_value')
            df_pivot = df_pivot.reset_index()
            return df_pivot
        except Exception:
            return df


async def prepare_features(indicators_df: pd.DataFrame) -> pd.DataFrame:
    """آماده‌سازی و نرمال‌سازی ویژگی‌ها برای مدل ML"""
    if indicators_df is None or indicators_df.empty:
        return indicators_df
    df = indicators_df.copy()
    # sample: fill NaNs and scale numerically; real pipelines should use sklearn Pipelines
    numeric = df.select_dtypes(include=['number'])
    df[numeric.columns] = numeric.fillna(method='ffill').fillna(0)
    return df


async def get_historical_predictions(symbol: str, timeframe: str, limit: int = 1000):
    async with AsyncSessionLocal() as session:
        sql = "SELECT id, created_at, symbol, timeframe, prediction_type, confidence_score, predicted_price, target_time, model_version, features_used FROM predictions WHERE symbol = :symbol AND timeframe = :timeframe ORDER BY created_at DESC LIMIT :limit"
        try:
            res = await session.execute(sql, {'symbol': symbol.upper(), 'timeframe': timeframe.upper(), 'limit': limit})
        except Exception as e:
            logger.error('Predictions query failed: %s', e)
            return []
        rows = res.fetchall()
        return [dict(row) for row in rows]
