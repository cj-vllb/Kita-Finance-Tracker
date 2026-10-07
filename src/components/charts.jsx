import { money, monthShort } from '../utils/format.js'
const kfmt = (v) => `${+(v / 1000).toFixed(1)}k`
const niceMax = (m) => Math.max(30000, Math.ceil(m / 30000) * 30000)
function Grid({ W, H, L, B, max, y }) {
  return [0, 1, 2, 3].map((i) => { const v = (max / 3) * i; return <g key={i}><line x1={L} x2={W - 8} y1={y(v)} y2={y(v)} stroke="var(--color-border)" /><text x={0} y={y(v) + 4} fontSize="12" fill="var(--color-muted)">{kfmt(v)}</text></g> })
}
export function MoneyFlowChart({ data }) {
  const W = 800, H = 280, L = 40, B = 30, max = niceMax(Math.max(...data.map((d) => Math.max(d.income, d.expenses))))
  const x = (i) => L + (i * (W - L - 16)) / Math.max(1, data.length - 1), y = (v) => H - B - (v / max) * (H - B - 12)
  const line = (k) => data.map((d, i) => `${i ? 'L' : 'M'}${x(i)},${y(d[k])}`).join(' '), last = data.at(-1)
  return (<figure style={{ margin: 0 }}><div className="chart-scroll"><svg className="chart" viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Running totals: income ${money(last.income)}, expenses ${money(last.expenses)}`}>
    <Grid {...{ W, H, L, B, max, y }} />{data.map((d, i) => <text key={i} x={x(i)} y={H - 8} fontSize="12" textAnchor="middle" fill="var(--color-muted)">{d.label}</text>)}
    <path d={line('income')} fill="none" stroke="var(--color-primary)" strokeWidth="2.5" /><path d={line('expenses')} fill="none" stroke="var(--color-negative)" strokeWidth="2.5" strokeDasharray="6 4" /></svg></div>
    <figcaption className="legend"><span><span className="dot" style={{ background: 'var(--color-primary)' }} />Income {money(last.income)}</span><span><span className="dot" style={{ background: 'var(--color-negative)' }} />Expenses {money(last.expenses)}</span></figcaption></figure>)
}
export function BarChart({ data }) {
  const W = 800, H = 300, L = 40, B = 30, max = niceMax(Math.max(...data.map((d) => Math.max(d.income, d.expenses))))
  const y = (v) => H - B - (v / max) * (H - B - 20), slot = (W - L - 8) / data.length, bw = Math.min(34, slot / 3)
  return (<figure style={{ margin: 0 }}><div className="chart-scroll"><svg className="chart" viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Income and expenses by month">
    <Grid {...{ W, H, L, B, max, y }} />
    {data.map((d, i) => { const cx = L + slot * i + slot / 2; return <g key={d.month}>
      <rect x={cx - bw - 2} y={y(d.income)} width={bw} height={H - B - y(d.income)} fill="var(--color-primary)" rx="2" /><text x={cx - bw / 2 - 2} y={y(d.income) - 5} fontSize="12" textAnchor="middle" fill="var(--color-text)">{kfmt(d.income)}</text>
      <rect x={cx + 2} y={y(d.expenses)} width={bw} height={H - B - y(d.expenses)} fill="var(--color-negative)" rx="2" /><text x={cx + bw / 2 + 2} y={y(d.expenses) - 5} fontSize="12" textAnchor="middle" fill="var(--color-text)">{kfmt(d.expenses)}</text>
      <text x={cx} y={H - 8} fontSize="12" textAnchor="middle" fill="var(--color-muted)">{monthShort(d.month)}</text></g> })}</svg></div>
    <figcaption className="legend"><span><span className="dot" style={{ background: 'var(--color-primary)' }} />Income</span><span><span className="dot" style={{ background: 'var(--color-negative)' }} />Expenses</span></figcaption></figure>)
}
