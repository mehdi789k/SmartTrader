from app.core.mt5_service import mt5_service

print('before', mt5_service.is_connected())
res = mt5_service.connect(91283860, 'Kazmi28810@', 'LiteFinance-MT5-Demo')
print('connect', res)
print('connected', mt5_service.is_connected())
print('last_error', mt5_service.last_error)
print('account_info', mt5_service.get_account_info())
print('positions', mt5_service.get_positions())
print('orders', mt5_service.get_orders())
print('symbols', mt5_service.get_symbols()[:10])
