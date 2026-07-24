import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { Button } from './UI'
import { api } from '../api'

const defaultRiskConfig = {
  risk_percent: 1,
  max_drawdown_percent: 5,
  max_daily_drawdown_percent: 3,
  max_positions: 3,
  max_position_volume: 5,
  session_start: '08:00',
  session_end: '17:00',
  enable_break_even: true,
  enable_drawdown_control: true,
  enable_position_limits: true,
  selected_sessions: ['london', 'asia', 'new_york'],
}

const sessionTemplates = [
  { key: 'asia', label: 'آسیا', start: '22:00', end: '08:00' },
  { key: 'london', label: 'لندن', start: '08:00', end: '16:00' },
  { key: 'new_york', label: 'نیویورک', start: '13:00', end: '21:00' },
]

const OrderTicket = ({ defaultSymbol, onPlaced, balance = 0, equity = 0, activePositions = 0 }) => {
  const [symbol, setSymbol] = useState(defaultSymbol || '')
  const [volume, setVolume] = useState(0.1)
  const [type, setType] = useState('BUY')
  const [price, setPrice] = useState('')
  const [sl, setSl] = useState('')
  const [tp, setTp] = useState('')
  const [loading, setLoading] = useState(false)
  const [riskLoading, setRiskLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [riskConfig, setRiskConfig] = useState(defaultRiskConfig)
  const [riskAssessment, setRiskAssessment] = useState(null)
  const [sessionTemplatesState, setSessionTemplatesState] = useState(sessionTemplates)

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await api.getRiskManagementConfig()
        const config = response?.data || response
        if (config && typeof config === 'object') {
          const nextConfig = { ...defaultRiskConfig, ...config }
          if (Array.isArray(config.selected_sessions)) {
            nextConfig.selected_sessions = config.selected_sessions
          }
          setRiskConfig(nextConfig)
          if (config.session_templates && typeof config.session_templates === 'object') {
            setSessionTemplatesState(Object.entries(config.session_templates).map(([key, value]) => ({ key, label: value.label, start: value.start, end: value.end })))
          }
        }
      } catch (err) {
        console.error('Failed to load risk config', err)
      }
    }

    void loadConfig()
  }, [])

  const handleRiskConfigChange = (field, value) => {
    setRiskConfig((current) => ({ ...current, [field]: value }))
  }

  const toggleSession = (sessionKey) => {
    setRiskConfig((current) => {
      const currentSessions = Array.isArray(current.selected_sessions) ? current.selected_sessions : []
      const nextSessions = currentSessions.includes(sessionKey)
        ? currentSessions.filter((item) => item !== sessionKey)
        : [...currentSessions, sessionKey]
      return { ...current, selected_sessions: nextSessions }
    })
  }

  const runRiskAssessment = async (overrideVolume = volume) => {
    const requestVolume = Number(overrideVolume) || 0
    if (!requestVolume || requestVolume <= 0) {
      setRiskAssessment(null)
      return null
    }

    setRiskLoading(true)
    try {
      const stopLossDistance = sl ? Math.abs(Number(sl) - Number(price || 0)) : 0
      const payload = {
        balance: Number(balance) || 0,
        equity: Number(equity) || Number(balance) || 0,
        volume: requestVolume,
        active_positions: Number(activePositions) || 0,
        stop_loss_distance: stopLossDistance,
        risk_config: riskConfig,
        trading_time: new Date().toISOString(),
      }
      const response = await api.assessTradeRequest(payload)
      const assessment = response?.data || response
      setRiskAssessment(assessment)
      return assessment
    } catch (err) {
      console.error('Risk assessment error', err)
      setRiskAssessment(null)
      return null
    } finally {
      setRiskLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')
    const payload = {
      symbol: (symbol || defaultSymbol || '').trim().toUpperCase(),
      volume: Number(volume) || 0,
      type,
      price: price ? Number(price) : undefined,
      sl: sl ? Number(sl) : undefined,
      tp: tp ? Number(tp) : undefined,
      balance: Number(balance) || 0,
      equity: Number(equity) || Number(balance) || 0,
      active_positions: Number(activePositions) || 0,
      stop_loss_distance: sl ? Math.abs(Number(sl) - Number(price || 0)) : 0,
      risk_config: riskConfig,
      trading_time: new Date().toISOString(),
    }
    if (!payload.symbol || payload.volume <= 0) {
      setMessage('لطفاً نماد و حجم معتبر وارد کنید.')
      return
    }

    try {
      setLoading(true)
      const assessment = await runRiskAssessment(payload.volume)
      if (assessment && assessment?.data && assessment.data.allowed === false) {
        const reason = assessment.data.reason || 'درخواست معامله با محدودیت‌های مدیریت سرمایه مغایرت دارد.'
        setMessage(reason)
        return
      }
      if (assessment && assessment.allowed === false) {
        setMessage(assessment.reason || 'درخواست معامله با محدودیت‌های مدیریت سرمایه مغایرت دارد.')
        return
      }

      const res = await api.openPosition(payload)
      const success = res?.success || false
      setMessage(success ? 'سفارش ثبت شد' : (res?.message || 'خطا در ثبت سفارش'))
      if (success && typeof onPlaced === 'function') onPlaced(res)
    } catch (err) {
      setMessage(typeof err === 'string' ? err : err?.message || 'خطا در ارسال سفارش')
    } finally {
      setLoading(false)
    }
  }

  const renderAssessment = () => {
    if (!riskAssessment) return null

    const assessmentData = riskAssessment?.data || riskAssessment
    if (!assessmentData) return null

    const allowed = assessmentData.allowed !== false
    const sessionOpen = assessmentData.session_allowed !== false
    const volumeText = assessmentData.adjusted_volume != null ? `${assessmentData.adjusted_volume}` : '—'

    return (
      <div className='rounded-lg border border-slate-700/60 bg-slate-950/50 p-3 text-xs leading-6 text-slate-300'>
        <div className='mb-2 flex items-center justify-between'>
          <span className='font-semibold text-slate-100'>وضعیت مدیریت سرمایه</span>
          <span className={allowed ? 'text-emerald-400' : 'text-rose-400'}>{allowed ? 'مجاز' : 'مسدود'}</span>
        </div>
        <div>دلیل: {assessmentData.reason || '—'}</div>
        <div>حجم تنظیم‌شده: {volumeText}</div>
        <div>سشن معاملاتی: {sessionOpen ? 'باز' : 'بسته'}</div>
      </div>
    )
  }

  return (
    <div className='rounded-lg border border-slate-700/50 bg-slate-900/40 p-3'>
      <div className='mb-2 text-sm font-medium'>Order Ticket</div>
      <form onSubmit={handleSubmit} className='space-y-2 text-sm'>
        <div>
          <label className='mb-1 block'>Symbol</label>
          <input className='w-full rounded px-2 py-1 text-sm text-slate-900' value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder={defaultSymbol || 'EURUSD'} />
        </div>
        <div className='grid grid-cols-2 gap-2'>
          <div>
            <label className='mb-1 block'>Volume</label>
            <input className='w-full rounded px-2 py-1 text-sm text-slate-900' type='number' step='0.01' value={volume} onChange={(e) => setVolume(e.target.value)} />
          </div>
          <div>
            <label className='mb-1 block'>Type</label>
            <select className='w-full rounded px-2 py-1 text-sm text-slate-900' value={type} onChange={(e) => setType(e.target.value)}>
              <option>BUY</option>
              <option>SELL</option>
            </select>
          </div>
        </div>

        <div className='grid grid-cols-3 gap-2'>
          <input className='rounded px-2 py-1 text-sm text-slate-900' placeholder='Price (optional)' value={price} onChange={(e) => setPrice(e.target.value)} />
          <input className='rounded px-2 py-1 text-sm text-slate-900' placeholder='SL (optional)' value={sl} onChange={(e) => setSl(e.target.value)} />
          <input className='rounded px-2 py-1 text-sm text-slate-900' placeholder='TP (optional)' value={tp} onChange={(e) => setTp(e.target.value)} />
        </div>

        <div className='rounded-lg border border-slate-700/50 bg-slate-950/50 p-3'>
          <div className='mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400'>مدیریت سرمایه</div>
          <div className='grid grid-cols-2 gap-2'>
            <label className='text-xs'>
              <span className='mb-1 block text-slate-300'>درصد ریسک</span>
              <input className='w-full rounded px-2 py-1 text-sm text-slate-900' type='number' value={riskConfig.risk_percent} onChange={(e) => handleRiskConfigChange('risk_percent', Number(e.target.value))} />
            </label>
            <label className='text-xs'>
              <span className='mb-1 block text-slate-300'>حد Drawdown</span>
              <input className='w-full rounded px-2 py-1 text-sm text-slate-900' type='number' value={riskConfig.max_drawdown_percent} onChange={(e) => handleRiskConfigChange('max_drawdown_percent', Number(e.target.value))} />
            </label>
            <label className='text-xs'>
              <span className='mb-1 block text-slate-300'>حد Daily DD</span>
              <input className='w-full rounded px-2 py-1 text-sm text-slate-900' type='number' value={riskConfig.max_daily_drawdown_percent} onChange={(e) => handleRiskConfigChange('max_daily_drawdown_percent', Number(e.target.value))} />
            </label>
            <label className='text-xs'>
              <span className='mb-1 block text-slate-300'>حد پوزیشن‌ها</span>
              <input className='w-full rounded px-2 py-1 text-sm text-slate-900' type='number' value={riskConfig.max_positions} onChange={(e) => handleRiskConfigChange('max_positions', Number(e.target.value))} />
            </label>
            <label className='text-xs'>
              <span className='mb-1 block text-slate-300'>حد حجم پوزیشن</span>
              <input className='w-full rounded px-2 py-1 text-sm text-slate-900' type='number' value={riskConfig.max_position_volume} onChange={(e) => handleRiskConfigChange('max_position_volume', Number(e.target.value))} />
            </label>
            <label className='text-xs'>
              <span className='mb-1 block text-slate-300'>سشن از</span>
              <input className='w-full rounded px-2 py-1 text-sm text-slate-900' value={riskConfig.session_start} onChange={(e) => handleRiskConfigChange('session_start', e.target.value)} />
            </label>
            <label className='text-xs'>
              <span className='mb-1 block text-slate-300'>سشن تا</span>
              <input className='w-full rounded px-2 py-1 text-sm text-slate-900' value={riskConfig.session_end} onChange={(e) => handleRiskConfigChange('session_end', e.target.value)} />
            </label>
          </div>
          <div className='mt-2 flex flex-wrap gap-2 text-xs'>
            <label className='flex items-center gap-1 text-slate-300'>
              <input type='checkbox' checked={riskConfig.enable_break_even} onChange={(e) => handleRiskConfigChange('enable_break_even', e.target.checked)} />
              Break Even
            </label>
            <label className='flex items-center gap-1 text-slate-300'>
              <input type='checkbox' checked={riskConfig.enable_drawdown_control} onChange={(e) => handleRiskConfigChange('enable_drawdown_control', e.target.checked)} />
              Drawdown
            </label>
            <label className='flex items-center gap-1 text-slate-300'>
              <input type='checkbox' checked={riskConfig.enable_position_limits} onChange={(e) => handleRiskConfigChange('enable_position_limits', e.target.checked)} />
              Limit Positions
            </label>
          </div>

          <div className='mt-3 rounded-lg border border-slate-700/50 bg-slate-950/60 p-3'>
            <div className='mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400'>سشن‌های معاملاتی</div>
            <div className='flex flex-wrap gap-2'>
              {sessionTemplatesState.map((session) => (
                <label key={session.key} className='flex items-center gap-2 rounded border border-slate-700 px-2 py-1 text-xs text-slate-300'>
                  <input type='checkbox' checked={(riskConfig.selected_sessions || []).includes(session.key)} onChange={() => toggleSession(session.key)} />
                  <span>{session.label}</span>
                  <span className='text-slate-500'>({session.start}–{session.end})</span>
                </label>
              ))}
            </div>
          </div>
          <div className='mt-3 flex items-center gap-2'>
            <Button type='button' variant='secondary' onClick={() => void runRiskAssessment()} disabled={riskLoading}>
              {riskLoading ? 'در حال بررسی…' : 'بررسی ریسک'}
            </Button>
            <div className='text-xs text-slate-400'>بالانس: {Number(balance).toLocaleString('fa-IR')} • Equity: {Number(equity).toLocaleString('fa-IR')}</div>
          </div>
          {renderAssessment()}
        </div>

        <div className='flex items-center gap-2'>
          <Button type='submit' variant='primary' disabled={loading}>{loading ? 'در حال ارسال…' : 'Send'}</Button>
          <div className='text-sm text-slate-300'>{message}</div>
        </div>
      </form>
    </div>
  )
}

OrderTicket.propTypes = {
  defaultSymbol: PropTypes.string,
  onPlaced: PropTypes.func,
  balance: PropTypes.number,
  equity: PropTypes.number,
  activePositions: PropTypes.number,
}

export default OrderTicket
