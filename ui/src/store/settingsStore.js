import { create } from 'zustand'

const STORAGE_KEY = 'smarttred.settings.v1'

const defaultSettings = {
  riskPercent: 2,
  defaultLot: 0.1,
  refreshInterval: '1m',
  autoTradingEnabled: false,
}

const loadSettings = () => {
  if (typeof window === 'undefined') {
    return { ...defaultSettings }
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return { ...defaultSettings }
    }

    const parsed = JSON.parse(raw)
    return {
      ...defaultSettings,
      ...parsed,
    }
  } catch (error) {
    console.warn('Failed to load settings from localStorage', error)
    return { ...defaultSettings }
  }
}

const persistSettings = (settings) => {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch (error) {
    console.warn('Failed to persist settings to localStorage', error)
  }
}

export const useSettingsStore = create((set) => ({
  settings: loadSettings(),

  updateSetting: (key, value) => set((state) => {
    const nextSettings = {
      ...state.settings,
      [key]: value,
    }
    persistSettings(nextSettings)
    return { settings: nextSettings }
  }),

  updateSettings: (partialSettings) => set((state) => {
    const nextSettings = {
      ...state.settings,
      ...partialSettings,
    }
    persistSettings(nextSettings)
    return { settings: nextSettings }
  }),

  toggleAutomation: () => set((state) => {
    const nextSettings = {
      ...state.settings,
      autoTradingEnabled: !state.settings.autoTradingEnabled,
    }
    persistSettings(nextSettings)
    return { settings: nextSettings }
  }),

  resetSettings: () => {
    persistSettings(defaultSettings)
    set({ settings: { ...defaultSettings } })
  },
}))

export { defaultSettings }
