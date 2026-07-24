import React, { useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from 'chart.js'
import { Line } from 'react-chartjs-2'
import { Badge, Button } from './UI'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend)

const indicatorDefinitions = {
  SMA: {
    label: 'SMA (میانگین متحرک ساده)',
    settings: [{ key: 'period', label: 'دوره', type: 'number', min: 2, max: 200, default: 10 }],
    description: 'میانگین قیمت‌ها را در بازه مشخص نشان می‌دهد.',
  },
  EMA: {
    label: 'EMA (میانگین متحرک نمایی)',
    settings: [{ key: 'period', label: 'دوره', type: 'number', min: 2, max: 200, default: 20 }],
    description: 'میانگین وزنی که به داده‌های اخیر وزن بیشتری می‌دهد.',
  },
  RSI: {
    label: 'RSI (شاخص قدرت نسبی)',
    settings: [{ key: 'period', label: 'دوره', type: 'number', min: 2, max: 50, default: 14 }],
    description: 'میزان خرید یا فروش بیش از حد را نشان می‌دهد.',
  },
  MACD: {
    label: 'MACD',
    settings: [
      { key: 'fastPeriod', label: 'دوره سریع', type: 'number', min: 2, max: 50, default: 12 },
      { key: 'slowPeriod', label: 'دوره کند', type: 'number', min: 2, max: 100, default: 26 },
      { key: 'signalPeriod', label: 'دوره سیگنال', type: 'number', min: 2, max: 50, default: 9 },
    ],
    description: 'تفاوت بین دو میانگین متحرک نمایی و خط سیگنال را نمایش می‌دهد.',
  },
  ATR: {
    label: 'ATR (دامنه واقعی میانگین)',
    settings: [{ key: 'period', label: 'دوره', type: 'number', min: 2, max: 50, default: 14 }],
    description: 'نوسان قیمت را با میانگین دامنه واقعی اندازه‌گیری می‌کند.',
  },
  OBV: {
    label: 'OBV (حجم متوازن شده)',
    settings: [],
    description: 'تراکم حجم خرید و فروش را با توجه به جهت حرکت قیمت نشان می‌دهد.',
  },
  ADX: {
    label: 'ADX (شاخص جهت‌گیری میانگین)',
    settings: [{ key: 'period', label: 'دوره', type: 'number', min: 2, max: 50, default: 14 }],
    description: 'قدرت روند را با مقایسه حرکات جهت‌دار قیمت می‌سنجد.',
  },
  CCI: {
    label: 'CCI (شاخص کانال کالا)',
    settings: [{ key: 'period', label: 'دوره', type: 'number', min: 2, max: 50, default: 20 }],
    description: 'افزایش یا کاهش قیمت را نسبت به میانگین آن در بازه مشخص نشان می‌دهد.',
  },
  VWAP: {
    label: 'VWAP (قیمت میانگین وزنی حجم)',
    settings: [],
    description: 'قیمت معامله شده را بر اساس حجم به صورت میانگین وزن شده نمایش می‌دهد.',
  },
  MFI: {
    label: 'MFI (شاخص جریان نقدینگی)',
    settings: [{ key: 'period', label: 'دوره', type: 'number', min: 2, max: 50, default: 14 }],
    description: 'حجم و قیمت را ترکیب کرده و جریان نقدینگی را برای شناسایی شرایط خرید/فروش بیش از حد نمایش می‌دهد.',
  },
  WILLIAMS_R: {
    label: 'Williams %R',
    settings: [{ key: 'period', label: 'دوره', type: 'number', min: 2, max: 50, default: 14 }],
    description: 'نسبت قیمت بسته شدن به محدوده دوره گذشته را در قالب نوسان‌گر درصدی نمایش می‌دهد.',
  },
  DONCHIAN_CHANNEL: {
    label: 'Donchian Channel',
    settings: [{ key: 'period', label: 'دوره', type: 'number', min: 2, max: 100, default: 20 }],
    description: 'سطوح حمایت و مقاومت را بر اساس بالاترین و پایین‌ترین قیمت‌های دوره‌ای نشان می‌دهد.',
  },
  PARABOLIC_SAR: {
    label: 'Parabolic SAR',
    settings: [
      { key: 'step', label: 'گام', type: 'number', min: 0.01, max: 0.2, default: 0.02 },
      { key: 'maxStep', label: 'حداکثر گام', type: 'number', min: 0.05, max: 0.5, default: 0.2 },
    ],
    description: 'جهت روند و نقاط بازگشت کوتاه‌مدت را با استفاده از نمادهای نقطه‌ای نمایش می‌دهد.',
  },
  ICHIMOKU: {
    label: 'Ichimoku Cloud',
    settings: [
      { key: 'conversionPeriod', label: 'دوره تنکان', type: 'number', min: 2, max: 20, default: 9 },
      { key: 'basePeriod', label: 'دوره کیجون', type: 'number', min: 2, max: 50, default: 26 },
      { key: 'leadingSpanBPeriod', label: 'دوره سنکو B', type: 'number', min: 20, max: 100, default: 52 },
      { key: 'displacement', label: 'جابجایی', type: 'number', min: 1, max: 30, default: 26 },
    ],
    description: 'چندین خط روند را برای مشاهده قدرت، جهت و فاز بازار نمایش می‌دهد.',
  },
  MOMENTUM: {
    label: 'Momentum',
    settings: [{ key: 'period', label: 'دوره', type: 'number', min: 2, max: 50, default: 10 }],
    description: 'سرعت تغییر قیمت را با مقایسه قیمت فعلی با قیمت گذشته اندازه می‌گیرد.',
  },
  ROC: {
    label: 'ROC (نرخ تغییر)',
    settings: [{ key: 'period', label: 'دوره', type: 'number', min: 2, max: 50, default: 12 }],
    description: 'درصد تغییر قیمت نسبت به چند دوره گذشته را نمایش می‌دهد.',
  },
  BBANDS: {
    label: 'Bollinger Bands',
    settings: [
      { key: 'period', label: 'دوره', type: 'number', min: 2, max: 100, default: 20 },
      { key: 'deviation', label: 'انحراف معیار', type: 'number', min: 1, max: 5, default: 2 },
    ],
    description: 'دامنه نوسان قیمت را با استفاده از میانگین و انحراف معیار نمایش می‌دهد.',
  },
  STOCHASTIC: {
    label: 'Stochastic',
    settings: [
      { key: 'kPeriod', label: 'دوره %K', type: 'number', min: 2, max: 50, default: 14 },
      { key: 'dPeriod', label: 'دوره %D', type: 'number', min: 2, max: 20, default: 3 },
    ],
    description: 'سرعت و شرایط اشباع خرید/فروش را با مقایسه قیمت بسته‌شدن با محدوده قیمت نشان می‌دهد.',
  },
}

