import React, { useMemo, useState } from 'react'
import { Button, Card } from './UI'
import { useSettingsStore } from '../store/settingsStore'

const intervalOptions = [
  { value: '10s', label: '۱۰ ثانیه' },
  { value: '30s', label: '۳۰ ثانیه' },
  { value: '1m', label: '۱ دقیقه' },
  { value: '1h', label: '۱ ساعت' },
  { value: '1d', label: 'روزانه' },
]

const Settings = () => {
  const { settings, updateSetting, updateSettings, toggleAutomation, resetSettings } = useSettingsStore()
  const [localDraft, setLocalDraft] = useState(settings)

  const isDirty = useMemo(() => JSON.stringify(localDraft) !== JSON.stringify(settings), [localDraft, settings])

  const applyChanges = () => {
    updateSettings(localDraft)
  }

  const handleInputChange = (field, value) => {
    setLocalDraft((current) => ({ ...current, [field]: value }))
  }

  return (
    <Card variant='dark' className='p-5 text-right'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <h3 className='text-lg font-semibold text-slate-100'>تنظیمات کاربر</h3>
          <p className='mt-1 text-sm text-slate-400'>پیش‌فرض‌های معاملاتی و رفتار خودکار را شخصی‌سازی کنید.</p>
        </div>
        <Button
          type='button'
          variant={settings.autoTradingEnabled ? 'success' : 'secondary'}
          size='sm'
          onClick={toggleAutomation}
        >
          {settings.autoTradingEnabled ? 'Stop' : 'Start'}
        </Button>
      </div>

      <div className='mt-5 grid gap-4 md:grid-cols-2'>
        <label className='rounded-2xl border border-slate-700/70 bg-slate-950/60 p-3 text-sm'>
          <span className='mb-2 block font-medium text-slate-200'>درصد ریسک</span>
          <input
            type='number'
            min='1'
            max='5'
            step='1'
            value={localDraft.riskPercent}
            onChange={(event) => handleInputChange('riskPercent', Number(event.target.value))}
            className='w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100'
          />
          <span className='mt-2 block text-xs text-slate-400'>مقدار بین ۱ تا ۵ درصد</span>
        </label>

        <label className='rounded-2xl border border-slate-700/70 bg-slate-950/60 p-3 text-sm'>
          <span className='mb-2 block font-medium text-slate-200'>لات پیش‌فرض</span>
          <input
            type='number'
            min='0.01'
            step='0.01'
            value={localDraft.defaultLot}
            onChange={(event) => handleInputChange('defaultLot', Number(event.target.value))}
            className='w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100'
          />
        </label>

        <label className='rounded-2xl border border-slate-700/70 bg-slate-950/60 p-3 text-sm md:col-span-2'>
          <span className='mb-2 block font-medium text-slate-200'>بازه زمانی به‌روزرسانی داده‌ها</span>
          <select
            value={localDraft.refreshInterval}
            onChange={(event) => handleInputChange('refreshInterval', event.target.value)}
            className='w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100'
          >
            {intervalOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className='mt-5 flex flex-wrap gap-2'>
        <Button type='button' variant='primary' size='sm' onClick={applyChanges} disabled={!isDirty}>
          ذخیره تنظیمات
        </Button>
        <Button type='button' variant='secondary' size='sm' onClick={() => setLocalDraft(settings)}>
          بازنشانی محلی
        </Button>
        <Button type='button' variant='ghost' size='sm' onClick={resetSettings}>
          بازنشانی پیش‌فرض
        </Button>
      </div>
    </Card>
  )
}

export default Settings
