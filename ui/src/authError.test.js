import test from 'node:test'
import assert from 'node:assert/strict'
import { isAuthError } from './authError.js'

test('treats missing or invalid token as auth failure', () => {
  assert.equal(isAuthError({ response: { status: 401, data: { detail: 'توکن ارائه نشده است' } } }), true)
  assert.equal(isAuthError({ response: { status: 401, data: { detail: 'توکن نامعتبر یا منقضی است' } } }), true)
})

test('does not treat MT5 connection errors as auth failures', () => {
  assert.equal(isAuthError({ response: { status: 401, data: { detail: 'حساب متصل نیست' } } }), false)
  assert.equal(isAuthError({ response: { status: 401, data: { message: 'Account not connected' } } }), false)
})
