import { useEffect, useId, useRef, useState } from 'react'
import { money, monthShort } from '../utils/format.js'
// Charts draw at the real width of their container (no scaling of a fixed canvas), so text stays 12px and
// readable on a phone. Layout choices (label thinning, value labels) adapt to the space available.
function useWidth(fallback = 320) {
  const ref = useRef(), [w, setW] = useState(fallback)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const read = () => setW(Math.max(240, Math.floor(el.clientWidth)))
    read()
    if (typeof ResizeObserver === 'undefined') { window.addEventListener('resize', read); return () => window.removeEventListener('resize', read) }
    const ro = new ResizeObserver(read); ro.observe(el); return () => ro.disconnect()
  }, [])
  return [ref, w]
}
const compact = (v) => (v >= 1e9 ? `${+(v / 1e9).toFixed(1)}B` : v >= 1e6 ? `${+(v / 1e6).toFixed(1)}M` : v >= 1e4 ? `${+(v / 1e3).toFixed(0)}k` : v >= 1e3 ? `${+(v / 1e3).toFixed(1)}k` : String(+v.toFixed(0)))
// Axis top = three equal steps of a "nice" size (1, 2, 2.5, 5 x 10^n), so ticks read cleanly for any currency.
const niceMax = (m) => {
  if (!(m > 0)) return 3000
  const raw = m / 3, pow = 10 ** Math.floor(Math.log10(raw)), step = [1, 2, 2.5, 5, 10].map((k) => k * pow).find((s) => s >= raw)
  return step * 3
}
const TICK = 'var(--color-muted)'
function Grid({ W, L, max, y }) {
  return [0, 1, 2, 3].map((i) => { const v = (max / 3) * i; return <g key={i}><line x1={L} x2={W - 4} y1={y(v)} y2={y(v)} stroke="var(--color-border)" /><text x={0} y={y(v) + 4} fontSize="12" fill={TICK}>{compact(v)}</text></g> })
}
const padLeft = (max) => Math.max(34, compact(max).length * 7 + 8)
const Legend = ({ children }) => <figcaption className="legend">{children}</figcaption>
const Key = ({ color, children }) => <span><span className="dot" style={{ background: color }} />{children}</span>

