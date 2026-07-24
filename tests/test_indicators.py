"""Unit tests for indicator computations (app/core/indicators.py)"""
import pytest
from app.core.indicators import (
    sma_list, ema_list, macd_list, rsi_list, atr_list, bollinger_list,
    vwap_list, obv_list, mfi_list, heiken_ashi_lists, linear_regression,
    compute_indicators
)


class TestSMAList:
    def test_sma_basic(self):
        """SMA with period 3 on simple values [1, 2, 3, 4, 5]"""
        values = [1.0, 2.0, 3.0, 4.0, 5.0]
        result = sma_list(values, 3)
        assert len(result) == 5
        # First SMA: 1
        # Second SMA: (1+2)/2 = 1.5
        # Third SMA: (1+2+3)/3 = 2
        # Fourth SMA: (2+3+4)/3 = 3
        # Fifth SMA: (3+4+5)/3 = 4
        assert result[0] == 1.0
        assert result[1] == 1.5
        assert result[2] == 2.0
        assert result[3] == 3.0
        assert result[4] == 4.0

    def test_sma_empty(self):
        """SMA on empty list should return empty"""
        result = sma_list([], 5)
        assert result == []

    def test_sma_single_value(self):
        """SMA on single value"""
        result = sma_list([10.0], 5)
        assert result == [10.0]


class TestEMAList:
    def test_ema_basic(self):
        """EMA smoothing on simple sequence"""
        values = [10.0, 11.0, 12.0, 11.0, 10.0]
        result = ema_list(values, 2)
        assert len(result) == 5
        # EMA with period 2 uses k = 2/(2+1) = 2/3
        # First EMA is just the first value: 10
        assert result[0] == 10.0
        # Should have progressive smoothing
        assert result[1] > result[0]
        assert result[-1] > 0


class TestRSIList:
    def test_rsi_neutral_market(self):
        """RSI on equal ups and downs should be around 50"""
        values = [10.0, 11.0, 10.0, 11.0, 10.0, 11.0, 10.0]
        result = rsi_list(values, 6)
        assert len(result) == 7
        # First value should be 50 (neutral)
        assert result[0] == 50.0

    def test_rsi_uptrend(self):
        """RSI on strong uptrend should be high"""
        values = [10.0 + i for i in range(10)]  # 10, 11, 12, ..., 19
        result = rsi_list(values, 5)
        assert result[-1] > 70  # Strong uptrend

    def test_rsi_downtrend(self):
        """RSI on strong downtrend should be low"""
        values = [20.0 - i for i in range(10)]  # 20, 19, 18, ..., 11
        result = rsi_list(values, 5)
        assert result[-1] < 30  # Strong downtrend


class TestATRList:
    def test_atr_basic(self):
        """ATR computation on simple candles"""
        highs = [102.0, 104.0, 103.0, 105.0, 106.0]
        lows = [100.0, 101.0, 101.0, 102.0, 103.0]
        closes = [101.0, 103.0, 102.0, 104.0, 105.0]
        result = atr_list(highs, lows, closes, 2)
        assert len(result) == 5
        # All values should be positive
        assert all(v > 0 for v in result)

    def test_atr_empty(self):
        """ATR on empty lists"""
        result = atr_list([], [], [], 14)
        assert result == []


class TestBollingerList:
    def test_bollinger_basic(self):
        """Bollinger bands with period 2 and std 2"""
        values = [10.0, 12.0, 11.0, 13.0, 12.0]
        upper, mid, lower, stds = bollinger_list(values, 2, 2.0)
        assert len(upper) == len(values)
        assert len(mid) == len(values)
        assert len(lower) == len(values)
        assert len(stds) == len(values)
        # Upper should be > mid > lower
        for u, m, l in zip(upper, mid, lower):
            assert u >= m >= l

    def test_bollinger_std_values(self):
        """Bollinger bands with different std multipliers"""
        values = [100.0] * 5  # Flat market
        upper, mid, lower, stds = bollinger_list(values, 3, 1.0)
        # On flat market, std should be 0 and bands should be at the mean
        assert all(s == 0.0 for s in stds)
        assert all(u == 100.0 for u in upper)
        assert all(m == 100.0 for m in mid)
        assert all(l == 100.0 for l in lower)


class TestVWAPList:
    def test_vwap_basic(self):
        """VWAP on simple candles"""
        closes = [100.0, 101.0, 102.0]
        highs = [101.0, 102.0, 103.0]
        lows = [99.0, 100.0, 101.0]
        volumes = [1000.0, 1000.0, 1000.0]
        result = vwap_list(closes, highs, lows, volumes)
        assert len(result) == 3
        # VWAP should be between high and low
        for i, v in enumerate(result):
            assert lows[i] <= v <= highs[i]

    def test_vwap_zero_volume(self):
        """VWAP with zero volume should fall back to price"""
        closes = [100.0, 101.0, 102.0]
        highs = [101.0, 102.0, 103.0]
        lows = [99.0, 100.0, 101.0]
        volumes = [0.0, 0.0, 0.0]
        result = vwap_list(closes, highs, lows, volumes)
        assert len(result) == 3
        # Should be around the typical price (h+l+c)/3
        for i in range(len(result)):
            tp = (highs[i] + lows[i] + closes[i]) / 3.0
            assert abs(result[i] - tp) < 0.01


