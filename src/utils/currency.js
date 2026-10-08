// Supported display currencies. The key is the ISO 4217 code stored in profiles.currency (never changes).
// Values are NOT converted when the currency changes; only the symbol/format shown changes.
export const CURRENCY_CODES = ['PHP', 'USD', 'EUR', 'GBP', 'JPY', 'CNY', 'KRW', 'SGD', 'AUD', 'CAD', 'HKD', 'NZD', 'INR', 'MYR', 'THB', 'IDR']
const NAMES = {
  PHP: 'Philippine Peso', USD: 'US Dollar', EUR: 'Euro', GBP: 'British Pound', JPY: 'Japanese Yen', CNY: 'Chinese Yuan', KRW: 'South Korean Won', SGD: 'Singapore Dollar',
  AUD: 'Australian Dollar', CAD: 'Canadian Dollar', HKD: 'Hong Kong Dollar', NZD: 'New Zealand Dollar', INR: 'Indian Rupee', MYR: 'Malaysian Ringgit', THB: 'Thai Baht', IDR: 'Indonesian Rupiah',
}
// Currencies that have no minor unit in everyday use.
const ZERO_DECIMAL = new Set(['JPY', 'KRW', 'IDR'])
export const DEFAULT_CURRENCY = 'PHP'
export const isSupportedCurrency = (code) => CURRENCY_CODES.includes(code)
// An unknown or missing code falls back to PHP so a stray value can never crash the UI.
export const safeCurrency = (code) => (isSupportedCurrency(code) ? code : DEFAULT_CURRENCY)
export const currencyName = (code) => NAMES[safeCurrency(code)]
export const decimalsFor = (code) => (ZERO_DECIMAL.has(safeCurrency(code)) ? 0 : 2)

const cache = {}
// Symbol as the 'en-US' locale writes it, e.g. ₱ $ € £ ¥ CN¥ ₩ A$ CA$ HK$ NZ$ ₹. Where there is no short symbol (SGD, MYR, THB, IDR)
// the ISO code is used, so currencies that share "$" are never confused with each other.
export function currencySymbol(code) {
  code = safeCurrency(code)
  if (cache[code]) return cache[code]
  let s = code
  try { s = new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).formatToParts(0).find((p) => p.type === 'currency')?.value || code } catch { /* old engine: keep the code */ }
  return (cache[code] = s)
}
// Prefix used before an amount: letters get a space ("MYR 12"), symbols do not ("₱12").
export const currencyPrefix = (code) => { const s = currencySymbol(code); return /[A-Za-z]$/.test(s) ? s + '\u00A0' : s }
export const CURRENCIES = Object.fromEntries(CURRENCY_CODES.map((c) => [c, [NAMES[c], currencySymbol(c)]]))
export const currencyLabel = (code) => { const s = currencySymbol(code).trim(); return `${code} · ${NAMES[code]}${s === code ? '' : ` (${s})`}` }