const getDefaultConfig = (type) => {
  const definition = indicatorDefinitions[type] || indicatorDefinitions.SMA
  return definition.settings.reduce((acc, setting) => ({ ...acc, [setting.key]: setting.default }), {})
}

const sma = (series = [], period = 10) => {
  if (!Array.isArray(series) || series.length < period) return null
  const window = series.slice(-period)
  const sum = window.reduce((sumValue, v) => sumValue + Number(v || 0), 0)
  return sum / period
}

const emaSeries = (series = [], period = 10) => {
  if (!Array.isArray(series) || series.length < period) return Array(series.length).fill(null)
  const alpha = 2 / (period + 1)
  const result = Array(series.length).fill(null)
  let prev = series.slice(0, period).reduce((sum, v) => sum + Number(v || 0), 0) / period
  result[period - 1] = prev
  for (let i = period; i < series.length; i += 1) {
    const value = Number(series[i] || 0)
    prev = alpha * value + (1 - alpha) * prev
    result[i] = prev
  }
  return result
}

const rsiSeries = (series = [], period = 14) => {
  if (!Array.isArray(series) || series.length <= period) return Array(series.length).fill(null)
  const result = Array(series.length).fill(null)
  let gains = 0
  let losses = 0
  for (let i = 1; i <= period; i += 1) {
    const delta = Number(series[i] || 0) - Number(series[i - 1] || 0)
    if (delta >= 0) gains += delta
    else losses -= delta
  }
  let avgGain = gains / period
  let avgLoss = losses / period
  result[period] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss))
  for (let i = period + 1; i < series.length; i += 1) {
    const delta = Number(series[i] || 0) - Number(series[i - 1] || 0)
    const gain = delta > 0 ? delta : 0
    const loss = delta < 0 ? -delta : 0
    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period
    result[i] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss))
  }
  return result
}

const macdSeries = (series = [], fast = 12, slow = 26, signal = 9) => {
  const fastLine = emaSeries(series, fast)
  const slowLine = emaSeries(series, slow)
  const macd = series.map((_, idx) => {
    const f = fastLine[idx]
    const s = slowLine[idx]
    return Number.isFinite(f) && Number.isFinite(s) ? f - s : null
  })
  const signalLine = emaSeries(macd.map((v) => (v === null ? 0 : v)), signal)
  return { macd, signalLine }
}

const standardDeviation = (series = [], period = 20) => {
  if (!Array.isArray(series) || series.length < period) return null
  const window = series.slice(-period)
  const mean = window.reduce((sum, value) => sum + Number(value || 0), 0) / period
  const variance = window.reduce((sum, value) => sum + Math.pow(Number(value || 0) - mean, 2), 0) / period
  return Math.sqrt(variance)
}

const momentumSeries = (series = [], period = 10) => {
  if (!Array.isArray(series) || series.length <= period) return Array(series.length).fill(null)
  return series.map((value, index) => {
    if (index < period) return null
    return Number(value) - Number(series[index - period])
  })
}

const rocSeries = (series = [], period = 12) => {
  if (!Array.isArray(series) || series.length <= period) return Array(series.length).fill(null)
  return series.map((value, index) => {
    if (index < period) return null
    const prior = Number(series[index - period])
    if (!Number.isFinite(prior) || prior === 0) return null
    return ((Number(value) - prior) / prior) * 100
  })
}

const bollingerSeries = (series = [], period = 20, deviation = 2) => {
  if (!Array.isArray(series) || series.length < period) return { middle: Array(series.length).fill(null), upper: Array(series.length).fill(null), lower: Array(series.length).fill(null) }
  const middle = Array(series.length).fill(null)
  const upper = Array(series.length).fill(null)
  const lower = Array(series.length).fill(null)
  for (let i = period - 1; i < series.length; i += 1) {
    const window = series.slice(i - period + 1, i + 1)
    const avg = window.reduce((sum, value) => sum + Number(value || 0), 0) / period
    const std = standardDeviation(window, period)
    middle[i] = avg
    upper[i] = avg + std * deviation
    lower[i] = avg - std * deviation
  }
  return { middle, upper, lower }
}

