// Rules for the on-screen amount keypad (phone/tablet quick-add sheets). Pure functions: the keypad only ever builds a TEXT expression such as
// "100+25.5", and that text is evaluated by the same safe parser (utils/expression.js) the desktop form uses, so what is stored is exactly what
// the desktop form would store. Nothing here can produce a letter or any character the parser rejects.
import { evaluateAmount } from './expression.js'

export const OPERATORS = { '+': '+', '-': '−', '*': '×', '/': '÷' } // stored character -> shown character
const OPS = new Set(Object.keys(OPERATORS))
const MAX_TEXT = 40, MAX_WHOLE = 12, MAX_FRAC = 2
const lastNumber = (text) => text.split(/[+\-*/]/).pop()
const endsWithOp = (text) => OPS.has(text.slice(-1))

// Applies one key press to the current text and returns the new text. Unknown or illegal presses return the text unchanged.
export function pressKey(text, key) {
  const t = String(text ?? '')
  if (key === 'clear') return ''
  if (key === 'back') return t.slice(0, -1)
  if (OPS.has(key)) {
    if (!t) return t                      // an expression never starts with an operator
    if (endsWithOp(t)) return t.slice(0, -1) + key // a second operator replaces the first
    if (t.endsWith('.')) return t.slice(0, -1) + key
    return t.length >= MAX_TEXT ? t : t + key
  }
  if (t.length >= MAX_TEXT) return t
  const num = lastNumber(t)
  if (key === '.') {
    if (num.includes('.')) return t
    return t + (num === '' ? '0.' : '.')
  }
  if (/^[0-9]$/.test(key)) {
    const [whole, frac] = num.split('.')
    if (frac !== undefined) return frac.length >= MAX_FRAC ? t : t + key
    if (whole === '0') return t.slice(0, -1) + key // no leading zeros: 05 becomes 5
    return whole.length >= MAX_WHOLE ? t : t + key
  }
  return t
}

// A trailing operator or dot ("100+") is simply dropped before the value is worked out, so a half-typed sum still previews and saves its complete part.
export const settle = (text) => String(text ?? '').replace(/[+\-*/.]+$/, '')
export const evaluateKeypad = (text) => evaluateAmount(settle(text))
// Shows the stored text with the proper operator symbols.
export const display = (text) => String(text ?? '').replace(/[+\-*/]/g, (c) => ` ${OPERATORS[c]} `)
// Only the characters the keypad can produce are allowed when the field is typed into directly (letters and symbols are dropped).
export const sanitizeTyped = (raw) => String(raw ?? '').replace(/\u2212|\u2013/g, '-').replace(/\u00d7/g, '*').replace(/\u00f7/g, '/').replace(/,/g, '.').replace(/[^0-9+\-*/.]/g, '').slice(0, MAX_TEXT)
