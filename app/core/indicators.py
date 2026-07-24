from typing import List, Dict, Any, Optional

def _to_float(x):
    try:
        return float(x)
    except Exception:
        return 0.0


def sma_list(values: List[float], period: int) -> List[float]:
    res = []
    for i in range(len(values)):
        start = max(0, i - period + 1)
        slicev = values[start:i+1]
        res.append(sum(slicev)/len(slicev) if len(slicev) else 0.0)
    return res


def ema_list(values: List[float], period: int) -> List[float]:
    res = []
    k = 2.0 / (period + 1)
    prev = None
    for v in values:
        if prev is None:
            prev = v
        else:
            prev = v * k + prev * (1 - k)
        res.append(prev)
    return res


def macd_list(closes: List[float], fast: int = 12, slow: int = 26, signal: int = 9):
    ema_fast = ema_list(closes, fast)
    ema_slow = ema_list(closes, slow)
    macd = [ (f or 0.0) - (s or 0.0) for f, s in zip(ema_fast, ema_slow) ]
    signal_line = ema_list(macd, signal)
    hist = [ (m or 0.0) - (s or 0.0) for m, s in zip(macd, signal_line) ]
    return macd, signal_line, hist, ema_fast, ema_slow


def rsi_list(closes: List[float], period: int = 14) -> List[float]:
    res = []
    for i in range(len(closes)):
        if i == 0:
            res.append(50.0)
            continue
        gains = 0.0
        losses = 0.0
        for j in range(max(1, i-period+1), i+1):
            diff = closes[j] - closes[j-1]
            if diff > 0:
                gains += diff
            else:
                losses += abs(diff)
        avgGain = gains/period
        avgLoss = losses/period
        if avgLoss == 0.0:
            res.append(100.0 if avgGain > 0 else 50.0)
        else:
            rs = avgGain/avgLoss
            val = 100.0 - (100.0 / (1.0 + rs))
            res.append(val)
    return res


def atr_list(highs: List[float], lows: List[float], closes: List[float], period: int = 14) -> List[float]:
    trs = []
    for i in range(len(closes)):
        if i == 0:
            trs.append(highs[i] - lows[i])
        else:
            tr = max(highs[i] - lows[i], abs(highs[i] - closes[i-1]), abs(lows[i] - closes[i-1]))
            trs.append(tr)
    res = []
    for i in range(len(trs)):
        start = max(0, i - period + 1)
        slicev = trs[start:i+1]
        res.append(sum(slicev)/len(slicev) if len(slicev) else 0.0)
    return res


def bollinger_list(closes: List[float], period: int = 20, std_mul: float = 2.0):
    upper = []
    lower = []
    mid = []
    stds = []
    for i in range(len(closes)):
        start = max(0, i - period + 1)
        slicev = closes[start:i+1]
        mean = sum(slicev)/len(slicev) if len(slicev) else 0.0
        var = sum((x-mean)**2 for x in slicev)/len(slicev) if len(slicev) else 0.0
        std = var**0.5
        mid.append(mean)
        stds.append(std)
        upper.append(mean + std_mul*std)
        lower.append(mean - std_mul*std)
    return upper, mid, lower, stds


def vwap_list(closes: List[float], highs: List[float], lows: List[float], volumes: List[float]):
    res = []
    cumPV = 0.0
    cumV = 0.0
    for i in range(len(closes)):
        tp = (highs[i] + lows[i] + closes[i])/3.0
        v = volumes[i] or 0.0
        cumPV += tp * v
        cumV += v
        res.append(cumPV/cumV if cumV != 0.0 else tp)
    return res


def obv_list(closes: List[float], volumes: List[float]):
    res = []
    prev = closes[0] if len(closes) else 0.0
    running = 0.0
    for i, c in enumerate(closes):
        if i == 0:
            res.append(0.0)
            prev = c
            continue
        v = volumes[i] or 0.0
        if c > prev:
            running += v
        elif c < prev:
            running -= v
        res.append(running)
        prev = c
    return res


def mfi_list(highs: List[float], lows: List[float], closes: List[float], volumes: List[float], period: int = 14):
    res = []
    for i in range(len(closes)):
        if i == 0:
            res.append(50.0)
            continue
        start = max(1, i - period + 1)
        pos = 0.0
        neg = 0.0
        for j in range(start, i+1):
            tp = (highs[j] + lows[j] + closes[j]) / 3.0
            prev_tp = (highs[j-1] + lows[j-1] + closes[j-1]) / 3.0
            mf = tp * (volumes[j] or 0.0)
            if tp > prev_tp:
                pos += mf
            else:
                neg += mf
        if neg == 0.0:
            res.append(100.0 if pos > 0 else 50.0)
        else:
            r = pos/neg
            val = 100.0 - (100.0 / (1.0 + (r if r != float('inf') else 1000.0)))
            res.append(val)
    return res


def heiken_ashi_lists(opens: List[float], highs: List[float], lows: List[float], closes: List[float]):
    ha_close = []
    ha_open = []
    for i in range(len(closes)):
        c = closes[i]
        h = highs[i]
        l = lows[i]
        o = opens[i]
        close_val = (c + h + l + o)/4.0
        ha_close.append(close_val)
        if i == 0:
            ha_open.append((o + close_val)/2.0)
        else:
            ha_open.append((ha_open[i-1] + ha_close[i-1]) / 2.0)
    return ha_close, ha_open