class TestOBVList:
    def test_obv_uptrend(self):
        """OBV should accumulate on up closes"""
        closes = [100.0, 101.0, 102.0, 103.0]
        volumes = [1000.0, 1000.0, 1000.0, 1000.0]
        result = obv_list(closes, volumes)
        assert len(result) == 4
        assert result[0] == 0.0  # First is 0
        # OBV should increase (up closes with positive volume)
        assert result[-1] > 0

    def test_obv_downtrend(self):
        """OBV should decrease on down closes"""
        closes = [103.0, 102.0, 101.0, 100.0]
        volumes = [1000.0, 1000.0, 1000.0, 1000.0]
        result = obv_list(closes, volumes)
        assert len(result) == 4
        # OBV should decrease (down closes with positive volume)
        assert result[-1] < 0


class TestMFIList:
    def test_mfi_basic(self):
        """MFI computation on sample data"""
        highs = [102.0, 104.0, 103.0, 105.0]
        lows = [100.0, 101.0, 101.0, 102.0]
        closes = [101.0, 103.0, 102.0, 104.0]
        volumes = [1000.0, 1200.0, 1100.0, 1300.0]
        result = mfi_list(highs, lows, closes, volumes, 3)
        assert len(result) == 4
        # First MFI should be neutral
        assert result[0] == 50.0
        # All should be between 0-100
        assert all(0 <= v <= 100 for v in result)


class TestHeikenAshi:
    def test_heiken_ashi_basic(self):
        """Heiken-Ashi candle computation"""
        opens = [100.0, 101.0, 102.0]
        highs = [102.0, 103.0, 104.0]
        lows = [99.0, 100.0, 101.0]
        closes = [101.0, 102.0, 103.0]
        ha_close, ha_open = heiken_ashi_lists(opens, highs, lows, closes)
        assert len(ha_close) == 3
        assert len(ha_open) == 3
        # HA close = (open + high + low + close) / 4
        expected_ha_close_0 = (100 + 102 + 99 + 101) / 4.0
        assert ha_close[0] == expected_ha_close_0


class TestLinearRegression:
    def test_linear_regression_basic(self):
        """Linear regression on uptrend"""
        arr = [1.0, 2.0, 3.0, 4.0, 5.0]
        result = linear_regression(arr, 3)
        assert result is not None
        # Slope should be positive (uptrend)
        assert result['slope'] > 0
        assert 'last' in result
        assert 'intercept' in result

    def test_linear_regression_empty(self):
        """Linear regression on empty array"""
        result = linear_regression([], 5)
        assert result is None

    def test_linear_regression_flat(self):
        """Linear regression on flat line"""
        arr = [10.0, 10.0, 10.0, 10.0]
        result = linear_regression(arr, 3)
        assert result is not None
        # Slope should be ~0 on flat line
        assert abs(result['slope']) < 0.01


class TestComputeIndicators:
    def test_compute_indicators_basic(self):
        """Full indicator computation"""
        candles = [
            {'open': 100.0, 'high': 102.0, 'low': 99.0, 'close': 101.0, 'tick_volume': 1000},
            {'open': 101.0, 'high': 104.0, 'low': 100.0, 'close': 103.0, 'tick_volume': 1200},
            {'open': 103.0, 'high': 105.0, 'low': 102.0, 'close': 104.0, 'tick_volume': 1100},
            {'open': 104.0, 'high': 106.0, 'low': 103.0, 'close': 105.0, 'tick_volume': 1300},
            {'open': 105.0, 'high': 107.0, 'low': 104.0, 'close': 106.0, 'tick_volume': 1400},
        ]
        options = {
            'sma_period': 3,
            'rsi_period': 5,
            'atr_period': 3,
            'mfi_period': 3,
        }
        result = compute_indicators(candles, options)
        
        # Check all expected keys are present
        assert 'sma' in result
        assert 'rsi' in result
        assert 'atr' in result
        assert 'macd' in result
        assert 'macd_signal' in result
        assert 'macd_hist' in result
        assert 'bollinger' in result
        assert 'vwap' in result
        assert 'obv' in result
        assert 'mfi' in result
        assert 'ha_close' in result
        assert 'ha_open' in result
        assert 'supertrend' in result
        assert 'trend' in result
        
        # All indicator arrays should have same length as candles
        assert len(result['sma']) == len(candles)
        assert len(result['rsi']) == len(candles)
        assert len(result['atr']) == len(candles)
        assert len(result['mfi']) == len(candles)
        
        # Bollinger should have nested arrays
        assert isinstance(result['bollinger'], dict)
        assert len(result['bollinger']['upper']) == len(candles)
        assert len(result['bollinger']['mid']) == len(candles)
        assert len(result['bollinger']['lower']) == len(candles)

    def test_compute_indicators_empty(self):
        """Compute indicators on empty candles list"""
        result = compute_indicators([], {})
        assert 'sma' in result
        assert result['sma'] == []
        assert result['rsi'] == []

    def test_compute_indicators_missing_fields(self):
        """Handle candles with missing OHLC fields gracefully"""
        candles = [
            {'close': 100.0},  # Missing open, high, low
            {'close': 101.0},
            {'close': 102.0},
        ]
        result = compute_indicators(candles, {'sma_period': 2})
        assert len(result['sma']) == 3
        # Should still compute (with defaults)
        assert all(v is not None for v in result['sma'])


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
