import React, { useEffect, useMemo, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import { Chart as ChartJS, ArcElement, CategoryScale, Filler, Legend, LinearScale, LineElement, PointElement, Tooltip } from 'chart.js'
import { Doughnut, Line } from 'react-chartjs-2'
import { Badge, Button, Card, Alert, Modal } from '../components/UI'
import IndicatorsPanel from '../components/IndicatorsPanel'
import AISignalsPanel from '../components/AISignalsPanel'
import FiltersPanel from '../components/FiltersPanel'
import CustomIndicatorsPanel from '../components/CustomIndicatorsPanel'
import TradingHeader from '../components/TradingHeader'
import { api } from '../api'
import AccountSettingsPanel from '../components/AccountSettingsPanel'
import { useAuthStore } from '../store'

ChartJS.register(ArcElement, CategoryScale, Filler, Legend, LinearScale, LineElement, PointElement, Tooltip)

const timeframeOptions = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1']

const sessionOptions = [
  { key: 'asia', label: 'آسیا', range: '00:00–08:00', start: 0, end: 8 },
  { key: 'london', label: 'لندن', range: '08:00–17:00', start: 8, end: 17 },
  { key: 'new_york', label: 'نیویورک', range: '17:00–24:00', start: 17, end: 24 },
]

const formatNumber = (value, digits = 2) => {
  const numericValue = Number(value)
  if (Number.isFinite(numericValue)) {
    return numericValue.toLocaleString('fa-IR', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    })
  }
  return value ?? '—'
}

const formatDate = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('fa-IR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

const getTradeTimestamp = (entry) => {
  const value = entry.close_time || entry.time || ''
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : 0
}

const getTradePrice = (entry, ...keys) => {
  for (const key of keys) {
    const value = Number(entry[key])
    if (Number.isFinite(value) && value !== 0) return value
  }
  return null
}

const getTradeChange = (entry) => {
  const explicitChange = Number(entry.change ?? entry.change_percent ?? entry.changePercent)
  if (Number.isFinite(explicitChange)) return explicitChange

  const openPrice = getTradePrice(entry, 'price_open', 'priceOpen', 'open_price')
  const closePrice = getTradePrice(entry, 'price', 'close_price', 'closePrice')
  if (openPrice === null || closePrice === null || openPrice === 0) return null
  return ((closePrice - openPrice) / openPrice) * 100
}

const formatRealtimeUpdate = (timestamp) => {
  if (!timestamp) return '—'
  const now = new Date()
  const date = new Date(timestamp)
  const diffSeconds = Math.floor((now - date) / 1000)
  
  if (diffSeconds < 5) {
    return 'الآن'
  } else if (diffSeconds < 60) {
    return `${diffSeconds} ثانیه پیش`
  } else if (diffSeconds < 3600) {
    const minutes = Math.floor(diffSeconds / 60)
    return `${minutes} دقیقه پیش`
  }
  
  return date.toLocaleString('fa-IR', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  })
}

const getPayload = (result) => {
  if (result?.status !== 'fulfilled') return null
  const value = result.value
  if (value && typeof value === 'object' && 'data' in value) {
    return value.data
  }
  return value
}

const formatPercent = (value, digits = 2) => {
  const numericValue = Number(value)
  if (Number.isFinite(numericValue)) {
    return `${numericValue.toLocaleString('fa-IR', { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`
  }
  return '—'
}

