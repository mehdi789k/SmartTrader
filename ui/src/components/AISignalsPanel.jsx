import React, { useMemo } from 'react'
import PropTypes from 'prop-types'
import { Badge, Button } from './UI'

const sma = (series = [], period = 10) => {
  if (!Array.isArray(series) || series.length < period) return null
  const window = series.slice(-period)
  const sum = window.reduce((s, v) => s + (Number(v) || 0), 0)
  return sum / period
}

const AISignalsPanel = ({ priceSeries = [], symbol = '—', timeframe = '—' }) => {
  const sma10 = useMemo(() => sma(priceSeries, 10), [priceSeries])
  const latest = priceSeries.length ? Number(priceSeries[priceSeries.length - 1]) : null

  const aiDecision = useMemo(() => {
    if (latest == null || sma10 == null) return { signal: 'در انتظار داده', confidence: 0 }
    const signal = latest > sma10 ? 'خرید پیشنهادی (AI)' : 'فروش پیشنهادی (AI)'
    const diff = Math.abs(latest - sma10)
    const confidence = Math.min(98, Math.max(10, Math.round((diff / Math.max(1, sma10)) * 100 * 2)))
    return { signal, confidence }
  }, [latest, sma10])

  return (
    <div className='rounded-3xl border border-slate-700/60 bg-slate-950/85 p-5 text-sm'>
      <div className='mb-3 flex items-center justify-between'>
        <div>
          <div className='text-xs uppercase tracking-[0.18em] text-slate-400'>سیگنال هوشمند</div>
          <div className='mt-1 text-lg font-semibold text-white'>{symbol} • {timeframe}</div>
        </div>
        <Badge variant='teal'>AI</Badge>
      </div>

      <div className='mb-3'>
        <div className='text-sm text-slate-300 font-medium'>{aiDecision.signal}</div>
        <div className='text-xs text-slate-400 mt-1'>اعتماد مدل: {aiDecision.confidence}%</div>
      </div>

      <div className='flex gap-2'>
        <Button variant='primary' size='sm'>اعمال استراتژی</Button>
        <Button variant='ghost' size='sm'>جزئیات AI</Button>
      </div>
    </div>
  )
}

AISignalsPanel.propTypes = {
  priceSeries: PropTypes.arrayOf(PropTypes.number),
  symbol: PropTypes.string,
  timeframe: PropTypes.string,
}

export default AISignalsPanel
