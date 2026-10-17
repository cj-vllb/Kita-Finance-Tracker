// Safe arithmetic for the amount field. A small recursive-descent parser: it never uses eval() or new Function(), and it only
// accepts numbers, + - * /, parentheses and spaces. Arithmetic runs on scaled BigInt integers (8 decimal places), so there is no
// floating-point drift: 0.1+0.2 is exactly 0.3, 600/3 is exactly 200. The final result is rounded to cents (half away from zero).
const SCALE = 100000000n // 10^8
const MAX_AMOUNT_CENTS = 99999999999999n // numeric(14,2): 999,999,999,999.99
const MAX_LEN = 200
const MAX_DEPTH = 20

const fail = (message) => { throw Object.assign(new Error(message), { calc: true }) }

// Accepts the characters phone keyboards often produce for the same operators.
const normalize = (s) => s.replace(/\u2212|\u2013/g, '-').replace(/\u00d7/g, '*').replace(/\u00f7/g, '/')

function tokenize(src) {
  const out = []
  let i = 0
  while (i < src.length) {
    const ch = src[i]
    if (ch === ' ' || ch === '\t') { i++; continue }
    if ('+-*/()'.includes(ch)) { out.push({ t: ch }); i++; continue }
    if ((ch >= '0' && ch <= '9') || ch === '.') {
      let j = i, dots = 0
      while (j < src.length && ((src[j] >= '0' && src[j] <= '9') || src[j] === '.')) { if (src[j] === '.') dots++; j++ }
      const text = src.slice(i, j)
      if (dots > 1 || text === '.') fail('Check the numbers in your calculation.')
      const [whole, frac = ''] = text.split('.')
      if (whole.length > 15) fail('That number is too large.')
      if (frac.length > 8) fail('Use up to 8 decimal places.')
      out.push({ t: 'num', v: BigInt(whole || '0') * SCALE + BigInt((frac + '00000000').slice(0, 8)) })
      i = j; continue
    }
    fail('Use only numbers and + - * / ( ).')
  }
  return out
}

const roundDiv = (num, den) => { // BigInt division rounded half away from zero
  const neg = (num < 0n) !== (den < 0n), n = num < 0n ? -num : num, d = den < 0n ? -den : den
  const q = (n * 2n + d) / (d * 2n)
  return neg ? -q : q
}

function parse(tokens) {
  let pos = 0, depth = 0
  const peek = () => tokens[pos]?.t
  const next = () => tokens[pos++]
  const expr = () => {
    let v = term()
    while (peek() === '+' || peek() === '-') { const op = next().t, r = term(); v = op === '+' ? v + r : v - r }
    return v
  }
  const term = () => {
    let v = unary()
    while (peek() === '*' || peek() === '/') {
      const op = next().t, r = unary()
      if (op === '*') v = roundDiv(v * r, SCALE)
      else { if (r === 0n) fail('You cannot divide by zero.'); v = roundDiv(v * SCALE, r) }
    }
    return v
  }
  const unary = () => {
    if (peek() === '-') { next(); return -unary() }
    if (peek() === '+') { next(); return unary() }
    return primary()
  }
  const primary = () => {
    const tok = next()
    if (!tok) fail('That calculation looks unfinished.')
    if (tok.t === 'num') return tok.v
    if (tok.t === '(') {
      if (++depth > MAX_DEPTH) fail('Too many nested brackets.')
      const v = expr()
      if (next()?.t !== ')') fail('A bracket is not closed.')
      depth--; return v
    }
    fail('Check your calculation. An operator is in the wrong place.')
  }
  const value = expr()
  if (pos < tokens.length) fail(tokens[pos].t === ')' ? 'A closing bracket has no opening bracket.' : 'Check your calculation.')
  return value
}

// Returns { ok: true, amount, isExpression } or { ok: false, error }. `amount` is a JS number with at most 2 decimals, always above zero and
// within the database limit, so it can go straight into the existing transaction validation and save.
export function evaluateAmount(raw) {
  const text = normalize(String(raw ?? '')).trim()
  if (!text) return { ok: false, error: 'Enter an amount.' }
  if (text.length > MAX_LEN) return { ok: false, error: 'That calculation is too long.' }
  try {
    const scaled = parse(tokenize(text))
    const cents = roundDiv(scaled, SCALE / 100n)
    if (cents <= 0n) return { ok: false, error: 'Enter an amount above zero.' }
    if (cents > MAX_AMOUNT_CENTS) return { ok: false, error: 'That amount is too large.' }
    return { ok: true, amount: Number(cents) / 100, isExpression: /[-+*/()]/.test(text.replace(/^[-+]/, '')) }
  } catch (e) {
    if (e?.calc) return { ok: false, error: e.message }
    return { ok: false, error: 'Check your calculation.' }
  }
}
