// Landing-page product previews (1.3.7). They show the CURRENT TrackMyKita interface inside the original angled frames and the 3D phone.
// Desktop-sized screens use the app's own class names, chart and calendar components inside a ".shell" wrapper (it carries the app's tokens), so they track the real
// dashboard. The phone has its own small mobile layout (the app's mobile CSS keys off the browser width, which a frame on a desktop page cannot trigger).
// Everything shown is fixed, illustrative sample data defined here: nothing reads the signed-in user's records, the app context or Supabase.
import { Eye, Bell, Home, ArrowLeftRight, BarChart3, MoreHorizontal, Plus, ChevronRight, BatteryFull, Signal, Wifi } from 'lucide-react'
import { CashFlowChart } from '../components/charts.jsx'
import { FlowBars } from '../components/reportCharts.jsx'
import { CategoryIcon } from '../components/ui.jsx'
import { LogoMark } from '../components/Logo.jsx'

const peso = (n) => '₱' + n.toLocaleString('en-US')
export const SAMPLE_TX = [
  { title: 'Monthly salary', cat: 'Salary', icon: 'briefcase', date: '10/01/2026', amount: 28000, type: 'income' },
  { title: 'Groceries', cat: 'Food', icon: 'shopping-cart', date: '10/08/2026', amount: 1860, type: 'expense' },
  { title: 'Jeepney and train fare', cat: 'Transport', icon: 'bus', date: '10/08/2026', amount: 340, type: 'expense' },
  { title: 'Electricity bill', cat: 'Bills', icon: 'lamp', date: '10/06/2026', amount: 2450, type: 'expense' },
  { title: 'Freelance project', cat: 'Side income', icon: 'laptop', date: '10/05/2026', amount: 6500, type: 'income' },
]
export const SAMPLE_BUDGETS = [
  { name: 'Food', spent: 6200, amount: 8000 }, { name: 'Transport', spent: 3100, amount: 3000 }, { name: 'Bills', spent: 4100, amount: 6000 }, { name: 'Leisure', spent: 1400, amount: 3500 },
]
const FLOW = [[1, 28000, 0], [4, 28000, 2900], [8, 34500, 5100], [12, 34500, 9800], [16, 34500, 14200], [20, 34500, 18900], [24, 34500, 21300], [28, 34500, 23750]].map(([day, income, expenses]) => ({ day, income, expenses, label: 'Oct ' + day }))
const SERIES = [['May', 31000, 22400], ['Jun', 30500, 24100], ['Jul', 34000, 23800], ['Aug', 33000, 26300], ['Sep', 35500, 25200], ['Oct', 34500, 23750]].map(([label, income, expenses]) => ({ key: label, label, income, expenses, net: income - expenses }))
const level = (p) => (p > 100 ? 'over' : p >= 80 ? 'warn' : 'ok')

// The angled screens: a window frame around the app's own markup.
export const Frame = ({ label, children, className = '' }) => (
  <div className={'lp-frame ' + className} role="img" aria-label={label}><div className="lp-frame-bar" aria-hidden="true"><i /><i /><i /></div>
    <div className="lp-frame-body" aria-hidden="true"><div className="shell lp-app">{children}</div></div></div>)

const TxList = ({ rows = SAMPLE_TX }) => (<ul className="tx-list">{rows.map((t) => (
  <li key={t.title}><div className="tx-item"><span className={'dir-icon tx-cat-icon ' + (t.type === 'income' ? 'in' : 'out')}><CategoryIcon id={t.icon} size={18} /></span>
    <span className="tx-main"><span className="tx-title">{t.title}</span><span className="muted small meta"><span className="cat-label"><span className="dot" style={{ background: t.type === 'income' ? 'var(--color-positive)' : 'var(--color-negative)' }} />{t.cat}</span><span className="meta-date"> · {t.date}</span></span></span>
    <span className="tx-amt"><span className={'amount ' + (t.type === 'income' ? 'pos' : 'neg')}>{t.type === 'income' ? '+' : '−'}{peso(t.amount)}</span><span className="small muted tx-kind">{t.type === 'income' ? 'Income' : 'Expense'}</span></span></div></li>))}</ul>)
