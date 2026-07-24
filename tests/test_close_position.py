import asyncio
from types import SimpleNamespace
from unittest.mock import Mock

from app.api.routes import close_position_endpoint, open_position_endpoint, get_status
from app.core.mt5_service import MT5Service


def test_discover_mt5_terminal_candidates_finds_program_files_install(monkeypatch, tmp_path):
    service = MT5Service()
    terminal_dir = tmp_path / "Program Files" / "MetaTrader 5"
    terminal_dir.mkdir(parents=True)
    terminal_path = terminal_dir / "terminal64.exe"
    terminal_path.touch()

    monkeypatch.setenv("ProgramFiles", str(tmp_path / "Program Files"))
    monkeypatch.setenv("ProgramFiles(x86)", str(tmp_path / "Program Files (x86)"))
    monkeypatch.setattr("app.core.mt5_service.settings.MT5_PATH", "")

    discovered = service._find_mt5_terminal_candidates()

    assert str(terminal_path) in discovered


def test_status_route_returns_disconnected_state_without_error(monkeypatch):
    import app.core.mt5_service as mt5_service_module

    monkeypatch.setattr(mt5_service_module.mt5_service, 'connected', False)
    monkeypatch.setattr(mt5_service_module.mt5_service, 'account_login', None, raising=False)
    monkeypatch.setattr(mt5_service_module.mt5_service, 'server', None, raising=False)

    result = asyncio.run(get_status({'sub': 'demo'}))

    assert result['success'] is True
    assert result['connected'] is False
    assert result['account'] is None
    assert result['server'] is None


def test_close_position_returns_ascii_safe_error_message(monkeypatch):
    service = MT5Service()
    service.connected = True

    fake_mt5 = Mock()
    fake_mt5.positions_get.return_value = [
        SimpleNamespace(ticket=123, symbol='EURUSD', volume=0.01, type=0)
    ]
    fake_mt5.symbol_info_tick.return_value = SimpleNamespace(bid=1.1000, ask=1.1001)
    fake_mt5.ORDER_TYPE_SELL = 1
    fake_mt5.ORDER_TYPE_BUY = 2
    fake_mt5.TRADE_ACTION_DEAL = 1
    fake_mt5.TRADE_RETCODE_DONE = 10009
    fake_mt5.order_send.return_value = SimpleNamespace(retcode=10027, comment='AutoTrading disabled by client')

    monkeypatch.setattr('app.core.mt5_service._get_mt5', lambda: fake_mt5)

    result = service.close_position(123)

    assert result['success'] is False
    assert result['retcode'] == 10027
    assert result['comment'] == 'AutoTrading disabled by client'
    assert 'AutoTrading disabled by client' in result['message']
    assert all(ord(ch) < 128 for ch in result['message'])


def test_close_position_includes_mt5_comment_for_auto_trading_disabled(monkeypatch):
    service = MT5Service()
    service.connected = True

    fake_mt5 = Mock()
    fake_mt5.positions_get.return_value = [
        SimpleNamespace(ticket=123, symbol='EURUSD', volume=0.01, type=0)
    ]
    fake_mt5.symbol_info_tick.return_value = SimpleNamespace(bid=1.1000, ask=1.1001)
    fake_mt5.ORDER_TYPE_SELL = 1
    fake_mt5.ORDER_TYPE_BUY = 2
    fake_mt5.TRADE_ACTION_DEAL = 1
    fake_mt5.TRADE_RETCODE_DONE = 10009
    fake_mt5.order_send.return_value = SimpleNamespace(retcode=10027, comment='AutoTrading disabled by client')

    monkeypatch.setattr('app.core.mt5_service._get_mt5', lambda: fake_mt5)

    result = service.close_position(123)

    assert result['success'] is False
    assert result['retcode'] == 10027
    assert result['comment'] == 'AutoTrading disabled by client'
    assert 'AutoTrading disabled' in result['message']


def test_close_position_guides_user_when_autotrading_is_disabled(monkeypatch):
    service = MT5Service()
    service.connected = True

    fake_mt5 = Mock()
    fake_mt5.positions_get.return_value = [
        SimpleNamespace(ticket=123, symbol='EURUSD', volume=0.01, type=0)
    ]
    fake_mt5.symbol_info_tick.return_value = SimpleNamespace(bid=1.1000, ask=1.1001)
    fake_mt5.ORDER_TYPE_SELL = 1
    fake_mt5.ORDER_TYPE_BUY = 2
    fake_mt5.TRADE_ACTION_DEAL = 1
    fake_mt5.TRADE_RETCODE_DONE = 10009
    fake_mt5.order_send.return_value = SimpleNamespace(retcode=10027, comment='AutoTrading disabled by client')

    monkeypatch.setattr('app.core.mt5_service._get_mt5', lambda: fake_mt5)

    result = service.close_position(123)

    assert result['success'] is False
    assert 'enable autotrading' in result['message'].lower()
    assert 'metatrader 5' in result['message'].lower()


