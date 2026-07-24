from fastapi.testclient import TestClient

from app.config import settings
from app.main import app


def test_login_config_endpoint_returns_env_defaults():
    client = TestClient(app)

    response = client.get('/api/auth/config')

    assert response.status_code == 200
    payload = response.json()
    assert payload['success'] is True
    assert payload['data']['account'] == settings.MT5_LOGIN
    assert payload['data']['server'] == settings.MT5_SERVER
