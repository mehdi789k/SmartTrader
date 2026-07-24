import os
from app.core.mt5_service import _get_mt5
from app.config import settings

mt5 = _get_mt5()
print('configured_path', settings.MT5_PATH)
print('exists', os.path.exists(settings.MT5_PATH))
print('isfile', os.path.isfile(settings.MT5_PATH))
try:
    ok = mt5.initialize(path=settings.MT5_PATH, timeout=5000)
    print('initialize', ok)
    print('last_error', mt5.last_error())
except Exception as exc:
    print('initialize_exception', repr(exc))
    try:
        print('last_error', mt5.last_error())
    except Exception as exc2:
        print('last_error_exception', repr(exc2))