const CandlestickChart = ({ data, darkMode }) => {
  if (!data || data.length === 0) {
    return <div className='flex h-72 items-center justify-center rounded-xl border border-dashed border-slate-700/60 bg-slate-900/40 text-sm text-slate-400'>برای نمایش کندل‌استیک، داده‌های تایم‌فریم را بارگذاری کنید.</div>
  }

  const width = 680
  const height = 280
  const margin = { top: 24, right: 20, bottom: 48, left: 48 }
  const innerWidth = width - margin.left - margin.right
  const innerHeight = height - margin.top - margin.bottom
  const min = Math.min(...data.map((item) => item.low))
  const max = Math.max(...data.map((item) => item.high))
  const padding = (max - min) * 0.1 || 0.01
  const chartMin = min - padding
  const chartMax = max + padding
  const priceToY = (value) => margin.top + ((chartMax - value) / (chartMax - chartMin)) * innerHeight
  const volumeMax = Math.max(...data.map((item) => item.volume || 0), 1)
  const candleWidth = Math.min(14, Math.max(6, innerWidth / data.length / 1.65))

  return (
    <div className='overflow-x-auto rounded-xl border border-slate-700/50 bg-slate-950/40 p-2'>
      <svg viewBox={`0 0 ${width} ${height}`} className='h-72 w-full max-w-full'>
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
        {data.map((item, index) => {
          const x = margin.left + index * (innerWidth / data.length) + innerWidth / data.length / 2
          const openY = priceToY(item.open)
          const closeY = priceToY(item.close)
          const highY = priceToY(item.high)
          const lowY = priceToY(item.low)
          const color = item.close >= item.open ? '#22c55e' : '#ef4444'
          const bodyTop = Math.min(openY, closeY)
          const bodyHeight = Math.max(Math.abs(closeY - openY), 2)
          const volumeHeight = ((item.volume || 0) / volumeMax) * 42
          return (
            <g key={`${item.open}-${index}`}>
              <line x1={x} y1={highY} x2={x} y2={lowY} stroke={color} strokeWidth='1.5' />
              <rect x={x - candleWidth / 2} y={bodyTop} width={candleWidth} height={bodyHeight} rx='2' fill={color} />
              <rect x={x - candleWidth / 2 + 1} y={height - margin.bottom - volumeHeight + 2} width={candleWidth - 2} height={Math.max(volumeHeight, 2)} rx='2' fill={darkMode ? '#38bdf8' : '#3b82f6'} opacity='0.65' />
              <text x={x - 10} y={height - 18} fontSize='10' fill={darkMode ? '#94a3b8' : '#64748b'}>{index + 1}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

const DashboardPage = () => {
  const [darkMode, setDarkMode] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [symbol, setSymbol] = useState('EURUSD')
  const [symbolSuggestions, setSymbolSuggestions] = useState([])
  const [timeframe, setTimeframe] = useState('M1')
  const [selectedTimeframes, setSelectedTimeframes] = useState(['M1'])
  const [data, setData] = useState(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [minVolumeFilter, setMinVolumeFilter] = useState(0)
  const [minPriceFilter, setMinPriceFilter] = useState('')
  const [maxPriceFilter, setMaxPriceFilter] = useState('')
  const [filterSessionKeys, setFilterSessionKeys] = useState([])
  const [serverFiltersEnabled, setServerFiltersEnabled] = useState(false)
  // Indicator filters
  const [filterCloseAboveSMA, setFilterCloseAboveSMA] = useState(false)
  const [filterSMAPeriod, setFilterSMAPeriod] = useState(20)
  const [filterRSIEnabled, setFilterRSIEnabled] = useState(false)
  const [filterRSILevel, setFilterRSILevel] = useState(30)
  const [filterRSIPeriod, setFilterRSIPeriod] = useState(14)
  const [filterRSIAbove, setFilterRSIAbove] = useState(false)
  const [filterMACDEnabled, setFilterMACDEnabled] = useState(false)
  const [filterMACDHistEnabled, setFilterMACDHistEnabled] = useState(false)
  const [filterMACDHistAbove, setFilterMACDHistAbove] = useState(true)
  const [filterMACDHistThreshold, setFilterMACDHistThreshold] = useState(0)
  const [filterVolumeSpikeEnabled, setFilterVolumeSpikeEnabled] = useState(false)
  const [filterVolumeSpikeMultiplier, setFilterVolumeSpikeMultiplier] = useState(2)
  const [filterCandleDirection, setFilterCandleDirection] = useState('both') // 'bull', 'bear', 'both'
  // MA crossover / slope
  const [filterMACrossoverEnabled, setFilterMACrossoverEnabled] = useState(false)
  const [filterMAFastPeriod, setFilterMAFastPeriod] = useState(12)
  const [filterMASlowPeriod, setFilterMASlowPeriod] = useState(26)
  const [filterMACrossoverRequireCross, setFilterMACrossoverRequireCross] = useState(false)
  const [filterMASlopeEnabled, setFilterMASlopeEnabled] = useState(false)
  const [filterMASlopePeriod, setFilterMASlopePeriod] = useState(5)
  const [filterMASlopeThreshold, setFilterMASlopeThreshold] = useState(0.0001)
  // ADX
  const [filterADXEnabled, setFilterADXEnabled] = useState(false)
  const [filterADXPeriod, setFilterADXPeriod] = useState(14)
  const [filterADXThreshold, setFilterADXThreshold] = useState(25)
  // Bollinger
  const [filterBollingerEnabled, setFilterBollingerEnabled] = useState(false)
  const [filterBollingerPeriod, setFilterBollingerPeriod] = useState(20)
  const [filterBollingerStd, setFilterBollingerStd] = useState(2)
  // ATR Volatility Breakout
  const [filterATRBreakoutEnabled, setFilterATRBreakoutEnabled] = useState(false)
  const [filterATRPeriod, setFilterATRPeriod] = useState(14)
  const [filterATRMultiplier, setFilterATRMultiplier] = useState(1.5)
  // VWAP
  const [filterVWAPEnabled, setFilterVWAPEnabled] = useState(false)
  // Heikin-Ashi / consecutive candles
  const [filterHeikenEnabled, setFilterHeikenEnabled] = useState(false)
  const [filterHeikenConsecutive, setFilterHeikenConsecutive] = useState(3)
  // SuperTrend
  const [filterSuperTrendEnabled, setFilterSuperTrendEnabled] = useState(false)
  const [filterSuperTrendATRPeriod, setFilterSuperTrendATRPeriod] = useState(10)
  const [filterSuperTrendMultiplier, setFilterSuperTrendMultiplier] = useState(3)
  // OBV / MFI
  const [filterOBVEnabled, setFilterOBVEnabled] = useState(false)
  const [filterMFIEnabled, setFilterMFIEnabled] = useState(false)
  const [filterMFIPeriod, setFilterMFIPeriod] = useState(14)
  const [filterMFIThreshold, setFilterMFIThreshold] = useState(20)
  // HTF alignment
  const [htfEnabled, setHtfEnabled] = useState(false)
  const [htfTimeframe, setHtfTimeframe] = useState('H1')
  const [htfDirection, setHtfDirection] = useState('up') // 'up'|'down'
  const [htfData, setHtfData] = useState(null)
  // Trendline / Channel detection
  const [filterTrendEnabled, setFilterTrendEnabled] = useState(false)
  const [filterTrendWindow, setFilterTrendWindow] = useState(80)
  const [filterTrendRequireBreak, setFilterTrendRequireBreak] = useState(true)
  const [filterTrendDirection, setFilterTrendDirection] = useState('above') // 'above'|'below'|'both'
  const [quickVolume, setQuickVolume] = useState(0.1)
  const [quickKind, setQuickKind] = useState('MARKET')
  const [quickPrice, setQuickPrice] = useState('')
  const [quickSL, setQuickSL] = useState('')
  const [quickTP, setQuickTP] = useState('')
  const [selectedSessionKeys, setSelectedSessionKeys] = useState(() => {
    const hour = new Date().getHours()
    if (hour >= 8 && hour < 17) return ['london']
    if (hour >= 17) return ['new_york']
    return ['asia']
  })
  const [loading, setLoading] = useState(false)
  const [exportedPath, setExportedPath] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [statusType, setStatusType] = useState('info')
  const [lastTradeHistoryUpdate, setLastTradeHistoryUpdate] = useState(null)
  const [tradeHistoryLimit, setTradeHistoryLimit] = useState(10)
  const [overview, setOverview] = useState({
    accountInfo: null,
    positions: [],
    orders: [],
    tradeHistory: [],
    symbols: [],
  })
  const [overviewLoading, setOverviewLoading] = useState(false)
  const [overviewError, setOverviewError] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [batchResults, setBatchResults] = useState([])
  const [batchLoading, setBatchLoading] = useState(false)
  const [activeAction, setActiveAction] = useState('')
  const logout = useAuthStore((state) => state.logout)
  const confirmCallbackRef = React.useRef(null)
  const symbolSearchRef = useRef(null)
  const suppressSuggestionHideRef = React.useRef(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [confirmTitle, setConfirmTitle] = useState('')

  useEffect(() => {
    const handlePageClick = (event) => {
      if (symbolSearchRef.current && !symbolSearchRef.current.contains(event.target)) {
        setSymbolSuggestions([])
      }
    }

    document.addEventListener('mousedown', handlePageClick)
    return () => document.removeEventListener('mousedown', handlePageClick)
  }, [])

  const theme = darkMode ? {
    page: 'min-h-screen w-full overflow-x-hidden bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.2),_transparent_28%),linear-gradient(135deg,_#020617_0%,_#0f172a_45%,_#111827_100%)] p-2 text-slate-100 sm:p-4 lg:p-6 xl:p-8',
    text: 'text-slate-100',
    muted: 'text-slate-400',
    subtle: 'text-slate-500',
    input: 'border-slate-700 bg-slate-950/70 text-slate-100 placeholder:text-slate-500',
    panel: 'bg-slate-900/85 border-slate-800',
    tableHead: 'bg-slate-800/80 text-slate-300',
    tableRow: 'border-slate-800 hover:bg-slate-800/60',
    chip: 'bg-slate-800/80 text-slate-200',
    status: 'border-slate-700 bg-slate-900/70 text-slate-300',
  } : {
    page: 'min-h-screen w-full overflow-x-hidden bg-slate-100 p-2 text-slate-900 sm:p-4 lg:p-6 xl:p-8',
    text: 'text-slate-900',
    muted: 'text-slate-600',
    subtle: 'text-slate-500',
    input: 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400',
    panel: 'bg-white/95 border-slate-200',
    tableHead: 'bg-slate-100 text-slate-700',
    tableRow: 'border-slate-200 hover:bg-slate-50',
    chip: 'bg-slate-100 text-slate-700',
    status: 'border-slate-200 bg-slate-50 text-slate-700',
  }

  const handleRefreshOverview = async () => {
    setOverviewLoading(true)
    setOverviewError('')
    try {
      const [accountRes, positionsRes, ordersRes, historyRes, symbolsRes] = await Promise.allSettled([
        api.getAccountInfo(),
        api.getPositions(),
        api.getOrders(),
        api.getTradeHistory({ limit: tradeHistoryLimit, page: 1 }),
        api.getSymbols(''),
      ])

      const accountInfo = getPayload(accountRes)
      const positions = getPayload(positionsRes) || []
      const orders = getPayload(ordersRes) || []
      const tradeHistory = getPayload(historyRes) || []
      const symbols = getPayload(symbolsRes) || []

      console.log('Trade History Fetched:', {
        count: tradeHistory.length,
        firstTrade: tradeHistory[0],
        allTrades: tradeHistory,
      })

      setOverview({ accountInfo, positions, orders, tradeHistory, symbols })
      setLastTradeHistoryUpdate(new Date())
      if (!accountInfo && positions.length === 0 && orders.length === 0 && tradeHistory.length === 0 && symbols.length === 0) {
        setOverviewError('در حال حاضر داده‌ای از حساب MT5 در دسترس نیست.')
      }
    } catch (err) {
      console.error('Overview refresh error', err)
      setOverviewError(typeof err === 'string' ? err : 'به‌روزرسانی داشبورد با خطا مواجه شد.')
    } finally {
      setOverviewLoading(false)
    }
  }

  useEffect(() => {
    void handleRefreshOverview()
    
    // Auto-refresh overview every 10 seconds to keep trade history updated
    const refreshInterval = setInterval(() => {
      void handleRefreshOverview()
    }, 10000)
    
    return () => clearInterval(refreshInterval)
  }, [tradeHistoryLimit])

  useEffect(() => {
    const query = (symbol || '').trim()
    if (!query) {
      setSymbolSuggestions([])
      return
    }

    const timer = window.setTimeout(async () => {
      try {
        const response = await api.getSymbols(query)
        const items = Array.isArray(response?.data) ? response.data : []
        const normalizedQuery = query.toLowerCase()
        const filtered = items.filter((item) => item && item.toLowerCase().includes(normalizedQuery)).slice(0, 8)
        setSymbolSuggestions(filtered)
      } catch (err) {
        setSymbolSuggestions([])
      }
    }, 250)

    return () => window.clearTimeout(timer)
  }, [symbol])

  const toggleTimeframeSelection = (value) => {
    setSelectedTimeframes((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value])
  }

  const toggleFilterSessionKey = (key) => {
    setFilterSessionKeys((current) => current.includes(key) ? current.filter((k) => k !== key) : [...current, key])
  }

  const toggleSelectAllTimeframes = () => {
    setSelectedTimeframes((current) => current.length === timeframeOptions.length ? [] : [...timeframeOptions])
  }

  const handleLoadSelectedTimeframes = async () => {
    setSymbolSuggestions([])
    const s = (symbol || '').trim().toUpperCase()
    if (!s) {
      setStatusMessage('لطفاً یک نماد وارد کنید.')
      return
    }

    if (selectedTimeframes.length === 0) {
      setStatusMessage('لطفاً حداقل یک تایم‌فریم را انتخاب کنید.')
      return
    }

    setBatchLoading(true)
    setBatchResults([])
    setStatusMessage('')
    setData(null)
    setExportedPath('')

    try {
      const results = []
      for (const tf of selectedTimeframes) {
        const serverFilters = serverFiltersEnabled ? {
          start_date: filterFrom || undefined,
          end_date: filterTo || undefined,
          min_volume: minVolumeFilter || undefined,
          min_price: minPriceFilter || undefined,
          max_price: maxPriceFilter || undefined,
          selected_sessions: filterSessionKeys.length > 0 ? filterSessionKeys.join(',') : undefined,
          // Ask server to compute indicators and (optionally) apply indicator filters
          compute_indicators: true,
          apply_indicator_filters: serverFiltersEnabled && (filterCloseAboveSMA || filterRSIEnabled || filterMACDEnabled || filterMACDHistEnabled || filterVolumeSpikeEnabled || filterHeikenEnabled || filterMFIEnabled || filterSuperTrendEnabled),
          // pass some indicator params
          filter_sma_period: filterSMAPeriod,
          filter_rsi_period: filterRSIPeriod,
          filter_rsi_enabled: filterRSIEnabled,
          filter_rsi_level: filterRSILevel,
          filter_rsi_above: filterRSIAbove,
          filter_close_above_sma: filterCloseAboveSMA,
          filter_heiken_enabled: filterHeikenEnabled,
          filter_heiken_consecutive: filterHeikenConsecutive,
          filter_mfi_enabled: filterMFIEnabled,
            filter_rsi_period: filterRSIPeriod,
          filter_mfi_threshold: filterMFIThreshold,
          filter_supertrend_enabled: filterSuperTrendEnabled,
            filter_close_above_sma: filterCloseAboveSMA,
          filter_super_atr: filterSuperTrendATRPeriod,
          filter_super_mult: filterSuperTrendMultiplier,
          filter_trend_window: filterTrendWindow,
          // MACD/MA mapping
          filter_ma_fast: filterMAFastPeriod,
          filter_ma_slow: filterMASlowPeriod,
          // Bollinger
          filter_bollinger_period: filterBollingerPeriod,
          filter_bollinger_std: filterBollingerStd,
          // MACD histogram filter
            // MACD/MA mapping
            filter_ma_fast: filterMAFastPeriod,
            filter_ma_slow: filterMASlowPeriod,
            // Bollinger
            filter_bollinger_period: filterBollingerPeriod,
            filter_bollinger_std: filterBollingerStd,
            // MACD histogram filter
          filter_macd_hist_enabled: filterMACDHistEnabled,
          filter_macd_hist_threshold: filterMACDHistThreshold,
          filter_macd_fast: filterMAFastPeriod,
          filter_macd_slow: filterMASlowPeriod,
          filter_macd_signal: 9,
          // ATR breakout
          filter_atr_breakout_enabled: filterATRBreakoutEnabled,
          filter_atr_period: filterATRPeriod,
          filter_atr_multiplier: filterATRMultiplier,
        } : {}
        const resp = await api.getSymbolTimeframeData(s, tf, 300, serverFilters)
        const payload = resp?.data || resp
        results.push({ timeframe: tf, payload, candleCount: payload?.candles?.length || 0 })
      }

      // If HTF alignment requested, fetch HTF payload as well
      if (htfEnabled && htfTimeframe) {
        try {
          const serverFilters = serverFiltersEnabled ? {
            start_date: filterFrom || undefined,
            end_date: filterTo || undefined,
            min_volume: minVolumeFilter || undefined,
            min_price: minPriceFilter || undefined,
            max_price: maxPriceFilter || undefined,
            selected_sessions: filterSessionKeys.length > 0 ? filterSessionKeys.join(',') : undefined,
          } : {}
          const htfResp = await api.getSymbolTimeframeData(s, htfTimeframe, 500, serverFilters)
          const htfPayload = htfResp?.data || htfResp
          setHtfData(htfPayload)
        } catch (e) {
          console.warn('Failed to fetch HTF data', e)
          setHtfData(null)
        }
      } else {
        setHtfData(null)
      }

      const successful = results.filter((entry) => (entry.payload?.candles?.length || 0) > 0)
      setBatchResults(results)

      if (successful.length > 0) {
        const firstSuccess = successful[0]
        setData(firstSuccess.payload)
        setFiltersOpen(true)
        setTimeframe(firstSuccess.timeframe)
        setStatusMessage(`داده‌های ${s} برای ${successful.map((item) => item.timeframe).join(', ')} با موفقیت بارگذاری شد.`)
      } else {
        setData({ requested_symbol: s, timeframe: selectedTimeframes[0], candles: [] })
        setStatusMessage(`هیچ کندلی برای ${s} در تایم‌فریم‌های انتخابی یافت نشد.`)
      }
    } catch (err) {
      console.error('Load selected timeframes error', err)
      setBatchResults([])
      setData({ requested_symbol: s, timeframe: selectedTimeframes[0], candles: [] })
      const message = typeof err === 'string' ? err : 'بارگذاری داده با خطا مواجه شد.'
      const friendlyMessage = /401|unauthorized|توکن|connected/i.test(message)
        ? 'برای بارگذاری داده‌های نماد، ابتدا باید دوباره وارد شوید یا اتصال MT5 فعال باشد.'
        : message
      setStatusMessage(friendlyMessage)
    } finally {
      setBatchLoading(false)
    }
  }

  const handleExport = async (requestedSymbol) => {
    const s = (requestedSymbol || symbol || '').trim().toUpperCase()
    if (!s) {
      setStatusMessage('لطفاً یک نماد وارد کنید.')
      return
    }

    const timeframesToExport = Array.from(new Set((selectedTimeframes.length > 0 ? selectedTimeframes : [timeframe]).filter(Boolean)))
    if (timeframesToExport.length === 0) {
      setStatusMessage('لطفاً حداقل یک تایم‌فریم را انتخاب کنید.')
      return
    }

    setLoading(true)
    setExportedPath('')
    setStatusMessage('')

    try {
      const resolvedEntries = await Promise.all(timeframesToExport.map(async (tf) => {
        const existingEntry = batchResults.find((entry) => entry.timeframe === tf)
        if (existingEntry?.payload && (existingEntry.payload.candles?.length > 0 || existingEntry.payload.requested_symbol)) {
          return existingEntry
        }

        const serverFilters = serverFiltersEnabled ? {
          start_date: filterFrom || undefined,
          end_date: filterTo || undefined,
          min_volume: minVolumeFilter || undefined,
          min_price: minPriceFilter || undefined,
          max_price: maxPriceFilter || undefined,
          selected_sessions: filterSessionKeys.length > 0 ? filterSessionKeys.join(',') : undefined,
          // include indicator/filter params as in load
          compute_indicators: true,
          apply_indicator_filters: serverFiltersEnabled && (filterCloseAboveSMA || filterRSIEnabled || filterMACDEnabled || filterMACDHistEnabled || filterVolumeSpikeEnabled || filterHeikenEnabled || filterMFIEnabled || filterSuperTrendEnabled),
          filter_sma_period: filterSMAPeriod,
          filter_rsi_period: filterRSIPeriod,
          filter_rsi_enabled: filterRSIEnabled,
          filter_rsi_level: filterRSILevel,
          filter_rsi_above: filterRSIAbove,
          filter_close_above_sma: filterCloseAboveSMA,
          filter_mfi_enabled: filterMFIEnabled,
          filter_mfi_period: filterMFIPeriod,
          filter_mfi_threshold: filterMFIThreshold,
          filter_supertrend_enabled: filterSuperTrendEnabled,
          filter_super_atr: filterSuperTrendATRPeriod,
          filter_super_mult: filterSuperTrendMultiplier,
          // MACD/MA mapping
          filter_ma_fast: filterMAFastPeriod,
          filter_ma_slow: filterMASlowPeriod,
          // Bollinger
          filter_bollinger_period: filterBollingerPeriod,
          filter_bollinger_std: filterBollingerStd,
          // MACD/ATR
          filter_macd_enabled: filterMACDEnabled,
          filter_macd_hist_enabled: filterMACDHistEnabled,
          filter_macd_hist_threshold: filterMACDHistThreshold,
          filter_macd_fast: filterMAFastPeriod,
          filter_macd_slow: filterMASlowPeriod,
          filter_macd_signal: 9,
          filter_atr_breakout_enabled: filterATRBreakoutEnabled,
          filter_atr_period: filterATRPeriod,
          filter_atr_multiplier: filterATRMultiplier,
        } : {}
        const resp = await api.getSymbolTimeframeData(s, tf, 300, serverFilters)
        const payload = resp?.data || resp
        return { timeframe: tf, payload, candleCount: payload?.candles?.length || 0 }
      }))

      setBatchResults((current) => {
        const merged = new Map(current.map((entry) => [entry.timeframe, entry]))
        resolvedEntries.forEach((entry) => merged.set(entry.timeframe, entry))
        return Array.from(merged.values())
      })

      const exportRecords = resolvedEntries.map((entry) => ({
        timeframe: entry.timeframe,
        payload: entry.payload && (entry.payload.candles?.length > 0 || entry.payload.requested_symbol) ? entry.payload : null,
      }))

      const response = await api.exportSymbolTimeframesData(s, exportRecords)
      const payload = response?.data || response
      const savedFiles = payload?.saved_files || []
      const failedExports = payload?.failed_exports || []

      if (savedFiles.length > 0) {
        setExportedPath(savedFiles.map((file) => `${file.timeframe}: ${file.path}`).join('\n'))
        const savedList = savedFiles.map((file) => file.timeframe).join(', ')
        setStatusMessage(`فایل‌های تایم‌فریم ${savedList} با موفقیت ذخیره شدند.`)
      }

      if (failedExports.length > 0) {
        const failedList = failedExports.map((item) => `${item.timeframe}`).join(', ')
        setStatusMessage((prev) => `${prev || ''} ذخیره برای تایم‌فریم‌های ${failedList} موفق نبود.`.trim())
      }

      if (savedFiles.length === 0 && failedExports.length === 0) {
        setStatusMessage('هیچ تایم‌فریمی برای ذخیره وجود ندارد.')
      }
    } catch (err) {
      console.error('Export timeframe error', err)
      const fallbackSaved = []
      const fallbackFailed = []
      for (const tf of timeframesToExport) {
        try {
          const resp = await api.exportSymbolTimeframeData(s, tf, 300)
          const fallbackPayload = resp?.data || resp
          if (fallbackPayload?.success || resp?.success) {
            fallbackSaved.push({ timeframe: tf, path: fallbackPayload?.path || `${s}_${tf}.json` })
          } else {
            fallbackFailed.push({ timeframe: tf, detail: fallbackPayload })
          }
        } catch (fallbackErr) {
          fallbackFailed.push({ timeframe: tf, detail: fallbackErr })
        }
      }

      if (fallbackSaved.length > 0) {
        setExportedPath(fallbackSaved.map((file) => `${file.timeframe}: ${file.path}`).join('\n'))
        const savedList = fallbackSaved.map((file) => file.timeframe).join(', ')
        setStatusMessage(`فایل‌های تایم‌فریم ${savedList} با موفقیت ذخیره شدند.`)
      } else {
        setExportedPath(String(err))
        setStatusMessage(typeof err === 'string' ? err : 'ذخیره فایل با خطا مواجه شد.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleClosePosition = async (ticket) => {
    if (!ticket) return
    setActionLoading(true)
    setActiveAction(`close:${ticket}`)
    setStatusMessage('')
    try {
      const result = await api.closePosition(ticket)
      const message = result?.message || result?.detail || 'پوزیشن با موفقیت بسته شد.'
      setStatusMessage(message)
      await handleRefreshOverview()
    } catch (err) {
      console.error('Close position error', err)
      setStatusMessage(typeof err === 'string' ? err : 'بستن پوزیشن با خطا مواجه شد.')
    } finally {
      setActionLoading(false)
      setActiveAction('')
    }
  }

  const handleCancelOrder = async (ticket) => {
    if (!ticket) return
    setActionLoading(true)
    setActiveAction(`cancel:${ticket}`)
    setStatusMessage('')
    try {
      const result = await api.cancelOrder(ticket)
      const message = result?.message || result?.detail || 'سفارش با موفقیت لغو شد.'
      setStatusMessage(message)
      await handleRefreshOverview()
    } catch (err) {
      console.error('Cancel order error', err)
      setStatusMessage(typeof err === 'string' ? err : 'لغو سفارش با خطا مواجه شد.')
    } finally {
      setActionLoading(false)
      setActiveAction('')
    }
  }

  const handleQuickTrade = async (orderType) => {
    const s = (symbol || '').trim().toUpperCase()
    if (!s) {
      setStatusMessage('لطفاً نماد را وارد کنید.');
      return
    }
    const vol = Number(quickVolume) || 0.01
    // fetch symbol info for validation
    let symbolProps = null
    try {
      const symResp = await api.getSymbolData(s)
      symbolProps = symResp?.data?.symbol_info || symResp?.symbol_info || symResp?.data
    } catch (e) {
      // ignore — we'll validate basic constraints
    }

    // validate volume against symbol properties
    if (symbolProps && symbolProps.volume_min) {
      const minVol = Number(symbolProps.volume_min) || 0
      const step = Number(symbolProps.volume_step) || 0
      if (vol < minVol) {
        setStatusMessage(`حجم باید حداقل ${minVol} باشد.`)
        return
      }
      if (step > 0) {
        const diff = Math.abs((vol - minVol) / step)
        const rounded = Math.round(diff)
        if (Math.abs(diff - rounded) > 1e-6) {
          setStatusMessage(`حجم باید مضربی از ${step} باشد.`)
          return
        }
      }
    }

    // open confirmation modal
    const confirmMsg = `آیا مطمئن هستید که می‌خواهید ${orderType === 'BUY' ? 'خرید' : 'فروش'} ${s} به حجم ${vol} لات ارسال کنید؟`
    setConfirmTitle('تأیید سفارش سریع')
    setConfirmText(confirmMsg)
    confirmCallbackRef.current = async () => {
      setConfirmOpen(false)
      setActionLoading(true)
      setActiveAction(`quick:${orderType}:${s}`)
      setStatusMessage('در حال ارسال سفارش...')
      setStatusType('info')
      try {
        const payload = { symbol: s, volume: vol, type: orderType }
        if ((quickKind || '').toUpperCase() === 'LIMIT' && quickPrice) {
          // validate price precision
          if (symbolProps && typeof symbolProps.digits === 'number') {
            const digits = Number(symbolProps.digits)
            const parts = String(quickPrice).split('.')
            const decimals = parts[1] ? parts[1].length : 0
            if (decimals > digits) {
              setStatusMessage(`دقت قیمت بیش از حد است؛ حداکثر ${digits} رقم بعد از اعشار مجاز است.`)
              setStatusType('error')
              setActionLoading(false)
              setActiveAction('')
              return
            }
          }
          payload.price = Number(quickPrice)
        }
        if (quickSL) payload.sl = Number(quickSL)
        if (quickTP) payload.tp = Number(quickTP)
        const result = await api.openPosition(payload)
        const ok = result && (result.success === true || result.status === 'ok')
        if (ok) {
          setStatusMessage(`سفارش ${orderType === 'BUY' ? 'خرید' : 'فروش'} برای ${s} با موفقیت ارسال شد.`)
          setStatusType('success')
          await handleRefreshOverview()
        } else {
          const detail = result?.message || result?.detail || JSON.stringify(result)
          setStatusMessage(`ارسال سفارش با خطا مواجه شد: ${detail}`)
          setStatusType('error')
        }
      } catch (err) {
        console.error('Quick trade error', err)
        setStatusMessage(typeof err === 'string' ? err : 'خطا در ارسال سفارش سریع')
        setStatusType('error')
      } finally {
        setActionLoading(false)
        setActiveAction('')
      }
    }
    setConfirmOpen(true)
  }

  const handleModalCancel = () => {
    setConfirmOpen(false)
    confirmCallbackRef.current = null
  }

  const handleModalConfirm = async () => {
    if (confirmCallbackRef.current) await confirmCallbackRef.current()
  }

  const handleQuickBuy = async () => void handleQuickTrade('BUY')
  const handleQuickSell = async () => void handleQuickTrade('SELL')

  const accountInfo = overview.accountInfo || {}
  const positions = overview.positions || []
  const orders = overview.orders || []
  const tradeHistory = overview.tradeHistory || []
  const symbols = overview.symbols || []
  const sortedTradeHistory = useMemo(() => {
    return [...tradeHistory].sort((a, b) => getTradeTimestamp(b) - getTradeTimestamp(a))
  }, [tradeHistory])

  const portfolioSummary = useMemo(() => {
    const totalOpenVolume = positions.reduce((sum, position) => sum + (Number(position.volume) || 0), 0)
    const totalOpenProfit = positions.reduce((sum, position) => sum + (Number(position.profit) || 0), 0)
    const totalClosedProfit = tradeHistory.reduce((sum, entry) => sum + (Number(entry.profit) || 0), 0)
    const totalClosedTrades = tradeHistory.length
    const winningTrades = tradeHistory.filter((entry) => Number(entry.profit) > 0).length
    const averageProfit = totalClosedTrades > 0 ? totalClosedProfit / totalClosedTrades : 0
    const balance = Number(accountInfo.balance) || 0
    const equity = Number(accountInfo.equity) || balance
    const margin = Number(accountInfo.margin) || 0
    const marginFree = Number(accountInfo.free_margin ?? accountInfo.margin_free ?? accountInfo.marginFree) || 0
    // In MT5 API, `margin` is the amount currently used, and `free_margin` is the remaining available margin.
    // Therefore `marginUsed` should equal the reported `margin` value, not `margin - free_margin`.
    const marginUsed = margin
    const marginTotal = marginUsed + marginFree
    const marginUsage = marginTotal > 0 ? (marginUsed / marginTotal) * 100 : 0
    const marginUsageOnBalance = balance > 0 ? (marginUsed / balance) * 100 : 0
    const marginUsageOnEquity = equity > 0 ? (marginUsed / equity) * 100 : 0
    const drawdown = balance > 0 ? Math.max(0, ((balance - equity) / balance) * 100) : 0
    const winRate = totalClosedTrades > 0 ? (winningTrades / totalClosedTrades) * 100 : 0

    return {
      totalOpenVolume,
      totalOpenProfit,
      totalClosedProfit,
      totalClosedTrades,
      winningTrades,
      averageProfit,
      winRate,
      marginUsed,
      marginUsage,
      marginUsageOnBalance,
      marginUsageOnEquity,
      drawdown,
      totalOpenPositions: positions.length,
      balance,
      equity,
    }
  }, [accountInfo, positions, tradeHistory])

  const currentSessionKey = useMemo(() => {
    const hour = new Date().getHours()
    if (hour >= 8 && hour < 17) return 'london'
    if (hour >= 17) return 'new_york'
    return 'asia'
  }, [])

  const tradingSession = useMemo(() => {
    return sessionOptions.filter((session) => selectedSessionKeys.includes(session.key))
  }, [selectedSessionKeys])

  const selectedSessionLabel = useMemo(() => {
    if (selectedSessionKeys.length === 0) return 'بدون سشن'
    if (selectedSessionKeys.length === 1) return `${tradingSession[0].label} (${tradingSession[0].range})`
    return tradingSession.map((session) => session.label).join(' / ')
  }, [selectedSessionKeys, tradingSession])

  const selectedSessionDescription = useMemo(() => {
    if (selectedSessionKeys.length === sessionOptions.length) return 'تمام سشن‌ها فعال هستند'
    if (selectedSessionKeys.length > 1) return 'چند سشن انتخاب شده برای تحلیل'
    if (selectedSessionKeys.length === 1) return selectedSessionKeys[0] === currentSessionKey ? 'بازار فعلی' : 'سشن انتخاب‌شده'
    return 'هیچ سشن انتخاب نشده'
  }, [selectedSessionKeys, currentSessionKey, sessionOptions.length])

  const selectedSessionAccent = useMemo(() => {
    if (selectedSessionKeys.length === sessionOptions.length) return 'text-cyan-300'
    if (selectedSessionKeys.length > 1) return 'text-sky-300'
    if (selectedSessionKeys.length === 1) return selectedSessionKeys[0] === currentSessionKey ? 'text-emerald-400' : 'text-amber-300'
    return 'text-rose-400'
  }, [selectedSessionKeys, currentSessionKey, sessionOptions.length])

  const tradeHistorySummary = useMemo(() => ({
    total: tradeHistory.length,
    profit: portfolioSummary.totalClosedProfit,
    winRate: portfolioSummary.winRate,
    averageProfit: portfolioSummary.averageProfit,
    positive: portfolioSummary.winningTrades,
    negative: tradeHistory.length - portfolioSummary.winningTrades,
  }), [tradeHistory, portfolioSummary])

  const allocationData = useMemo(() => {
    const grouped = positions.reduce((acc, position) => {
      const symbolName = position.symbol || 'Unknown'
      const amount = Number(position.volume) || 0
      acc[symbolName] = (acc[symbolName] || 0) + amount
      return acc
    }, {})

    const labels = Object.keys(grouped)
    const values = labels.map((key) => grouped[key])
    return {
      labels,
      datasets: [{
        data: values,
        backgroundColor: ['#2563eb', '#14b8a6', '#f59e0b', '#8b5cf6', '#ef4444', '#0f766e'],
        borderWidth: 0,
      }],
    }
  }, [positions])

  const baseCandles = useMemo(() => (data?.candles || []), [data])
  // map timestamp to index for quick lookup when applying indicator filters
  const tsIndexMap = useMemo(() => {
    const m = new Map()
    baseCandles.forEach((c, i) => {
      if (c && c.time) m.set(c.time, i)
    })
    return m
  }, [baseCandles])

  // compute simple indicators on baseCandles: SMA, EMA, RSI, MACD, avg volume
  const indicators = useMemo(() => {
    const closes = baseCandles.map((c) => Number(c.close) || 0)
    const volumes = baseCandles.map((c) => Number(c.tick_volume || c.real_volume || c.volume || 0) || 0)
    const sma = []
    const ema = []
    const rsi = []
    const macd = []
    const macdSignal = []
    const emaFast = []
    const emaSlow = []
    const macdHist = []
    const bollinger = { upper: [], lower: [], mid: [], std: [] }
    const atr = []
    const adx = []
    const vwap = []
    const obv = []
    const mfi = []

    // SMA
    for (let i = 0; i < closes.length; i++) {
      const p = filterSMAPeriod
      const start = Math.max(0, i - p + 1)
      const slice = closes.slice(start, i + 1)
      const avg = slice.length ? slice.reduce((s, v) => s + v, 0) / slice.length : 0
      sma.push(avg)
    }

    // EMA helper
    const emaForPeriod = (period) => {
      const res = []
      const k = 2 / (period + 1)
      let prev = null
      for (let i = 0; i < closes.length; i++) {
        const price = closes[i]
        if (prev === null) {
          prev = price
        } else {
          prev = price * k + prev * (1 - k)
        }
        res.push(prev)
      }
      return res
    }

    const emaFastArr = emaForPeriod(filterMAFastPeriod || 12)
    const emaSlowArr = emaForPeriod(filterMASlowPeriod || 26)
    for (let i = 0; i < closes.length; i++) {
      ema.push(emaFastArr[i] || 0)
      emaFast.push(emaFastArr[i] || 0)
      emaSlow.push(emaSlowArr[i] || 0)
      const m = (emaFastArr[i] || 0) - (emaSlowArr[i] || 0)
      macd.push(m)
    }

    // MACD signal (9)
    const macdSignalArr = (() => {
      const res = []
      const k = 2 / (9 + 1)
      let prev = null
      for (let i = 0; i < macd.length; i++) {
        const v = macd[i]
        if (prev === null) prev = v
        else prev = v * k + prev * (1 - k)
        res.push(prev)
      }
      return res
    })()
    for (let i = 0; i < macdSignalArr.length; i++) macdSignal.push(macdSignalArr[i] || 0)
    // MACD histogram
    for (let i = 0; i < macd.length; i++) {
      macdHist.push((macd[i] || 0) - (macdSignalArr[i] || 0))
    }

    // RSI (14)
    const periodR = 14
    for (let i = 0; i < closes.length; i++) {
      if (i === 0) { rsi.push(50); continue }
      let gains = 0; let losses = 0
      for (let j = Math.max(1, i - periodR + 1); j <= i; j++) {
        const diff = closes[j] - closes[j - 1]
        if (diff > 0) gains += diff
        else losses += Math.abs(diff)
      }
      const avgGain = gains / periodR
      const avgLoss = losses / periodR
      const rs = avgLoss === 0 ? (avgGain === 0 ? 0 : 100) : avgGain / avgLoss
      const r = avgLoss === 0 ? 100 : 100 - (100 / (1 + rs))
      rsi.push(Number.isFinite(r) ? r : 50)
    }

    // avg volume (simple moving average for volume baseline)
    const avgVolume = []
    for (let i = 0; i < volumes.length; i++) {
      const p = 20
      const start = Math.max(0, i - p + 1)
      const slice = volumes.slice(start, i + 1)
      const avg = slice.length ? slice.reduce((s, v) => s + v, 0) / slice.length : 0
      avgVolume.push(avg)
    }

    // Bollinger Bands
    for (let i = 0; i < closes.length; i++) {
      const p = filterBollingerPeriod || 20
      const start = Math.max(0, i - p + 1)
      const slice = closes.slice(start, i + 1)
      const mean = slice.length ? slice.reduce((s, v) => s + v, 0) / slice.length : 0
      const variance = slice.length ? slice.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / slice.length : 0
      const std = Math.sqrt(variance)
      bollinger.mid.push(mean)
      bollinger.std.push(std)
      bollinger.upper.push(mean + (filterBollingerStd || 2) * std)
      bollinger.lower.push(mean - (filterBollingerStd || 2) * std)
    }

    // ATR (for later use) and ADX
    const highs = baseCandles.map((c) => Number(c.high) || 0)
    const lows = baseCandles.map((c) => Number(c.low) || 0)
    const trs = []
    for (let i = 0; i < closes.length; i++) {
      if (i === 0) { trs.push(highs[i] - lows[i]); continue }
      const tr = Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1]))
      trs.push(tr)
    }
    // ATR smoothing (simple SMA of TR)
    for (let i = 0; i < trs.length; i++) {
      const p = 14
      const start = Math.max(0, i - p + 1)
      const slice = trs.slice(start, i + 1)
      const avg = slice.length ? slice.reduce((s, v) => s + v, 0) / slice.length : 0
      atr.push(avg)
    }

    // VWAP (running VWAP based on typical price and volume)
    let cumPV = 0
    let cumV = 0
    for (let i = 0; i < closes.length; i++) {
      const tp = (highs[i] + lows[i] + closes[i]) / 3
      const vol = volumes[i] || 0
      cumPV += tp * vol
      cumV += vol
      vwap.push(cumV === 0 ? tp : cumPV / cumV)
    }

    // OBV
    let prevClose = closes[0] || 0
    let runningOBV = 0
    for (let i = 0; i < closes.length; i++) {
      const price = closes[i]
      const vol = volumes[i] || 0
      if (i === 0) { obv.push(0); prevClose = price; continue }
      if (price > prevClose) runningOBV += vol
      else if (price < prevClose) runningOBV -= vol
      obv.push(runningOBV)
      prevClose = price
    }

    // MFI (money flow index) simplified
    for (let i = 0; i < closes.length; i++) {
      if (i === 0) { mfi.push(50); continue }
      const tp = (highs[i] + lows[i] + closes[i]) / 3
      const period = filterMFIPeriod || 14
      let posFlow = 0
      let negFlow = 0
      for (let j = Math.max(1, i - period + 1); j <= i; j++) {
        const tpj = (Number(baseCandles[j]?.high || 0) + Number(baseCandles[j]?.low || 0) + Number(baseCandles[j]?.close || 0)) / 3
        const rf = tpj * (volumes[j] || 0)
        const prevTpj = (Number(baseCandles[j - 1]?.high || 0) + Number(baseCandles[j - 1]?.low || 0) + Number(baseCandles[j - 1]?.close || 0)) / 3
        if (tpj > prevTpj) posFlow += rf
        else negFlow += rf
      }
      const mfr = negFlow === 0 ? (posFlow === 0 ? 0 : Infinity) : posFlow / negFlow
      const idx = 100 - (100 / (1 + (mfr === Infinity ? 1000 : mfr)))
      mfi.push(Number.isFinite(idx) ? idx : 50)
    }

    // Heikin-Ashi
    const haClose = []
    const haOpen = []
    for (let i = 0; i < closes.length; i++) {
      const c = closes[i]
      const h = highs[i]
      const l = lows[i]
      const closeVal = (c + h + l + (Number(baseCandles[i]?.open || 0))) / 4
      haClose.push(closeVal)
      if (i === 0) haOpen.push((Number(baseCandles[i]?.open || 0) + closeVal) / 2)
      else haOpen.push((haOpen[i - 1] + haClose[i - 1]) / 2)
    }

    // SuperTrend (simplified)
    const superTrend = []
    const stAtrPeriod = filterSuperTrendATRPeriod || 10
    const stMultiplier = filterSuperTrendMultiplier || 3
    // compute ATR used earlier (atr array)
    const finalUpper = []
    const finalLower = []
    let prevTrendUp = true
    for (let i = 0; i < closes.length; i++) {
      const hl2 = (highs[i] + lows[i]) / 2
      const atrVal = atr[i] || 0
      const basicUpper = hl2 + stMultiplier * atrVal
      const basicLower = hl2 - stMultiplier * atrVal
      if (i === 0) {
        finalUpper.push(basicUpper)
        finalLower.push(basicLower)
        superTrend.push(true)
        continue
      }
      // final upper/lower
      const fu = basicUpper < finalUpper[i - 1] || closes[i - 1] > finalUpper[i - 1] ? basicUpper : finalUpper[i - 1]
      const fl = basicLower > finalLower[i - 1] || closes[i - 1] < finalLower[i - 1] ? basicLower : finalLower[i - 1]
      finalUpper.push(fu)
      finalLower.push(fl)
      // determine trend
      const trendUp = closes[i] > finalUpper[i] ? true : (closes[i] < finalLower[i] ? false : prevTrendUp)
      superTrend.push(trendUp)
      prevTrendUp = trendUp
    }

    // ADX calculation (simplified)
    const plusDM = []
    const minusDM = []
    for (let i = 0; i < closes.length; i++) {
      if (i === 0) { plusDM.push(0); minusDM.push(0); continue }
      const upMove = highs[i] - highs[i - 1]
      const downMove = lows[i - 1] - lows[i]
      plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0)
      minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0)
    }
    const smoothedTR = []
    const smoothedPlus = []
    const smoothedMinus = []
    const periodADX = filterADXPeriod || 14
    for (let i = 0; i < closes.length; i++) {
      if (i < periodADX) {
        smoothedTR.push(null); smoothedPlus.push(null); smoothedMinus.push(null); adx.push(null); continue
      }
      if (i === periodADX) {
        const trSlice = trs.slice(1, periodADX + 1)
        const plusSlice = plusDM.slice(1, periodADX + 1)
        const minusSlice = minusDM.slice(1, periodADX + 1)
        const trSum = trSlice.reduce((s, v) => s + v, 0)
        const plusSum = plusSlice.reduce((s, v) => s + v, 0)
        const minusSum = minusSlice.reduce((s, v) => s + v, 0)
        smoothedTR.push(trSum)
        smoothedPlus.push(plusSum)
        smoothedMinus.push(minusSum)
      } else {
        // Wilder's smoothing
        const prevTR = smoothedTR[smoothedTR.length - 1]
        const prevPlus = smoothedPlus[smoothedPlus.length - 1]
        const prevMinus = smoothedMinus[smoothedMinus.length - 1]
        smoothedTR.push(prevTR - prevTR / periodADX + trs[i])
        smoothedPlus.push(prevPlus - prevPlus / periodADX + plusDM[i])
        smoothedMinus.push(prevMinus - prevMinus / periodADX + minusDM[i])
      }
      const plusDI = 100 * (smoothedPlus[smoothedPlus.length - 1] / smoothedTR[smoothedTR.length - 1] || 0)
      const minusDI = 100 * (smoothedMinus[smoothedMinus.length - 1] / smoothedTR[smoothedTR.length - 1] || 0)
      const dx = 100 * (Math.abs(plusDI - minusDI) / ((plusDI + minusDI) || 1))
      // Smooth DX into ADX using same period (simple SMA of DX here for simplicity)
      const dxStart = i - periodADX + 1
      const dxSlice = []
      for (let j = Math.max(periodADX, dxStart); j <= i; j++) {
        // approximate by repeating dx (simplified)
        dxSlice.push(dx)
      }
      const adxVal = dxSlice.length ? dxSlice.reduce((s, v) => s + v, 0) / dxSlice.length : dx
      adx.push(adxVal)
    }

    return { sma, ema, rsi, macd, macdSignal, avgVolume, emaFast, emaSlow, macdHist, bollinger, atr, adx, vwap, obv, mfi, haClose, haOpen, superTrend }
  }, [baseCandles, filterSMAPeriod, filterMAFastPeriod, filterMASlowPeriod, filterADXPeriod, filterBollingerPeriod, filterBollingerStd, filterMFIPeriod, filterSuperTrendATRPeriod, filterSuperTrendMultiplier])
  
  // Extend indicators with trend/channel detection
  const extendedIndicators = useMemo(() => {
    const ind = indicators
    const closes = baseCandles.map((c) => Number(c.close) || 0)
    const highs = baseCandles.map((c) => Number(c.high) || 0)
    const lows = baseCandles.map((c) => Number(c.low) || 0)
    const n = closes.length
    const window = Math.max(10, Math.min(n, Number(filterTrendWindow) || 80))
    const start = Math.max(0, n - window)
    const xs = []
    for (let i = start; i < n; i++) xs.push(i - start)

    const linearRegression = (arr) => {
      const ys = arr.slice(start, n)
      if (ys.length !== xs.length || ys.length === 0) return null
      const meanX = xs.reduce((s, v) => s + v, 0) / xs.length
      const meanY = ys.reduce((s, v) => s + v, 0) / ys.length
      let num = 0, den = 0
      for (let i = 0; i < xs.length; i++) {
        num += (xs[i] - meanX) * (ys[i] - meanY)
        den += (xs[i] - meanX) * (xs[i] - meanX)
      }
      const slope = den === 0 ? 0 : num / den
      const intercept = meanY - slope * meanX
      return { slope, intercept }
    }

    const highLR = linearRegression(highs)
    const lowLR = linearRegression(lows)
    let lastUpper = null, lastLower = null, channelWidth = null, touchesUpper = 0, touchesLower = 0
    let breakAbove = false, breakBelow = false
    if (highLR && lowLR) {
      const lastX = (n - 1) - start
      lastUpper = highLR.slope * lastX + highLR.intercept
      lastLower = lowLR.slope * lastX + lowLR.intercept
      channelWidth = Math.abs(lastUpper - lastLower)
      // count touches (approx within 20% of channel width)
      for (let i = start; i < n; i++) {
        const hi = highs[i]
        const lo = lows[i]
        const x = i - start
        const up = highLR.slope * x + highLR.intercept
        const loLine = lowLR.slope * x + lowLR.intercept
        if (channelWidth > 0) {
          if (Math.abs(hi - up) <= channelWidth * 0.2) touchesUpper++
          if (Math.abs(lo - loLine) <= channelWidth * 0.2) touchesLower++
        }
      }
      const lastClose = Number(closes[n - 1] || 0)
      if (Number.isFinite(lastClose)) {
        breakAbove = lastClose > lastUpper
        breakBelow = lastClose < lastLower
      }
    }

    return { ...ind, trend: { highLR, lowLR, lastUpper, lastLower, channelWidth, touchesUpper, touchesLower, breakAbove, breakBelow, window } }
  }, [indicators, baseCandles, filterTrendWindow, filterTrendEnabled])
  const candles = useMemo(() => {
    try {
      return baseCandles.filter((candle) => {
        const ts = new Date(candle.time || candle.close_time || candle.timestamp || 0).getTime()
        if (filterFrom) {
          const fromTs = new Date(filterFrom).getTime()
          if (Number.isFinite(fromTs) && ts < fromTs) return false
        }
        if (filterTo) {
          const toTs = new Date(filterTo).getTime()
          if (Number.isFinite(toTs) && ts > toTs) return false
        }
        if (minVolumeFilter && Number(minVolumeFilter) > 0) {
          const vol = Number(candle.volume || candle.tick_volume || candle.real_volume || 0)
          if (Number.isFinite(vol) && vol < Number(minVolumeFilter)) return false
        }
        if (minPriceFilter) {
          const p = Number(minPriceFilter)
          if (Number.isFinite(p) && Number(candle.close || candle.high || candle.low) < p) return false
        }
        if (maxPriceFilter) {
          const p = Number(maxPriceFilter)
          if (Number.isFinite(p) && Number(candle.close || candle.high || candle.low) > p) return false
        }
        if (filterSessionKeys.length > 0) {
          const hour = new Date(ts).getHours()
          const matches = filterSessionKeys.some((key) => {
            const session = sessionOptions.find((s) => s.key === key)
            if (!session) return false
            if (session.start <= session.end) return hour >= session.start && hour < session.end
            return hour >= session.start || hour < session.end
          })
          if (!matches) return false
        }

        // Candle direction filter
        if (filterCandleDirection && filterCandleDirection !== 'both') {
          const close = Number(candle.close)
          const open = Number(candle.open)
          if (filterCandleDirection === 'bull' && !(Number.isFinite(close) && Number.isFinite(open) && close > open)) return false
          if (filterCandleDirection === 'bear' && !(Number.isFinite(close) && Number.isFinite(open) && close < open)) return false
        }

        // Indicator-based filters (require index mapping)
        const idx = tsIndexMap.get(candle.time)
        if ((filterCloseAboveSMA || filterRSIEnabled || filterMACDEnabled || filterVolumeSpikeEnabled || filterMACrossoverEnabled || filterMASlopeEnabled || filterADXEnabled || filterMACDHistEnabled || filterBollingerEnabled) && (typeof idx !== 'number' || idx < 0)) {
          // Not enough data to evaluate indicators; exclude
          return false
        }

        if (filterCloseAboveSMA) {
          const smaVal = indicators.sma[idx]
          const close = Number(candle.close)
          if (!Number.isFinite(smaVal) || !Number.isFinite(close) || close <= smaVal) return false
        }

        if (filterRSIEnabled) {
          const r = indicators.rsi[idx]
          if (!Number.isFinite(r)) return false
          if (filterRSIAbove) {
            if (!(r > Number(filterRSILevel))) return false
          } else {
            if (!(r < Number(filterRSILevel))) return false
          }
        }

        if (filterMACDEnabled) {
          const m = indicators.macd[idx]
          const s = indicators.macdSignal[idx]
          if (!Number.isFinite(m) || !Number.isFinite(s) || !(m > s)) return false
        }

        if (filterMACDHistEnabled) {
          const hist = indicators.macdHist[idx]
          if (!Number.isFinite(hist)) return false
          if (filterMACDHistAbove) {
            if (!(hist > Number(filterMACDHistThreshold))) return false
          } else {
            if (!(hist < Number(filterMACDHistThreshold))) return false
          }
        }

        if (filterMACrossoverEnabled) {
          const fast = indicators.emaFast[idx]
          const slow = indicators.emaSlow[idx]
          if (!Number.isFinite(fast) || !Number.isFinite(slow)) return false
          if (filterMACrossoverRequireCross) {
            const prevIdx = idx - 1
            const prevFast = indicators.emaFast[prevIdx]
            const prevSlow = indicators.emaSlow[prevIdx]
            if (!(Number.isFinite(prevFast) && Number.isFinite(prevSlow) && prevFast <= prevSlow && fast > slow)) return false
          } else {
            if (!(fast > slow)) return false
          }
        }

        if (filterMASlopeEnabled) {
          const period = Math.max(1, Number(filterMASlopePeriod) || 1)
          const cur = indicators.emaFast[idx]
          const prevIdx = Math.max(0, idx - period)
          const prev = indicators.emaFast[prevIdx]
          if (!Number.isFinite(cur) || !Number.isFinite(prev)) return false
          const slope = (cur - prev) / (prev || cur || 1)
          if (!(Math.abs(slope) >= Number(filterMASlopeThreshold))) return false
        }

        if (filterADXEnabled) {
          const a = indicators.adx[idx]
          if (!Number.isFinite(a) || a < Number(filterADXThreshold)) return false
        }

        if (filterBollingerEnabled) {
          const price = Number(candle.close)
          const up = indicators.bollinger.upper[idx]
          const low = indicators.bollinger.lower[idx]
          if (!Number.isFinite(price) || !Number.isFinite(up) || !Number.isFinite(low)) return false
          // require breakout above upper or below lower depending on direction
          if (!(price > up || price < low)) return false
        }

        if (filterATRBreakoutEnabled) {
          const atrVal = indicators.atr[idx]
          const prevClose = Number(baseCandles[idx - 1]?.close || 0)
          const close = Number(candle.close)
          if (!Number.isFinite(atrVal) || !Number.isFinite(prevClose) || !Number.isFinite(close)) return false
          if (!(close > prevClose + Number(filterATRMultiplier) * atrVal)) return false
        }

        if (filterVWAPEnabled) {
          const v = indicators.vwap[idx]
          const close = Number(candle.close)
          if (!Number.isFinite(v) || !Number.isFinite(close)) return false
          if (!(close > v)) return false
        }

        if (filterHeikenEnabled) {
          const n = Math.max(1, Number(filterHeikenConsecutive) || 1)
          let ok = true
          for (let k = 0; k < n; k++) {
            const checkIdx = idx - k
            if (checkIdx < 0) { ok = false; break }
            const haC = indicators.haClose[checkIdx]
            const haO = indicators.haOpen[checkIdx]
            if (!(Number.isFinite(haC) && Number.isFinite(haO) && haC > haO)) { ok = false; break }
          }
          if (!ok) return false
        }

        if (filterSuperTrendEnabled) {
          const st = indicators.superTrend[idx]
          if (st !== true) return false
        }

        if (filterOBVEnabled) {
          const o = indicators.obv[idx]
          const prev = indicators.obv[idx - 1]
          if (!Number.isFinite(o) || !Number.isFinite(prev) || !(o > prev)) return false
        }

        if (filterMFIEnabled) {
          const m = indicators.mfi[idx]
          if (!Number.isFinite(m) || !(m > Number(filterMFIThreshold))) return false
        }

        if (filterVolumeSpikeEnabled) {
          const vol = Number(candle.volume || candle.tick_volume || candle.real_volume || 0)
          const avg = indicators.avgVolume[idx] || 0
          if (!Number.isFinite(vol) || !Number.isFinite(avg) || vol <= avg * Number(filterVolumeSpikeMultiplier)) return false
        }

        // HTF alignment: require higher timeframe direction if enabled
        if (htfEnabled) {
          try {
            const htfCandles = htfData?.candles || []
            if (!Array.isArray(htfCandles) || htfCandles.length < 2) return false
            const lastHTF = Number(htfCandles[htfCandles.length - 1].close)
            const prevHTF = Number(htfCandles[htfCandles.length - 2].close)
            if (!Number.isFinite(lastHTF) || !Number.isFinite(prevHTF)) return false
            const htfUp = lastHTF > prevHTF
            if (htfDirection === 'up' && !htfUp) return false
            if (htfDirection === 'down' && htfUp) return false
          } catch (e) {
            return false
          }
        }

        // Trend/channel break filter
        if (filterTrendEnabled) {
          const tr = extendedIndicators?.trend
          if (!tr) return false
          if (filterTrendRequireBreak) {
            if (filterTrendDirection === 'above' && !tr.breakAbove) return false
            if (filterTrendDirection === 'below' && !tr.breakBelow) return false
            if (filterTrendDirection === 'both' && !(tr.breakAbove || tr.breakBelow)) return false
          } else {
            // Require at least a certain number of touches to consider a valid channel
            if ((tr.touchesUpper + tr.touchesLower) < 2) return false
          }
        }

        return true
      }).slice(-40)
    } catch (e) {
      return (data?.candles || []).slice(-40)
    }
  }, [baseCandles, filterFrom, filterTo, minVolumeFilter, filterSessionKeys, data, filterCloseAboveSMA, filterSMAPeriod, filterRSIEnabled, filterRSILevel, filterRSIAbove, filterMACDEnabled, filterMACDHistEnabled, filterMACDHistThreshold, filterVolumeSpikeEnabled, filterVolumeSpikeMultiplier, filterCandleDirection, filterMACrossoverEnabled, filterMAFastPeriod, filterMASlowPeriod, filterMACrossoverRequireCross, filterMASlopeEnabled, filterMASlopePeriod, filterMASlopeThreshold, filterADXEnabled, filterADXPeriod, filterADXThreshold, filterBollingerEnabled, filterBollingerPeriod, filterBollingerStd, filterATRBreakoutEnabled, filterATRPeriod, filterATRMultiplier, filterVWAPEnabled, filterHeikenEnabled, filterHeikenConsecutive, filterSuperTrendEnabled, filterSuperTrendATRPeriod, filterSuperTrendMultiplier, filterOBVEnabled, filterMFIEnabled, filterMFIPeriod, filterMFIThreshold, indicators, htfEnabled, htfData, htfDirection])


  const priceSeries = useMemo(() => candles.map((candle) => Number(candle.close)).filter((value) => Number.isFinite(value)), [candles])
  const ohlcChartData = useMemo(() => { const values = candles.map((candle) => ({ open: Number(candle.open), high: Number(candle.high), low: Number(candle.low), close: Number(candle.close), volume: Number(candle.tick_volume || candle.real_volume || candle.volume || 0) })).filter((entry) => Number.isFinite(entry.open) && Number.isFinite(entry.high) && Number.isFinite(entry.low) && Number.isFinite(entry.close)); return values }, [candles])

  const signalPanel = useMemo(() => {
    const latest = ohlcChartData[ohlcChartData.length - 1]
    const previous = ohlcChartData[ohlcChartData.length - 2]
    if (!latest || !previous) {
      return { label: 'در انتظار سیگنال', description: 'هنوز داده کافی برای تحلیل سیگنال وجود ندارد.', tone: 'neutral' }
    }
    const momentum = latest.close - previous.close
    return {
      label: momentum >= 0 ? 'خوشبین' : 'نزولی',
      description: momentum >= 0 ? 'روند قیمت در حال تقویت است و احتمال ادامه حرکت رو به بالا بیشتر است.' : 'روند قیمت رو به پایین است و احتیاط در ورود توصیه می‌شود.',
      tone: momentum >= 0 ? 'positive' : 'negative',
    }
  }, [ohlcChartData])

  const watchlistItems = useMemo(() => {
    const baseSymbols = symbols.length > 0 ? symbols : ['EURUSD', 'USDJPY', 'GBPUSD', 'XAUUSD']
    return baseSymbols.slice(0, 6).map((item, index) => ({
      symbol: item,
      status: index % 2 === 0 ? 'صعودی' : 'در انتظار',
      strength: index % 2 === 0 ? 'قوی' : 'متوسط',
    }))
  }, [symbols])

  const priceChartData = useMemo(() => ({
    labels: priceSeries.map((_, index) => `#${index + 1}`),
    datasets: [{
      label: `${symbol || 'نماد'} (${timeframe})`,
      data: priceSeries,
      borderColor: '#38bdf8',
      backgroundColor: 'rgba(56, 189, 248, 0.18)',
      fill: true,
      tension: 0.35,
      pointRadius: 2,
      pointHoverRadius: 4,
    }],
  }), [priceSeries, symbol, timeframe])

  const volumeMax = ohlcChartData.length ? Math.max(...ohlcChartData.map((item) => item.volume)) : 0
  const shellClass = isFullscreen ? 'fixed inset-0 z-50 overflow-auto bg-slate-950/95 p-2 sm:p-4 lg:p-6' : ''
  const isAutoTradingIssue = typeof statusMessage === 'string' && /(autotrading|AutoTrading|10027|10029|trade disabled|غیرفعال)/i.test(statusMessage)

  return (
    <div className={`${theme.page} ${shellClass}`.trim()}>
      <div className='mx-auto flex w-full max-w-7xl flex-col gap-6'>
        <section aria-label='سرصفحه داشبورد' className='rounded-[32px] border border-slate-700/40 bg-slate-950/60 p-6 shadow-2xl shadow-black/20 backdrop-blur-xl'>
          <div className='flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between'>
            <div className='max-w-3xl'>
              <p className='text-sm font-semibold uppercase tracking-[0.24em] text-sky-300/90'>داشبورد هوشمند معاملات</p>
              <h1 className={`mt-3 text-3xl font-semibold ${theme.text}`}>مرکز کنترل نمادها، استراتژی‌ها و معاملات</h1>
              <p className={`mt-3 max-w-2xl text-sm leading-7 ${theme.muted}`}>یک نمای بصری متحد از داده‌های واقعی MT5 به همراه کارت‌های تحلیلی، سیگنال‌ها و ابزارهای عملیاتی.</p>
            </div>
            <div className='flex flex-wrap items-center gap-2'>
              <Badge variant='blue'>پیشرفته</Badge>
              <Badge variant='teal'>لحظه‌ای</Badge>
              <Badge variant='purple'>تحلیل حرفه‌ای</Badge>
              <Badge variant='teal'>AI: آنلاین</Badge>
            </div>
          </div>
        </section>

        <section aria-label='کنترل‌های اصلی داشبورد' className='grid gap-4 xl:grid-cols-[1.35fr_0.65fr]'>
          <Card className={`p-6 ${theme.panel}`} variant={darkMode ? 'dark' : 'default'}>
            <div className='flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between'>
              <div className='flex-1'>
                <TradingHeader
                  symbol={symbol}
                  setSymbol={setSymbol}
                  timeframe={timeframe}
                  setTimeframe={setTimeframe}
                  selectedSessionKeys={selectedSessionKeys}
                  setSelectedSessionKeys={setSelectedSessionKeys}
                  sessionOptions={sessionOptions}
                  lastPrice={priceSeries[priceSeries.length - 1] ? formatNumber(priceSeries[priceSeries.length - 1], 5) : '—'}
                  onQuickBuy={handleQuickBuy}
                  onQuickSell={handleQuickSell}
                  darkMode={darkMode}
                  theme={theme}
                  quickVolume={quickVolume}
                  setQuickVolume={setQuickVolume}
                  quickKind={quickKind}
                  setQuickKind={setQuickKind}
                  quickPrice={quickPrice}
                  setQuickPrice={setQuickPrice}
                  quickSL={quickSL}
                  setQuickSL={setQuickSL}
                  quickTP={quickTP}
                  setQuickTP={setQuickTP}
                  actionLoading={actionLoading}
                />
              </div>
              <div className='flex flex-wrap gap-2'>
                <Button type='button' variant='secondary' onClick={() => setDarkMode((value) => !value)}>
                  {darkMode ? 'حالت روشن' : 'حالت تاریک'}
                </Button>
                <Button type='button' variant='secondary' onClick={() => setIsFullscreen((value) => !value)}>
                  {isFullscreen ? 'خروج از تمام‌صفحه' : 'نمایش تمام‌صفحه'}
                </Button>
                <Button type='button' variant='danger' onClick={() => void logout().then(() => { window.location.assign('/login') })}>
                  خروج
                </Button>
              </div>
            </div>

            <div className='mt-4 space-y-4 rounded-xl border border-slate-700/50 bg-slate-950/40 p-4'>
              <div className='flex flex-wrap items-start gap-3'>
                <div className='min-w-[280px] flex-1' ref={symbolSearchRef}>
                  <label className={`mb-2 block text-sm ${theme.muted}`}>جستجوی نماد</label>
                  <div className='relative'>
                    <input
                      type='text'
                      value={symbol}
                      onChange={(e) => setSymbol(e.target.value)}
                      onFocus={() => setSymbolSuggestions([])}
                      onBlur={() => {
                        if (!suppressSuggestionHideRef.current) {
                          setTimeout(() => setSymbolSuggestions([]), 150)
                        }
                      }}
                      className={`w-full rounded-md border px-3 py-2 text-sm ${theme.input}`}
                      placeholder='مثال: xauusd یا EURUSD'
                      aria-label='جستجوی نماد'
                    />
                    {symbolSuggestions.length > 0 && (
                      <div className='absolute z-20 mt-1 max-h-44 w-full overflow-auto rounded-lg border border-slate-700 bg-slate-900 shadow-lg'>
                        {symbolSuggestions.map((item) => (
                          <button
                            key={item}
                            type='button'
                            className='block w-full px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800'
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setSymbol(item)
                              setSymbolSuggestions([])
                            }}
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className='flex flex-wrap gap-2'>
                  <Button type='button' variant='success' onClick={() => handleExport(symbol)} disabled={loading}>ذخیره تایم‌فریم</Button>
                </div>
              </div>

              <div className='rounded-lg border border-slate-700/60 bg-slate-900/50 p-3'>
                <div className='flex flex-wrap items-center justify-between gap-3'>
                  <div className={`text-sm font-medium ${theme.text}`}>تایم‌فریم‌های مورد نظر</div>
                  <label className={`flex items-center gap-2 text-sm ${theme.muted}`}>
                    <input
                      type='checkbox'
                      checked={selectedTimeframes.length === timeframeOptions.length}
                      onChange={toggleSelectAllTimeframes}
                    />
                    همه
                  </label>
                </div>
                <div className='mt-3 flex flex-wrap gap-3'>
                  {timeframeOptions.map((tf) => (
                    <label key={tf} className={`flex items-center gap-2 rounded-lg border border-slate-700/60 px-3 py-2 text-sm ${theme.text}`}>
                      <input
                        type='checkbox'
                        checked={selectedTimeframes.includes(tf)}
                        onChange={() => toggleTimeframeSelection(tf)}
                      />
                      {tf}
                    </label>
                  ))}
                </div>
              </div>

              {batchResults.length > 0 && (
                <div className='rounded-lg border border-slate-700/60 bg-slate-900/50 p-3'>
                  <div className={`text-sm font-medium ${theme.text}`}>وضعیت استخراج</div>
                  <div className='mt-2 grid gap-2 md:grid-cols-2'>
                    {batchResults.map((item) => (
                      <div key={item.timeframe} className='rounded-lg border border-slate-700/60 bg-slate-950/60 px-3 py-2 text-sm'>
                        <div className='flex items-center justify-between gap-2'>
                          <span className={theme.text}>{item.timeframe}</span>
                          <span className={item.candleCount > 0 ? 'text-emerald-400' : 'text-amber-400'}>
                            {item.candleCount > 0 ? `${item.candleCount} کندل` : 'بدون داده'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {statusMessage && (
              <div className='mt-4'>
                <Alert type={statusType || 'info'} message={statusMessage} />
              </div>
            )}
            {exportedPath && (
              <div className='mt-3 rounded-lg border border-slate-700/60 bg-slate-900/70 p-4 text-sm text-slate-100'>
                <div className='font-medium mb-2'>مسیر فایل‌های ذخیره شده</div>
                <pre className='whitespace-pre-wrap text-sm leading-6'>{exportedPath}</pre>
              </div>
            )}
            {isAutoTradingIssue && (
              <div className='mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-300'>
                <div className='font-semibold'>رفع مشکل معامله در MT5</div>
                <ul className='mt-2 list-disc space-y-1 pr-4'>
                  <li>در MetaTrader 5 از مسیر Tools → Options → AutoTrading گزینه Allow automated trading را روشن کنید.</li>
                  <li>مطمئن شوید حساب شما مجاز به معامله است و در حالت Read Only یا Disabled نیست.</li>
                  <li>پس از فعال‌سازی، دوباره عملیات را امتحان کنید.</li>
                </ul>
              </div>
            )}
            {overviewError && (
              <div className={`mt-4 rounded-md border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-400`}>
                {overviewError}
              </div>
            )}
          </Card>

          <Card className={`p-5 ${theme.panel}`} variant={darkMode ? 'dark' : 'default'}>
            <div className='flex items-center justify-between'>
              <div>
                <h2 className={`text-lg font-bold ${theme.text}`}>عملیات سریع</h2>
                <p className={`text-sm ${theme.muted}`}>دسترسی مستقیم به اقدامات پرکاربرد</p>
              </div>
              <Badge variant='blue'>اقدامات سریع</Badge>
            </div>
            <div className='mt-4 grid gap-2'>
              <Button type='button' variant='secondary' className='w-full justify-center' onClick={() => void handleRefreshOverview()} disabled={overviewLoading}>
                {overviewLoading ? 'در حال به‌روزرسانی…' : 'به‌روزرسانی وضعیت'}
              </Button>
              <Button type='button' variant='primary' className='w-full justify-center' onClick={() => void handleLoadSelectedTimeframes()} disabled={loading || batchLoading}>
                {batchLoading ? 'در حال استخراج…' : 'شروع استخراج'}
              </Button>
              <Button type='button' variant='success' className='w-full justify-center' onClick={() => handleExport(symbol)} disabled={loading}>
                ذخیره تایم‌فریم
              </Button>
                <div className='pt-3'>
                  <AccountSettingsPanel onConnected={(acc) => setStatusMessage(`حساب ${acc.label} متصل شد.`)} />
                </div>
              <Button type='button' variant='secondary' className='w-full justify-center' onClick={() => setIsFullscreen((value) => !value)}>
                {isFullscreen ? 'خروج از تمام‌صفحه' : 'نمایش تمام‌صفحه'}
              </Button>
              <Button type='button' variant='danger' className='w-full justify-center' onClick={() => void logout().then(() => { window.location.assign('/login') })}>
                خروج امن
              </Button>
            </div>
          </Card>
        </section>

        <Modal open={confirmOpen} title={confirmTitle} onCancel={handleModalCancel} onConfirm={handleModalConfirm} confirmLabel='تأیید' cancelLabel='انصراف'>
          <div className='text-sm'>{confirmText}</div>
        </Modal>

        <section aria-labelledby='status-summary' className='space-y-4'>
          <div className='flex flex-col gap-4 md:flex-row md:items-end md:justify-between'>
            <div>
              <h2 id='status-summary' className={`text-lg font-bold ${theme.text}`}>خلاصه داشبورد</h2>
              <p className={`text-sm ${theme.muted}`}>عملکرد حساب، ریسک و وضعیت بازار را به صورت یکجا مرور کنید.</p>
            </div>
            <div className='flex flex-wrap items-center gap-3'>
              <Badge variant='blue'>داشبورد</Badge>
              <Button type='button' variant='secondary' size='sm' onClick={() => void handleRefreshOverview()} disabled={overviewLoading}>
                {overviewLoading ? 'در حال بروزرسانی…' : 'بروزرسانی داده‌ها'}
              </Button>
            </div>
          </div>

          <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-5'>
            {[
              { label: 'بالانس', value: formatNumber(portfolioSummary.balance), description: 'سرمایه قابل معامله', accent: theme.text },
              { label: 'اکویتی', value: formatNumber(portfolioSummary.equity), description: 'ارزش لحظه‌ای حساب', accent: theme.text },
              { label: 'سود/زیان باز', value: formatNumber(portfolioSummary.totalOpenProfit), description: 'مجموع موقعیت‌های فعال', accent: portfolioSummary.totalOpenProfit >= 0 ? 'text-emerald-400' : 'text-rose-400' },
              { label: 'مارجین مصرفی', value: formatNumber(portfolioSummary.marginUsed), description: 'مقدار مارجین استفاده‌شده', accent: theme.text },
              { label: 'درصد مارجین', value: `${portfolioSummary.marginUsage.toFixed(1)}%`, description: 'نسبت مارجین استفاده‌شده به مارجین کل', accent: portfolioSummary.marginUsage > 80 ? 'text-rose-400' : theme.text },
              { label: 'نسبت به بالانس', value: `${portfolioSummary.marginUsageOnBalance.toFixed(1)}%`, description: 'نسبت مارجین استفاده‌شده به موجودی', accent: portfolioSummary.marginUsageOnBalance > 80 ? 'text-rose-400' : theme.text },
              { label: 'نسبت به اکویتی', value: `${portfolioSummary.marginUsageOnEquity.toFixed(1)}%`, description: 'نسبت مارجین استفاده‌شده به ارزش حساب', accent: portfolioSummary.marginUsageOnEquity > 80 ? 'text-rose-400' : theme.text },
            ].map((item) => (
              <Card key={item.label} className='p-5' variant={darkMode ? 'dark' : 'default'}>
                <div className={`text-sm ${theme.muted}`}>{item.label}</div>
                <div className={`mt-3 text-2xl font-bold ${item.accent}`}>{item.value}</div>
                <div className={`mt-2 text-sm ${theme.muted}`}>{item.description}</div>
              </Card>
            ))}
          </div>

          <div className='grid gap-4 xl:grid-cols-4'>
            {[
              { label: 'سشن معاملاتی', value: selectedSessionLabel, description: selectedSessionDescription, accent: selectedSessionAccent },
              { label: 'دراودان', value: `${portfolioSummary.drawdown.toFixed(2)}%`, description: 'ریسک فعلی حساب', accent: portfolioSummary.drawdown > 5 ? 'text-rose-400' : 'text-emerald-400' },
              { label: 'موقعیت‌های باز', value: portfolioSummary.totalOpenPositions, description: 'تعداد پوزیشن‌های جاری', accent: theme.text },
              { label: 'نرخ برد', value: `${portfolioSummary.winRate.toFixed(1)}%`, description: 'کارایی معاملات اخیر', accent: portfolioSummary.winRate >= 50 ? 'text-emerald-400' : 'text-amber-300' },
            ].map((item) => (
              <Card key={item.label} className='p-5' variant={darkMode ? 'dark' : 'default'}>
                <div className={`text-sm ${theme.muted}`}>{item.label}</div>
                <div className={`mt-3 text-2xl font-bold ${item.accent}`}>{item.value}</div>
                <div className={`mt-2 text-sm ${theme.muted}`}>{item.description}</div>
              </Card>
            ))}
          </div>

          <div className='grid gap-6 xl:grid-cols-[1.4fr_0.9fr]'>
          <Card className='p-5' variant={darkMode ? 'dark' : 'default'}>
            <div className='mb-4 flex items-center justify-between'>
              <div>
                <h2 className={`text-lg font-bold ${theme.text}`}>نمودار روند قیمت</h2>
                <p className={`text-sm ${theme.muted}`}>تحلیل لحظه‌ای کندل‌های {symbol || 'نماد'} در تایم‌فریم {timeframe}</p>
              </div>
              <Badge variant='blue'>نمودار قیمت</Badge>
            </div>
            {priceSeries.length > 0 ? (
              <div>
                <div className='mb-3 flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <Button type='button' variant='ghost' size='sm' onClick={() => setFiltersOpen((v) => !v)}>
                      فیلترها
                    </Button>
                    <div className={`text-sm ${theme.muted}`}>فیلترهای فعال: {filterSessionKeys.length > 0 ? filterSessionKeys.join(', ') : 'هیچ'}</div>
                  </div>
                  <div className='text-sm text-slate-400'>{candles.length} کندل پس از فیلتر</div>
                </div>

                {filtersOpen && (
                  <div className='mb-3 rounded-lg border border-slate-700/60 bg-slate-900/50 p-3'>
                    <div className='flex flex-wrap items-center gap-3'>
                      <label className={`text-sm ${theme.muted}`}>از</label>
                      <input type='date' value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} className={`rounded-md border px-2 py-1 ${theme.input}`} />
                      <label className={`text-sm ${theme.muted}`}>تا</label>
                      <input type='date' value={filterTo} onChange={(e) => setFilterTo(e.target.value)} className={`rounded-md border px-2 py-1 ${theme.input}`} />

                      <label className={`text-sm ${theme.muted}`}>حداقل حجم</label>
                      <input type='number' min='0' value={minVolumeFilter} onChange={(e) => setMinVolumeFilter(Number(e.target.value) || 0)} className={`w-28 rounded-md border px-2 py-1 ${theme.input}`} />

                      <label className={`text-sm ${theme.muted}`}>قیمت حداقل</label>
                      <input type='number' step='any' value={minPriceFilter} onChange={(e) => setMinPriceFilter(e.target.value)} className={`w-32 rounded-md border px-2 py-1 ${theme.input}`} />
                      <label className={`text-sm ${theme.muted}`}>قیمت حداکثر</label>
                      <input type='number' step='any' value={maxPriceFilter} onChange={(e) => setMaxPriceFilter(e.target.value)} className={`w-32 rounded-md border px-2 py-1 ${theme.input}`} />

                      <div className='flex items-center gap-2'>
                        {sessionOptions.map((s) => (
                          <label key={s.key} className={`flex items-center gap-2 rounded-md px-2 py-1 text-sm ${theme.muted}`}>
                            <input type='checkbox' checked={filterSessionKeys.includes(s.key)} onChange={() => toggleFilterSessionKey(s.key)} />
                            <span className='text-xs'>{s.label}</span>
                          </label>
                        ))}
                      </div>

                      {/* Indicator filters */}
                      <div className='flex items-center gap-2'>
                        <label className={`flex items-center gap-2 rounded-md px-2 py-1 text-sm ${theme.muted}`}>
                          <input type='checkbox' checked={filterCloseAboveSMA} onChange={() => setFilterCloseAboveSMA((v) => !v)} />
                          <span className='text-xs'>بالاتر از SMA</span>
                        </label>
                        <input type='number' min='1' value={filterSMAPeriod} onChange={(e) => setFilterSMAPeriod(Math.max(1, Number(e.target.value) || 1))} className={`w-20 rounded-md border px-2 py-1 ${theme.input}`} />

                        <label className={`flex items-center gap-2 rounded-md px-2 py-1 text-sm ${theme.muted}`}>
                          <input type='checkbox' checked={filterRSIEnabled} onChange={() => setFilterRSIEnabled((v) => !v)} />
                          <span className='text-xs'>RSI</span>
                        </label>
                        <input type='number' min='1' value={filterRSIPeriod} onChange={(e) => setFilterRSIPeriod(Math.max(1, Number(e.target.value) || 1))} className={`w-16 rounded-md border px-2 py-1 ${theme.input}`} />
                        <input type='number' min='1' max='100' value={filterRSILevel} onChange={(e) => setFilterRSILevel(Math.max(1, Math.min(100, Number(e.target.value) || 1)))} className={`w-20 rounded-md border px-2 py-1 ${theme.input}`} />
                        <label className={`text-sm ${theme.muted}`}>بالا</label>
                        <input type='checkbox' checked={filterRSIAbove} onChange={() => setFilterRSIAbove((v) => !v)} />

                        <label className={`flex items-center gap-2 rounded-md px-2 py-1 text-sm ${theme.muted}`}>
                          <input type='checkbox' checked={filterMACDEnabled} onChange={() => setFilterMACDEnabled((v) => !v)} />
                          <span className='text-xs'>MACD صعودی</span>
                        </label>

                          <label className={`flex items-center gap-2 rounded-md px-2 py-1 text-sm ${theme.muted}`}>
                            <input type='checkbox' checked={filterMACDHistEnabled} onChange={() => setFilterMACDHistEnabled((v) => !v)} />
                            <span className='text-xs'>MACD هیستوگرام</span>
                          </label>
                          <input type='number' step='any' value={filterMACDHistThreshold} onChange={(e) => setFilterMACDHistThreshold(Number(e.target.value) || 0)} className={`w-20 rounded-md border px-2 py-1 ${theme.input}`} />

                          {/* MA Crossover */}
                          <label className={`flex items-center gap-2 rounded-md px-2 py-1 text-sm ${theme.muted}`}>
                            <input type='checkbox' checked={filterMACrossoverEnabled} onChange={() => setFilterMACrossoverEnabled((v) => !v)} />
                            <span className='text-xs'>MA Crossover</span>
                          </label>
                          <input type='number' min='1' value={filterMAFastPeriod} onChange={(e) => setFilterMAFastPeriod(Math.max(1, Number(e.target.value) || 1))} className={`w-16 rounded-md border px-2 py-1 ${theme.input}`} />
                          <input type='number' min='1' value={filterMASlowPeriod} onChange={(e) => setFilterMASlowPeriod(Math.max(1, Number(e.target.value) || 1))} className={`w-16 rounded-md border px-2 py-1 ${theme.input}`} />
                          <label className={`text-sm ${theme.muted}`}>فقط تقاطع</label>
                          <input type='checkbox' checked={filterMACrossoverRequireCross} onChange={() => setFilterMACrossoverRequireCross((v) => !v)} />

                          {/* MA Slope */}
                          <label className={`flex items-center gap-2 rounded-md px-2 py-1 text-sm ${theme.muted}`}>
                            <input type='checkbox' checked={filterMASlopeEnabled} onChange={() => setFilterMASlopeEnabled((v) => !v)} />
                            <span className='text-xs'>MA Slope</span>
                          </label>
                          <input type='number' min='1' value={filterMASlopePeriod} onChange={(e) => setFilterMASlopePeriod(Math.max(1, Number(e.target.value) || 1))} className={`w-16 rounded-md border px-2 py-1 ${theme.input}`} />
                          <input type='number' step='any' value={filterMASlopeThreshold} onChange={(e) => setFilterMASlopeThreshold(Number(e.target.value) || 0)} className={`w-24 rounded-md border px-2 py-1 ${theme.input}`} />

                          {/* ADX */}
                          <label className={`flex items-center gap-2 rounded-md px-2 py-1 text-sm ${theme.muted}`}>
                            <input type='checkbox' checked={filterADXEnabled} onChange={() => setFilterADXEnabled((v) => !v)} />
                            <span className='text-xs'>ADX</span>
                          </label>
                          <input type='number' min='1' value={filterADXPeriod} onChange={(e) => setFilterADXPeriod(Math.max(1, Number(e.target.value) || 1))} className={`w-16 rounded-md border px-2 py-1 ${theme.input}`} />
                          <input type='number' step='any' value={filterADXThreshold} onChange={(e) => setFilterADXThreshold(Number(e.target.value) || 0)} className={`w-16 rounded-md border px-2 py-1 ${theme.input}`} />

                          {/* Bollinger */}
                          <label className={`flex items-center gap-2 rounded-md px-2 py-1 text-sm ${theme.muted}`}>
                            <input type='checkbox' checked={filterBollingerEnabled} onChange={() => setFilterBollingerEnabled((v) => !v)} />
                            <span className='text-xs'>Bollinger Breakout</span>
                          </label>
                          <input type='number' min='1' value={filterBollingerPeriod} onChange={(e) => setFilterBollingerPeriod(Math.max(1, Number(e.target.value) || 1))} className={`w-16 rounded-md border px-2 py-1 ${theme.input}`} />
                          <input type='number' step='any' value={filterBollingerStd} onChange={(e) => setFilterBollingerStd(Number(e.target.value) || 2)} className={`w-16 rounded-md border px-2 py-1 ${theme.input}`} />
                        
                          {/* ATR Breakout */}
                          <label className={`flex items-center gap-2 rounded-md px-2 py-1 text-sm ${theme.muted}`}>
                            <input type='checkbox' checked={filterATRBreakoutEnabled} onChange={() => setFilterATRBreakoutEnabled((v) => !v)} />
                            <span className='text-xs'>ATR Breakout</span>
                          </label>
                          <input type='number' min='1' value={filterATRPeriod} onChange={(e) => setFilterATRPeriod(Math.max(1, Number(e.target.value) || 1))} className={`w-16 rounded-md border px-2 py-1 ${theme.input}`} />
                          <input type='number' step='any' value={filterATRMultiplier} onChange={(e) => setFilterATRMultiplier(Number(e.target.value) || 1)} className={`w-16 rounded-md border px-2 py-1 ${theme.input}`} />

                          {/* VWAP */}
                          <label className={`flex items-center gap-2 rounded-md px-2 py-1 text-sm ${theme.muted}`}>
                            <input type='checkbox' checked={filterVWAPEnabled} onChange={() => setFilterVWAPEnabled((v) => !v)} />
                            <span className='text-xs'>VWAP تایید</span>
                          </label>

                          {/* Heikin-Ashi consecutive */}
                          <label className={`flex items-center gap-2 rounded-md px-2 py-1 text-sm ${theme.muted}`}>
                            <input type='checkbox' checked={filterHeikenEnabled} onChange={() => setFilterHeikenEnabled((v) => !v)} />
                            <span className='text-xs'>Heikin-Ashi پیاپی</span>
                          </label>
                          <input type='number' min='1' value={filterHeikenConsecutive} onChange={(e) => setFilterHeikenConsecutive(Math.max(1, Number(e.target.value) || 1))} className={`w-16 rounded-md border px-2 py-1 ${theme.input}`} />

                          {/* SuperTrend */}
                          <label className={`flex items-center gap-2 rounded-md px-2 py-1 text-sm ${theme.muted}`}>
                            <input type='checkbox' checked={filterSuperTrendEnabled} onChange={() => setFilterSuperTrendEnabled((v) => !v)} />
                            <span className='text-xs'>SuperTrend</span>
                          </label>
                          <input type='number' min='1' value={filterSuperTrendATRPeriod} onChange={(e) => setFilterSuperTrendATRPeriod(Math.max(1, Number(e.target.value) || 1))} className={`w-16 rounded-md border px-2 py-1 ${theme.input}`} />
                          <input type='number' step='any' value={filterSuperTrendMultiplier} onChange={(e) => setFilterSuperTrendMultiplier(Number(e.target.value) || 1)} className={`w-16 rounded-md border px-2 py-1 ${theme.input}`} />

                          {/* OBV / MFI */}
                          <label className={`flex items-center gap-2 rounded-md px-2 py-1 text-sm ${theme.muted}`}>
                            <input type='checkbox' checked={filterOBVEnabled} onChange={() => setFilterOBVEnabled((v) => !v)} />
                            <span className='text-xs'>OBV صعودی</span>
                          </label>
                          <label className={`flex items-center gap-2 rounded-md px-2 py-1 text-sm ${theme.muted}`}>
                            <input type='checkbox' checked={filterMFIEnabled} onChange={() => setFilterMFIEnabled((v) => !v)} />
                            <span className='text-xs'>MFI</span>
                          </label>
                          <input type='number' min='1' value={filterMFIPeriod} onChange={(e) => setFilterMFIPeriod(Math.max(1, Number(e.target.value) || 1))} className={`w-16 rounded-md border px-2 py-1 ${theme.input}`} />
                          <input type='number' step='any' value={filterMFIThreshold} onChange={(e) => setFilterMFIThreshold(Number(e.target.value) || 0)} className={`w-16 rounded-md border px-2 py-1 ${theme.input}`} />

                        <label className={`flex items-center gap-2 rounded-md px-2 py-1 text-sm ${theme.muted}`}>
                          <input type='checkbox' checked={filterVolumeSpikeEnabled} onChange={() => setFilterVolumeSpikeEnabled((v) => !v)} />
                          <span className='text-xs'>Volume Spike</span>
                        </label>
                        <input type='number' min='1' step='0.1' value={filterVolumeSpikeMultiplier} onChange={(e) => setFilterVolumeSpikeMultiplier(Number(e.target.value) || 1)} className={`w-20 rounded-md border px-2 py-1 ${theme.input}`} />

                        {/* HTF alignment controls */}
                        <label className={`flex items-center gap-2 rounded-md px-2 py-1 text-sm ${theme.muted}`}>
                          <input type='checkbox' checked={htfEnabled} onChange={() => setHtfEnabled((v) => !v)} />
                          <span className='text-xs'>همراستا با HTF</span>
                        </label>
                        <select value={htfTimeframe} onChange={(e) => setHtfTimeframe(e.target.value)} className={`rounded-md border px-2 py-1 ${theme.input}`}>
                          {timeframeOptions.map((tf) => <option key={tf} value={tf}>{tf}</option>)}
                        </select>
                        <select value={htfDirection} onChange={(e) => setHtfDirection(e.target.value)} className={`rounded-md border px-2 py-1 ${theme.input}`}>
                          <option value='up'>روند صعودی (HTF)</option>
                          <option value='down'>روند نزولی (HTF)</option>
                        </select>

                        {/* Trend/channel detection UI */}
                        <label className={`flex items-center gap-2 rounded-md px-2 py-1 text-sm ${theme.muted}`}>
                          <input type='checkbox' checked={filterTrendEnabled} onChange={() => setFilterTrendEnabled((v) => !v)} />
                          <span className='text-xs'>شکست چنل/خط روند</span>
                        </label>
                        <input type='number' min='10' max='500' value={filterTrendWindow} onChange={(e) => setFilterTrendWindow(Math.max(10, Number(e.target.value) || 80))} className={`w-20 rounded-md border px-2 py-1 ${theme.input}`} />
                        <select value={filterTrendDirection} onChange={(e) => setFilterTrendDirection(e.target.value)} className={`rounded-md border px-2 py-1 ${theme.input}`}>
                          <option value='above'>شکست به بالا</option>
                          <option value='below'>شکست به پایین</option>
                          <option value='both'>هر دو</option>
                        </select>
                        <label className={`flex items-center gap-2 rounded-md px-2 py-1 text-sm ${theme.muted}`}>
                          <input type='checkbox' checked={filterTrendRequireBreak} onChange={() => setFilterTrendRequireBreak((v) => !v)} />
                          <span className='text-xs'>نیاز به شکست واقعی</span>
                        </label>

                        <label className={`text-sm ${theme.muted}`}>جهت کندل</label>
                        <select value={filterCandleDirection} onChange={(e) => setFilterCandleDirection(e.target.value)} className={`rounded-md border px-2 py-1 ${theme.input}`}>
                          <option value='both'>همه</option>
                          <option value='bull'>صعودی</option>
                          <option value='bear'>نزولی</option>
                        </select>
                      </div>

                      <label className={`flex items-center gap-2 ml-auto text-sm ${theme.muted}`}>
                        <input type='checkbox' checked={serverFiltersEnabled} onChange={() => setServerFiltersEnabled((v) => !v)} />
                        <span>اعمال فیلتر سمت سرور</span>
                      </label>
                      <div className='ml-2 flex items-center gap-2'>
                        <Button type='button' variant='primary' size='sm' onClick={() => setFiltersOpen(false)}>اعمال</Button>
                        <Button type='button' variant='secondary' size='sm' onClick={() => { setFilterFrom(''); setFilterTo(''); setMinVolumeFilter(0); setMinPriceFilter(''); setMaxPriceFilter(''); setFilterSessionKeys([]) }}>پاک کردن</Button>
                      </div>
                    </div>
                  </div>
                )}

                <div className='h-72'>
                  <Line
                    data={priceChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                      scales: {
                        x: { grid: { display: false }, ticks: { color: darkMode ? '#94a3b8' : '#475569' } },
                        y: { grid: { color: darkMode ? 'rgba(148, 163, 184, 0.18)' : 'rgba(148, 163, 184, 0.2)' }, ticks: { color: darkMode ? '#94a3b8' : '#475569' } },
                      },
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className={`flex h-72 items-center justify-center rounded-xl border border-dashed ${theme.panel} ${theme.muted}`}>برای نمایش نمودار، ابتدا داده‌های تایم‌فریم را بارگذاری کنید.</div>
            )}
          </Card>

          <Card className='p-5' variant={darkMode ? 'dark' : 'default'}>
            <div className='mb-4 flex items-center justify-between'>
              <div>
                <h2 className={`text-lg font-bold ${theme.text}`}>توزیع پوزیشن‌ها</h2>
                <p className={`text-sm ${theme.muted}`}>سهم نمادها در سبد باز</p>
              </div>
              <Badge variant='green'>توزیع پوزیشن</Badge>
            </div>
            {allocationData.labels.length > 0 ? (
              <div className='flex flex-col items-center gap-4'>
                <div className='h-52 w-52'>
                  <Doughnut
                    data={allocationData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { position: 'bottom', labels: { color: darkMode ? '#e2e8f0' : '#334155' } } },
                    }}
                  />
                </div>
                <div className='w-full space-y-2'>
                  {allocationData.labels.map((label, index) => (
                    <div key={label} className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${theme.chip}`}>
                      <span className={`font-medium ${theme.text}`}>{label}</span>
                      <span className={theme.muted}>{allocationData.datasets[0].data[index]} لات</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className={`flex h-52 items-center justify-center rounded-xl border border-dashed ${theme.panel} ${theme.muted}`}>در حال حاضر هیچ پوزیسیون فعالی برای نمایش وجود ندارد.</div>
            )}
          </Card>
        </div>

        <Card className='p-5' variant={darkMode ? 'dark' : 'default'}>
          <div className='mb-4 flex items-center justify-between'>
            <div>
              <h2 className={`text-lg font-bold ${theme.text}`}>کندل‌استیک و حجم</h2>
              <p className={`text-sm ${theme.muted}`}>نمایش دقیق‌تر کندل‌ها و حجم معاملات برای {symbol || 'نماد'}</p>
            </div>
            <Badge variant='blue'>دید تکنیکال</Badge>
          </div>
          <CandlestickChart data={ohlcChartData} darkMode={darkMode} />
          <div className={`mt-3 rounded-lg px-3 py-2 text-sm ${theme.chip}`}>
            {ohlcChartData.length} کندل اخیر • حجم مبنا: {formatNumber(volumeMax)} • آخرین قیمت: {formatNumber(priceSeries[priceSeries.length - 1])}
          </div>
        </Card>

        <div className='grid gap-6 xl:grid-cols-2'>
          <Card className='p-5' variant={darkMode ? 'dark' : 'default'}>
            <div className='mb-4 flex items-center justify-between'>
              <div>
                <h2 className={`text-lg font-bold ${theme.text}`}>لیست پیگیری</h2>
                <p className={`text-sm ${theme.muted}`}>نمادهای منتخب برای تصمیم‌گیری سریع</p>
              </div>
              <Badge variant='blue'>لیست پیگیری</Badge>
            </div>
            <div className='space-y-2'>
              {watchlistItems.map((item) => (
                <div key={item.symbol} className={`flex items-center justify-between rounded-lg px-3 py-2 ${theme.chip}`}>
                  <div>
                    <div className={`font-semibold ${theme.text}`}>{item.symbol}</div>
                    <div className={`text-xs ${theme.muted}`}>قدرت: {item.strength}</div>
                  </div>
                  <Badge variant={item.status === 'صعودی' ? 'green' : 'yellow'}>{item.status}</Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card className='p-5' variant={darkMode ? 'dark' : 'default'}>
            <div className='mb-4 flex items-center justify-between'>
              <div>
                <h2 className={`text-lg font-bold ${theme.text}`}>پنل سیگنال</h2>
                <p className={`text-sm ${theme.muted}`}>تحلیل کوتاه‌مدت بر اساس حرکت اخیر قیمت</p>
              </div>
              <Badge variant={signalPanel.tone === 'positive' ? 'green' : signalPanel.tone === 'negative' ? 'yellow' : 'blue'}>{signalPanel.label}</Badge>
            </div>
            <div className={`rounded-xl border border-slate-700/50 p-4 text-sm ${theme.chip}`}>
              <div className={`font-semibold ${theme.text}`}>{signalPanel.description}</div>
              <div className={`mt-2 ${theme.muted}`}>تایم‌فریم فعلی: {timeframe} • نماد: {symbol || '—'}</div>
            </div>
          </Card>
        </div>

        <div className='grid gap-6 xl:grid-cols-2'>
          <Card className='p-5' variant={darkMode ? 'dark' : 'default'}>
            <div className='mb-4 flex items-center justify-between'>
              <div>
                <h2 className={`text-lg font-bold ${theme.text}`}>اطلاعات حساب</h2>
                <p className={`text-sm ${theme.muted}`}>وضعیت لحظه‌ای دارایی و مارجین</p>
              </div>
              <Badge variant='blue'>حساب</Badge>
            </div>
            {accountInfo && Object.keys(accountInfo).length > 0 ? (
              <div className='grid gap-3 sm:grid-cols-2'>
                {[
                  ['شماره حساب', accountInfo.login || accountInfo.account || '—'],
                  ['سرور', accountInfo.server || '—'],
                  ['بالانس', formatNumber(accountInfo.balance)],
                  ['اکویتی', formatNumber(accountInfo.equity)],
                  ['مارجین', formatNumber(accountInfo.margin)],
                  ['مارجین آزاد', formatNumber(accountInfo.free_margin ?? accountInfo.margin_free ?? accountInfo.marginFree)],
                ].map(([label, value]) => (
                  <div key={label} className={`rounded-lg p-3 ${theme.chip}`}>
                    <div className={`text-xs ${theme.muted}`}>{label}</div>
                    <div className={`mt-1 font-semibold ${theme.text}`}>{value}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`rounded-lg border border-dashed ${theme.panel} p-4 text-sm ${theme.muted}`}>هنوز اطلاعات حساب دریافت نشده است.</div>
            )}
          </Card>

          <Card className='p-5' variant={darkMode ? 'dark' : 'default'}>
            <div className='mb-4 flex items-center justify-between'>
              <div>
                <h2 className={`text-lg font-bold ${theme.text}`}>پوزیشن‌های باز</h2>
                <p className={`text-sm ${theme.muted}`}>جزئیات کامل موقعیت‌های فعال</p>
              </div>
              <Badge variant='green'>پوزیشن‌های باز</Badge>
            </div>
            {positions.length > 0 ? (
              <div className='overflow-x-auto rounded-3xl border border-slate-700/60 bg-slate-950/60 shadow-inner'>
                <table className='min-w-full text-sm'>
                  <thead className={`text-right ${theme.tableHead}`}>
                    <tr>
                      <th className='px-3 py-2'>نماد</th>
                      <th className='px-3 py-2'>تیکت</th>
                      <th className='px-3 py-2'>نوع</th>
                      <th className='px-3 py-2'>حجم</th>
                      <th className='px-3 py-2'>سود/زیان</th>
                      <th className='px-3 py-2'>عملیات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {positions.slice(0, 8).map((position, index) => (
                      <tr key={position.ticket || `${position.symbol}-${index}`} className={theme.tableRow}>
                        <td className={`px-3 py-2 font-medium ${theme.text}`}>{position.symbol || '—'}</td>
                        <td className={`px-3 py-2 ${theme.muted}`}>{position.ticket || '—'}</td>
                        <td className='px-3 py-2'><Badge variant='blue'>{position.type || '—'}</Badge></td>
                        <td className={`px-3 py-2 ${theme.muted}`}>{formatNumber(position.volume, 2)}</td>
                        <td className={`px-3 py-2 ${Number(position.profit) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatNumber(position.profit, 2)}</td>
                        <td className='px-3 py-2'>
                          <Button
                            type='button'
                            variant='danger'
                            size='sm'
                            disabled={actionLoading && activeAction === `close:${position.ticket}`}
                            onClick={() => void handleClosePosition(position.ticket)}
                          >
                            {actionLoading && activeAction === `close:${position.ticket}` ? 'در حال بستن…' : 'بستن'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className={`rounded-lg border border-dashed ${theme.panel} p-4 text-sm ${theme.muted}`}>در این لحظه پوزیشن باز ندارید.</div>
            )}
          </Card>
        </div>

        <div className='grid gap-6 xl:grid-cols-2'>
          <Card className='p-5' variant={darkMode ? 'dark' : 'default'}>
            <div className='mb-4 flex items-center justify-between'>
              <div>
                <h2 className={`text-lg font-bold ${theme.text}`}>سفارش‌های باز</h2>
                <p className={`text-sm ${theme.muted}`}>سفارش‌های در انتظار اجرا با جزئیات</p>
              </div>
              <Badge variant='yellow'>سفارش‌های معلق</Badge>
            </div>
            {orders.length > 0 ? (
              <div className='overflow-x-auto rounded-3xl border border-slate-700/60 bg-slate-950/60 shadow-inner'>
                <table className='min-w-full text-sm'>
                  <thead className={`text-right ${theme.tableHead}`}>
                    <tr>
                      <th className='px-3 py-2'>نماد</th>
                      <th className='px-3 py-2'>تیکت</th>
                      <th className='px-3 py-2'>نوع</th>
                      <th className='px-3 py-2'>حجم</th>
                      <th className='px-3 py-2'>قیمت</th>
                      <th className='px-3 py-2'>عملیات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.slice(0, 8).map((order, index) => (
                      <tr key={order.ticket || `${order.symbol}-${index}`} className={theme.tableRow}>
                        <td className={`px-3 py-2 font-medium ${theme.text}`}>{order.symbol || '—'}</td>
                        <td className={`px-3 py-2 ${theme.muted}`}>{order.ticket || '—'}</td>
                        <td className='px-3 py-2'><Badge variant='yellow'>{order.type || '—'}</Badge></td>
                        <td className={`px-3 py-2 ${theme.muted}`}>{formatNumber(order.volume, 2)}</td>
                        <td className={`px-3 py-2 ${theme.muted}`}>{formatNumber(order.price, 5)}</td>
                        <td className='px-3 py-2'>
                          <Button
                            type='button'
                            variant='secondary'
                            size='sm'
                            disabled={actionLoading && activeAction === `cancel:${order.ticket}`}
                            onClick={() => void handleCancelOrder(order.ticket)}
                          >
                            {actionLoading && activeAction === `cancel:${order.ticket}` ? 'در حال لغو…' : 'لغو'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className={`rounded-lg border border-dashed ${theme.panel} p-4 text-sm ${theme.muted}`}>سفارشی در انتظار اجرا ندارید.</div>
            )}
          </Card>
        </div>

        <Card className='p-5' variant={darkMode ? 'dark' : 'default'}>
          <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
            <div className='flex-1 min-w-[220px]'>
              <h2 className={`text-lg font-bold ${theme.text}`}>تاریخچه معاملات</h2>
              <p className={`text-sm ${theme.muted}`}>آخرین معاملات بسته‌شده با جزئیات</p>
              {lastTradeHistoryUpdate && (
                <div className='mt-2 flex flex-wrap items-center gap-2'>
                  <div className={`flex items-center gap-1 rounded-full px-3 py-1 ${
                    Math.floor((new Date() - lastTradeHistoryUpdate) / 1000) < 5 
                      ? 'bg-emerald-500/20 text-emerald-400' 
                      : darkMode ? 'bg-slate-800/60 text-slate-400' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {Math.floor((new Date() - lastTradeHistoryUpdate) / 1000) < 5 && (
                      <span className='inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-400'></span>
                    )}
                    <span className='text-xs font-medium'>
                      {formatRealtimeUpdate(lastTradeHistoryUpdate)}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <div className='flex flex-wrap items-center gap-2'>
              <label className={`flex items-center gap-2 rounded-full border px-3 py-2 text-sm ${theme.muted}`}>
                <span className='text-xs'>{`آخرین ${tradeHistoryLimit} معامله`}</span>
                <input
                  type='number'
                  min='1'
                  max='50'
                  value={tradeHistoryLimit}
                  onChange={(e) => setTradeHistoryLimit(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
                  className={`w-16 rounded-md border px-2 py-1 text-sm ${theme.input}`}
                />
              </label>
              <Button type='button' variant='ghost' size='sm' onClick={() => void handleRefreshOverview()}>
                بروزرسانی تاریخچه
              </Button>
            </div>
            <Badge variant='gray'>تاریخچه معاملات</Badge>
          </div>
          <div className='mb-4 grid gap-3 md:grid-cols-4'>
            {[
              { label: 'تعداد معاملات', value: tradeHistorySummary.total, badge: 'purple' },
              { label: 'سود کل', value: `${formatNumber(tradeHistorySummary.profit, 2)} دلار`, badge: 'teal' },
              { label: 'نرخ برد', value: formatPercent(tradeHistorySummary.winRate, 1), badge: 'blue' },
              { label: 'میانگین سود', value: `${formatNumber(tradeHistorySummary.averageProfit, 2)} دلار`, badge: 'green' },
            ].map((item) => (
              <div key={item.label} className={`rounded-3xl border border-slate-700/70 bg-slate-950/70 p-4 text-sm ${theme.text}`}>
                <div className='text-xs text-slate-400'>{item.label}</div>
                <div className='mt-2 text-lg font-semibold'>{item.value}</div>
                <Badge variant={item.badge} className='mt-3'>{item.badge === 'purple' ? 'خلاصه' : 'عملکرد'}</Badge>
              </div>
            ))}
          </div>
          {tradeHistory.length > 0 ? (
            <div className='overflow-x-auto rounded-3xl border border-slate-700/60 bg-slate-950/60'>
              <table className='min-w-full text-sm'>
                <thead className={`text-right ${theme.tableHead}`}>
                  <tr>
                    <th className='px-3 py-3 uppercase tracking-wide text-slate-400'>نماد</th>
                    <th className='px-3 py-3 uppercase tracking-wide text-slate-400'>تیکت</th>
                    <th className='px-3 py-3 uppercase tracking-wide text-slate-400'>نوع</th>
                    <th className='px-3 py-3 uppercase tracking-wide text-slate-400'>حجم</th>
                    <th className='px-3 py-3 uppercase tracking-wide text-slate-400'>قیمت ورود</th>
                    <th className='px-3 py-3 uppercase tracking-wide text-slate-400'>حد ضرر</th>
                    <th className='px-3 py-3 uppercase tracking-wide text-slate-400'>حد سود</th>
                    <th className='px-3 py-3 uppercase tracking-wide text-slate-400'>زمان</th>
                    <th className='px-3 py-3 uppercase tracking-wide text-slate-400'>قیمت بسته‌شدن</th>
                    <th className='px-3 py-3 uppercase tracking-wide text-slate-400'>سود</th>
                    <th className='px-3 py-3 uppercase tracking-wide text-slate-400'>تغییر</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTradeHistory.slice(0, tradeHistoryLimit).map((entry, index) => (
                    <tr key={entry.ticket || `${entry.symbol}-${index}`} className={`${theme.tableRow} ${index % 2 === 0 ? 'bg-slate-900/60' : 'bg-slate-950/60'}`}>
                      <td className={`px-3 py-3 font-medium ${theme.text}`}>{entry.symbol || '—'}</td>
                      <td className={`px-3 py-3 ${theme.muted}`}>{entry.ticket || '—'}</td>
                      <td className='px-3 py-3'><Badge variant={entry.profit >= 0 ? 'green' : 'red'}>{entry.type || '—'}</Badge></td>
                      <td className={`px-3 py-3 ${theme.muted}`}>{formatNumber(entry.volume, 2)}</td>
                      <td className={`px-3 py-3 ${theme.muted}`}>{formatNumber(getTradePrice(entry, 'price_open', 'priceOpen', 'open_price'), 5)}</td>
                      <td className={`px-3 py-3 ${theme.muted}`}>{formatNumber(getTradePrice(entry, 'sl', 'stop_loss', 'stopLoss'), 5)}</td>
                      <td className={`px-3 py-3 ${theme.muted}`}>{formatNumber(getTradePrice(entry, 'tp', 'take_profit', 'takeProfit'), 5)}</td>
                      <td className={`px-3 py-3 whitespace-nowrap ${theme.muted}`}>{formatDate(entry.close_time || entry.time)}</td>
                      <td className={`px-3 py-3 ${theme.muted}`}>{formatNumber(getTradePrice(entry, 'price', 'close_price', 'closePrice'), 5)}</td>
                      <td className={`px-3 py-3 ${Number(entry.profit) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatNumber(entry.profit, 2)}</td>
                      <td className={`px-3 py-3 ${getTradeChange(entry) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{getTradeChange(entry) === null ? '—' : `${formatNumber(getTradeChange(entry), 2)}%`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={`rounded-lg border border-dashed ${theme.panel} p-4 text-sm ${theme.muted}`}>تاریخچه معامله‌ای در دسترس نیست.</div>
          )}
        </Card>
        <Card className='p-5' variant={darkMode ? 'dark' : 'default'}>
          <div className='mb-3'>
            <h3 className={`text-md font-semibold ${theme.text}`}>تحلیل سریع</h3>
            <p className={`text-sm ${theme.muted}`}>ویجت‌های تحلیلی و سفارش دستی</p>
          </div>
          <div className='grid gap-3 md:grid-cols-3'>
            <IndicatorsPanel priceSeries={priceSeries} symbol={symbol} timeframe={timeframe} />
            <AISignalsPanel priceSeries={priceSeries} symbol={symbol} timeframe={timeframe} />
            <div className='sticky top-24 self-start'>
              <FiltersPanel
               priceSeries={priceSeries}
               symbol={symbol}
               timeframe={timeframe}
               onOpen={() => setFiltersOpen(true)}
               filterSessionKeys={filterSessionKeys}
               serverFiltersEnabled={serverFiltersEnabled}
               indicatorFlags={{
                 sma: filterSMAPeriod > 0 && filterCloseAboveSMA,
                 rsi: filterRSIEnabled,
                 macd: filterMACDEnabled || filterMACDHistEnabled,
                 supertrend: filterSuperTrendEnabled,
                 mfi: filterMFIEnabled,
                 obv: filterOBVEnabled,
               }}
               theme={theme}
             />
            </div>
          </div>
        </Card>

        <Card className='p-5' variant={darkMode ? 'dark' : 'default'}>
          <div className='mb-3'>
            <h3 className={`text-md font-semibold ${theme.text}`}>اندیکاتورهای سفارشی</h3>
            <p className={`text-sm ${theme.muted}`}>انتخاب و تنظیم اندیکاتورهای جدید برای تحلیل دقیق‌تر</p>
          </div>
          <CustomIndicatorsPanel
            priceSeries={priceSeries}
            symbol={symbol}
            timeframe={timeframe}
            theme={theme}
            ohlc={{
              high: ohlcChartData.map((candle) => Number(candle.high)),
              low: ohlcChartData.map((candle) => Number(candle.low)),
              close: ohlcChartData.map((candle) => Number(candle.close)),
              volume: ohlcChartData.map((candle) => Number(candle.volume)),
            }}
          />
        </Card>

        </section>
      </div>
    </div>
  )
}

CandlestickChart.propTypes = {
  data: PropTypes.arrayOf(PropTypes.shape({
    open: PropTypes.number,
    high: PropTypes.number,
    low: PropTypes.number,
    close: PropTypes.number,
    volume: PropTypes.number,
  })),
  darkMode: PropTypes.bool,
  symbol: PropTypes.string,
  timeframe: PropTypes.string,
}

export default DashboardPage
