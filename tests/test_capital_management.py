from app.core.capital_management import (
    calculate_position_size,
    compute_breakeven_price,
    evaluate_trade_request,
    is_within_selected_sessions,
    is_within_session,
)


def test_calculate_position_size_uses_risk_percentage():
    volume = calculate_position_size(balance=10000, risk_percent=1.0, stop_loss_distance=100.0)

    assert volume == 1.0


def test_compute_breakeven_price_for_long_positions():
    price = compute_breakeven_price(entry_price=1.1000, stop_loss=1.0900, order_type="BUY")

    assert price == 1.1000


def test_evaluate_trade_request_blocks_excess_positions():
    assessment = evaluate_trade_request(
        balance=10000,
        equity=9500,
        requested_volume=1.0,
        active_positions=3,
        max_positions=3,
        risk_percent=1.0,
        stop_loss_distance=100.0,
    )

    assert assessment.allowed is False
    assert "تعداد پوزیشن" in assessment.reason


def test_is_within_session_detects_time_window():
    assert is_within_session("2026-07-22 09:00:00", "08:00", "17:00") is True
    assert is_within_session("2026-07-22 22:00:00", "08:00", "17:00") is False


def test_is_within_selected_sessions_uses_enabled_templates():
    assert is_within_selected_sessions("2026-07-22 14:00:00", ["new_york"]) is True
    assert is_within_selected_sessions("2026-07-22 18:00:00", ["asia"]) is False