const BudgetList = ({ rows = SAMPLE_BUDGETS }) => (<ul className="bp-list">{rows.map((b) => { const pct = Math.round((b.spent / b.amount) * 100), left = b.amount - b.spent
  return (<li key={b.name}><div className="bp-top"><span>{b.name}</span><span className="muted small">{peso(b.spent)} of {peso(b.amount)}</span></div><div className="bar"><div className={'bar-fill ' + level(pct)} style={{ width: Math.min(pct, 100) + '%' }} /></div>
    <div className={'small bp-note ' + (left < 0 ? 'neg' : 'muted')}>{left < 0 ? `${peso(-left)} over budget` : `${peso(left)} left`} · {pct}% used</div></li>) })}</ul>)
const Panel = ({ title, sub, link, children }) => (<section className="preview"><div className="pv-head"><div className="pv-title"><h2>{title}</h2>{sub && <p className="muted small">{sub}</p>}</div>{link && <span className="pv-link">{link}<ChevronRight size={16} aria-hidden="true" /></span>}</div><div className="pv-body">{children}</div></section>)

const Balances = () => (<div className="balances">
  <section className="hero-balance"><div className="hero-main"><div className="balance-label bal-head">Current Balance<span className="eye-btn"><Eye size={18} strokeWidth={1.75} /></span></div><div className="balance bal-amount">₱48,260</div><div className="small hero-updated bal-note">Updated today, October 12</div></div>
    <dl className="mfig"><div><dt className="muted">Monthly income</dt><dd className="v pos">+₱34,500</dd></div><div><dt className="muted">Monthly expenses</dt><dd className="v neg">−₱23,750</dd></div><div><dt className="muted">Net change</dt><dd className="v">+₱10,750</dd><dd className="muted mfig-note">31% of income kept</dd></div></dl></section>
  <section className="savings-balance"><div><div className="balance-label bal-head">Savings<span className="eye-btn"><Eye size={18} strokeWidth={1.75} /></span></div><div className="sb-amount bal-amount">₱35,400</div><div className="muted small sb-note bal-note">₱20,000 set aside for goals</div></div><span className="pv-link">Manage savings<ChevronRight size={16} aria-hidden="true" /></span></section></div>)

// Hero: the current dashboard (balances, money flow, recent transactions).
export const DashboardPreview = () => (<Frame label="Preview of the TrackMyKita dashboard: current balance, savings, monthly money flow and recent transactions (sample data)">
  <Balances />
  <div className="lp-pair"><section className="preview"><div className="pv-body"><CashFlowChart title="Monthly money flow" data={FLOW} /></div></section><Panel title="Recent transactions" link="View all"><TxList rows={SAMPLE_TX.slice(0, 4)} /></Panel></div>
</Frame>)
export const TransactionsPreview = () => (<Frame label="Preview of the TrackMyKita transaction list (sample data)"><Panel title="Transactions" sub="Income and expenses with categories"><TxList /></Panel></Frame>)
export const BudgetsPreview = () => (<Frame label="Preview of TrackMyKita monthly budgets with progress bars (sample data)"><Panel title="Budgets" sub="October 2026"><BudgetList /></Panel></Frame>)
export const ReportsPreview = () => (<Frame label="Preview of the TrackMyKita Reports chart comparing income and expenses by month (sample data)"><section className="card rpt-sec"><h2>Income vs expenses</h2><FlowBars series={SERIES} title="Income versus expenses by month (sample data)" /></section></Frame>)

