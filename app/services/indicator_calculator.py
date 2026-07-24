"""
سرویس محاسبه اندیکاتورها و ذخیره در دیتابیس
"""
from typing import List, Dict, Any, Optional
import numpy as np
import logging
from datetime import datetime
from ..core.database import AsyncSessionLocal
from ..db import models as db_models

logger = logging.getLogger(__name__)


def _safe_values(data: List[Dict[str, Any]], key: str) -> List[float]:
    vals = []
    for item in data:
        v = item.get(key)
        try:
            vals.append(float(v) if v is not None else np.nan)
        except Exception:
            vals.append(np.nan)
    return vals


def calculate_moving_average(series: List[float], period: int) -> List[Optional[float]]:
    arr = np.array(series, dtype=float)
    if len(arr) < period:
        return [None] * len(arr)
    ma = np.convolve(np.nan_to_num(arr, nan=0.0), np.ones(period) / period, mode='valid')
    pad = [None] * (period - 1)
    return pad + [float(x) for x in ma.tolist()]


def calculate_moving_averages(data: List[Dict[str, Any]], periods: List[int] = [50, 100, 200]) -> Dict[str, List[Optional[float]]]:
    closes = _safe_values(data, 'close')
    output: Dict[str, List[Optional[float]]] = {}
    for period in periods:
        output[f'ma_{period}'] = calculate_moving_average(closes, period)
    return output


def calculate_rsi(data: List[Dict[str, Any]], period: int = 14) -> List[Optional[float]]:
    closes = _safe_values(data, 'close')
    deltas = np.diff(closes)
    seed = deltas[:period]
    up = seed[seed >= 0].sum() / period
    down = -seed[seed < 0].sum() / period
    rs = up / down if down != 0 else np.inf
    rsi = [float('nan')] * (period)
    rsi.append(100. - 100. / (1. + rs))

    for i in range(period + 1, len(closes)):
        delta = deltas[i - 1]
        upval = max(delta, 0)
        downval = -min(delta, 0)
        up = (up * (period - 1) + upval) / period
        down = (down * (period - 1) + downval) / period
        rs = up / down if down != 0 else np.inf
        rsi.append(100. - 100. / (1. + rs))
    return [float(x) if x is not None and not np.isnan(x) else None for x in rsi]


def calculate_macd(data: List[Dict[str, Any]], fast: int = 12, slow: int = 26, signal: int = 9) -> Dict[str, List[float]]:
    closes = np.array(_safe_values(data, 'close'))
    def ema(arr, period):
        alpha = 2/(period+1)
        out = []
        prev = arr[:period].mean()
        out.extend([prev]*(period))
        for v in arr[period:]:
            prev = (v - prev) * alpha + prev
            out.append(prev)
        return out
    fast_ema = ema(closes, fast)
    slow_ema = ema(closes, slow)
    macd_line = [f - s for f, s in zip(fast_ema[-len(slow_ema):], slow_ema)] if len(fast_ema) >= len(slow_ema) else []
    signal_line = []
    hist = []
    if macd_line:
        sig = ema(np.array(macd_line), signal)
        signal_line = sig
        hist = [m - s for m, s in zip(macd_line[-len(sig):], sig)]
    # normalize lengths by padding
    maxlen = len(closes)
    def pad(lst):
        return [None] * (maxlen - len(lst)) + lst
    return {
        'macd': pad(macd_line),
        'signal': pad(signal_line),
        'hist': pad(hist),
    }


def calculate_bollinger_bands(data: List[Dict[str, Any]], period: int = 20, mult: float = 2.0) -> Dict[str, List[float]]:
    closes = np.array(_safe_values(data, 'close'))
    ma = np.convolve(np.nan_to_num(closes, nan=0.0), np.ones(period)/period, mode='valid')
    pad = [None] * (period - 1)
    bands_mid = pad + ma.tolist()
    stds = []
    for i in range(period - 1, len(closes)):
        window = closes[i-(period-1):i+1]
        stds.append(float(np.nanstd(window)))
    bands_upper = pad + (ma + mult * np.array(stds)).tolist()
    bands_lower = pad + (ma - mult * np.array(stds)).tolist()
    return {'upper': bands_upper, 'mid': bands_mid, 'lower': bands_lower}


def calculate_atr(data: List[Dict[str, Any]], period: int = 14) -> List[float]:
    highs = np.array(_safe_values(data, 'high'))
    lows = np.array(_safe_values(data, 'low'))
    closes = np.array(_safe_values(data, 'close'))
    trs = []
    for i in range(1, len(closes)):
        tr = max(highs[i] - lows[i], abs(highs[i] - closes[i-1]), abs(lows[i] - closes[i-1]))
        trs.append(tr)
    atr = [None] * len(closes)
    if len(trs) >= period:
        atr_val = np.mean(trs[:period])
        atr[period] = atr_val
        for i in range(period+1, len(closes)):
            atr_val = (atr_val * (period - 1) + trs[i-1]) / period
            atr[i] = atr_val
    return atr


async def save_indicators_with_weights(
    symbol: str,
    timeframe: str,
    timestamps: List[Optional[datetime]],
    indicators: Dict[str, List[Optional[float]]],
    weights: Dict[str, float] | None = None,
    session_name: str | None = None,
    news_impact: float | None = None,
) -> int:
    """ذخیره‌ی مقادیر اندیکاتورها به همراه وزن‌ها در جدول `indicators_data`"""
    weights = weights or {}
    length = len(timestamps)
    if length == 0:
        return 0

    async with AsyncSessionLocal() as session:
        inserted = 0
        for idx in range(length):
            timestamp = timestamps[idx]
            for name, series in indicators.items():
                val = None
                if idx < len(series):
                    try:
                        val = float(series[idx]) if series[idx] is not None else None
                    except Exception:
                        val = None
                weight = float(weights.get(name, 1.0))
                obj = db_models.IndicatorsData(
                    time=timestamp,
                    symbol=symbol.upper(),
                    timeframe=timeframe.upper(),
                    indicator_name=name,
                    indicator_value=val,
                    weight=weight,
                    session=session_name,
                    news_impact=news_impact,
                )
                session.add(obj)
                inserted += 1
        try:
            await session.commit()
        except Exception as e:
            await session.rollback()
            logger.error('Failed to commit indicators: %s', e)
            return 0

    return inserted
