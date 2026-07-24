import axios from 'axios'
import { isAuthError } from './authError'

const API_BASE_URL = '/api'

// API Client instance
const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds for regular requests
})

// Add token to requests
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

const extractErrorMessage = (error) => {
  const data = error?.response?.data

  if (typeof data === 'string') {
    return data
  }

  if (data && typeof data === 'object') {
    if (typeof data.message === 'string' && data.message.trim()) {
      return data.message
    }
    if (typeof data.detail === 'string' && data.detail.trim()) {
      return data.detail
    }
    if (typeof data.error === 'string' && data.error.trim()) {
      return data.error
    }
  }

  return error?.message || 'Request failed'
}

// Handle response errors
client.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (isAuthError(error)) {
      localStorage.removeItem('access_token')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(extractErrorMessage(error))
  }
)

// API endpoints
export const api = {
  // Health
  health: () => client.get('/health'),
  
  // Authentication
  getAuthConfig: () => client.get('/auth/config'),
  login: (account, password, server) => {
    // Create a special client for login with longer timeout, because MT5 connection may require more than 60 seconds.
    const loginClient = axios.create({
      baseURL: API_BASE_URL,
      timeout: 120000,
    })
    loginClient.interceptors.response.use(
      (response) => response.data,
      (error) => Promise.reject(error.response?.data || error.message)
    )
    return loginClient.post('/auth/login', { account, password, server })
  },
  logout: () => client.post('/auth/logout'),
  
  // Account
  getAccountInfo: () => client.get('/account/info'),
  getStatus: () => client.get('/status'),
  // Server-side account management
  getAccounts: () => client.get('/accounts'),
  createAccount: (payload) => client.post('/accounts', payload),
  updateAccount: (id, payload) => client.put(`/accounts/${encodeURIComponent(id)}`, payload),
  deleteAccount: (id) => client.delete(`/accounts/${encodeURIComponent(id)}`),
  connectAccount: (id) => client.post(`/accounts/${encodeURIComponent(id)}/connect`),
  
  // Trading Data
  getPositions: () => client.get('/positions'),
  getOrders: () => client.get('/orders'),
  getTradeHistory: (params) => client.get('/trade-history', { 
    params: { ...params, _t: Date.now() }  // Add cache buster
  }),
  getSymbols: (filterText) =>
    client.get('/symbols', { params: { filter_text: filterText } }),
  getTick: (symbol) => client.get(`/tick/${symbol}`),
  getSymbolData: (symbol) => client.get(`/symbols/${encodeURIComponent(symbol)}/data`),
  exportSymbolData: (symbol) => client.post(`/symbols/${encodeURIComponent(symbol)}/export`),
  getSymbolTimeframeData: (symbol, timeframe, count = 100, filters = {}) => client.get(`/symbols/${encodeURIComponent(symbol)}/timeframe`, { params: { timeframe, count, ...filters } }),
  exportSymbolTimeframeData: (symbol, timeframe, count = 100) => client.post(`/symbols/${encodeURIComponent(symbol)}/timeframe/export`, null, { params: { timeframe, count } }),
  exportSymbolTimeframesData: (symbol, records) => client.post(`/symbols/${encodeURIComponent(symbol)}/timeframes/export`, { records }),
  closePosition: (ticket) => client.post('/positions/close', { ticket }),
  cancelOrder: (ticket) => client.post('/orders/cancel', { ticket }),
  openPosition: (payload) => client.post('/positions/open', payload),
  getRiskManagementConfig: () => client.get('/risk-management/config'),
  assessTradeRequest: (payload) => client.post('/risk-management/assess', payload),
  validateTradingSession: (payload) => client.post('/trading-sessions/validate', payload),
}

export default client
