import React, { useState, useEffect } from 'react'
import { useAuthStore } from '../store'
import { api } from '../api'
import { Button, Input, Alert, Card, Spinner } from '../components/UI'

const LoginPage = () => {
  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const [server, setServer] = useState('')
  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [fadeOut, setFadeOut] = useState(false)
  
  const { isLoading, error } = useAuthStore()
  
  useEffect(() => {
    if (isLoading) {
      setFadeOut(false)
    }
  }, [isLoading])

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await api.getAuthConfig()
        const config = response?.data || response
        if (config?.account != null && config.account !== '') {
          setAccount(String(config.account))
        }
        if (config?.password != null && config.password !== '') {
          setPassword(String(config.password))
        }
        if (config?.server) {
          setServer(config.server)
        }
      } catch (error) {
        console.warn('Failed to load auth config', error)
      }
    }

    loadConfig()
  }, [])
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrors({})
    setStatusMessage('')
    
    // Validation
    const newErrors = {}
    if (!account) newErrors.account = 'شماره حساب الزامی است'
    if (!password) newErrors.password = 'رمز عبور الزامی است'
    if (!server) newErrors.server = 'سرور الزامی است'
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    
    try {
      setStatusMessage('')
      const authStore = useAuthStore.getState()
      const form = e.currentTarget
      const accountValue = form?.elements?.namedItem('account')?.value ?? account
      const passwordValue = form?.elements?.namedItem('password')?.value ?? password
      const serverValue = form?.elements?.namedItem('server')?.value ?? server
      const response = await authStore.login(parseInt(accountValue, 10), passwordValue, serverValue)
      if (response?.success) {
        setFadeOut(true)
        window.location.assign('/dashboard')
        return
      }

      const fallbackMessage = response?.message || 'ورود با موفقیت انجام نشد.'
      setStatusMessage(fallbackMessage)
    } catch (err) {
      const message = typeof err === 'string'
        ? err
        : err?.message || err?.detail || 'ورود با خطا مواجه شد. لطفاً دوباره تلاش کنید.'
      const friendlyMessage = message.includes('Failed to connect to MT5')
        ? 'اتصال به MT5 برقرار نشد. لطفاً اطلاعات حساب، رمز عبور و سرور را بررسی کنید و مطمئن شوید برنامهٔ MT5 در دسترس است.'
        : message
      setStatusMessage(friendlyMessage)
      console.error('Login error:', err)
    }
  }
  
  return (
    <div className={`min-h-screen bg-[radial-gradient(circle_at_top,_#60a5fa_0%,_#1e3a8a_45%,_#0f172a_100%)] flex items-center justify-center p-4 transition-opacity duration-300 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}>
      <Card className='w-full max-w-md border-0 shadow-2xl shadow-blue-950/40'>
        {/* Header */}
        <div className='text-center mb-8'>
          <h1 className='text-3xl font-bold text-gray-900 mb-2'>Smart Tred</h1>
          <p className='text-gray-600'>اتصال به MetaTrader 5</p>
        </div>
        
        {/* Error Alert */}
        {(error || statusMessage) && <Alert type='error' message={error || statusMessage} />}
        {isLoading && !statusMessage && (
          <Alert type='info' message='در حال اتصال به MT5 و بررسی پاسخ سرور است. این فرآیند ممکن است چند ثانیه طول بکشد.' />
        )}
        
        {/* Form */}
        <form onSubmit={handleSubmit} className='space-y-4'>
          <Input
            label='شماره حساب'
            type='number'
            name='account'
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            placeholder='مثال: 123456789'
            error={errors.account}
            disabled={isLoading}
          />
          <p className='text-xs text-gray-500 -mt-2'>برای حساب دمو LiteFinance از شماره و رمز عبور خود استفاده کنید.</p>
          
          <div className='mb-4'>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              رمز عبور
            </label>
            <div className='relative'>
              <input
                type={showPassword ? 'text' : 'password'}
                name='password'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder='رمز عبور خود را وارد کنید'
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10 ${
                  errors.password ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={isLoading}
              />
              <button
                type='button'
                onClick={() => setShowPassword(!showPassword)}
                className='absolute right-3 top-2.5 text-gray-500 hover:text-gray-700'
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {errors.password && (
              <p className='text-red-500 text-sm mt-1'>{errors.password}</p>
            )}
          </div>
          
          <div className='mb-4'>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              سرور
            </label>
            <select
              name='server'
              value={server}
              onChange={(e) => setServer(e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.server ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isLoading}
            >
              <option value='LiteFinance-MT5-Demo'>LiteFinance Demo</option>
              <option value='LiteFinance Demo'>LiteFinance Legacy Demo</option>
              <option value='ICMarketsSC-Demo'>ICMarkets Demo</option>
              <option value='ICMarketsSC-Live'>ICMarkets Live</option>
              <option value='ForexPros-Demo'>ForexPros Demo</option>
              <option value='MetaTrader5.FXOpen'>FXOpen</option>
            </select>
            {errors.server && (
              <p className='text-red-500 text-sm mt-1'>{errors.server}</p>
            )}
          </div>
          
          <Button
            type='submit'
            variant='primary'
            size='lg'
            className='w-full flex items-center justify-center gap-2'
            disabled={isLoading}
          >
            {isLoading && <Spinner size='sm' className='text-white' />}
            {isLoading ? 'در حال ورود...' : 'ورود'}
          </Button>
        </form>
        
        {/* Footer */}
        <div className='mt-6 text-center text-sm text-gray-600'>
          <p>سرور Demo برای تست و آموزش</p>
          <p>در صورت مشکل اتصال، سرور و اطلاعات حساب را دوباره بررسی کنید.</p>
        </div>
      </Card>
    </div>
  )
}

export default LoginPage