const atrSeries = (highSeries = [], lowSeries = [], closeSeries = [], period = 14) => {
  if (!Array.isArray(highSeries) || !Array.isArray(lowSeries) || !Array.isArray(closeSeries) || !highSeries.length || !lowSeries.length || !closeSeries.length) {
    return Array(closeSeries.length).fill(null)
  }
  const result = Array(closeSeries.length).fill(null)
  for (let i = 0; i < closeSeries.length; i += 1) {
    if (i === 0) {
      result[i] = null
      continue
    }
    const high = Number(highSeries[i] || 0)
    const low = Number(lowSeries[i] || 0)
    const prevClose = Number(closeSeries[i - 1] || 0)
    const trueRange = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose),
    )
    result[i] = trueRange
  }
  const atr = Array(closeSeries.length).fill(null)
  let sum = 0
  for (let i = 0; i < closeSeries.length; i += 1) {
    if (i < period) {
      if (i > 0) sum += result[i]
      continue
    }
    if (i === period) {
      atr[i] = sum / period
    } else {
      atr[i] = ((atr[i - 1] * (period - 1)) + result[i]) / period
    }
  }
  return atr
}

const obvSeries = (closeSeries = [], volumeSeries = []) => {
  if (!Array.isArray(closeSeries) || !Array.isArray(volumeSeries) || closeSeries.length !== volumeSeries.length) {
    return Array(closeSeries.length).fill(null)
  }
  const result = Array(closeSeries.length).fill(null)
  result[0] = 0
  for (let i = 1; i < closeSeries.length; i += 1) {
    const currentClose = Number(closeSeries[i] || 0)
    const prevClose = Number(closeSeries[i - 1] || 0)
    const volume = Number(volumeSeries[i] || 0)
    if (currentClose > prevClose) {
      result[i] = result[i - 1] + volume
    } else if (currentClose < prevClose) {
      result[i] = result[i - 1] - volume
    } else {
      result[i] = result[i - 1]
    }
  }
  return result
}

const adxSeries = (highSeries = [], lowSeries = [], closeSeries = [], period = 14) => {
  const length = closeSeries.length
  const result = Array(length).fill(null)
  if (length <= period || !highSeries.length || !lowSeries.length) return result

  const tr = Array(length).fill(0)
  const plusDM = Array(length).fill(0)
  const minusDM = Array(length).fill(0)

  for (let i = 1; i < length; i += 1) {
    const high = Number(highSeries[i] || 0)
    const low = Number(lowSeries[i] || 0)
    const prevHigh = Number(highSeries[i - 1] || 0)
    const prevLow = Number(lowSeries[i - 1] || 0)
    const prevClose = Number(closeSeries[i - 1] || 0)

    tr[i] = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose),
    )

    const upMove = high - prevHigh
    const downMove = prevLow - low
    plusDM[i] = upMove > downMove && upMove > 0 ? upMove : 0
    minusDM[i] = downMove > upMove && downMove > 0 ? downMove : 0
  }

  let atr = 0
  let plusATR = 0
  let minusATR = 0
  for (let i = 1; i <= period; i += 1) {
    atr += tr[i]
    plusATR += plusDM[i]
    minusATR += minusDM[i]
  }

  atr /= period
  plusATR /= period
  minusATR /= period

  const dxValues = Array(length).fill(null)
  for (let i = period; i < length; i += 1) {
    if (i > period) {
      atr = ((atr * (period - 1)) + tr[i]) / period
      plusATR = ((plusATR * (period - 1)) + plusDM[i]) / period
      minusATR = ((minusATR * (period - 1)) + minusDM[i]) / period
    }

    const plusDI = atr === 0 ? 0 : (100 * plusATR) / atr
    const minusDI = atr === 0 ? 0 : (100 * minusATR) / atr
    const denom = plusDI + minusDI
    dxValues[i] = denom === 0 ? 0 : (100 * Math.abs(plusDI - minusDI)) / denom
  }

  if (length >= period * 2) {
    let adxValue = dxValues.slice(period, period * 2).reduce((sum, value) => sum + (value || 0), 0) / period
    result[period * 2 - 1] = adxValue
    for (let i = period * 2; i < length; i += 1) {
      const dx = dxValues[i]
      adxValue = ((adxValue * (period - 1)) + (dx || 0)) / period
      result[i] = adxValue
    }
  }

  return result
}

const cciSeries = (highSeries = [], lowSeries = [], closeSeries = [], period = 20) => {
  const length = closeSeries.length
  const result = Array(length).fill(null)
  if (!highSeries.length || !lowSeries.length || length < period) return result

  const typicalPrices = closeSeries.map((close, index) => {
    const high = Number(highSeries[index] || 0)
    const low = Number(lowSeries[index] || 0)
    const closeValue = Number(close || 0)
    return (high + low + closeValue) / 3
  })

  for (let i = period - 1; i < length; i += 1) {
    const window = typicalPrices.slice(i - period + 1, i + 1)
    const mean = window.reduce((sum, value) => sum + value, 0) / period
    const meanDev = window.reduce((sum, value) => sum + Math.abs(value - mean), 0) / period
    result[i] = meanDev === 0 ? 0 : (typicalPrices[i] - mean) / (0.015 * meanDev)
  }

  return result
}

