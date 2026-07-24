from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock

from app.core.mt5_service import MT5Service


def test_get_symbol_full_data_collects_tick_and_history(monkeypatch):
    service = MT5Service()
    service.connected = True

    fake_mt5 = Mock()
    fake_mt5.symbol_select.return_value = True
    fake_mt5.symbol_info.return_value = SimpleNamespace(name='EURUSD_l', digits=5, spread=1, point=0.00001, trade_mode=0)
    fake_mt5.symbol_info_tick.return_value = SimpleNamespace(bid=1.1002, ask=1.1003, time=1710000000)
    fake_mt5.positions_get.return_value = [SimpleNamespace(ticket=101, symbol='EURUSD_l', type=0, volume=0.01, price_open=1.1, price_current=1.1002, profit=1.2)]
    fake_mt5.orders_get.return_value = [SimpleNamespace(ticket=202, symbol='EURUSD_l', type=0, volume_initial=0.01, volume_current=0.01, price_open=1.1, price_current=1.1002, time_setup=1710000000)]
    fake_mt5.history_deals_get.return_value = [SimpleNamespace(ticket=303, symbol='EURUSD_l', type=0, volume=0.1, price=1.1002, profit=1.5, commission=0.0, time=1710000000)]

    monkeypatch.setattr('app.core.mt5_service._get_mt5', lambda: fake_mt5)

    data = service.get_symbol_full_data('EURUSD')

    assert data['requested_symbol'] == 'EURUSD'
    assert data['resolved_symbol'] == 'EURUSD_l'
    assert data['tick']['bid'] == 1.1002
    assert data['positions'][0]['ticket'] == 101
    assert data['trade_history'][0]['ticket'] == 303


def test_save_symbol_data_writes_json_file(monkeypatch, tmp_path):
    service = MT5Service()
    service.connected = True

    monkeypatch.setattr(
        service,
        'get_symbol_full_data',
        lambda symbol: {
            'requested_symbol': symbol,
            'resolved_symbol': 'EURUSD_l',
            'tick': {'bid': 1.1002, 'ask': 1.1003},
            'positions': [],
            'orders': [],
            'trade_history': [],
        },
    )

    output_path = tmp_path / 'eurusd.json'
    result = service.save_symbol_data('EURUSD', output_path=str(output_path))

    assert result['success'] is True
    assert output_path.exists()
    payload = output_path.read_text(encoding='utf-8')
    assert 'EURUSD_l' in payload


def test_get_symbol_timeframe_data_returns_candles(monkeypatch):
    service = MT5Service()
    service.connected = True

    fake_mt5 = Mock()
    fake_mt5.symbol_select.return_value = True
    fake_mt5.symbol_info.return_value = SimpleNamespace(name='EURUSD_l')
    fake_mt5.copy_rates_from_pos.return_value = [
        SimpleNamespace(time=1710000000, open=1.10, high=1.11, low=1.09, close=1.10, tick_volume=1000),
        SimpleNamespace(time=1710003600, open=1.10, high=1.12, low=1.10, close=1.11, tick_volume=1200),
    ]

    monkeypatch.setattr('app.core.mt5_service._get_mt5', lambda: fake_mt5)

    data = service.get_symbol_timeframe_data('EURUSD', timeframe='M15', count=2)

    assert data['requested_symbol'] == 'EURUSD'
    assert data['resolved_symbol'] == 'EURUSD_l'
    assert data['timeframe'] == 'M15'
    assert len(data['candles']) == 2
    assert data['candles'][0]['close'] == 1.10


def test_save_symbol_timeframe_data_writes_json_file(monkeypatch, tmp_path):
    service = MT5Service()
    service.connected = True

    monkeypatch.setattr(
        service,
        'get_symbol_timeframe_data',
        lambda symbol, timeframe='M1', count=100: {
            'requested_symbol': symbol,
            'resolved_symbol': 'EURUSD_l',
            'timeframe': timeframe,
            'candles': [{'time': 1710000000, 'close': 1.10}],
        },
    )

    output_path = tmp_path / 'eurusd_timeframe.json'
    result = service.save_symbol_timeframe_data('EURUSD', timeframe='M15', output_path=str(output_path))

    assert result['success'] is True
    assert output_path.exists()
    payload = output_path.read_text(encoding='utf-8')
    assert 'EURUSD_l' in payload
