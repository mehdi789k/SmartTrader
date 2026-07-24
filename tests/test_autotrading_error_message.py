from app.core.mt5_service import format_manual_trade_error


def test_autotrading_error_message_guides_user_to_enable_auto_trading():
    message = format_manual_trade_error('Order cancellation failed. Retcode: 10027 | AutoTrading disabled by client')

    assert 'AutoTrading' in message
    assert 'Allow automated trading' in message
    assert 'Tools > Options > AutoTrading' in message
