import { create } from 'zustand'
import { api } from './api'

const normalizeAccountInfo = (data) => {
  if (!data) return null

  const normalizedMarginFree = data.marginFree ?? data.margin_free ?? data.free_margin ?? data.marginFreeValue ?? 0

  return {
    login: data.login ?? data.Login ?? null,
    name: data.name ?? data.Name ?? 'Unknown',
    server: data.server ?? data.Server ?? '',
    currency: data.currency ?? data.Currency ?? 'USD',
    balance: data.balance ?? data.Balance ?? 0,
    equity: data.equity ?? data.Equity ?? 0,
    profit: data.profit ?? data.Profit ?? 0,
    margin: data.margin ?? data.Margin ?? 0,
    marginFree: normalizedMarginFree,
    margin_free: normalizedMarginFree,
    free_margin: normalizedMarginFree,
    marginLevel: data.marginLevel ?? data.margin_level ?? data.marginLevelValue ?? 0,
    leverage: data.leverage ?? data.Leverage ?? 0,
    connected: data.connected ?? true,
  }
}

const normalizePositions = (data) => {
  if (!Array.isArray(data)) return []

  return data.map((item) => ({
    ticket: item.ticket ?? item.Ticket ?? 0,
    symbol: item.symbol ?? item.Symbol ?? '—',
    type: item.type ?? item.Type ?? 'UNKNOWN',
    volume: item.volume ?? item.Volume ?? 0,
    priceOpen: item.priceOpen ?? item.price_open ?? item.PriceOpen ?? 0,
    priceCurrent: item.priceCurrent ?? item.price_current ?? item.PriceCurrent ?? 0,
    profit: item.profit ?? item.Profit ?? 0,
    timeOpen: item.timeOpen ?? item.time_open ?? item.TimeOpen ?? '',
  }))
}

const normalizeOrders = (data) => {
  if (!Array.isArray(data)) return []

  return data.map((item) => ({
    ticket: item.ticket ?? item.Ticket ?? 0,
    symbol: item.symbol ?? item.Symbol ?? '—',
    type: item.type ?? item.Type ?? 'UNKNOWN',
    volume: item.volume ?? item.Volume ?? 0,
    priceOpen: item.priceOpen ?? item.price_open ?? item.PriceOpen ?? 0,
    priceCurrent: item.priceCurrent ?? item.price_current ?? item.PriceCurrent ?? 0,
    timeSetup: item.timeSetup ?? item.time_setup ?? item.TimeSetup ?? '',
  }))
}

const normalizeTradeHistory = (data) => {
  if (!Array.isArray(data)) return []

  return data.map((item) => ({
    ticket: item.ticket ?? item.Ticket ?? 0,
    symbol: item.symbol ?? item.Symbol ?? '—',
    type: item.type ?? item.Type ?? 'UNKNOWN',
    volume: item.volume ?? item.Volume ?? 0,
    price: item.price ?? item.Price ?? item.priceOpen ?? item.price_open ?? 0,
    profit: item.profit ?? item.Profit ?? 0,
    commission: item.commission ?? item.Commission ?? 0,
    time: item.time ?? item.Time ?? '',
    close_time: item.close_time ?? item.closeTime ?? item.CloseTime ?? item.time ?? item.Time ?? '',
  }))
}

export const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem('access_token') || null,
  isLoading: false,
  error: null,
  isAuthenticated: !!localStorage.getItem('access_token'),
  
  login: async (account, password, server) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.login(account, password, server)
      if (response?.success) {
        const token = response.access_token
        localStorage.setItem('access_token', token)
        set({
          token,
          isAuthenticated: true,
          user: { account, server },
          isLoading: false
        })
        window.dispatchEvent(new Event('auth:changed'))
        return response
      }

      const message = response?.message || 'خطا در ورود'
      throw new Error(message)
    } catch (error) {
      const message = typeof error === 'string'
        ? error
        : error?.message || error?.detail || 'خطا در ورود'
      set({ error: message, isLoading: false })
      throw error
    }
  },
  
  logout: async () => {
    try {
      await api.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      localStorage.removeItem('access_token')
      set({
        token: null,
        isAuthenticated: false,
        user: null,
        error: null
      })
    }
  },
  
  clearError: () => set({ error: null }),
}))

export const useAccountStore = create((set, get) => ({
  accountInfo: null,
  positions: [],
  orders: [],
  tradeHistory: [],
  symbols: [],
  isLoading: false,
  error: null,
  lastUpdate: null,
  
  fetchAccountInfo: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.getAccountInfo()
      if (response?.success) {
        set({
          accountInfo: normalizeAccountInfo(response.data),
          lastUpdate: new Date(),
          isLoading: false
        })
      }
    } catch (error) {
      const message = typeof error === 'string' ? error : error?.message || 'خطا در بارگذاری اطلاعات حساب'
      set({ error: message, isLoading: false })
    }
  },
  
  fetchPositions: async () => {
    try {
      const response = await api.getPositions()
      if (response?.success) {
        set({ positions: normalizePositions(response.data) })
      }
    } catch (error) {
      set({ error: error.message })
    }
  },

  closePosition: async (ticket) => {
    try {
      const response = await api.closePosition(ticket)
      if (response?.success) {
        await Promise.all([get().fetchPositions(), get().fetchOrders()])
      }
      return response
    } catch (error) {
      const message = typeof error === 'string' ? error : error?.message || 'خطا در بستن پوزیشن'
      set({ error: message })
      throw error
    }
  },

  cancelOrder: async (ticket) => {
    try {
      const response = await api.cancelOrder(ticket)
      if (response?.success) {
        await Promise.all([get().fetchPositions(), get().fetchOrders()])
      }
      return response
    } catch (error) {
      const message = typeof error === 'string' ? error : error?.message || 'خطا در لغو سفارش'
      set({ error: message })
      throw error
    }
  },

  openPosition: async ({ symbol, volume, type, price, sl, tp }) => {
    try {
      const response = await api.openPosition({
        symbol,
        volume,
        type,
        price,
        sl,
        tp,
      })
      if (response?.success) {
        await Promise.all([get().fetchPositions(), get().fetchOrders(), get().fetchTradeHistory()])
      }
      return response
    } catch (error) {
      const message = typeof error === 'string' ? error : error?.message || 'خطا در باز کردن پوزیشن'
      set({ error: message })
      throw error
    }
  },
  
  fetchOrders: async () => {
    try {
      const response = await api.getOrders()
      if (response?.success) {
        set({ orders: normalizeOrders(response.data) })
      }
    } catch (error) {
      set({ error: error.message })
    }
  },

  fetchTradeHistory: async ({ symbol = '', startDate = '', endDate = '', limit = 20, page = 1 } = {}) => {
    try {
      const normalizedSymbol = symbol ? symbol.trim().toUpperCase() : ''
      const response = await api.getTradeHistory({
        symbol: normalizedSymbol,
        start_date: startDate || '',
        end_date: endDate || '',
        limit,
        page,
      })
      if (response?.success) {
        set({ tradeHistory: normalizeTradeHistory(response.data) })
      }
    } catch (error) {
      set({ error: error.message })
    }
  },
  
  fetchSymbols: async (filter = '') => {
    try {
      const response = await api.getSymbols(filter)
      if (response.success) {
        set({ symbols: response.data })
      }
    } catch (error) {
      set({ error: error.message })
    }
  },
  
  clearError: () => set({ error: null }),
}))
