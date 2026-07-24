from unittest.mock import Mock

from app.core.mt5_service import MT5Service


def test_cancel_order_attempts_removal_by_ticket_even_when_orders_list_is_stale(monkeypatch):
    service = MT5Service()
    service.connected = True

    fake_mt5 = Mock()
    fake_mt5.TRADE_ACTION_REMOVE = 10008
    fake_mt5.TRADE_RETCODE_DONE = 10009
    fake_mt5.orders_get.return_value = []
    fake_mt5.order_send.return_value = Mock(retcode=10009, comment='Done')

    monkeypatch.setattr('app.core.mt5_service._get_mt5', lambda: fake_mt5)

    result = service.cancel_order(12345)

    assert result['success'] is True
    fake_mt5.order_send.assert_called_once_with({
        'action': fake_mt5.TRADE_ACTION_REMOVE,
        'order': 12345,
        'comment': 'Cancelled via API',
    })