const vwapSeries = (highSeries = [], lowSeries = [], closeSeries = [], volumeSeries = []) => {
  const length = closeSeries.length
  const result = Array(length).fill(null)
  if (!highSeries.length || !lowSeries.length || !volumeSeries.length) return result

  let cumulativePV = 0
  let cumulativeVolume = 0
  for (let i = 0; i < length; i += 1) {
    const high = Number(highSeries[i] || 0)
    const low = Number(lowSeries[i] || 0)
    const close = Number(closeSeries[i] || 0)
    const volume = Number(volumeSeries[i] || 0)
    const typicalPrice = (high + low + close) / 3
    cumulativePV += typicalPrice * volume
    cumulativeVolume += volume
    result[i] = cumulativeVolume === 0 ? null : cumulativePV / cumulativeVolume
  }

  return result
}

const mfiSeries = (highSeries = [], lowSeries = [], closeSeries = [], volumeSeries = [], period = 14) => {
  const length = closeSeries.length
  const result = Array(length).fill(null)
  if (!highSeries.length || !lowSeries.length || !volumeSeries.length || length < period) return result

  const typicalPrices = closeSeries.map((rawClose, index) => {
    const high = Number(highSeries[index] || 0)
    const low = Number(lowSeries[index] || 0)
    const close = Number(rawClose || 0)
    return (high + low + close) / 3
  })

  for (let i = 1; i < length; i += 1) {
    const change = typicalPrices[i] - typicalPrices[i - 1]
    const volume = Number(volumeSeries[i] || 0)
    result[i] = change >= 0 ? volume : -volume
  }

  for (let i = period; i < length; i += 1) {
    let positiveFlow = 0
    let negativeFlow = 0
    for (let j = i - period + 1; j <= i; j += 1) {
      if (result[j] >= 0) positiveFlow += result[j]
      else negativeFlow -= result[j]
    }
    const moneyRatio = negativeFlow === 0 ? 0 : positiveFlow / negativeFlow
    result[i] = negativeFlow === 0 ? 100 : 100 - (100 / (1 + moneyRatio))
  }

  return result
}

const williamsRSeries = (highSeries = [], lowSeries = [], closeSeries = [], period = 14) => {
  const length = closeSeries.length
  const result = Array(length).fill(null)
  if (!highSeries.length || !lowSeries.length || length < period) return result

  for (let i = period - 1; i < length; i += 1) {
    const highWindow = highSeries.slice(i - period + 1, i + 1).map((value) => Number(value || 0))
    const lowWindow = lowSeries.slice(i - period + 1, i + 1).map((value) => Number(value || 0))
    const highestHigh = Math.max(...highWindow)
    const lowestLow = Math.min(...lowWindow)
    const close = Number(closeSeries[i] || 0)
    result[i] = highestHigh === lowestLow ? 0 : -100 * ((highestHigh - close) / (highestHigh - lowestLow))
  }

  return result
}

const donchianSeries = (highSeries = [], lowSeries = [], period = 20) => {
  const length = highSeries.length
  const upper = Array(length).fill(null)
  const lower = Array(length).fill(null)
  const middle = Array(length).fill(null)
  if (!highSeries.length || !lowSeries.length || length < period) return { upper, lower, middle }

  for (let i = period - 1; i < length; i += 1) {
    const highWindow = highSeries.slice(i - period + 1, i + 1).map((value) => Number(value || 0))
    const lowWindow = lowSeries.slice(i - period + 1, i + 1).map((value) => Number(value || 0))
    upper[i] = Math.max(...highWindow)
    lower[i] = Math.min(...lowWindow)
    middle[i] = (upper[i] + lower[i]) / 2
  }

  return { upper, lower, middle }
}

const parabolicSarSeries = (highSeries = [], lowSeries = [], step = 0.02, maxStep = 0.2) => {
  const length = highSeries.length
  const result = Array(length).fill(null)
  if (!highSeries.length || !lowSeries.length || length < 2) return result

  let isRising = true
  let ep = highSeries[0]
  let af = step
  result[0] = lowSeries[0]

  for (let i = 1; i < length; i += 1) {
    const high = Number(highSeries[i] || 0)
    const low = Number(lowSeries[i] || 0)
    const prevSar = result[i - 1]
    let sar = prevSar + af * (ep - prevSar)

    if (isRising) {
      sar = Math.min(sar, Number(lowSeries[i - 1] || 0), low)
      if (low < sar) {
        isRising = false
        sar = ep
        af = step
      } else if (high > ep) {
        ep = high
        af = Math.min(maxStep, af + step)
      }
    } else {
      sar = Math.max(sar, Number(highSeries[i - 1] || 0), high)
      if (high > sar) {
        isRising = true
        sar = ep
        af = step
      } else if (low < ep) {
        ep = low
        af = Math.min(maxStep, af + step)
      }
    }

    result[i] = sar
  }

  return result
}

