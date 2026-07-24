from types import SimpleNamespace
from unittest.mock import Mock

from app.core.mt5_service import MT5Service


def test_get_symbol_timeframe_data_retries_symbol_variants(monkeypatch):
    service = MT5Service()
    service.connected = True

    fake_mt5 = Mock()
    fake_mt5.symbol_select.side_effect = [True, True]
    fake_mt5.symbol_info.side_effect = [SimpleNamespace(name='XAUUSD'), SimpleNamespace(name='XAUUSD_l')]
    fake_mt5.copy_rates_from_pos.side_effect = [[], [SimpleNamespace(time=1710000000, open=1.0, high=2.0, low=0.5, close=1.5, tick_volume=10, real_volume=0)]]
    fake_mt5.TIMEFRAME_M1 = 1

    monkeypatch.setattr('app.core.mt5_service._get_mt5', lambda: fake_mt5)

    data = service.get_symbol_timeframe_data('xauusd', timeframe='M1', count=1)

    assert data['requested_symbol'] == 'xauusd'
    assert data['resolved_symbol'] == 'XAUUSD_l'
    assert len(data['candles']) == 1
    assert data['candles'][0]['close'] == 1.5