def test_open_position_endpoint_returns_payload_for_open_trade(monkeypatch):
    import app.core.mt5_service as mt5_service_module

    monkeypatch.setattr(mt5_service_module.mt5_service, 'connected', True)
    monkeypatch.setattr(
        mt5_service_module.mt5_service,
        'open_position',
        lambda symbol, volume, order_type, price=None, sl=None, tp=None, deviation=10: {
            'success': True,
            'ticket': 123,
            'message': 'Opened',
        },
    )

    result = asyncio.run(open_position_endpoint({'symbol': 'EURUSD', 'volume': 0.01, 'type': 'BUY'}, {'sub': 'demo'}))

    assert result['success'] is True
    assert result['ticket'] == 123


def test_open_position_resolves_symbol_and_sends_order(monkeypatch):
    service = MT5Service()
    service.connected = True

    fake_mt5 = Mock()
    fake_mt5.ORDER_TYPE_BUY = 0
    fake_mt5.ORDER_TYPE_SELL = 1
    fake_mt5.TRADE_ACTION_DEAL = 1
    fake_mt5.TRADE_RETCODE_DONE = 10009
    fake_mt5.symbol_info.side_effect = lambda symbol: SimpleNamespace(name=symbol) if symbol in {'XRPUSD_l', 'XRPUSD_L'} else None
    fake_mt5.symbol_select.side_effect = lambda symbol, visible=True: symbol in {'XRPUSD_l', 'XRPUSD_L'}
    def tick_side_effect(symbol):
        if symbol == 'XRPUSD_l':
            return SimpleNamespace(bid=1.11538, ask=1.11761, time=1690)
        if symbol == 'XRPUSD_L':
            return SimpleNamespace(bid=1.11520, ask=1.11740, time=1690)
        return None
    fake_mt5.symbol_info_tick.side_effect = tick_side_effect
    fake_mt5.order_send.return_value = SimpleNamespace(retcode=10009, order=123456, comment='Done')

    monkeypatch.setattr('app.core.mt5_service._get_mt5', lambda: fake_mt5)

    result = service.open_position('XRPUSD_l', 0.01, 'BUY')

    assert result['success'] is True
    assert result['ticket'] == 123456
    assert fake_mt5.symbol_select.called
    assert fake_mt5.order_send.called
    assert fake_mt5.symbol_info_tick.call_args_list[0][0][0] in {'XRPUSD_l', 'XRPUSD_L'}


def test_resolve_symbol_prefers_lowercase_l_variant(monkeypatch):
    service = MT5Service()
    fake_mt5 = Mock()
    fake_mt5.symbol_select.side_effect = lambda symbol, visible=True: symbol == 'XRPUSD_l'
    fake_mt5.symbol_info.side_effect = lambda symbol: SimpleNamespace(name=symbol) if symbol in {'XRPUSD_l', 'XRPUSD_L'} else None
    fake_mt5.symbol_info_tick.side_effect = lambda symbol: SimpleNamespace(bid=1.11538, ask=1.11761, time=1690) if symbol == 'XRPUSD_l' else None
    monkeypatch.setattr('app.core.mt5_service._get_mt5', lambda: fake_mt5)

    resolved = service._resolve_symbol('XRPUSD_L')

    assert resolved == 'XRPUSD_l'
    assert fake_mt5.symbol_select.call_args_list[0][0][0] == 'XRPUSD_l'


def test_close_position_endpoint_returns_payload_for_failed_trade(monkeypatch):
    import app.core.mt5_service as mt5_service_module

    monkeypatch.setattr(mt5_service_module.mt5_service, 'connected', True)
    monkeypatch.setattr(
        mt5_service_module.mt5_service,
        'close_position',
        lambda ticket: {
            'success': False,
            'message': 'Close request failed. Retcode: 10027 | AutoTrading disabled by client',
        },
    )

    result = asyncio.run(close_position_endpoint({'ticket': 123}, {'sub': 'demo'}))

    assert result['success'] is False
    assert 'AutoTrading disabled' in result['message']
