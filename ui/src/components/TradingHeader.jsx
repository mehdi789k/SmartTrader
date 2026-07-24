import React from 'react'
import PropTypes from 'prop-types'
import { Button } from './UI'

const TradingHeader = ({ symbol, setSymbol, timeframe, setTimeframe, selectedSessionKeys, setSelectedSessionKeys, sessionOptions, lastPrice, onQuickBuy, onQuickSell, theme, quickVolume, setQuickVolume, quickKind, setQuickKind, quickPrice, setQuickPrice, quickSL, setQuickSL, quickTP, setQuickTP, actionLoading }) => {
  const allSelected = selectedSessionKeys.length === sessionOptions.length
  const toggleSessionKey = (key) => {
    setSelectedSessionKeys((current) => {
      if (current.includes(key)) {
        return current.filter((item) => item !== key)
      }
      return [...current, key]
    })
  }
  const toggleSelectAllSessions = () => {
    if (allSelected) {
      setSelectedSessionKeys([])
    } else {
      setSelectedSessionKeys(sessionOptions.map((session) => session.key))
    }
  }

  return (
    <div className='flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between'>
      <div className='flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end'>
        <div className='min-w-[220px]'>
          <label htmlFor='trading-symbol' className={`block text-xs ${theme?.muted || 'text-slate-500'}`}>نماد</label>
          <input id='trading-symbol' value={symbol} onChange={(e) => setSymbol(e.target.value)} aria-label='نماد' className={`w-full rounded-2xl border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 ${theme?.input || ''}`} />
        </div>
        <div className='min-w-[140px]'>
          <label htmlFor='trading-timeframe' className={`block text-xs ${theme?.muted || 'text-slate-500'}`}>تایم‌فریم</label>
          <select id='trading-timeframe' value={timeframe} onChange={(e) => setTimeframe(e.target.value)} aria-label='تایم‌فریم' className={`w-full rounded-2xl border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 ${theme?.input || ''}`}>
            <option value='M1'>M1</option>
            <option value='M5'>M5</option>
            <option value='M15'>M15</option>
            <option value='M30'>M30</option>
            <option value='H1'>H1</option>
            <option value='H4'>H4</option>
            <option value='D1'>D1</option>
          </select>
        </div>
        <div className='min-w-[220px]'>
          <div className='flex items-center justify-between gap-2'>
            <label htmlFor='trading-session' className={`block text-xs ${theme?.muted || 'text-slate-500'}`}>سشن‌های معاملاتی</label>
            <button type='button' onClick={toggleSelectAllSessions} className='text-xs text-sky-300 transition hover:text-sky-200'>{allSelected ? 'لغو همه' : 'انتخاب همه'}</button>
          </div>
          <div className={`mt-2 rounded-[28px] border border-slate-700/70 bg-slate-950/45 p-3 ${theme?.text}`}>
            <div className='grid gap-2'>
              {sessionOptions.map((session) => (
                <label key={session.key} className='flex items-center gap-2 rounded-full border border-slate-700/60 bg-slate-900/80 px-3 py-2 text-sm transition hover:border-sky-400'>
                  <input type='checkbox' checked={selectedSessionKeys.includes(session.key)} onChange={() => toggleSessionKey(session.key)} />
                  <span>{session.label} ({session.range})</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className='min-w-[120px]'>
          <label htmlFor='quick-volume' className={`block text-xs ${theme?.muted || 'text-slate-500'}`}>حجم (لات)</label>
          <input id='quick-volume' type='number' step='0.01' value={quickVolume} onChange={(e) => setQuickVolume(Number(e.target.value || 0))} aria-label='حجم معامله' className={`w-full rounded-2xl border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 ${theme?.input || ''}`} />
        </div>

        <div className='min-w-[140px]'>
          <label htmlFor='quick-kind' className={`block text-xs ${theme?.muted || 'text-slate-500'}`}>نوع سفارش</label>
          <select id='quick-kind' value={quickKind} onChange={(e) => setQuickKind(e.target.value)} aria-label='نوع سفارش' className={`w-full rounded-2xl border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 ${theme?.input || ''}`}>
            <option value='MARKET'>بازار</option>
            <option value='LIMIT'>محدود</option>
          </select>
        </div>
      </div>

      <div className='flex flex-col gap-3 lg:flex-row lg:items-end'>
        <div className='text-right'>
          <div className={`text-sm ${theme?.muted || 'text-slate-500'}`}>قیمت آخر</div>
          <div className={`text-xl font-semibold ${theme?.text || 'text-slate-900'}`}>{lastPrice ?? '—'}</div>
        </div>

        <div className='flex flex-col gap-2'>
          {quickKind === 'LIMIT' && (
            <input type='number' step='0.00001' value={quickPrice || ''} onChange={(e) => setQuickPrice(e.target.value)} placeholder='قیمت محدود' aria-label='قیمت محدود' className={`rounded-2xl border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 ${theme?.input || ''}`} />
          )}
          <div className='flex flex-wrap gap-2'>
            <input type='number' step='0.00001' value={quickSL || ''} onChange={(e) => setQuickSL(e.target.value)} placeholder='SL' aria-label='حد ضرر' className={`rounded-2xl border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 ${theme?.input || ''}`} />
            <input type='number' step='0.00001' value={quickTP || ''} onChange={(e) => setQuickTP(e.target.value)} placeholder='TP' aria-label='حد سود' className={`rounded-2xl border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 ${theme?.input || ''}`} />
          </div>
        </div>

        <div className='flex gap-2'>
          <Button variant='success' onClick={onQuickBuy} disabled={actionLoading}>خرید</Button>
          <Button variant='danger' onClick={onQuickSell} disabled={actionLoading}>فروش</Button>
        </div>
      </div>
    </div>
  )
}

TradingHeader.propTypes = {
  symbol: PropTypes.string.isRequired,
  setSymbol: PropTypes.func.isRequired,
  timeframe: PropTypes.string.isRequired,
  setTimeframe: PropTypes.func.isRequired,
  selectedSessionKeys: PropTypes.arrayOf(PropTypes.string).isRequired,
  setSelectedSessionKeys: PropTypes.func.isRequired,
  sessionOptions: PropTypes.arrayOf(PropTypes.shape({
    key: PropTypes.string,
    label: PropTypes.string,
    range: PropTypes.string,
  })).isRequired,
  lastPrice: PropTypes.string,
  onQuickBuy: PropTypes.func.isRequired,
  onQuickSell: PropTypes.func.isRequired,
  theme: PropTypes.object.isRequired,
  quickVolume: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  setQuickVolume: PropTypes.func.isRequired,
  quickKind: PropTypes.string.isRequired,
  setQuickKind: PropTypes.func.isRequired,
  quickPrice: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  setQuickPrice: PropTypes.func.isRequired,
  quickSL: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  setQuickSL: PropTypes.func.isRequired,
  quickTP: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  setQuickTP: PropTypes.func.isRequired,
  actionLoading: PropTypes.bool.isRequired,
}

export default TradingHeader
