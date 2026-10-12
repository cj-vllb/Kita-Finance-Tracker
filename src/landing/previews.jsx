// Landing-page product previews. Static, illustrative sample data only: nothing here reads the user's data or touches Supabase.
// They reuse the app's own classes and chart components so they match the current TrackMyKita interface.
import { ArrowDownLeft, ArrowUpRight, BatteryFull, Signal, Wifi } from 'lucide-react'
import { MoneyFlowChart, BarChart } from '../components/charts.jsx'

const peso = (n) => '₱' + n.toLocaleString('en-US')
const DirIcon = ({ type }) => <span className={'dir-icon ' + (type === 'income' ? 'in' : 'out')} aria-hidden="true">{type === 'income' ? <ArrowDownLeft size={16} strokeWidth={2} /> : <ArrowUpRight size={16} strokeWidth={2} />}</span>

export const SAMPLE_TX = [
  { title: 'Monthly salary', cat: 'Salary', color: '#0E8A5F', date: 'Oct 1', amount: 28000, type: 'income' },
  { title: 'Groceries', cat: 'Food', color: '#C98A0B', date: 'Oct 8', amount: 1860, type: 'expense' },
  { title: 'Jeepney and train fare', cat: 'Transport', color: '#3F6FB5', date: 'Oct 8', amount: 340, type: 'expense' },
  { title: 'Electricity bill', cat: 'Bills', color: '#B0392B', date: 'Oct 6', amount: 2450, type: 'expense' },
  { title: 'Freelance project', cat: 'Side income', color: '#0E8A5F', date: 'Oct 5', amount: 6500, type: 'income' },
]
export const SAMPLE_BUDGETS = [
  { name: 'Food', spent: 6200, amount: 8000 },
  { name: 'Transport', spent: 3100, amount: 3000 },
  { name: 'Bills', spent: 4100, amount: 6000 },
  { name: 'Leisure', spent: 1400, amount: 3500 },
]
const MONTHS = [
  { month: '2026-05', income: 31000, expenses: 22400 }, { month: '2026-06', income: 30500, expenses: 24100 },
  { month: '2026-07', income: 34000, expenses: 23800 }, { month: '2026-08', income: 33000, expenses: 26300 },
  { month: '2026-09', income: 35500, expenses: 25200 }, { month: '2026-10', income: 34500, expenses: 23750 },
]
const FLOW = [[1, 28000, 0], [4, 28000, 2900], [8, 34500, 5100], [12, 34500, 9800], [16, 34500, 14200], [20, 34500, 18900], [24, 34500, 21300], [28, 34500, 23750]].map(([d, income, expenses]) => ({ day: d, income, expenses, label: 'Oct ' + d }))

const level = (p) => (p > 100 ? 'over' : p >= 80 ? 'warn' : 'ok')
export const Frame = ({ label, children, className = '' }) => (
  <div className={'lp-frame ' + className} role="img" aria-label={label}><div className="lp-frame-bar" aria-hidden="true"><i /><i /><i /></div><div className="lp-frame-body" aria-hidden="true">{children}</div></div>)

export const TxList = ({ rows = SAMPLE_TX }) => (
  <ul className="tx-list">{rows.map((t) => (
    <li key={t.title}><div className="tx-item"><DirIcon type={t.type} />
      <span className="tx-main"><span className="tx-title">{t.title}</span><span className="muted small meta"><span className="cat-label"><span className="dot" style={{ background: t.color }} />{t.cat}</span><span className="meta-date"> · {t.date}</span></span></span>
      <span className="tx-amt"><span className={'amount ' + (t.type === 'income' ? 'pos' : 'neg')}>{t.type === 'income' ? '+' : '−'}{peso(t.amount)}</span><span className="small muted tx-kind">{t.type === 'income' ? 'Income' : 'Expense'}</span></span></div></li>))}</ul>)

