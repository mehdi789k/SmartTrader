import React, { useMemo } from 'react'
import PropTypes from 'prop-types'
import { Card } from './UI'

const SmartSignal = ({ price, atr = 0.0012, trend = 'up', symbol = 'EURUSD', timeframe = 'M1' }) => {
  const signal = useMemo(() => {
    const safePrice = Number(price) || 1.085
    const safeAtr = Number(atr) || 0.0012
    const base = safePrice
    const tpDistance = safeAtr * 2.5
    const slDistance = safeAtr * 1.3

    const buyLevels = [
      { label: 'TP1', value: base + tpDistance * 0.6, color: 'text-emerald-400' },
      { label: 'TP2', value: base + tpDistance * 1.2, color: 'text-emerald-400' },
      { label: 'TP3', value: base + tpDistance * 1.8, color: 'text-emerald-400' },
    ]

    const sellLevels = [
      { label: 'TP1', value: base - tpDistance * 0.6, color: 'text-rose-400' },
      { label: 'TP2', value: base - tpDistance * 1.2, color: 'text-rose-400' },
      { label: 'TP3', value: base - tpDistance * 1.8, color: 'text-rose-400' },
    ]

    return {
      bias: trend === 'down' ? 'فروش' : 'خرید',
      entry: base,
      stopLoss: trend === 'down' ? base + slDistance : base - slDistance,
      buyLevels,
      sellLevels,
    }
  }, [price, atr, trend])

  return (
    <Card variant='dark' className='p-5 text-right'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <h3 className='text-lg font-semibold text-slate-100'>سیگنال هوشمند</h3>
          <p className='mt-1 text-sm text-slate-400'>محاسبه خودکار اهداف ورود و حد ضرر بر اساس ATR و نوسان بازار.</p>
        </div>
        <div className={`rounded-full px-3 py-1 text-sm font-semibold ${trend === 'down' ? 'bg-rose-500/10 text-rose-300' : 'bg-emerald-500/10 text-emerald-300'}`}>
          {signal.bias}
        </div>
      </div>

      <div className='mt-4 grid gap-3 md:grid-cols-2'>
        <div className='rounded-2xl border border-slate-700/70 bg-slate-950/60 p-3'>
          <div className='text-xs text-slate-400'>قیمت ورود</div>
          <div className='mt-2 text-xl font-semibold text-slate-100'>{Number(signal.entry).toFixed(5)}</div>
          <div className='mt-2 text-xs text-slate-500'>{symbol} • {timeframe}</div>
        </div>
        <div className='rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3'>
          <div className='text-xs text-amber-200'>حد ضرر (SL)</div>
          <div className='mt-2 text-xl font-semibold text-amber-300'>{Number(signal.stopLoss).toFixed(5)}</div>
        </div>
      </div>

      <div className='mt-4 grid gap-3 lg:grid-cols-2'>
        <div className='rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3'>
          <div className='mb-2 text-sm font-semibold text-emerald-300'>اهداف خرید</div>
          <div className='space-y-2'>
            {signal.buyLevels.map((item) => (
              <div key={item.label} className='flex items-center justify-between rounded-lg bg-slate-950/40 px-3 py-2 text-sm text-slate-200'>
                <span>{item.label}</span>
                <span className={item.color}>{Number(item.value).toFixed(5)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className='rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3'>
          <div className='mb-2 text-sm font-semibold text-rose-300'>اهداف فروش</div>
          <div className='space-y-2'>
            {signal.sellLevels.map((item) => (
              <div key={item.label} className='flex items-center justify-between rounded-lg bg-slate-950/40 px-3 py-2 text-sm text-slate-200'>
                <span>{item.label}</span>
                <span className={item.color}>{Number(item.value).toFixed(5)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  )
}

SmartSignal.propTypes = {
  price: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  atr: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  trend: PropTypes.oneOf(['up', 'down']),
  symbol: PropTypes.string,
  timeframe: PropTypes.string,
}

export default SmartSignal
