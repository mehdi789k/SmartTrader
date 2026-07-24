from fastapi.testclient import TestClient

from app.main import app


def test_user_settings_crud_flow():
    client = TestClient(app)

    payload = {
        'riskPercent': 3,
        'defaultLot': 0.2,
        'refreshInterval': '30s',
        'autoTradingEnabled': True,
    }

    create_response = client.post('/api/v1/settings', json=payload)
    assert create_response.status_code == 200
    created = create_response.json()
    assert created['success'] is True
    assert created['data']['riskPercent'] == 3
    assert created['data']['refreshInterval'] == '30s'

    get_response = client.get('/api/v1/settings')
    assert get_response.status_code == 200
    fetched = get_response.json()
    assert fetched['success'] is True
    assert fetched['data']['autoTradingEnabled'] is True

    replace_response = client.put('/api/v1/settings', json={'riskPercent': 4, 'refreshInterval': '1h'})
    assert replace_response.status_code == 200
    replaced = replace_response.json()
    assert replaced['data']['riskPercent'] == 4
    assert replaced['data']['refreshInterval'] == '1h'

    delete_response = client.delete('/api/v1/settings')
    assert delete_response.status_code == 200
    deleted = delete_response.json()
    assert deleted['data']['riskPercent'] == 2
    assert deleted['data']['autoTradingEnabled'] is False
