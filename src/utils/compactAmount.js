// Short amounts for chart axes: 950, 1.2k, 20k, 1.5M, 2B. Negative values keep their sign (-20k), and a value that rounds to zero is just "0" (never "-0").
export function compact(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return '0'
  const a = Math.abs(n)
  const body = a >= 1e9 ? `${+(a / 1e9).toFixed(1)}B` : a >= 1e6 ? `${+(a / 1e6).toFixed(1)}M` : a >= 1e4 ? `${+(a / 1e3).toFixed(0)}k` : a >= 1e3 ? `${+(a / 1e3).toFixed(1)}k` : String(+a.toFixed(0))
  return n < 0 && body !== '0' ? '-' + body : body
}
