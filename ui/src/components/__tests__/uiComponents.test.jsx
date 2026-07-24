import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import Settings from '../Settings'
import SmartSignal from '../SmartSignal'
import Chart from '../Chart'

describe('UI components render', () => {
  it('renders settings panel', () => {
    const html = renderToStaticMarkup(<Settings />)
    expect(html).toContain('تنظیمات کاربر')
    expect(html).toContain('درصد ریسک')
  })

  it('renders smart signal panel', () => {
    const html = renderToStaticMarkup(<SmartSignal price={1.085} atr={0.0012} trend='up' />)
    expect(html).toContain('سیگنال هوشمند')
    expect(html).toContain('اهداف خرید')
  })

  it('renders chart shell', () => {
    const html = renderToStaticMarkup(<Chart data={[]} symbol='EURUSD' timeframe='M1' />)
    expect(html).toContain('نمودار قیمت زنده')
  })
})
