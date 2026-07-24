"""Server-side account storage with optional encryption (Fernet).

This module stores account entries in an encrypted JSON file under `data/accounts.json.enc`.
It uses an environment-provided `ACCOUNTS_KEY` (Fernet key) or a generated key saved to `app/.accounts_key`.
"""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Optional, List, Dict, Any
import logging
import base64
import uuid

logger = logging.getLogger(__name__)

try:
    from cryptography.fernet import Fernet, InvalidToken
    _HAS_CRYPTO = True
except Exception:
    Fernet = None  # type: ignore
    InvalidToken = Exception
    _HAS_CRYPTO = False


DATA_DIR = Path(__file__).parent.parent / "data"
KEY_FILE = Path(__file__).parent.parent / ".accounts_key"
STORAGE_FILE = DATA_DIR / "accounts.json.enc"


def _ensure_dirs():
    DATA_DIR.mkdir(parents=True, exist_ok=True)


def _load_key() -> Optional[bytes]:
    """Return a 32-byte urlsafe-base64-encoded key for Fernet, or None if crypto not available."""
    if not _HAS_CRYPTO:
        return None

    env_key = os.environ.get('ACCOUNTS_KEY')
    if env_key:
        try:
            return env_key.encode('utf-8')
        except Exception:
            pass

    # try key file
    try:
        if KEY_FILE.exists():
            data = KEY_FILE.read_bytes()
            return data.strip()
    except Exception:
        logger.exception("Failed to read accounts key file")

    # generate a new key and save it
    try:
        key = Fernet.generate_key()
        try:
            KEY_FILE.write_bytes(key)
            try:
                os.chmod(KEY_FILE, 0o600)
            except Exception:
                pass
        except Exception:
            logger.exception("Failed to write accounts key file")
        return key
    except Exception:
        logger.exception("Failed to generate Fernet key")
        return None


def _get_fernet() -> Optional[Fernet]:
    key = _load_key()
    if not key:
        return None
    try:
        return Fernet(key)
    except Exception:
        logger.exception("Invalid Fernet key")
        return None


def _read_raw() -> bytes | None:
    if not STORAGE_FILE.exists():
        return None
    try:
        return STORAGE_FILE.read_bytes()
    except Exception:
        logger.exception("Failed to read accounts storage file")
        return None


def _write_raw(data: bytes) -> bool:
    try:
        _ensure_dirs()
        STORAGE_FILE.write_bytes(data)
        try:
            os.chmod(STORAGE_FILE, 0o600)
        except Exception:
            pass
        return True
    except Exception:
        logger.exception("Failed to write accounts storage file")
        return False


def load_accounts() -> List[Dict[str, Any]]:
    """Load and return the list of stored accounts (decrypted)."""
    raw = _read_raw()
    if raw is None:
        return []

    f = _get_fernet()
    if f:
        try:
            dec = f.decrypt(raw)
            return json.loads(dec.decode('utf-8') or '[]')
        except InvalidToken:
            logger.error("Invalid accounts encryption key or corrupt storage file")
            return []
        except Exception:
            logger.exception("Failed to decrypt accounts storage")
            return []
    else:
        # fallback: try to parse raw as plaintext json
        try:
            return json.loads(raw.decode('utf-8') or '[]')
        except Exception:
            logger.exception("Failed to parse plaintext accounts storage")
            return []


def save_accounts(accounts: List[Dict[str, Any]]) -> bool:
    """Persist accounts (encrypted when possible)."""
    payload = json.dumps(accounts, ensure_ascii=False).encode('utf-8')
    f = _get_fernet()
    if f:
        try:
            enc = f.encrypt(payload)
            return _write_raw(enc)
        except Exception:
            logger.exception("Failed to encrypt accounts payload")
            return False
    else:
        return _write_raw(payload)


def add_account(entry: Dict[str, Any]) -> Dict[str, Any]:
    accounts = load_accounts()
    entry = dict(entry)
    entry.setdefault('id', str(uuid.uuid4()))
    entry.setdefault('label', f"Account {entry.get('login')}")
    accounts.append(entry)
    save_accounts(accounts)
    return entry


def update_account(acc_id: str, patch: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    accounts = load_accounts()
    for i, a in enumerate(accounts):
        if str(a.get('id')) == str(acc_id):
            accounts[i] = {**a, **patch}
            save_accounts(accounts)
            return accounts[i]
    return None


def delete_account(acc_id: str) -> bool:
    accounts = load_accounts()
    new = [a for a in accounts if str(a.get('id')) != str(acc_id)]
    if len(new) == len(accounts):
        return False
    save_accounts(new)
    return True


def get_account(acc_id: str) -> Optional[Dict[str, Any]]:
    accounts = load_accounts()
    for a in accounts:
        if str(a.get('id')) == str(acc_id):
            return a
    return None
