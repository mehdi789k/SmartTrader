import React from 'react'
import PropTypes from 'prop-types'

const Chart = ({ data, symbol = 'EURUSD', timeframe = 'M1', darkMode = true }) => {
  const safeData = Array.isArray(data) ? data : []

  if (safeData.length === 0) {
    return (
      <div className='rounded-[24px] border border-slate-700/50 bg-slate-950/50 p-3'>
        <div className='mb-3 flex items-center justify-between'>
          <div>
            <div className='text-sm font-semibold text-slate-100'>نمودار قیمت زنده</div>
            <div className='text-xs text-slate-400'>{symbol} • {timeframe}</div>
          </div>
          <div className='rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300'>آنلاین</div>
        </div>
        <div className='flex h-[320px] items-center justify-center rounded-xl border border-dashed border-slate-700/70 text-sm text-slate-400'>در حال آماده‌سازی داده‌های نمودار...</div>
      </div>
    )
  }

  const width = 700
  const height = 320
  const margin = { top: 24, right: 20, bottom: 28, left: 40 }
  const innerWidth = width - margin.left - margin.right
  const innerHeight = height - margin.top - margin.bottom
  const values = safeData.map((item) => Number(item.close)).filter((value) => Number.isFinite(value))
  const min = Math.min(...values)
  const max = Math.max(...values)
  const padding = (max - min) * 0.1 || 0.01
  const chartMin = min - padding
  const chartMax = max + padding
  const toY = (value) => margin.top + ((chartMax - value) / (chartMax - chartMin)) * innerHeight

  return (
    <div className='rounded-[24px] border border-slate-700/50 bg-slate-950/50 p-3'>
      <div className='mb-3 flex items-center justify-between'>
        <div>
          <div className='text-sm font-semibold text-slate-100'>نمودار قیمت زنده</div>
          <div className='text-xs text-slate-400'>{symbol} • {timeframe}</div>
        </div>
        <div className='rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300'>آنلاین</div>
      </div>
      <div className='overflow-hidden rounded-xl border border-slate-800/70 bg-slate-900/60 p-2'>
        <svg viewBox={`0 0 ${width} ${height}`} className='h-[320px] w-full'>
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = margin.top + ratio * innerHeight
            const value = chartMax - (chartMax - chartMin) * ratio
            return (
              <g key={ratio}>
                <line x1={margin.left} y1={y} x2={width - margin.right} y2={y} stroke={darkMode ? '#334155' : '#cbd5e1'} strokeDasharray='4 4' />
                <text x={8} y={y + 4} fontSize='11' fill={darkMode ? '#94a3b8' : '#64748b'}>{value.toFixed(5)}</text>
              </g>
            )
          })}
          {values.map((value, index) => {
            const x = margin.left + (index / Math.max(values.length - 1, 1)) * innerWidth
            const y = toY(value)
            return <circle key={`${value}-${index}`} cx={x} cy={y} r='2.8' fill='#38bdf8' />
          })}
          {values.length > 1 && (
            <path
              d={values.map((value, index) => `${index === 0 ? 'M' : 'L'} ${margin.left + (index / Math.max(values.length - 1, 1)) * innerWidth} ${toY(value)}`).join(' ')}
              fill='none'
              stroke='#38bdf8'
              strokeWidth='2.4'
              strokeLinecap='round'
            />
          )}
        </svg>
      </div>
    </div>
  )
}

Chart.propTypes = {
  data: PropTypes.array,
  symbol: PropTypes.string,
  timeframe: PropTypes.string,
  darkMode: PropTypes.bool,
}

export default Chart