export function MoneyFlowChart({ data }) {
  const [ref, W] = useWidth(), H = 260, B = 30, max = niceMax(Math.max(...data.map((d) => Math.max(d.income, d.expenses)))), L = padLeft(max), last = data.at(-1)
  const x = (i) => L + (i * (W - L - 12)) / Math.max(1, data.length - 1), y = (v) => H - B - (v / max) * (H - B - 12)
  const path = (k) => data.map((d, i) => `${i ? 'L' : 'M'}${x(i)},${y(d[k])}`).join(' ')
  // Show only as many x labels as fit without touching each other (~56px each), always keeping the last one.
  const every = Math.max(1, Math.ceil(56 / Math.max(1, (W - L - 12) / Math.max(1, data.length - 1)))), show = (i) => (data.length - 1 - i) % every === 0
  return (<figure style={{ margin: 0 }}><div ref={ref} className="chart-box"><svg className="chart" width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Running totals: income ${money(last.income)}, expenses ${money(last.expenses)}`}>
    <Grid {...{ W, L, max, y }} />{data.map((d, i) => show(i) && <text key={i} x={Math.min(Math.max(x(i), L + 14), W - 22)} y={H - 8} fontSize="12" textAnchor="middle" fill={TICK}>{d.label}</text>)}
    <path d={`${path('income')} L${x(data.length - 1)},${y(0)} L${x(0)},${y(0)} Z`} fill="var(--color-primary)" opacity=".08" stroke="none" /><path d={path('income')} fill="none" stroke="var(--color-primary)" strokeWidth="2.5" /><path d={path('expenses')} fill="none" stroke="var(--color-negative)" strokeWidth="2.5" strokeDasharray="6 4" /></svg></div>
    <Legend><Key color="var(--color-primary)">Income {money(last.income)}</Key><Key color="var(--color-negative)">Expenses {money(last.expenses)}</Key></Legend></figure>)
}
// Smooth line through the points (monotone cubic, so it never overshoots the data). Presentation only: the values are unchanged.
function smooth(pts) {
  const n = pts.length, line = (p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`
  if (n < 3) return pts.map(line).join(' ')
  const dx = [], m = [], t = []
  for (let i = 0; i < n - 1; i++) { dx[i] = pts[i + 1][0] - pts[i][0] || 1; m[i] = (pts[i + 1][1] - pts[i][1]) / dx[i] }
  t[0] = m[0]; t[n - 1] = m[n - 2]
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; continue }
    const a = t[i] / m[i], b = t[i + 1] / m[i], s2 = a * a + b * b
    if (s2 > 9) { const k = 3 / Math.sqrt(s2); t[i] = k * a * m[i]; t[i + 1] = k * b * m[i] }
  }
  let d = `M${pts[0][0]},${pts[0][1]}`
  for (let i = 0; i < n - 1; i++) { const h = dx[i] / 3; d += ` C${pts[i][0] + h},${pts[i][1] + t[i] * h} ${pts[i + 1][0] - h},${pts[i + 1][1] - t[i + 1] * h} ${pts[i + 1][0]},${pts[i + 1][1]}` }
  return d
}
// Dashboard cash-flow chart (title, legend, divider, graph). Same data and maths as MoneyFlowChart; this variant exists so the
// landing page preview, which uses MoneyFlowChart, is not affected by dashboard-only refinements.
export function CashFlowChart({ data, title }) {
  const [ref, W] = useWidth(), [hover, setHover] = useState(null), gid = 'cf' + useId().replace(/[^a-zA-Z0-9]/g, '')
  const H = W < 440 ? 240 : 310, B = 32, T = 16, R = 14, max = niceMax(Math.max(...data.map((d) => Math.max(d.income, d.expenses)))), L = padLeft(max) + 6, last = data.at(-1), n = data.length
  const span = Math.max(1, n - 1), x = (i) => L + (i * (W - L - R)) / span, y = (v) => H - B - (v / max) * (H - B - T)
  const path = (k) => smooth(data.map((d, i) => [x(i), y(d[k])]))
  const every = Math.max(1, Math.ceil(56 / Math.max(1, (W - L - R) / span))), show = (i) => (n - 1 - i) % every === 0
  const move = (e) => { const r = e.currentTarget.getBoundingClientRect(), i = Math.round(((e.clientX - r.left - L) / Math.max(1, W - L - R)) * span); setHover(Math.min(n - 1, Math.max(0, i))) }
  const h = hover !== null ? data[hover] : null, tipLeft = h ? Math.min(Math.max(x(hover), 74), W - 74) : 0
  return (<figure className="cashflow" style={{ margin: 0 }}>
    <div className="cf-head"><h2>{title}</h2><div className="legend cf-legend"><Key color="var(--color-primary)">Income {money(last.income)}</Key><Key color="var(--color-negative)">Expenses {money(last.expenses)}</Key></div></div>
    <hr className="cf-rule" />
    <div className="cf-pad"><div ref={ref} className="chart-box cf-box">
      <svg className="chart" width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Running totals: income ${money(last.income)}, expenses ${money(last.expenses)}`} onPointerMove={move} onPointerDown={move} onPointerLeave={() => setHover(null)}>
        <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--color-primary)" stopOpacity=".34" /><stop offset="1" stopColor="var(--color-primary)" stopOpacity="0" /></linearGradient></defs>
        {data.map((d, i) => show(i) && <line className="cf-vgrid" key={'v' + i} x1={x(i)} x2={x(i)} y1={T - 4} y2={H - B} />)}
        {[0, 1, 2, 3].map((i) => { const v = (max / 3) * i; return <g key={i}><line className={i === 0 ? 'cf-base' : 'cf-grid'} x1={L} x2={W - R} y1={y(v)} y2={y(v)} /><text className="cf-tick" x={L - 10} y={y(v) + 4} fontSize="12" textAnchor="end">{compact(v)}</text></g> })}
        {data.map((d, i) => show(i) && <text className="cf-tick" key={i} x={Math.min(Math.max(x(i), L + 14), W - 22)} y={H - 9} fontSize="12" textAnchor="middle">{d.label}</text>)}
        <path d={`${path('income')} L${x(n - 1)},${y(0)} L${x(0)},${y(0)} Z`} fill={`url(#${gid})`} stroke="none" />
        <path d={path('income')} fill="none" stroke="var(--color-primary)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        <path d={path('expenses')} fill="none" stroke="var(--color-negative)" strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" strokeDasharray="6 5" />
        <circle cx={x(n - 1)} cy={y(last.income)} r="4" fill="var(--color-primary)" /><circle cx={x(n - 1)} cy={y(last.expenses)} r="4" fill="var(--color-negative)" />
        {h && <g><line className="cf-guide" x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} /><circle cx={x(hover)} cy={y(h.income)} r="4.5" fill="var(--color-primary)" className="cf-pt" /><circle cx={x(hover)} cy={y(h.expenses)} r="4.5" fill="var(--color-negative)" className="cf-pt" /></g>}
      </svg>
      {h && <div className="cf-tip" aria-hidden="true" style={{ left: tipLeft }}><strong>{h.label}</strong><span><i style={{ background: 'var(--color-primary)' }} />Income <b>{money(h.income)}</b></span><span><i style={{ background: 'var(--color-negative)' }} />Expenses <b>{money(h.expenses)}</b></span></div>}
    </div></div></figure>)
}
export function BarChart({ data }) {
  const [ref, W] = useWidth(), H = 280, B = 30, max = niceMax(Math.max(...data.map((d) => Math.max(d.income, d.expenses)))), L = padLeft(max)
  const y = (v) => H - B - (v / max) * (H - B - 20), slot = (W - L - 4) / data.length, bw = Math.max(6, Math.min(34, slot / 3)), values = slot >= 76 // value labels only when they cannot collide
  return (<figure style={{ margin: 0 }}><div ref={ref} className="chart-box"><svg className="chart" width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Income and expenses by month">
    <Grid {...{ W, L, max, y }} />
    {data.map((d, i) => { const cx = L + slot * i + slot / 2; return <g key={d.month}>
      <rect x={cx - bw - 2} y={y(d.income)} width={bw} height={H - B - y(d.income)} fill="var(--color-primary)" rx="2" />{values && <text x={cx - bw / 2 - 2} y={y(d.income) - 5} fontSize="12" textAnchor="middle" fill="var(--color-text)">{compact(d.income)}</text>}
      <rect x={cx + 2} y={y(d.expenses)} width={bw} height={H - B - y(d.expenses)} fill="var(--color-negative)" rx="2" />{values && <text x={cx + bw / 2 + 2} y={y(d.expenses) - 5} fontSize="12" textAnchor="middle" fill="var(--color-text)">{compact(d.expenses)}</text>}
      <text x={cx} y={H - 8} fontSize="12" textAnchor="middle" fill={TICK}>{monthShort(d.month)}</text></g> })}</svg></div>
    <Legend><Key color="var(--color-primary)">Income</Key><Key color="var(--color-negative)">Expenses</Key></Legend></figure>)
}
export function MiniBars({ data }) {
  const [ref, W] = useWidth(260), H = 110, B = 20, max = Math.max(1, ...data.flatMap((d) => [d.income, d.expenses])), slot = W / data.length, bw = Math.max(5, Math.min(16, slot / 3.2)), h = (v) => (v > 0 ? Math.max(2, (v / max) * (H - B - 6)) : 0)
  return (<div ref={ref} className="chart-box"><svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Income and expenses for the last ${data.length} months`}>
    <line x1="0" x2={W} y1={H - B} y2={H - B} stroke="var(--color-border)" />
    {data.map((d, i) => { const cx = slot * i + slot / 2; return <g key={d.month}>
      <rect x={cx - bw - 1} y={H - B - h(d.income)} width={bw} height={h(d.income)} fill="var(--color-primary)" rx="2" />
      <rect x={cx + 1} y={H - B - h(d.expenses)} width={bw} height={h(d.expenses)} fill="var(--color-negative)" rx="2" />
      <text x={cx} y={H - 5} fontSize="12" textAnchor="middle" fill={TICK}>{monthShort(d.month)}</text></g> })}</svg></div>)
}