// Small flat chart for the phone (the full chart needs more room than a 250px card has). Same sample data as the dashboard chart; solid colours only.
const MiniFlow = () => {
  const w = 226, h = 84, x = (d) => 6 + ((d - 1) / 27) * (w - 12), y = (v) => h - 8 - (v / 36000) * (h - 16)
  const inc = FLOW.map((p) => `${x(p.day).toFixed(1)},${y(p.income).toFixed(1)}`), exp = FLOW.map((p) => `${x(p.day).toFixed(1)},${y(p.expenses).toFixed(1)}`)
  return (<svg className="lp-m-svg" viewBox={`0 0 ${w} ${h}`} width="100%" height={h} aria-hidden="true">
    {[0, 1, 2].map((i) => <line key={i} x1="0" x2={w} y1={8 + i * 30} y2={8 + i * 30} stroke="var(--color-border)" strokeWidth="1" />)}
    <polygon points={`${inc.join(' ')} ${x(28)},${h - 8} ${x(1)},${h - 8}`} fill="var(--color-positive)" fillOpacity=".12" />
    <polyline points={inc.join(' ')} fill="none" stroke="var(--color-positive)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    <polyline points={exp.join(' ')} fill="none" stroke="var(--color-negative)" strokeWidth="2" strokeDasharray="4 3" strokeLinejoin="round" strokeLinecap="round" />
    <circle cx={x(28)} cy={y(34500)} r="3" fill="var(--color-positive)" /><circle cx={x(28)} cy={y(23750)} r="3" fill="var(--color-negative)" /></svg>)
}
// ---- the phone: a realistic device (rounded body built from stacked plates, side buttons, island, home bar) showing the mobile dashboard ----
const PHONE_SLICES = Array.from({ length: 10 }, (_, i) => i + 1)
const Tab = ({ icon: I, label, on }) => <span className={'lp-m-tab' + (on ? ' on' : '')}><I size={18} strokeWidth={1.9} />{label}</span>
export const PhoneMockup = () => (
  <div className="lp-phone" role="img" aria-label="Preview of the TrackMyKita app on a smartphone: balance, monthly money flow, recent transactions and the bottom navigation (sample data)">
    <span className="lp-phone-cast" aria-hidden="true" />
    {PHONE_SLICES.map((n) => <span key={n} className="lp-phone-slice" style={{ '--i': n }} aria-hidden="true" />)}
    <div className="lp-phone-screen" aria-hidden="true">
      <div className="lp-phone-status"><span>9:41</span><span className="lp-phone-island" /><span className="lp-phone-sys"><Signal size={13} strokeWidth={2.4} /><Wifi size={13} strokeWidth={2.4} /><BatteryFull size={16} strokeWidth={2} /></span></div>
      <div className="lp-m">
        <div className="lp-m-top"><LogoMark size={20} /><span className="lp-m-title">Good evening, Alex</span><Bell size={17} strokeWidth={1.85} /><span className="lp-m-av">AC</span></div>
        <div className="lp-m-card lp-m-bal"><div className="lp-m-k">Current Balance</div><div className="lp-m-v">₱48,260</div>
          <div className="lp-m-pair"><div><span className="lp-m-k">Monthly income</span><b className="pos">+₱34,500</b></div><div><span className="lp-m-k">Monthly expenses</span><b className="neg">−₱23,750</b></div></div></div>
        <div className="lp-m-card"><h4>Monthly money flow</h4><div className="lp-m-legend"><span><i className="in" />Income ₱34,500</span><span><i className="ex" />Expenses ₱23,750</span></div><MiniFlow /></div>
        <div className="lp-m-card"><h4>Recent transactions</h4>
          {SAMPLE_TX.slice(0, 2).map((t) => <div className="lp-m-tx" key={t.title}><span className={'lp-m-ic ' + t.type}><CategoryIcon id={t.icon} size={15} /></span><span className="lp-m-tt"><b>{t.title}</b><i>{t.cat}</i></span><span className={'lp-m-amt ' + (t.type === 'income' ? 'pos' : 'neg')}>{t.type === 'income' ? '+' : '−'}{peso(t.amount)}</span></div>)}</div>
      </div>
      <div className="lp-m-bar"><Tab icon={Home} label="Dashboard" on /><Tab icon={ArrowLeftRight} label="Transactions" /><span className="lp-m-plus"><Plus size={20} strokeWidth={2.4} /></span><Tab icon={BarChart3} label="Reports" /><Tab icon={MoreHorizontal} label="More" /></div>
      <span className="lp-phone-home" />
    </div>
  </div>)