const ichimokuSeries = (highSeries = [], lowSeries = [], closeSeries = [], conversionPeriod = 9, basePeriod = 26, leadingSpanBPeriod = 52, displacement = 26) => {
  const length = closeSeries.length
  const conversionLine = Array(length).fill(null)
  const baseLine = Array(length).fill(null)
  const leadingSpanA = Array(length).fill(null)
  const leadingSpanB = Array(length).fill(null)

  for (let i = conversionPeriod - 1; i < length; i += 1) {
    const window = highSeries.slice(i - conversionPeriod + 1, i + 1).map((value) => Number(value || 0))
    const lowWindow = lowSeries.slice(i - conversionPeriod + 1, i + 1).map((value) => Number(value || 0))
    conversionLine[i] = (Math.max(...window) + Math.min(...lowWindow)) / 2
  }

  for (let i = basePeriod - 1; i < length; i += 1) {
    const window = highSeries.slice(i - basePeriod + 1, i + 1).map((value) => Number(value || 0))
    const lowWindow = lowSeries.slice(i - basePeriod + 1, i + 1).map((value) => Number(value || 0))
    baseLine[i] = (Math.max(...window) + Math.min(...lowWindow)) / 2
  }

  for (let i = leadingSpanBPeriod - 1; i < length; i += 1) {
    const window = highSeries.slice(i - leadingSpanBPeriod + 1, i + 1).map((value) => Number(value || 0))
    const lowWindow = lowSeries.slice(i - leadingSpanBPeriod + 1, i + 1).map((value) => Number(value || 0))
    leadingSpanB[i] = (Math.max(...window) + Math.min(...lowWindow)) / 2
  }

  for (let i = 0; i < length; i += 1) {
    if (i + displacement < length) {
      leadingSpanA[i + displacement] = (conversionLine[i] !== null && baseLine[i] !== null)
        ? (conversionLine[i] + baseLine[i]) / 2
        : null
      leadingSpanB[i + displacement] = leadingSpanB[i]
    }
  }

  return { conversionLine, baseLine, leadingSpanA, leadingSpanB }
}

const stochasticSeries = (series = [], kPeriod = 14, dPeriod = 3) => {
  if (!Array.isArray(series) || series.length < kPeriod) return { kLine: Array(series.length).fill(null), dLine: Array(series.length).fill(null) }
  const kLine = Array(series.length).fill(null)
  const dLine = Array(series.length).fill(null)
  for (let i = kPeriod - 1; i < series.length; i += 1) {
    const window = series.slice(i - kPeriod + 1, i + 1)
    const low = Math.min(...window.map((value) => Number(value || 0)))
    const high = Math.max(...window.map((value) => Number(value || 0)))
    const close = Number(series[i] || 0)
    kLine[i] = high === low ? 50 : ((close - low) / (high - low)) * 100
  }
  for (let i = kPeriod + dPeriod - 2; i < series.length; i += 1) {
    const window = kLine.slice(i - dPeriod + 1, i + 1)
    dLine[i] = window.reduce((sum, value) => sum + Number(value || 0), 0) / dPeriod
  }
  return { kLine, dLine }
}

const computeIndicatorSeries = (series, type, config, ohlc = {}) => {
  if (!Array.isArray(series) || series.length === 0) return []
  switch (type) {
    case 'SMA':
      return series.map((_, index) => (index + 1 >= config.period ? sma(series.slice(0, index + 1), config.period) : null))
    case 'EMA':
      return emaSeries(series, config.period)
    case 'RSI':
      return rsiSeries(series, config.period)
    case 'MACD':
      return macdSeries(series, config.fastPeriod, config.slowPeriod, config.signalPeriod)
    case 'MOMENTUM':
      return momentumSeries(series, config.period)
    case 'ROC':
      return rocSeries(series, config.period)
    case 'ATR':
      return atrSeries(ohlc.high, ohlc.low, series, config.period)
    case 'OBV':
      return obvSeries(series, ohlc.volume)
    case 'ADX':
      return adxSeries(ohlc.high, ohlc.low, ohlc.close, config.period)
    case 'CCI':
      return cciSeries(ohlc.high, ohlc.low, ohlc.close, config.period)
    case 'VWAP':
      return vwapSeries(ohlc.high, ohlc.low, ohlc.close, ohlc.volume)
    case 'MFI':
      return mfiSeries(ohlc.high, ohlc.low, ohlc.close, ohlc.volume, config.period)
    case 'WILLIAMS_R':
      return williamsRSeries(ohlc.high, ohlc.low, ohlc.close, config.period)
    case 'DONCHIAN_CHANNEL':
      return donchianSeries(ohlc.high, ohlc.low, config.period)
    case 'PARABOLIC_SAR':
      return parabolicSarSeries(ohlc.high, ohlc.low, config.step, config.maxStep)
    case 'ICHIMOKU':
      return ichimokuSeries(ohlc.high, ohlc.low, ohlc.close, config.conversionPeriod, config.basePeriod, config.leadingSpanBPeriod, config.displacement)
    case 'BBANDS':
      return bollingerSeries(series, config.period, config.deviation)
    case 'STOCHASTIC':
      return stochasticSeries(series, config.kPeriod, config.dPeriod)
    default:
      return []
  }
}

const calculateLatest = (series) => {
  if (!Array.isArray(series) || series.length === 0) return null
  for (let i = series.length - 1; i >= 0; i -= 1) {
    if (series[i] !== null && series[i] !== undefined) return series[i]
  }
  return null
}

const colorPalette = ['#38bdf8', '#facc15', '#a855f7', '#f97316', '#22c55e', '#ef4444']

