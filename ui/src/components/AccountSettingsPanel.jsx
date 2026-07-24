import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { Button, Badge } from './UI'
import { api } from '../api'

const STORAGE_KEY = 'userAccounts_v1'

const loadAccounts = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch (e) {
    return []
  }
}

const saveAccounts = (accounts) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts))
  } catch (e) {
    // ignore
  }
}

const AccountSettingsPanel = ({ onConnected }) => {
  const [accounts, setAccounts] = useState([])
  const [label, setLabel] = useState('')
  const [server, setServer] = useState('')
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [loadingId, setLoadingId] = useState(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    const init = async () => {
      if (token) {
        try {
          const resp = await api.getAccounts()
          setAccounts(resp.data || [])
        } catch (err) {
          console.error('Failed to load server accounts', err)
          setAccounts(loadAccounts())
        }
      } else {
        setAccounts(loadAccounts())
      }
    }
    init()
  }, [])

  const handleAddOrUpdate = () => {
    if (!label || !login) {
      setMessage('لطفاً نام و شناسه ورود را وارد کنید.')
      return
    }
    const now = new Date().toISOString()
    const token = localStorage.getItem('access_token')
    if (token) {
      // Use server-side storage when authenticated
      ;(async () => {
        try {
          if (editingId) {
            await api.updateAccount(editingId, { label, server, login })
            setMessage('حساب در سرور به‌روزرسانی شد.')
          } else {
            await api.createAccount({ label, server, login, password })
            setMessage('حساب به سرور افزوده شد.')
          }
          const resp = await api.getAccounts()
          setAccounts(resp.data || [])
        } catch (err) {
          console.error('Server account save error', err)
          setMessage('خطا در ذخیره‌سازی سروری.')
        } finally {
          setEditingId(null)
        }
      })()
    } else {
      if (editingId) {
        const updated = accounts.map((a) => a.id === editingId ? { ...a, label, server, login, password, updatedAt: now } : a)
        setAccounts(updated)
        saveAccounts(updated)
        setEditingId(null)
        setMessage('حساب به‌روزرسانی شد.')
      } else {
        const id = `${Date.now()}-${Math.floor(Math.random()*1000)}`
        const record = { id, label, server, login, password, createdAt: now }
        const updated = [record, ...accounts]
        setAccounts(updated)
        saveAccounts(updated)
        setMessage('حساب افزوده شد.')
      }
    }
    setLabel('')
    setServer('')
    setLogin('')
    setPassword('')
  }

  const handleEdit = (id) => {
    const acc = accounts.find((a) => a.id === id)
    if (!acc) return
    setEditingId(id)
    setLabel(acc.label)
    setServer(acc.server || '')
    setLogin(acc.login)
    setPassword(acc.password || '')
    setMessage('در حال ویرایش...')
  }

  const handleDelete = (id) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      ;(async () => {
        try {
          await api.deleteAccount(id)
          const resp = await api.getAccounts()
          setAccounts(resp.data || [])
          setMessage('حساب از سرور حذف شد.')
        } catch (err) {
          console.error('Delete server account error', err)
          setMessage('خطا در حذف حساب سروری.')
        }
      })()
    } else {
      const updated = accounts.filter((a) => a.id !== id)
      setAccounts(updated)
      saveAccounts(updated)
      setMessage('حساب حذف شد.')
    }
  }

  const handleConnect = async (account) => {
    setLoadingId(account.id)
    setMessage('در حال اتصال...')
    try {
      const token = localStorage.getItem('access_token')
      if (token && !account.password) {
        // Server-stored account (password not returned): use connect endpoint
        const resp = await api.connectAccount(account.id)
        const newToken = resp.access_token || resp.data?.access_token
        if (newToken) {
          localStorage.setItem('access_token', newToken)
        }
      } else if (account.password) {
        // Local account or unauthenticated: call /auth/login directly
        await api.login(account.login, account.password, account.server)
      } else {
        throw new Error('credential not available')
      }

      // Update UI list: either refresh server accounts or update local records
      if (localStorage.getItem('access_token')) {
        try {
          const resp2 = await api.getAccounts()
          // server accounts don't include password; add lastConnectedAt for UI
          const now = new Date().toISOString()
          const updated = (resp2.data || []).map((a) => ({ ...a, lastConnectedAt: a.id === account.id ? now : a.lastConnectedAt }))
          setAccounts(updated)
        } catch (e) {
          // ignore
        }
      } else {
        const updated = accounts.map((a) => a.id === account.id ? { ...a, connected: true, lastConnectedAt: new Date().toISOString() } : a)
        setAccounts(updated)
        saveAccounts(updated)
      }

      setMessage('اتصال موفقیت‌آمیز بود.')
      if (typeof onConnected === 'function') onConnected(account)
    } catch (err) {
      console.error('Connect account error', err)
      setMessage(typeof err === 'string' ? err : 'اتصال با خطا مواجه شد.')
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div>
      <div className='mb-3'>
        <div className='text-sm font-semibold text-white'>مدیریت حساب‌ها</div>
        <div className='text-xs text-slate-400'>افزودن، ویرایش و اتصال به حساب‌های MT5</div>
      </div>

      <div className='mb-3 grid gap-2'>
        <input placeholder='نام صرافی/حساب' value={label} onChange={(e) => setLabel(e.target.value)} className='rounded-md border px-2 py-1 bg-slate-900 text-sm' />
        <input placeholder='سرور (مثال: LiteFinance-MT5-Demo)' value={server} onChange={(e) => setServer(e.target.value)} className='rounded-md border px-2 py-1 bg-slate-900 text-sm' />
        <input placeholder='شناسه ورود' value={login} onChange={(e) => setLogin(e.target.value)} className='rounded-md border px-2 py-1 bg-slate-900 text-sm' />
        <input placeholder='رمز عبور' type='password' value={password} onChange={(e) => setPassword(e.target.value)} className='rounded-md border px-2 py-1 bg-slate-900 text-sm' />
        <div className='flex gap-2'>
          <Button variant='primary' size='sm' onClick={handleAddOrUpdate}>{editingId ? 'ذخیره تغییرات' : 'افزودن حساب'}</Button>
          {editingId && <Button variant='secondary' size='sm' onClick={() => { setEditingId(null); setLabel(''); setServer(''); setLogin(''); setPassword(''); setMessage('ویرایش لغو شد.') }}>انصراف</Button>}
        </div>
        {message && <div className='text-xs text-slate-300'>{message}</div>}
      </div>

      <div className='space-y-2'>
        {accounts.length === 0 && <div className='text-sm text-slate-400'>هیچ حسابی اضافه نشده است.</div>}
        {accounts.map((acc) => (
          <div key={acc.id} className='rounded-lg border border-slate-700/60 bg-slate-950/60 p-3 flex items-center justify-between gap-2'>
            <div>
              <div className='text-sm font-medium'>{acc.label} <span className='text-xs text-slate-400'>({acc.server})</span></div>
              <div className='text-xs text-slate-400'>شناسه: {acc.login} {acc.lastConnectedAt ? `• متصل شده: ${new Date(acc.lastConnectedAt).toLocaleString('fa-IR')}` : ''}</div>
            </div>
            <div className='flex gap-2'>
              <Button variant='primary' size='sm' onClick={() => handleConnect(acc)} disabled={loadingId === acc.id}>{loadingId === acc.id ? 'در حال اتصال…' : 'اتصال'}</Button>
              <Button variant='ghost' size='sm' onClick={() => handleEdit(acc.id)}>ویرایش</Button>
              <Button variant='danger' size='sm' onClick={() => handleDelete(acc.id)}>حذف</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

AccountSettingsPanel.propTypes = {
  onConnected: PropTypes.func,
}

export default AccountSettingsPanel