export const BudgetList = ({ rows = SAMPLE_BUDGETS }) => (
  <ul className="bp-list">{rows.map((b) => { const pct = Math.round((b.spent / b.amount) * 100), left = b.amount - b.spent
    return (<li key={b.name}><div className="bp-top"><span>{b.name}</span><span className="muted small">{peso(b.spent)} of {peso(b.amount)}</span></div>
      <div className="bar"><div className={'bar-fill ' + level(pct)} style={{ width: Math.min(pct, 100) + '%' }} /></div>
      <div className={'small bp-note ' + (left < 0 ? 'neg' : 'muted')}>{left < 0 ? `${peso(-left)} over budget` : `${peso(left)} left`} · {pct}% used</div></li>) })}</ul>)

export const BalanceHero = () => (
  <section className="hero-balance"><div className="hero-main"><div className="balance-label">Current balance</div><div className="balance">₱48,260</div><div className="small hero-updated">Updated today, October 11</div></div>
    <div className="figures">
      <div><div className="muted">Monthly income</div><div className="v pos">+₱34,500</div></div>
      <div><div className="muted">Monthly expenses</div><div className="v neg">−₱23,750</div></div>
      <div><div className="muted">Net change</div><div className="v">+₱10,750</div><div className="muted small">31% of income kept this month</div></div></div></section>)

export const Panel = ({ title, sub, children }) => (<section className="preview"><div className="preview-body"><h2>{title}</h2>{sub && <p className="muted small">{sub}</p>}{children}</div></section>)

export const DashboardPreview = () => (
  <Frame label="Preview of the TrackMyKita dashboard showing the current balance, recent transactions and budgets (sample data)">
    <BalanceHero />
    <div className="lp-pair"><Panel title="Recent transactions" sub="Your latest activity"><TxList rows={SAMPLE_TX.slice(0, 4)} /></Panel><Panel title="Budgets" sub="October 2026"><BudgetList rows={SAMPLE_BUDGETS.slice(0, 3)} /></Panel></div>
  </Frame>)
export const TransactionsPreview = () => (<Frame label="Preview of the TrackMyKita transaction list (sample data)"><Panel title="Recent transactions" sub="Income and expenses with categories"><TxList /></Panel></Frame>)
export const BudgetsPreview = () => (<Frame label="Preview of TrackMyKita monthly budgets with progress bars (sample data)"><Panel title="Budgets" sub="October 2026"><BudgetList /></Panel></Frame>)
export const ReportsPreview = () => (<Frame label="Preview of the TrackMyKita Reports chart comparing income and expenses by month (sample data)"><section className="card"><h2>Income and expenses by month</h2><p className="muted small" style={{ marginBottom: 12 }}>Is spending staying below income?</p><BarChart data={MONTHS} /></section></Frame>)
export const FlowPreview = () => (<Frame label="Preview of the TrackMyKita monthly money flow chart (sample data)"><Panel title="Monthly money flow"><MoneyFlowChart data={FLOW} /></Panel></Frame>)
export const MiniTx = ({ t }) => (<div className="lp-float" aria-hidden="true"><DirIcon type={t.type} /><span className="tx-main"><span className="tx-title">{t.title}</span><span className="muted small">{t.cat} · {t.date}</span></span><span className={'amount ' + (t.type === 'income' ? 'pos' : 'neg')}>{t.type === 'income' ? '+' : '−'}{peso(t.amount)}</span></div>)

// Smartphone presentation of the same sample Monthly money flow (and the recent list under it, as on the phone dashboard).
// Generic rounded device: no brand marks. Static sample data only, nothing here reads the user's data.
export const PhoneMockup = () => (
  <div className="lp-phone" role="img" aria-label="Preview of the TrackMyKita monthly money flow chart on a smartphone (sample data)">
    <div className="lp-phone-screen" aria-hidden="true">
      <div className="lp-phone-status"><span>9:41</span><span className="lp-phone-island" /><span className="lp-phone-sys"><Signal size={13} strokeWidth={2.4} /><Wifi size={13} strokeWidth={2.4} /><BatteryFull size={16} strokeWidth={2} /></span></div>
      <div className="lp-phone-body">
        <Panel title="Monthly money flow"><MoneyFlowChart data={FLOW} /></Panel>
        <Panel title="Recent transactions"><TxList rows={SAMPLE_TX.slice(0, 3)} /></Panel>
      </div>
      <span className="lp-phone-home" />
    </div>
  </div>)
