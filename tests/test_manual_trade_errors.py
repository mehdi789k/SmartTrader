from app.core.mt5_service import format_manual_trade_error


def test_format_manual_trade_error_for_missing_symbol_tick():
    message = format_manual_trade_error("Symbol tick not available", symbol="EURUSD")

    assert "EURUSD" in message
    assert "قیمت لحظه‌ای" in message
    assert "نماد" in message
