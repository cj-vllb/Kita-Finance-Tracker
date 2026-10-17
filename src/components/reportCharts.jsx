import { money } from '../utils/format.js'
import { colorHex } from '../utils/colors.js'
import { useWidth, compact, padLeft } from './charts.jsx'
import { CategoryIcon } from './ui.jsx'
// Charts for the Reports > Charts view. All of them draw the rows they are given (nothing is demo data) and are plain SVG/HTML, so they inherit the theme
// through CSS variables. Exact amounts are always readable: in the legend / list next to the chart and in each shape's tooltip (<title>).
const TICK = 'var(--color-muted)'
// Slices need colors that are distinguishable from each other, so they are taken by rank from the app palette rather than from each category's own
// color (several categories can share one color).
const PALETTE = ['#2E9E5B', '#3B82C4', '#E8833A', '#9B4DCA', '#D9A400', '#1AA6C4', '#E0589B', '#8B5E3C', '#5B4FD1', '#D64545', '#1F8A8A']
const OTHER = '#7A807C'
export const MAX_SLICES = 8
// Groups everything beyond the largest MAX_SLICES into one "Other" slice, so the pie and legend stay readable. Totals and shares are unchanged.
export function pieSlices(rows) {
  const total = rows.reduce((s, r) => s + Math.round(r.amount * 100), 0) / 100
  const head = rows.slice(0, MAX_SLICES), rest = rows.slice(MAX_SLICES)
  const out = head.map((r, i) => ({ key: r.categoryId || 'none', name: r.name, icon: r.icon, amount: r.amount, color: PALETTE[i % PALETTE.length] }))
  if (rest.length) out.push({ key: 'other', name: `Other (${rest.length} categories)`, icon: null, amount: Math.round(rest.reduce((s, r) => s + r.amount * 100, 0)) / 100, color: OTHER })
  return out.map((s) => ({ ...s, share: total ? (s.amount / total) * 100 : 0 }))
}
const polar = (cx, cy, r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)]
export const pct1 = (v) => `${v >= 10 || v === 0 ? Math.round(v) : v.toFixed(1)}%`

export function PieChart({ rows, title, totalLabel = 'Total' }) {
  const slices = pieSlices(rows), total = slices.reduce((s, x) => s + Math.round(x.amount * 100), 0) / 100, R = 100, C = 110
  let angle = -Math.PI / 2
  const shapes = slices.map((s) => {
    const sweep = (s.share / 100) * Math.PI * 2, a0 = angle, a1 = angle + sweep; angle = a1
    const label = `${s.name}: ${money(s.amount)}, ${pct1(s.share)}`
    if (s.share >= 99.995) return { s, label, circle: true }
    const [x0, y0] = polar(C, C, R, a0), [x1, y1] = polar(C, C, R, a1), mid = (a0 + a1) / 2, [lx, ly] = polar(C, C, R * 0.62, mid)
    return { s, label, d: `M${C},${C} L${x0},${y0} A${R},${R} 0 ${sweep > Math.PI ? 1 : 0} 1 ${x1},${y1} Z`, lx, ly }
  })
  return (<figure className="pie" style={{ margin: 0 }}>
    <div className="pie-box"><svg viewBox={`0 0 ${C * 2} ${C * 2}`} className="pie-svg" role="img" aria-label={`${title}. ${totalLabel} ${money(total)}. ${shapes.map((x) => x.label).join('; ')}.`}>
      {shapes.map(({ s, label, circle, d, lx, ly }) => (<g key={s.key}>
        {circle ? <circle cx={C} cy={C} r={R} fill={s.color} stroke="var(--color-field)" strokeWidth="2"><title>{label}</title></circle> : <path d={d} fill={s.color} stroke="var(--color-field)" strokeWidth="2"><title>{label}</title></path>}
        {!circle && s.share >= 7 && <text x={lx} y={ly + 4} textAnchor="middle" fontSize="13" fontWeight="700" fill="#fff" pointerEvents="none">{pct1(s.share)}</text>}
        {circle && <text x={C} y={C + 5} textAnchor="middle" fontSize="16" fontWeight="700" fill="#fff" pointerEvents="none">100%</text>}</g>))}</svg></div>
    <ul className="pie-legend" aria-label={`${title}, legend`}>{slices.map((s) => (<li key={s.key}><span className="pie-swatch" style={{ background: s.color }} aria-hidden="true" />
      {s.icon !== null && <span className="pie-icon"><CategoryIcon id={s.icon} size={16} /></span>}<span className="pie-name">{s.name}</span><span className="pie-amt amount">{money(s.amount)}</span><span className="pie-pct muted small">{pct1(s.share)}</span></li>))}</ul>
  </figure>)
}

