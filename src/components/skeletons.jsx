import { useLocation } from 'react-router-dom'
// Loading placeholders that follow the layout of the page they stand in for. They only show while real data is loading
// (AppShell decides when, after a short delay), and never replace an error or an empty state.
const Sk = ({ w, h = 14, className = '', style }) => <div className={'skeleton ' + className} style={{ width: w, height: h, ...style }} />
const Head = ({ action = true }) => (<div className="sk-head"><div className="sk-stack"><Sk w={200} h={30} /><Sk w={260} h={14} /></div>{action && <Sk w={140} h={44} className="sk-action" />}</div>)
const Wrap = ({ label, children }) => <div className="sk-page" role="status" aria-busy="true"><span className="sr-only">{label}</span><div aria-hidden="true">{children}</div></div>
const rows = (n, row) => Array.from({ length: n }, (_, i) => <div key={i}>{row(i)}</div>)
export const TransactionsSkeleton = () => (<Wrap label="Loading your transactions"><Head />
  <div className="sk-toolbar"><Sk h={48} /><Sk w={96} h={48} /></div>
  {rows(7, () => <div className="sk-row"><div className="sk-stack"><Sk w="55%" /><Sk w="35%" h={12} /></div><Sk w={84} /></div>)}</Wrap>)
export const CategoriesSkeleton = () => (<Wrap label="Loading your categories"><Head />
  {[4, 3].map((n, g) => <div key={g} className="sk-group"><Sk w={180} h={22} /><Sk w={140} h={12} style={{ margin: '8px 0 12px' }} />
    {rows(n, () => <div className="sk-row sk-row-sm"><div className="sk-inline"><Sk w={10} h={10} style={{ borderRadius: '50%' }} /><Sk w={140} /></div><Sk w={72} /></div>)}</div>)}</Wrap>)
export const BudgetsSkeleton = () => (<Wrap label="Loading your budgets"><Head />
  <div className="sk-toolbar"><Sk w={200} h={48} /><Sk w={260} h={14} style={{ alignSelf: 'center' }} /></div>
  {rows(4, () => <div className="sk-budget"><div className="sk-between"><Sk w={150} h={16} /><Sk w={64} /></div><div className="sk-three"><Sk h={14} /><Sk h={14} /><Sk h={14} /></div><Sk h={6} /></div>)}</Wrap>)
export const DashboardSkeleton = () => (<Wrap label="Loading your dashboard"><Sk w={300} h={32} /><Sk w={240} h={14} style={{ margin: '8px 0 28px' }} />
  <div className="sk-card"><Sk w={120} h={12} /><Sk w={220} h={38} style={{ margin: '10px 0 24px' }} /><div className="sk-three"><Sk h={40} /><Sk h={40} /><Sk h={40} /></div></div>
  <div className="sk-two"><div className="sk-card"><Sk w={160} h={18} /><Sk h={150} style={{ marginTop: 16 }} /></div><div className="sk-card"><Sk w={100} h={18} /><Sk h={150} style={{ marginTop: 16 }} /></div></div>
  <div className="sk-two">{[0, 1].map((i) => <div key={i} className="sk-card"><Sk w={150} h={18} />{rows(3, () => <div className="sk-row sk-row-sm"><Sk w="50%" /><Sk w={64} /></div>)}</div>)}</div></Wrap>)
export const ReportsSkeleton = () => (<Wrap label="Loading your reports"><Head action={false} />
  <div className="sk-four"><Sk h={56} /><Sk h={56} /><Sk h={56} /><Sk h={56} /></div>
  <div className="sk-card" style={{ marginTop: 32 }}><Sk w={200} h={18} /><Sk h={200} style={{ marginTop: 16 }} /></div>
  {rows(4, () => <div className="sk-row sk-row-sm"><Sk w={120} /><Sk h={6} style={{ flex: 1, margin: '0 16px' }} /><Sk w={72} /></div>)}</Wrap>)
// Forms, detail pages and settings: a title and a few field-shaped bars.
export const GenericSkeleton = () => (<Wrap label="Loading"><Head action={false} /><div className="sk-form">{rows(4, () => <div className="sk-stack"><Sk w={110} h={12} /><Sk h={48} /></div>)}</div></Wrap>)
export default function PageSkeleton() {
  const { pathname } = useLocation(), p = pathname.replace(/\/$/, '')
  if (p === '/transactions') return <TransactionsSkeleton />
  if (p === '/categories') return <CategoriesSkeleton />
  if (p === '/budgets') return <BudgetsSkeleton />
  if (p === '/dashboard') return <DashboardSkeleton />
  if (p === '/reports') return <ReportsSkeleton />
  return <GenericSkeleton />
}
