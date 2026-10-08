import { currencyPrefix, decimalsFor, DEFAULT_CURRENCY, safeCurrency } from './currency.js'
// The active currency is set once by the app context from the user's profile; every money() call reads it.
let currency = DEFAULT_CURRENCY
export const setCurrency = (code) => { currency = safeCurrency(code) }
export const getCurrency = () => currency
export const money = (n) => {
  const v = Number(n), dp = decimalsFor(currency)
  const text = Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: dp && v % 1 ? 2 : 0, maximumFractionDigits: dp })
  return (v < 0 ? '−' : '') + currencyPrefix(currency) + text
}
export const signed = (n, type) => (type === 'income' ? '+' : '−') + money(n)
const d = (iso) => new Date(iso.slice(0, 10) + 'T00:00:00')
export const formatDate = (iso) => d(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
export const formatDateLong = (iso) => d(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
export const formatDateTime = (iso) => new Date(iso).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
export const monthLabel = (ym) => d(ym + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
export const monthName = (ym) => d(ym + '-01').toLocaleDateString('en-US', { month: 'long' })
export const monthShort = (ym) => d(ym + '-01').toLocaleDateString('en-US', { month: 'short' })
export const greeting = (now = new Date()) => { const h = now.getHours(); return h >= 5 && h < 12 ? 'Good morning' : h >= 12 && h < 18 ? 'Good afternoon' : 'Good evening' }
export const firstName = (user) => user.fullName.trim().split(' ')[0]
export const initials = (user) => user.fullName.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
// A transaction may have no description: fall back to its category, then to its type.
export const txLabel = (t, categories = []) => t.description || categories.find((c) => c.id === t.categoryId)?.name || (t.type === 'income' ? 'Income' : 'Expense')
