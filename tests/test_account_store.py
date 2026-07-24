"""Unit tests for account store (app/core/account_store.py)"""
import pytest
import json
import os
import tempfile
from pathlib import Path
from unittest.mock import patch, MagicMock

# Mock cryptography before importing account_store
import sys
sys.path.insert(0, str(Path(__file__).parent.parent / 'app'))

from app.core.account_store import (
    load_accounts, save_accounts, add_account, update_account,
    delete_account, get_account, _get_fernet, _load_key
)


@pytest.fixture
def temp_storage():
    """Create a temporary directory for storage files"""
    with tempfile.TemporaryDirectory() as tmpdir:
        with patch('app.core.account_store.DATA_DIR', Path(tmpdir)):
            with patch('app.core.account_store.KEY_FILE', Path(tmpdir) / '.accounts_key'):
                with patch('app.core.account_store.STORAGE_FILE', Path(tmpdir) / 'accounts.json.enc'):
                    yield tmpdir


class TestAccountStore:
    def test_add_account(self, temp_storage):
        """Add a new account"""
        entry = {'login': '12345', 'password': 'secret', 'server': 'Demo'}
        result = add_account(entry)
        
        assert 'id' in result
        assert result['login'] == '12345'
        assert result['password'] == 'secret'
        assert 'label' in result

    def test_load_empty_accounts(self, temp_storage):
        """Load accounts when none exist"""
        accounts = load_accounts()
        assert accounts == []

    def test_save_and_load_accounts(self, temp_storage):
        """Save and then load accounts"""
        accounts = [
            {'id': '1', 'login': '111', 'password': 'pass1', 'server': 'Demo', 'label': 'Acc1'},
            {'id': '2', 'login': '222', 'password': 'pass2', 'server': 'Live', 'label': 'Acc2'},
        ]
        assert save_accounts(accounts) == True
        
        loaded = load_accounts()
        assert len(loaded) == 2
        assert loaded[0]['login'] == '111'
        assert loaded[1]['login'] == '222'

    def test_add_multiple_accounts(self, temp_storage):
        """Add multiple accounts sequentially"""
        acc1 = add_account({'login': '111', 'password': 'p1', 'server': 'D1'})
        acc2 = add_account({'login': '222', 'password': 'p2', 'server': 'D2'})
        
        loaded = load_accounts()
        assert len(loaded) == 2
        assert acc1['id'] != acc2['id']

    def test_update_account(self, temp_storage):
        """Update an existing account"""
        added = add_account({'login': '111', 'password': 'p1', 'server': 'Demo'})
        acc_id = added['id']
        
        updated = update_account(acc_id, {'label': 'New Label', 'server': 'Live'})
        assert updated is not None
        assert updated['label'] == 'New Label'
        assert updated['server'] == 'Live'
        assert updated['login'] == '111'  # Unchanged

    def test_update_nonexistent_account(self, temp_storage):
        """Update non-existent account returns None"""
        result = update_account('nonexistent', {'label': 'Test'})
        assert result is None

    def test_delete_account(self, temp_storage):
        """Delete an account"""
        added = add_account({'login': '111', 'password': 'p1', 'server': 'Demo'})
        acc_id = added['id']
        
        ok = delete_account(acc_id)
        assert ok == True
        
        loaded = load_accounts()
        assert len(loaded) == 0

    def test_delete_nonexistent_account(self, temp_storage):
        """Delete non-existent account returns False"""
        result = delete_account('nonexistent')
        assert result == False

    def test_get_account(self, temp_storage):
        """Get a specific account by ID"""
        added = add_account({'login': '111', 'password': 'p1', 'server': 'Demo', 'label': 'MyAccount'})
        acc_id = added['id']
        
        retrieved = get_account(acc_id)
        assert retrieved is not None
        assert retrieved['login'] == '111'
        assert retrieved['label'] == 'MyAccount'

    def test_get_nonexistent_account(self, temp_storage):
        """Get non-existent account returns None"""
        result = get_account('nonexistent')
        assert result is None

    def test_persistence_across_saves(self, temp_storage):
        """Data persists across save/load cycles"""
        acc1 = add_account({'login': '111', 'password': 'p1', 'server': 'Demo'})
        
        # Simulate a new load
        loaded = load_accounts()
        assert len(loaded) == 1
        
        # Add another and verify both are still there
        acc2 = add_account({'login': '222', 'password': 'p2', 'server': 'Live'})
        loaded2 = load_accounts()
        assert len(loaded2) == 2

    def test_password_field_preserved(self, temp_storage):
        """Password field is stored and retrieved"""
        password = 'MySecurePassword123!'
        added = add_account({'login': '111', 'password': password, 'server': 'Demo'})
        
        retrieved = get_account(added['id'])
        assert retrieved['password'] == password


class TestAccountStoreEdgeCases:
    def test_add_account_with_meta(self, temp_storage):
        """Add account with metadata"""
        entry = {
            'login': '111',
            'password': 'pass',
            'server': 'Demo',
            'meta': {'strategy': 'scalping', 'risk': 1.5}
        }
        added = add_account(entry)
        assert 'meta' in added
        assert added['meta']['strategy'] == 'scalping'

    def test_special_characters_in_password(self, temp_storage):
        """Handle special characters in password"""
        password = 'P@$$w0rd!#%&*()[]{}:;<>,.?/\\|`~'
        added = add_account({'login': '111', 'password': password, 'server': 'Demo'})
        
        retrieved = get_account(added['id'])
        assert retrieved['password'] == password

    def test_unicode_in_label(self, temp_storage):
        """Handle Unicode in account label"""
        label = 'حساب تجاری ۱ - Compte démo'
        added = add_account({
            'login': '111',
            'password': 'pass',
            'server': 'Demo',
            'label': label
        })
        
        retrieved = get_account(added['id'])
        assert retrieved['label'] == label

    def test_large_number_of_accounts(self, temp_storage):
        """Handle storage of many accounts"""
        for i in range(50):
            add_account({'login': f'{1000+i}', 'password': f'pass{i}', 'server': 'Demo'})
        
        loaded = load_accounts()
        assert len(loaded) == 50

    def test_delete_then_add_same_login(self, temp_storage):
        """Delete and re-add account with same login"""
        added1 = add_account({'login': '111', 'password': 'pass1', 'server': 'Demo'})
        id1 = added1['id']
        
        delete_account(id1)
        
        added2 = add_account({'login': '111', 'password': 'pass2', 'server': 'Demo'})
        id2 = added2['id']
        
        assert id1 != id2
        assert get_account(id2) is not None
        assert get_account(id1) is None


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
