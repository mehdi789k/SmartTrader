from types import SimpleNamespace
from unittest.mock import Mock

from app.core.mt5_service import MT5Service


def test_get_trade_history_returns_formatted_deals(monkeypatch):
    service = MT5Service()
    service.connected = True

    fake_mt5 = Mock()
    fake_deals = [
        SimpleNamespace(
            ticket=1001,
            symbol='EURUSD',
            type=0,
            volume=0.1,
            price=1.1002,
            profit=12.3,
            commission=0.0,
            time=1710000000,
        )
    ]
    fake_mt5.history_deals_get.return_value = fake_deals
    monkeypatch.setattr('app.core.mt5_service._get_mt5', lambda: fake_mt5)

    deals = service.get_trade_history(limit=10)

    assert len(deals) == 1
    assert deals[0]['symbol'] == 'EURUSD'
    assert deals[0]['type'] == 'BUY'
    assert deals[0]['profit'] == 12.3
    assert deals[0]['price'] == 1.1002


def test_get_trade_history_filters_by_symbol(monkeypatch):
    service = MT5Service()
    service.connected = True

    fake_mt5 = Mock()
    fake_deals = [
        SimpleNamespace(ticket=1001, symbol='EURUSD', type=0, volume=0.1, price=1.10, profit=1.0, commission=0.0, time=1710000000),
        SimpleNamespace(ticket=1002, symbol='GBPUSD', type=1, volume=0.2, price=1.30, profit=-1.0, commission=0.0, time=1710000100),
    ]
    fake_mt5.history_deals_get.return_value = fake_deals
    monkeypatch.setattr('app.core.mt5_service._get_mt5', lambda: fake_mt5)

    deals = service.get_trade_history(symbol='eurusd', limit=10)

    assert len(deals) == 1
    assert deals[0]['symbol'] == 'EURUSD'
    assert deals[0]['profit'] == 1.0


def test_get_trade_history_matches_broker_suffix_symbol(monkeypatch):
    service = MT5Service()
    service.connected = True

    fake_mt5 = Mock()
    fake_deals = [
        SimpleNamespace(ticket=1001, symbol='EURUSD_l', type=0, volume=0.1, price=1.10, profit=1.0, commission=0.0, time=1710000000),
    ]
    fake_mt5.history_deals_get.return_value = fake_deals
    monkeypatch.setattr('app.core.mt5_service._get_mt5', lambda: fake_mt5)

    deals = service.get_trade_history(symbol='eurusd', limit=10)

    assert len(deals) == 1
    assert deals[0]['symbol'] == 'EURUSD_l'


def test_get_trade_history_returns_close_time_and_sorts(monkeypatch):
    service = MT5Service()
    service.connected = True

    fake_mt5 = Mock()
    fake_mt5.DEAL_ENTRY_OUT = 1
    fake_deals = [
        SimpleNamespace(ticket=1001, symbol='EURUSD', type=0, volume=0.1, price=1.10, profit=1.0, commission=0.0, time=1710000000, entry=1),
        SimpleNamespace(ticket=1002, symbol='EURUSD', type=1, volume=0.1, price=1.11, profit=-0.5, commission=0.0, time=1710001000, entry=1),
        SimpleNamespace(ticket=1003, symbol='EURUSD', type=0, volume=0.1, price=1.09, profit=2.0, commission=0.0, time=1710000500, entry=0),
    ]
    fake_mt5.history_deals_get.return_value = fake_deals
    monkeypatch.setattr('app.core.mt5_service._get_mt5', lambda: fake_mt5)

    deals = service.get_trade_history(symbol='eurusd', limit=10)

    assert len(deals) == 2
    assert deals[0]['ticket'] == 1002
    assert deals[1]['ticket'] == 1001
    assert deals[0]['close_time'] >= deals[1]['close_time']
