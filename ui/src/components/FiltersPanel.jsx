import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { Button, Badge } from './UI'

const Section = ({ title, description, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className='mb-3'>
      <div className='flex items-center justify-between'>
        <div>
          <div className='text-sm font-semibold text-white'>{title}</div>
          {description && <div className='text-xs text-slate-400'>{description}</div>}
        </div>
        <button onClick={() => setOpen((v) => !v)} className='text-xs text-slate-300 underline'>{open ? 'بستن' : 'نمایش'}</button>
      </div>
      {open && <div className='mt-2'>{children}</div>}
    </div>
  )
}

const FiltersPanel = ({ symbol = '—', timeframe = '—', onOpen = () => {}, filterSessionKeys = [], serverFiltersEnabled = false, indicatorFlags = {}, theme = {} }) => {
  const enabledIndicators = Object.keys(indicatorFlags).filter((k) => indicatorFlags[k])

  return (
    <div className='rounded-3xl border border-slate-700/60 bg-slate-950/85 p-5 text-sm shadow-md'>
      <div className='mb-4 flex items-start justify-between gap-3'>
        <div>
          <div className='text-xs uppercase tracking-[0.18em] text-slate-400'>فیلترها</div>
          <div className='mt-2 text-lg font-semibold text-white'>{symbol} • {timeframe}</div>
          <div className='text-sm text-slate-400 mt-1'>فیلترهای انتخابی: {filterSessionKeys.length > 0 ? filterSessionKeys.join(', ') : 'هیچ'}</div>
        </div>
        <div className='flex flex-col items-end gap-2'>
          <Badge variant={serverFiltersEnabled ? 'teal' : 'gray'} className='text-xs'>{serverFiltersEnabled ? 'سرور: روشن' : 'سرور: خاموش'}</Badge>
          <Button type='button' variant='primary' size='sm' onClick={onOpen}>ویرایش فیلترها</Button>
        </div>
      </div>

      <div className='text-sm text-slate-300 space-y-3'>
        <div className='text-xs text-slate-500'>راهنما: فیلترها را گروه‌بندی کرده‌ایم تا سریع‌تر پیدا کنید. برای تنظیمات کامل روی «ویرایش فیلترها» بزنید.</div>

        <Section title='فیلتر روند (Trend / Channel)' description='شکست خطوط روند یا کانال را بررسی می‌کند.' defaultOpen={true}>
          <div className='text-sm text-slate-300'>
            - پنل مربوط به تشخیص شکست روند و کانال با پنجره زمانی قابل تنظیم.
            <div className='mt-2'>
              <Button type='button' variant='secondary' size='sm' onClick={onOpen}>تنظیمات روند</Button>
            </div>
          </div>
        </Section>

        <Section title='اندیکاتورها' description='MA, RSI, MACD, SuperTrend و سایر اندیکاتورها'>
          <div className='text-sm text-slate-300'>اندیکاتورهای فعال: {enabledIndicators.length > 0 ? enabledIndicators.join(', ') : 'هیچ'}</div>
        </Section>

        <Section title='قیمت و حجم' description='فیلترهای حداقل/حداکثر قیمت و حجم برای حذف نویز'>
          <div className='text-sm text-slate-300'>پیکربندی حداقل حجم و بازه قیمت در این بخش اعمال می‌شود.</div>
        </Section>
      </div>
    </div>
  )
}

FiltersPanel.propTypes = {
  symbol: PropTypes.string,
  timeframe: PropTypes.string,
  onOpen: PropTypes.func,
  filterSessionKeys: PropTypes.array,
  serverFiltersEnabled: PropTypes.bool,
  indicatorFlags: PropTypes.object,
  theme: PropTypes.object,
}

export default FiltersPanel