def linear_regression(arr: List[float], window: int):
    n = len(arr)
    window = max(1, min(window, n))
    start = max(0, n - window)
    xs = [i - start for i in range(start, n)]
    ys = arr[start:n]
    if not ys or len(xs) != len(ys):
        return None
    mean_x = sum(xs)/len(xs)
    mean_y = sum(ys)/len(ys)
    num = sum((xs[i]-mean_x)*(ys[i]-mean_y) for i in range(len(xs)))
    den = sum((xs[i]-mean_x)**2 for i in range(len(xs)))
    slope = num/den if den != 0 else 0.0
    intercept = mean_y - slope*mean_x
    # compute last value
    last_x = xs[-1]
    last_val = slope*last_x + intercept
    return {'slope': slope, 'intercept': intercept, 'last': last_val, 'start': start}


def compute_indicators(candles: List[Dict[str, Any]], options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    opts = options or {}
    closes = [ _to_float(c.get('close') or c.get('price') or 0) for c in candles ]
    opens = [ _to_float(c.get('open') or 0) for c in candles ]
    highs = [ _to_float(c.get('high') or 0) for c in candles ]
    lows = [ _to_float(c.get('low') or 0) for c in candles ]
    volumes = [ _to_float(c.get('tick_volume') or c.get('real_volume') or c.get('volume') or 0) for c in candles ]

    sma_period = int(opts.get('sma_period', 20) or 20)
    boll_period = int(opts.get('bollinger_period', 20) or 20)
    boll_std = float(opts.get('bollinger_std', 2.0) or 2.0)
    rsi_period = int(opts.get('rsi_period', 14) or 14)
    atr_period = int(opts.get('atr_period', 14) or 14)
    ma_fast = int(opts.get('ma_fast', 12) or 12)
    ma_slow = int(opts.get('ma_slow', 26) or 26)
    mfi_period = int(opts.get('mfi_period', 14) or 14)
    super_atr = int(opts.get('super_atr', 10) or 10)
    super_mult = float(opts.get('super_mult', 3.0) or 3.0)

    sma = sma_list(closes, sma_period)
    macd, macd_signal, macd_hist, ema_fast, ema_slow = macd_list(closes, ma_fast, ma_slow)
    rsi = rsi_list(closes, rsi_period)
    atr = atr_list(highs, lows, closes, atr_period)
    boll_u, boll_mid, boll_l, boll_std = bollinger_list(closes, boll_period, boll_std)
    vwap = vwap_list(closes, highs, lows, volumes)
    obv = obv_list(closes, volumes)
    mfi = mfi_list(highs, lows, closes, volumes, mfi_period)
    ha_close, ha_open = heiken_ashi_lists(opens, highs, lows, closes)
    # supertrend simplified using ATR
    super_trend = []
    final_upper = []
    final_lower = []
    prev_trend_up = True
    for i in range(len(closes)):
        hl2 = (highs[i] + lows[i]) / 2.0
        atrv = atr[i] if i < len(atr) else 0.0
        basic_upper = hl2 + super_mult * atrv
        basic_lower = hl2 - super_mult * atrv
        if i == 0:
            final_upper.append(basic_upper)
            final_lower.append(basic_lower)
            super_trend.append(True)
            continue
        fu = basic_upper if (basic_upper < final_upper[i-1] or closes[i-1] > final_upper[i-1]) else final_upper[i-1]
        fl = basic_lower if (basic_lower > final_lower[i-1] or closes[i-1] < final_lower[i-1]) else final_lower[i-1]
        final_upper.append(fu)
        final_lower.append(fl)
        trend_up = True if closes[i] > final_upper[i] else (False if closes[i] < final_lower[i] else prev_trend_up)
        super_trend.append(trend_up)
        prev_trend_up = trend_up

    # channel regressions
    high_lr = linear_regression(highs, int(opts.get('trend_window', 80) or 80))
    low_lr = linear_regression(lows, int(opts.get('trend_window', 80) or 80))
    trend = {
        'high_lr': high_lr,
        'low_lr': low_lr,
    }
    # detect break
    trend['break_above'] = False
    trend['break_below'] = False
    if high_lr and low_lr:
        last_close = closes[-1] if closes else 0.0
        trend['break_above'] = last_close > (high_lr.get('last') or 0.0)
        trend['break_below'] = last_close < (low_lr.get('last') or 0.0)

    return {
        'sma': sma,
        'macd': macd,
        'macd_signal': macd_signal,
        'macd_hist': macd_hist,
        'ema_fast': ema_fast,
        'ema_slow': ema_slow,
        'rsi': rsi,
        'atr': atr,
        'bollinger': {'upper': boll_u, 'mid': boll_mid, 'lower': boll_l, 'std': boll_std},
        'vwap': vwap,
        'obv': obv,
        'mfi': mfi,
        'ha_close': ha_close,
        'ha_open': ha_open,
        'supertrend': super_trend,
        'trend': trend,
    }