const CustomIndicatorsPanel = ({ priceSeries = [], symbol = '—', timeframe = '—', theme, ohlc = {} }) => {
  const [activeIndicators, setActiveIndicators] = useState([])

  const isIndicatorActive = (type) => activeIndicators.some((entry) => entry.type === type)

  const handleToggleIndicator = (type) => {
    const active = isIndicatorActive(type)
    if (active) {
      setActiveIndicators((current) => current.filter((entry) => entry.type !== type))
      return
    }

    const definition = indicatorDefinitions[type]
    const config = getDefaultConfig(type)
    const id = `${type}-${Date.now()}`
    setActiveIndicators((current) => [
      ...current,
      {
        id,
        type,
        label: definition.label,
        config,
      },
    ])
  }

  const handleActiveConfigChange = (type, key, value) => {
    setActiveIndicators((current) => current.map((entry) => {
      if (entry.type !== type) return entry
      return {
        ...entry,
        config: {
          ...entry.config,
          [key]: Number(value) || 0,
        },
      }
    }))
  }

  const handleRemoveIndicator = (id) => {
    setActiveIndicators((current) => current.filter((entry) => entry.id !== id))
  }

  const indicatorSummaries = useMemo(() => (
    activeIndicators.map((entry) => {
      const series = computeIndicatorSeries(priceSeries, entry.type, entry.config, ohlc)
      const latest = entry.type === 'MACD'
        ? calculateLatest(series.macd)
        : entry.type === 'BBANDS'
          ? calculateLatest(series.middle)
          : entry.type === 'STOCHASTIC'
            ? calculateLatest(series.kLine)
            : calculateLatest(series)
      return {
        ...entry,
        series,
        latest,
      }
    })
  ), [activeIndicators, priceSeries, ohlc])

  const chartData = useMemo(() => {
    const labels = priceSeries.map((_, index) => `${index + 1}`)
    const datasets = [
      {
        label: 'Close',
        data: priceSeries,
        borderColor: '#38bdf8',
        backgroundColor: 'rgba(56, 189, 248, 0.18)',
        fill: false,
        tension: 0.35,
        pointRadius: 0,
      },
    ]

    indicatorSummaries.forEach((item, index) => {
      if (item.type === 'MACD') {
        datasets.push({
          label: 'MACD',
          data: item.series.macd,
          borderColor: colorPalette[index % colorPalette.length],
          backgroundColor: 'transparent',
          fill: false,
          tension: 0.35,
          pointRadius: 0,
        })
        datasets.push({
          label: 'Signal',
          data: item.series.signalLine,
          borderColor: '#f97316',
          backgroundColor: 'transparent',
          borderDash: [4, 4],
          fill: false,
          tension: 0.35,
          pointRadius: 0,
        })
      } else if (item.type === 'BBANDS') {
        datasets.push({
          label: 'BB Middle',
          data: item.series.middle,
          borderColor: colorPalette[index % colorPalette.length],
          backgroundColor: 'transparent',
          fill: false,
          tension: 0.35,
          pointRadius: 0,
        })
        datasets.push({
          label: 'BB Upper',
          data: item.series.upper,
          borderColor: '#38bdf8',
          backgroundColor: 'transparent',
          borderDash: [6, 4],
          fill: false,
          tension: 0.35,
          pointRadius: 0,
        })
        datasets.push({
          label: 'BB Lower',
          data: item.series.lower,
          borderColor: '#f97316',
          backgroundColor: 'transparent',
          borderDash: [6, 4],
          fill: false,
          tension: 0.35,
          pointRadius: 0,
        })
      } else if (item.type === 'STOCHASTIC') {
        datasets.push({
          label: '%K',
          data: item.series.kLine,
          borderColor: colorPalette[index % colorPalette.length],
          backgroundColor: 'transparent',
          fill: false,
          tension: 0.35,
          pointRadius: 0,
        })
        datasets.push({
          label: '%D',
          data: item.series.dLine,
          borderColor: '#a855f7',
          backgroundColor: 'transparent',
          borderDash: [4, 4],
          fill: false,
          tension: 0.35,
          pointRadius: 0,
        })
      } else if (item.type === 'DONCHIAN_CHANNEL') {
        datasets.push({
          label: 'Donchian Upper',
          data: item.series.upper,
          borderColor: colorPalette[index % colorPalette.length],
          backgroundColor: 'transparent',
          fill: false,
          tension: 0.35,
          pointRadius: 0,
        })
        datasets.push({
          label: 'Donchian Lower',
          data: item.series.lower,
          borderColor: '#f97316',
          backgroundColor: 'transparent',
          fill: false,
          tension: 0.35,
          pointRadius: 0,
        })
        datasets.push({
          label: 'Donchian Middle',
          data: item.series.middle,
          borderColor: '#22c55e',
          backgroundColor: 'transparent',
          borderDash: [6, 4],
          fill: false,
          tension: 0.35,
          pointRadius: 0,
        })
      } else if (item.type === 'ICHIMOKU') {
        datasets.push({
          label: 'Conversion Line',
          data: item.series.conversionLine,
          borderColor: '#38bdf8',
          backgroundColor: 'transparent',
          fill: false,
          tension: 0.35,
          pointRadius: 0,
        })
        datasets.push({
          label: 'Base Line',
          data: item.series.baseLine,
          borderColor: '#facc15',
          backgroundColor: 'transparent',
          fill: false,
          tension: 0.35,
          pointRadius: 0,
        })
        datasets.push({
          label: 'Senkou Span A',
          data: item.series.leadingSpanA,
          borderColor: '#a855f7',
          backgroundColor: 'transparent',
          borderDash: [4, 4],
          fill: false,
          tension: 0.35,
          pointRadius: 0,
        })
        datasets.push({
          label: 'Senkou Span B',
          data: item.series.leadingSpanB,
          borderColor: '#f97316',
          backgroundColor: 'transparent',
          borderDash: [4, 4],
          fill: false,
          tension: 0.35,
          pointRadius: 0,
        })
      } else if (item.type === 'PARABOLIC_SAR') {
        datasets.push({
          label: 'Parabolic SAR',
          data: item.series,
          borderColor: '#22c55e',
          backgroundColor: 'transparent',
          fill: false,
          tension: 0.1,
          pointRadius: 2,
          showLine: false,
        })
      } else if (item.type === 'WILLIAMS_R') {
        datasets.push({
          label: 'Williams %R',
          data: item.series,
          borderColor: '#ef4444',
          backgroundColor: 'transparent',
          fill: false,
          tension: 0.35,
          pointRadius: 0,
        })
      } else {
        datasets.push({
          label: item.label,
          data: item.series,
          borderColor: colorPalette[(index + 1) % colorPalette.length],
          backgroundColor: 'transparent',
          fill: false,
          tension: 0.35,
          pointRadius: 0,
        })
      }
    })

    return { labels, datasets }
  }, [indicatorSummaries, priceSeries])

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: theme?.text?.includes('text-slate-100') ? '#e2e8f0' : '#334155' },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.parsed.y
            return `${context.dataset.label}: ${value != null ? Number(value).toFixed(5) : '—'}`
          },
        },
      },
    },
    scales: {
      x: {
        ticks: { color: theme?.text?.includes('text-slate-100') ? '#94a3b8' : '#475569' },
        grid: { display: false },
      },
      y: {
        ticks: { color: theme?.text?.includes('text-slate-100') ? '#94a3b8' : '#475569' },
        grid: { color: theme?.text?.includes('text-slate-100') ? 'rgba(148, 163, 184, 0.18)' : 'rgba(148, 163, 184, 0.2)' },
      },
    },
  }

  const activeIndicatorCount = activeIndicators.length

  return (
    <div className={`rounded-[30px] p-5 shadow-xl shadow-slate-950/20 text-sm ${theme?.panel || 'border border-slate-700/60 bg-slate-950/80'}`}>
      <div className={`mb-5 flex flex-col gap-4 rounded-[28px] border ${theme?.panel ? 'border-slate-700/60' : 'border-slate-800/70'} bg-slate-900/80 p-4 sm:flex-row sm:items-center sm:justify-between`}>
        <div>
          <div className={`text-xs uppercase tracking-[0.18em] ${theme?.muted || 'text-slate-400'}`}>اندیکاتورهای سفارشی</div>
          <div className={`mt-2 text-xl font-semibold ${theme?.text || 'text-white'}`}>سفارشی‌سازی چند اندیکاتور</div>
          <div className={`text-xs ${theme?.muted || 'text-slate-400'}`}>برای {symbol} در تایم‌فریم {timeframe}</div>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <Badge variant={activeIndicatorCount > 0 ? 'green' : 'blue'}>{activeIndicatorCount} اندیکاتور فعال</Badge>
          <Badge variant='purple'>{Object.keys(indicatorDefinitions).length} گزینه</Badge>
        </div>
      </div>

      <div className='grid gap-4 lg:grid-cols-[1.1fr_0.9fr]'>
        <div className='space-y-4'>
          <div className='grid gap-3 sm:grid-cols-2'>
            <div className='space-y-4'>
              <div className='rounded-3xl border border-slate-700/70 bg-slate-900/80 p-4'>
                <div className='flex items-center justify-between gap-3'>
                  <div>
                    <div className='text-sm font-semibold text-white'>انتخاب اندیکاتورها</div>
                    <div className='text-xs text-slate-400'>با تیک زدن اندیکاتور، تنظیمات و نمودار آن فعال می‌شود.</div>
                  </div>
                  <Badge variant='blue'>{Object.keys(indicatorDefinitions).length} مورد</Badge>
                </div>
                <div className='mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3'>
                  {Object.entries(indicatorDefinitions).map(([key, definition]) => {
                    const active = isIndicatorActive(key)
                    return (
                      <label
                        key={key}
                        className={`flex cursor-pointer flex-col gap-3 rounded-[24px] border p-4 transition-all duration-200 ${active ? 'border-sky-400 bg-slate-900/95 shadow-sky-500/10' : 'border-slate-700/70 bg-slate-950/80 hover:border-slate-500'}`}
                      >
                        <div className='flex items-start justify-between gap-3'>
                          <div className='flex items-start gap-3'>
                            <input
                              type='checkbox'
                              checked={active}
                              onChange={() => handleToggleIndicator(key)}
                              className='mt-1 h-4 w-4 accent-sky-400'
                            />
                            <div>
                              <div className='text-sm font-semibold text-white'>{definition.label}</div>
                              <div className='text-xs text-slate-400'>{definition.description}</div>
                            </div>
                          </div>
                          <Badge variant={active ? 'green' : 'gray'}>{active ? 'فعال' : 'غیرفعال'}</Badge>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>
              {!priceSeries.length && (
                <div className='rounded-3xl border border-slate-700/60 bg-slate-900/80 p-4 text-sm text-slate-400'>برای انتخاب اندیکاتورها، ابتدا داده‌های قیمت را بارگذاری کنید.</div>
              )}
            </div>

            <div className='space-y-4'>
              {activeIndicators.length === 0 ? (
                <div className='rounded-3xl border border-slate-700/70 bg-slate-900/80 p-4 text-sm text-slate-400'>بعد از انتخاب هر اندیکاتور، تنظیمات آن در اینجا نمایش داده می‌شود.</div>
              ) : (
                <div className='space-y-4'>
                  {activeIndicators.map((entry) => (
                    <div key={entry.type} className='rounded-3xl border border-slate-700/70 bg-slate-900/80 p-4'>
                      <div className='mb-3 flex items-center justify-between gap-3'>
                        <div>
                          <div className='text-sm font-semibold text-white'>{entry.label}</div>
                          <div className='text-xs text-slate-400'>تنظیمات قابل ویرایش برای اندیکاتور انتخاب‌شده</div>
                        </div>
                        <Button type='button' variant='danger' size='sm' onClick={() => handleRemoveIndicator(entry.id)}>
                          حذف
                        </Button>
                      </div>
                      {indicatorDefinitions[entry.type].settings.length === 0 ? (
                        <div className='text-sm text-slate-400'>این اندیکاتور تنظیمات اضافی ندارد و بلافاصله فعال است.</div>
                      ) : (
                        <div className='grid gap-3 sm:grid-cols-2'>
                          {indicatorDefinitions[entry.type].settings.map((setting) => (
                            <label key={setting.key} className='block text-sm text-slate-200'>
                              <span className='text-xs text-slate-400'>{setting.label}</span>
                                <input
                                type='number'
                                min={setting.min}
                                max={setting.max}
                                value={entry.config[setting.key] ?? setting.default}
                                onChange={(e) => handleActiveConfigChange(entry.type, setting.key, e.target.value)}
                                className='mt-1 w-full rounded-2xl border border-slate-700/60 bg-slate-950/80 px-3 py-2 text-sm text-slate-100'
                              />
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className='space-y-4'>
          <div className='rounded-[28px] border border-slate-700/70 bg-slate-900/80 p-4 shadow-inner'>
            <div className='flex items-center justify-between gap-3'>
              <div>
                <div className='text-sm font-semibold text-white'>پیش‌نمایش نمودار</div>
                <div className='text-xs text-slate-400'>خط قیمت و اندیکاتورهای انتخاب‌شده</div>
              </div>
              <Badge variant='blue'>{indicatorSummaries.length} خط</Badge>
            </div>
            {priceSeries.length > 0 ? (
              <div className='mt-3 h-72 rounded-[24px] border border-slate-700/70 bg-slate-950/80 p-3'>
                <Line data={chartData} options={chartOptions} />
              </div>
            ) : (
              <div className='mt-4 rounded-3xl border border-dashed border-slate-700/60 bg-slate-900/70 p-6 text-center text-sm text-slate-400'>ابتدا داده‌های قیمت را بارگیری کنید تا نمودار اندیکاتور فعال شود.</div>
            )}
          </div>

          <div className='rounded-[28px] border border-slate-700/70 bg-slate-900/80 p-4'>
            <div className='text-sm font-semibold text-white mb-3'>راهنما</div>
            <div className='space-y-2 text-sm text-slate-400'>
              <div>• SMA: برای تشخیص روند عمومی قیمت استفاده می‌شود.</div>
              <div>• EMA: به قیمت‌های اخیر وزن بیشتری می‌دهد.</div>
              <div>• RSI: ناحیه‌های خرید/فروش بیش از حد را نمایش می‌دهد.</div>
              <div>• MACD: واگرایی/همگرایی میانگین‌های متحرک را بررسی می‌کند.</div>
              <div>• Bollinger Bands: پهنای نوسان و محدوده قیمت را نمایش می‌دهد.</div>
              <div>• Stochastic: شرایط اشباع خرید/فروش را با سرعت حرکت قیمت نشان می‌دهد.</div>
              <div>• ADX: قدرت روند جاری را در بازه زمانی مشخص نشان می‌دهد.</div>
              <div>• CCI: نوسان قیمت را نسبت به میانگین تاریخی خود ارزیابی می‌کند.</div>
              <div>• VWAP: قیمت میانگین وزنی با حجم را برای شکل‌گیری نقاط ورود و خروج نشان می‌دهد.</div>
              <div>• MFI: جریان نقدینگی را با ترکیب حجم و قیمت برای تشخیص خرید/فروش بیش از حد نمایش می‌دهد.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

CustomIndicatorsPanel.propTypes = {
  priceSeries: PropTypes.arrayOf(PropTypes.number),
  symbol: PropTypes.string,
  timeframe: PropTypes.string,
  theme: PropTypes.object,
  ohlc: PropTypes.shape({
    high: PropTypes.arrayOf(PropTypes.number),
    low: PropTypes.arrayOf(PropTypes.number),
    close: PropTypes.arrayOf(PropTypes.number),
    volume: PropTypes.arrayOf(PropTypes.number),
  }),
}

export default CustomIndicatorsPanel
