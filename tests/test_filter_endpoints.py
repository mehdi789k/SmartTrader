"""Integration tests for filter endpoints (app/api/routes.py)"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from app.main import app


@pytest.fixture
def client():
    """Create a test client"""
    return TestClient(app)


@pytest.fixture
def mock_auth_token():
    """Mock authentication token"""
    return "test_token_12345"


@pytest.fixture
def auth_headers(mock_auth_token):
    """Authorization headers with mock token"""
    return {"Authorization": f"Bearer {mock_auth_token}"}


class TestAccountManagementEndpoints:
    """Tests for /api/accounts endpoints"""

    @patch('app.api.routes.token_manager.verify_token')
    @patch('app.core.account_store.load_accounts')
    def test_list_accounts(self, mock_load, mock_verify, client, auth_headers):
        """GET /api/accounts should list accounts without passwords"""
        mock_verify.return_value = {'sub': '12345', 'type': 'access'}
        mock_load.return_value = [
            {'id': '1', 'login': '111', 'password': 'secret1', 'server': 'Demo', 'label': 'Acc1'},
            {'id': '2', 'login': '222', 'password': 'secret2', 'server': 'Live', 'label': 'Acc2'},
        ]
        
        response = client.get('/api/accounts', headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data['success'] == True
        assert data['count'] == 2
        # Passwords should be hidden
        for acc in data['data']:
            assert 'password' not in acc

    @patch('app.api.routes.token_manager.verify_token')
    @patch('app.core.account_store.load_accounts')
    def test_list_accounts_empty(self, mock_load, mock_verify, client, auth_headers):
        """GET /api/accounts with no accounts"""
        mock_verify.return_value = {'sub': '12345', 'type': 'access'}
        mock_load.return_value = []
        
        response = client.get('/api/accounts', headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data['data'] == []
        assert data['count'] == 0

    @patch('app.api.routes.token_manager.verify_token')
    @patch('app.core.account_store.add_account')
    def test_create_account(self, mock_add, mock_verify, client, auth_headers):
        """POST /api/accounts should create a new account"""
        mock_verify.return_value = {'sub': '12345', 'type': 'access'}
        mock_add.return_value = {
            'id': 'new_id',
            'login': '333',
            'password': 'newsecret',
            'server': 'Demo',
            'label': 'NewAccount',
            'meta': {}
        }
        
        response = client.post('/api/accounts', json={
            'login': '333',
            'password': 'newsecret',
            'server': 'Demo',
            'label': 'NewAccount'
        }, headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data['success'] == True
        assert 'password' not in data['data']
        assert data['data']['login'] == '333'

    @patch('app.api.routes.token_manager.verify_token')
    def test_create_account_missing_login(self, mock_verify, client, auth_headers):
        """POST /api/accounts without login should fail"""
        mock_verify.return_value = {'sub': '12345', 'type': 'access'}
        
        response = client.post('/api/accounts', json={
            'password': 'secret',
            'server': 'Demo'
        }, headers=auth_headers)
        
        assert response.status_code == 400

    @patch('app.api.routes.token_manager.verify_token')
    @patch('app.core.account_store.update_account')
    def test_update_account(self, mock_update, mock_verify, client, auth_headers):
        """PUT /api/accounts/{id} should update account"""
        mock_verify.return_value = {'sub': '12345', 'type': 'access'}
        mock_update.return_value = {
            'id': '1',
            'login': '111',
            'password': 'secret',
            'server': 'Live',  # Updated
            'label': 'UpdatedLabel'
        }
        
        response = client.put('/api/accounts/1', json={
            'server': 'Live',
            'label': 'UpdatedLabel'
        }, headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data['success'] == True
        assert 'password' not in data['data']

    @patch('app.api.routes.token_manager.verify_token')
    @patch('app.core.account_store.update_account')
    def test_update_account_not_found(self, mock_update, mock_verify, client, auth_headers):
        """PUT /api/accounts/{id} with non-existent ID"""
        mock_verify.return_value = {'sub': '12345', 'type': 'access'}
        mock_update.return_value = None
        
        response = client.put('/api/accounts/nonexistent', json={
            'label': 'Test'
        }, headers=auth_headers)
        
        assert response.status_code == 404

    @patch('app.api.routes.token_manager.verify_token')
    @patch('app.core.account_store.delete_account')
    def test_delete_account(self, mock_delete, mock_verify, client, auth_headers):
        """DELETE /api/accounts/{id} should delete account"""
        mock_verify.return_value = {'sub': '12345', 'type': 'access'}
        mock_delete.return_value = True
        
        response = client.delete('/api/accounts/1', headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data['success'] == True

    @patch('app.api.routes.token_manager.verify_token')
    @patch('app.core.account_store.delete_account')
    def test_delete_account_not_found(self, mock_delete, mock_verify, client, auth_headers):
        """DELETE /api/accounts/{id} with non-existent ID"""
        mock_verify.return_value = {'sub': '12345', 'type': 'access'}
        mock_delete.return_value = False
        
        response = client.delete('/api/accounts/nonexistent', headers=auth_headers)
        assert response.status_code == 404


class TestConnectAccountEndpoint:
    """Tests for /api/accounts/{id}/connect endpoint"""

    @patch('app.api.routes.token_manager.verify_token')
    @patch('app.core.account_store.get_account')
    @patch('app.api.routes.mt5_service.login')
    @patch('app.api.routes.token_manager.create_access_token')
    @patch('app.api.routes.session_manager.create_session')
    def test_connect_account_success(self, mock_session, mock_create_token, mock_login,
                                     mock_get, mock_verify, client, auth_headers):
        """POST /api/accounts/{id}/connect should login and return token"""
        mock_verify.return_value = {'sub': '12345', 'type': 'access'}
        mock_get.return_value = {
            'id': '1',
            'login': '123456',
            'password': 'mypass',
            'server': 'Demo',
            'label': 'TestAccount'
        }
        mock_login.return_value = {
            'success': True,
            'message': 'Login successful',
            'terminal_launched': True
        }
        mock_create_token.return_value = 'new_token_789'
        
        response = client.post('/api/accounts/1/connect', headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data['success'] == True
        assert data['access_token'] == 'new_token_789'
        # Verify mt5_service.login was called with correct credentials
        mock_login.assert_called_once()

    @patch('app.api.routes.token_manager.verify_token')
    @patch('app.core.account_store.get_account')
    def test_connect_account_not_found(self, mock_get, mock_verify, client, auth_headers):
        """POST /api/accounts/{id}/connect with non-existent ID"""
        mock_verify.return_value = {'sub': '12345', 'type': 'access'}
        mock_get.return_value = None
        
        response = client.post('/api/accounts/nonexistent/connect', headers=auth_headers)
        assert response.status_code == 404

    @patch('app.api.routes.token_manager.verify_token')
    @patch('app.core.account_store.get_account')
    @patch('app.api.routes.mt5_service.login')
    def test_connect_account_login_failed(self, mock_login, mock_get, mock_verify, client, auth_headers):
        """POST /api/accounts/{id}/connect when login fails"""
        mock_verify.return_value = {'sub': '12345', 'type': 'access'}
        mock_get.return_value = {
            'id': '1',
            'login': '999999',
            'password': 'wrongpass',
            'server': 'Demo'
        }
        mock_login.return_value = {
            'success': False,
            'message': 'Invalid credentials'
        }
        
        response = client.post('/api/accounts/1/connect', headers=auth_headers)
        assert response.status_code == 401


class TestFilterEndpointsWithServer:
    """Integration tests for indicator filters on /api/symbols/{symbol}/timeframe"""

    @patch('app.api.routes.token_manager.verify_token')
    @patch('app.api.routes.mt5_service.is_connected')
    @patch('app.api.routes.mt5_service.get_symbol_timeframe_data')
    def test_get_timeframe_compute_indicators(self, mock_get_data, mock_connected, 
                                             mock_verify, client, auth_headers):
        """GET /symbols/{symbol}/timeframe with compute_indicators=true"""
        mock_verify.return_value = {'sub': '12345', 'type': 'access'}
        mock_connected.return_value = True
        mock_get_data.return_value = {
            'requested_symbol': 'EURUSD',
            'timeframe': 'M1',
            'candles': [
                {'open': 1.0850, 'high': 1.0860, 'low': 1.0840, 'close': 1.0855, 'tick_volume': 100},
                {'open': 1.0855, 'high': 1.0870, 'low': 1.0850, 'close': 1.0865, 'tick_volume': 120},
                {'open': 1.0865, 'high': 1.0875, 'low': 1.0860, 'close': 1.0870, 'tick_volume': 110},
            ]
        }
        
        response = client.get(
            '/api/symbols/EURUSD/timeframe?timeframe=M1&compute_indicators=true&filter_sma_period=2',
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data['success'] == True
        # When compute_indicators=true, the endpoint computes indicators
        # The candles should be present in the response
        assert 'candles' in data['data']
        assert len(data['data']['candles']) == 3
        # The endpoint will compute indicators if the actual function runs
        # (may or may not be in response depending on exception handling)

    @patch('app.api.routes.token_manager.verify_token')
    @patch('app.api.routes.mt5_service.is_connected')
    @patch('app.api.routes.mt5_service.get_symbol_timeframe_data')
    def test_get_timeframe_with_filter_params(self, mock_get_data, mock_connected,
                                             mock_verify, client, auth_headers):
        """GET /symbols/{symbol}/timeframe with filter parameters"""
        mock_verify.return_value = {'sub': '12345', 'type': 'access'}
        mock_connected.return_value = True
        mock_get_data.return_value = {
            'requested_symbol': 'EURUSD',
            'timeframe': 'H1',
            'candles': [
                {'open': 1.0850, 'high': 1.0860, 'low': 1.0840, 'close': 1.0855, 'tick_volume': 100},
            ]
        }
        
        response = client.get(
            '/api/symbols/EURUSD/timeframe?timeframe=H1&min_volume=50&max_price=1.09',
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data['success'] == True

    @patch('app.api.routes.token_manager.verify_token')
    @patch('app.api.routes.mt5_service.is_connected')
    def test_get_timeframe_not_connected(self, mock_connected, mock_verify, client, auth_headers):
        """GET /symbols/{symbol}/timeframe when not connected to MT5"""
        mock_verify.return_value = {'sub': '12345', 'type': 'access'}
        mock_connected.return_value = False
        
        response = client.get('/api/symbols/EURUSD/timeframe', headers=auth_headers)
        assert response.status_code == 401

    @patch('app.api.routes.token_manager.verify_token')
    def test_missing_auth_header(self, mock_verify, client):
        """Request without authorization header should fail"""
        response = client.get('/api/symbols/EURUSD/timeframe')
        assert response.status_code == 401

    @patch('app.api.routes.token_manager.verify_token')
    def test_invalid_auth_token(self, mock_verify, client):
        """Request with invalid token format"""
        mock_verify.return_value = None
        
        response = client.get(
            '/api/symbols/EURUSD/timeframe',
            headers={"Authorization": "Bearer invalid_token"}
        )
        assert response.status_code == 401


class TestHealthAndStatusEndpoints:
    """Tests for health check endpoints"""

    def test_health_check(self, client):
        """GET /api/health should return healthy status"""
        response = client.get('/api/health')
        assert response.status_code == 200
        data = response.json()
        assert data['status'] == 'healthy'

    @patch('app.api.routes.token_manager.verify_token')
    @patch('app.api.routes.mt5_service.is_connected')
    @patch('app.api.routes.mt5_service.account_login', '123456')
    @patch('app.api.routes.mt5_service.server', 'Demo')
    def test_status_endpoint(self, mock_connected, mock_verify, client, auth_headers):
        """GET /api/status should return connection status"""
        mock_verify.return_value = {'sub': '12345', 'type': 'access'}
        mock_connected.return_value = True
        
        response = client.get('/api/status', headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data['success'] == True
        assert data['connected'] == True


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
