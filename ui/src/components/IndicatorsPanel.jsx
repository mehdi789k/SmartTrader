import React, { useMemo } from 'react'
import PropTypes from 'prop-types'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend)

const sma = (series = [], period = 10) => {
  if (!Array.isArray(series) || series.length < period) return null
  const window = series.slice(-period)
  const sum = window.reduce((s, v) => s + (Number(v) || 0), 0)
  return sum / period
}

const formatValue = (value) => {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return Number(value).toFixed(5)
}

const IndicatorsPanel = ({ priceSeries = [], symbol = '—', timeframe = '—' }) => {
  const sma10 = useMemo(() => sma(priceSeries, 10), [priceSeries])
  const sma20 = useMemo(() => sma(priceSeries, 20), [priceSeries])
  const latest = priceSeries.length ? priceSeries[priceSeries.length - 1] : null
  const previous = priceSeries.length > 1 ? priceSeries[priceSeries.length - 2] : null
  const priceChange = useMemo(() => {
    if (latest == null || previous == null) return null
    return Number(latest) - Number(previous)
  }, [latest, previous])
  const priceChangePercent = useMemo(() => {
    if (priceChange == null || previous === null || Number(previous) === 0) return null
    return (priceChange / Number(previous)) * 100
  }, [priceChange, previous])

  const signal = useMemo(() => {
    if (sma10 == null || sma20 == null || latest == null) return '—'
    if (sma10 > sma20 && latest > sma10) return 'صعودی'
    if (sma10 < sma20 && latest < sma10) return 'نزولی'
    return 'خنثی'
  }, [sma10, sma20, latest])

  const signalBadgeClass = signal === 'صعودی'
    ? 'bg-emerald-500/15 text-emerald-300'
    : signal === 'نزولی'
      ? 'bg-rose-500/15 text-rose-300'
      : 'bg-slate-700/20 text-slate-300'

  const chartData = useMemo(() => {
    const labels = priceSeries.map((_, index) => `${index + 1}`)
    const sma10Series = priceSeries.map((_, index) => (index + 1 >= 10 ? sma(priceSeries.slice(0, index + 1), 10) : null))
    const sma20Series = priceSeries.map((_, index) => (index + 1 >= 20 ? sma(priceSeries.slice(0, index + 1), 20) : null))

    return {
      labels,
      datasets: [
        {
          label: 'Close',
          data: priceSeries,
          borderColor: '#38bdf8',
          backgroundColor: 'rgba(56, 189, 248, 0.14)',
          tension: 0.3,
          pointRadius: 0,
          fill: true,
        },
        {
          label: 'SMA 10',
          data: sma10Series,
          borderColor: '#facc15',
          backgroundColor: 'transparent',
          borderDash: [6, 4],
          tension: 0.3,
          pointRadius: 0,
        },
        {
          label: 'SMA 20',
          data: sma20Series,
          borderColor: '#a855f7',
          backgroundColor: 'transparent',
          borderDash: [6, 4],
          tension: 0.3,
          pointRadius: 0,
        },
      ],
    }
  }, [priceSeries])

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        labels: { color: '#cbd5e1', boxWidth: 10, boxHeight: 6 },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.dataset.label || ''
            const value = context.parsed.y
            return `${label}: ${value != null ? Number(value).toFixed(5) : '—'}`
          },
        },
      },
    },
    scales: {
      x: {
        ticks: { color: '#94a3b8', maxTicksLimit: 6 },
        grid: { display: false },
      },
      y: {
        ticks: { color: '#94a3b8' },
        grid: { color: 'rgba(148, 163, 184, 0.16)' },
      },
    },
  }

  return (
    <div className='rounded-3xl border border-slate-700/60 bg-slate-950/80 p-5 shadow-xl shadow-slate-950/20 text-sm'>
      <div className='mb-5 flex flex-col gap-4 rounded-3xl border border-slate-800/70 bg-slate-900/80 p-4 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <div className='text-xs uppercase tracking-[0.18em] text-slate-400'>اندیکاتور تکنیکال</div>
          <div className='mt-2 text-xl font-semibold text-white'>{symbol} • {timeframe}</div>
        </div>
        <div className={`rounded-full px-3 py-1 text-xs font-semibold ${signalBadgeClass}`}>
          {signal}
        </div>
      </div>

      {priceSeries.length === 0 ? (
        <div className='rounded-3xl border border-dashed border-slate-700/70 bg-slate-900/70 p-6 text-center text-sm text-slate-400'>برای نمایش اندیکاتورها ابتدا داده‌های تایم‌فریم را بارگذاری کنید.</div>
      ) : (
        <>
          <div className='grid gap-4 lg:grid-cols-3'>
            <div className='rounded-3xl border border-slate-700/70 bg-slate-900/80 p-4'>
              <div className='text-xs text-slate-400'>آخرین قیمت</div>
              <div className='mt-2 text-2xl font-semibold text-white'>{formatValue(latest)}</div>
              <div className={`mt-2 text-sm ${priceChange >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                {priceChange != null ? `${priceChange >= 0 ? '+' : ''}${formatValue(priceChange)} (${priceChangePercent != null ? `${priceChangePercent.toFixed(2)}%` : '—'})` : '—'}
              </div>
            </div>
            <div className='rounded-3xl border border-slate-700/70 bg-slate-900/80 p-4'>
              <div className='text-xs text-slate-400'>تعداد کندل</div>
              <div className='mt-2 text-2xl font-semibold text-white'>{priceSeries.length}</div>
              <div className='mt-2 text-sm text-slate-400'>داده‌های اخیر بازار</div>
            </div>
            <div className='rounded-3xl border border-slate-700/70 bg-slate-900/80 p-4'>
              <div className='text-xs text-slate-400'>سیگنال لحظه‌ای</div>
              <div className='mt-2 text-2xl font-semibold text-white'>{signal}</div>
              <div className='mt-2 text-sm text-slate-400'>بازار بر اساس SMA تحلیل شد</div>
            </div>
          </div>

          <div className='mt-4 grid gap-4 lg:grid-cols-3'>
            <div className='rounded-3xl border border-slate-700/70 bg-slate-900/80 p-4'>
              <div className='text-xs text-slate-400'>SMA 10</div>
              <div className='mt-2 text-xl font-semibold text-slate-100'>{formatValue(sma10)}</div>
            </div>
            <div className='rounded-3xl border border-slate-700/70 bg-slate-900/80 p-4'>
              <div className='text-xs text-slate-400'>SMA 20</div>
              <div className='mt-2 text-xl font-semibold text-slate-100'>{formatValue(sma20)}</div>
            </div>
            <div className='rounded-3xl border border-slate-700/70 bg-slate-900/80 p-4'>
              <div className='text-xs text-slate-400'>دامنه SMA</div>
              <div className='mt-2 text-xl font-semibold text-slate-100'>{formatValue(Math.abs((sma10 ?? 0) - (sma20 ?? 0)))}</div>
            </div>
          </div>

          <div className='mt-4 rounded-[2rem] border border-slate-700/70 bg-slate-900/80 p-3'>
            <div className='mb-3 flex items-center justify-between gap-3'>
              <div className='text-sm font-semibold text-slate-100'>نمودار قیمت و SMA</div>
              <div className='text-xs text-slate-400'>آخرین داده‌ها</div>
            </div>
            <div className='h-56'>
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>
        </>
      )}

      {priceSeries.length > 0 && priceSeries.length < 10 && (
        <div className='mt-4 rounded-3xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200'>برای محاسبه SMA 10 و SMA 20، حداقل ۱۰ کندل نیاز است.</div>
      )}
    </div>
  )
}

IndicatorsPanel.propTypes = {
  priceSeries: PropTypes.arrayOf(PropTypes.number),
  symbol: PropTypes.string,
  timeframe: PropTypes.string,
}

export default IndicatorsPanel
