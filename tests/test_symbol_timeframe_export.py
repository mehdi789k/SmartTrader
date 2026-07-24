import asyncio
import json

from app.api import routes


def test_export_symbol_timeframes_data_saves_each_selected_timeframe(monkeypatch, tmp_path):
    monkeypatch.chdir(tmp_path)
    monkeypatch.setattr(routes.mt5_service, 'is_connected', lambda: True)

    response = asyncio.run(routes.export_symbol_timeframes_data(
        'EURUSD',
        {
            'records': [
                {'timeframe': 'M1', 'payload': {'requested_symbol': 'EURUSD', 'candles': [{'close': 1.1}] }},
                {'timeframe': 'M5', 'payload': {'requested_symbol': 'EURUSD', 'candles': [{'close': 1.2}] }},
            ]
        },
    ))

    assert response['success'] is True
    saved_files = response['data']['saved_files']
    assert [item['timeframe'] for item in saved_files] == ['M1', 'M5']

    export_dir = tmp_path / 'logs' / 'symbol_exports'
    assert (export_dir / 'EURUSD_M1.json').exists()
    assert (export_dir / 'EURUSD_M5.json').exists()

    content_m1 = json.loads((export_dir / 'EURUSD_M1.json').read_text(encoding='utf-8'))
    content_m5 = json.loads((export_dir / 'EURUSD_M5.json').read_text(encoding='utf-8'))
    assert content_m1['candles'][0]['close'] == 1.1
    assert content_m5['candles'][0]['close'] == 1.2