const niceStep = (raw) => { if (!(raw > 0)) return 1; const p = 10 ** Math.floor(Math.log10(raw)); return [1, 2, 2.5, 5, 10].map((k) => k * p).find((s) => s >= raw) }
// Axis from the lowest to the highest value (zero is always included), in 4 equal "nice" steps. Works when net cash flow goes negative.
export function axisFor(values) {
  const lo0 = Math.min(0, ...values), hi0 = Math.max(0, ...values), step = niceStep((hi0 - lo0 || 1) / 4)
  const lo = Math.floor(lo0 / step) * step, hi = Math.max(Math.ceil(hi0 / step) * step, lo + step), ticks = []
  for (let v = lo; v <= hi + step / 1000; v += step) ticks.push(Math.round(v * 100) / 100)
  return { lo, hi, ticks }
}
// Wide series (a month of days, three years of months) scroll sideways inside the card instead of squeezing labels together.
function Scroller({ children, slotMin, n }) {
  const [ref, W] = useWidth(), inner = Math.max(W, n * slotMin)
  return <div ref={ref} className="chart-box chart-scroll">{children(inner)}</div>
}
const every = (slot) => Math.max(1, Math.ceil(46 / slot))

export function FlowBars({ series, title }) {
  const slotMin = series.length > 12 ? 30 : 56, H = 280, B = 34, T = 14
  const ax = axisFor(series.flatMap((d) => [d.income, d.expenses]))
  return (<figure style={{ margin: 0 }}><Scroller slotMin={slotMin} n={series.length}>{(W) => {
    const L = padLeft(ax.hi) + 4, slot = (W - L - 6) / series.length, bw = Math.max(5, Math.min(26, slot / 2.6)), y = (v) => T + ((ax.hi - v) / (ax.hi - ax.lo)) * (H - B - T), step = every(slot)
    return (<svg className="chart" width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title}. ${series.map((d) => `${d.label}: income ${money(d.income)}, expenses ${money(d.expenses)}`).join('; ')}`}>
      {ax.ticks.map((v) => <g key={v}><line x1={L} x2={W - 4} y1={y(v)} y2={y(v)} stroke="var(--color-border)" /><text x={0} y={y(v) + 4} fontSize="12" fill={TICK}>{compact(v)}</text></g>)}
      {series.map((d, i) => { const cx = L + slot * i + slot / 2; return (<g key={d.key}><title>{`${d.label}: income ${money(d.income)}, expenses ${money(d.expenses)}`}</title>
        <rect x={cx - bw - 1} y={Math.min(y(d.income), y(0))} width={bw} height={Math.abs(y(0) - y(d.income))} fill="var(--color-primary)" rx="2" />
        <rect x={cx + 1} y={Math.min(y(d.expenses), y(0))} width={bw} height={Math.abs(y(0) - y(d.expenses))} fill="var(--color-negative)" rx="2" />
        {i % step === 0 && <text x={cx} y={H - 10} fontSize="12" textAnchor="middle" fill={TICK}>{d.label}</text>}</g>) })}</svg>)
  }}</Scroller>
    <figcaption className="legend"><span><span className="dot" style={{ background: 'var(--color-primary)' }} />Income</span><span><span className="dot" style={{ background: 'var(--color-negative)' }} />Expenses</span></figcaption></figure>)
}

const LINES = [['income', 'Income', 'var(--color-primary)', ''], ['expenses', 'Expenses', 'var(--color-negative)', '6 5'], ['net', 'Net cash flow', 'var(--color-text)', '2 4']]
export function TrendLines({ series, title }) {
  const slotMin = series.length > 12 ? 30 : 56, H = 280, B = 34, T = 14, ax = axisFor(series.flatMap((d) => [d.income, d.expenses, d.net]))
  return (<figure style={{ margin: 0 }}><Scroller slotMin={slotMin} n={series.length}>{(W) => {
    const L = padLeft(Math.max(Math.abs(ax.lo), ax.hi)) + 8, n = series.length, span = Math.max(1, n - 1), x = (i) => L + 8 + (i * (W - L - 20)) / span, y = (v) => T + ((ax.hi - v) / (ax.hi - ax.lo)) * (H - B - T), step = every((W - L - 20) / span)
    return (<svg className="chart" width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title}. ${series.map((d) => `${d.label}: income ${money(d.income)}, expenses ${money(d.expenses)}, net ${money(d.net)}`).join('; ')}`}>
      {ax.ticks.map((v) => <g key={v}><line x1={L} x2={W - 4} y1={y(v)} y2={y(v)} stroke={v === 0 ? 'var(--color-muted)' : 'var(--color-border)'} /><text x={0} y={y(v) + 4} fontSize="12" fill={TICK}>{compact(v)}</text></g>)}
      {LINES.map(([k, , color, dash]) => <path key={k} d={series.map((d, i) => `${i ? 'L' : 'M'}${x(i)},${y(d[k])}`).join(' ')} fill="none" stroke={color} strokeWidth="2.25" strokeDasharray={dash || undefined} strokeLinejoin="round" strokeLinecap="round" />)}
      {series.map((d, i) => (<g key={d.key}><title>{`${d.label}: income ${money(d.income)}, expenses ${money(d.expenses)}, net ${money(d.net)}`}</title>
        {n <= 40 && LINES.map(([k, , color]) => <circle key={k} cx={x(i)} cy={y(d[k])} r="3" fill={color} />)}
        <rect x={x(i) - (W - L - 20) / span / 2} y={T} width={Math.max(8, (W - L - 20) / span)} height={H - B - T} fill="transparent" />
        {i % step === 0 && <text x={x(i)} y={H - 10} fontSize="12" textAnchor="middle" fill={TICK}>{d.label}</text>}</g>))}</svg>)
  }}</Scroller>
    <figcaption className="legend">{LINES.map(([k, label, color]) => <span key={k}><span className="dot" style={{ background: color }} />{label}</span>)}</figcaption></figure>)
}

// Budget vs actual: for each budgeted category a grey bar (the budget) and a colored bar (what was spent), scaled to the same maximum.
export function BudgetBars({ rows }) {
  const max = Math.max(1, ...rows.flatMap((r) => [r.budgeted, r.spent]))
  return (<ul className="bvb" aria-label="Budget versus actual spending">{rows.map((r) => (<li key={r.key}>
    <div className="bvb-top"><span className="bvb-name"><CategoryIcon id={r.icon} size={16} />{r.name}</span><span className="small muted bvb-amt">{r.tracked ? `${money(r.spent)} of ${money(r.budgeted)}` : `${money(r.budgeted)} (spending not tracked)`}</span></div>
    <div className="bvb-track" role="img" aria-label={`${r.name}: budget ${money(r.budgeted)}, spent ${money(r.spent)}`}><span className="bvb-budget" style={{ width: (r.budgeted / max) * 100 + '%' }} /><span className={'bvb-spent ' + r.level} style={{ width: (r.spent / max) * 100 + '%' }} /></div></li>))}</ul>)
}
