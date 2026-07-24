from app.core.mt5_service import normalize_symbol, get_symbol_candidates


def test_normalize_symbol_for_litefinance_suffix():
    assert normalize_symbol('XAUUSD_L') == 'XAUUSD_l'
    assert normalize_symbol('EURUSD_L') == 'EURUSD_l'


def test_symbol_candidates_include_mt5_litefinance_variants():
    candidates = get_symbol_candidates('XAUUSD_L')
    assert candidates[0] == 'XAUUSD_l'
    assert 'XAUUSD_L' in candidates
    assert 'XAUUSD' in candidates
    assert 'XAUUSD.l' in candidates
