import React from 'react'
import PropTypes from 'prop-types'
import { Button, Card } from './UI'

const TimeframePanel = ({
  symbol,
  selectedTimeframe,
  selectedTimeframeData,
  selectedTimeframeLoading,
  selectedTimeframeExportedPath,
  onChangeTimeframe,
  onLoadTimeframe,
  onExportTimeframe,
}) => {
  const normalizedSymbol = (symbol || '').trim().toUpperCase()

  return (
    <Card className='mb-8'>
      <div className='flex items-center justify-between mb-4'>
        <div>
          <h2 className='text-xl font-bold text-gray-900'>داده‌های تایم‌فریم</h2>
          <p className='text-sm text-gray-600'>استخراج مستقل کندل‌ها برای نماد و تایم‌فریم مشخص</p>
        </div>
        <div className='flex items-center gap-2'>
          <select
            value={selectedTimeframe}
            onChange={(e) => onChangeTimeframe(e.target.value)}
            className='rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100'
          >
            <option value='M1'>M1</option>
            <option value='M5'>M5</option>
            <option value='M15'>M15</option>
            <option value='M30'>M30</option>
            <option value='H1'>H1</option>
            <option value='H4'>H4</option>
            <option value='D1'>D1</option>
          </select>
          <Button type='button' variant='secondary' onClick={() => onLoadTimeframe(normalizedSymbol)} disabled={selectedTimeframeLoading}>
            {selectedTimeframeLoading ? 'در حال بارگذاری…' : 'بارگذاری'}
          </Button>
          <Button type='button' variant='secondary' onClick={() => onExportTimeframe(normalizedSymbol)} disabled={selectedTimeframeLoading || !(selectedTimeframeData && selectedTimeframeData.candles && selectedTimeframeData.candles.length > 0)}>
            ذخیره تایم‌فریم
          </Button>
        </div>
      </div>

      {selectedTimeframeLoading ? (
        <div className='rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-gray-500'>در حال استخراج داده‌های تایم‌فریم…</div>
      ) : selectedTimeframeData ? (
        <div className='space-y-3'>
          <div className='flex flex-wrap gap-2'>
            <span className='rounded-full bg-blue-50 px-2.5 py-1 text-xs text-blue-700'>نماد: {selectedTimeframeData.resolved_symbol || selectedTimeframeData.requested_symbol}</span>
            <span className='rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700'>تایم‌فریم: {selectedTimeframeData.timeframe}</span>
            <span className='rounded-full bg-amber-50 px-2.5 py-1 text-xs text-amber-700'>کندل‌ها: {selectedTimeframeData.candles?.length || 0}</span>
          </div>
          {(selectedTimeframeData?.candles?.length || 0) > 0 ? (
            <div className='max-h-64 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3'>
              <pre className='whitespace-pre-wrap text-xs text-gray-700'>{JSON.stringify((selectedTimeframeData?.candles ?? []).slice(-8), null, 2)}</pre>
            </div>
          ) : (
            <div className='rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800'>
              برای این نماد و تایم‌فریم در حال حاضر داده‌ای موجود نیست. این می‌تواند به دلیل عدم دسترسی به نماد در MT5 یا نبود کندل در بازه فعلی باشد.
            </div>
          )}
          {selectedTimeframeExportedPath && (
            <div className='rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800'>
              <div className='font-semibold'>فایل تایم‌فریم ذخیره شد</div>
              <div className='mt-1 break-all text-xs'>{selectedTimeframeExportedPath}</div>
            </div>
          )}
        </div>
      ) : (
        <div className='rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-gray-500'>برای نمایش داده‌های تایم‌فریم، ابتدا نماد و تایم‌فریم را انتخاب کنید.</div>
      )}
    </Card>
  )
}

TimeframePanel.propTypes = {
  symbol: PropTypes.string,
  selectedTimeframe: PropTypes.string.isRequired,
  selectedTimeframeData: PropTypes.object,
  selectedTimeframeLoading: PropTypes.bool,
  selectedTimeframeExportedPath: PropTypes.string,
  onChangeTimeframe: PropTypes.func.isRequired,
  onLoadTimeframe: PropTypes.func.isRequired,
  onExportTimeframe: PropTypes.func.isRequired,
}

export default TimeframePanel
