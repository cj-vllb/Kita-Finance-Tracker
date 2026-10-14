import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Coins, Plus, Pencil, Trash2, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Eye, Undo2 } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { money, formatDate, txLabel } from '../utils/format.js'
import { bucketAmount, goalProgress, pctText, isSavings } from '../utils/ledger.js'
import { PageHeader, EmptyState, RowMenu } from '../components/ui.jsx'
import { MoveDialog, GoalDialog, DeleteGoalDialog, UndoDialog } from '../components/SavingsDialogs.jsx'

const PAGE = 10
export default function Savings() {
  const { savingsReady, ledger, goals, activeGoals, transactions, transfers, reallocations, categories } = useApp()
  const [dlg, setDlg] = useState(null), [shown, setShown] = useState(PAGE)
  const name = (id) => { if (!id) return 'General Savings'; const g = goals.find((x) => x.id === id); return g ? g.name + (g.archived ? ' (deleted)' : '') : 'a goal' }
  // Everything that touched Savings, newest first: transfers and moves (undoable here) and income/expenses that used Savings (opened in Transactions).
  const activity = useMemo(() => [
    ...transfers.map((t) => ({ kind: 'transfer', id: t.id, date: t.date, createdAt: t.createdAt, t })),
    ...reallocations.map((r) => ({ kind: 'move', id: r.id, date: r.date, createdAt: r.createdAt, r })),
    ...transactions.filter(isSavings).map((t) => ({ kind: 'tx', id: t.id, date: t.date, createdAt: t.createdAt, t })),
  ].sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || '')), [transfers, reallocations, transactions])
  if (!savingsReady) return (<><PageHeader title="Savings" /><EmptyState icon={Coins} title="Savings is not set up yet" text="The latest database update has not been applied to this project. Apply it with supabase db push, then reload this page. Everything else keeps working." /></>)

  const open = (kind, extra) => setDlg({ kind, ...extra })
  const hasGoals = activeGoals.length > 0
  // Withdrawing or moving needs money in that bucket; moving out of General Savings also needs a goal to move it to.
  const rowMenu = (id) => { const held = bucketAmount(ledger, id) > 0; return [
    { label: 'Add money', icon: Plus, onSelect: () => open('add', { goalId: id }) },
    ...(held ? [{ label: 'Withdraw to Current Balance', icon: ArrowUpRight, onSelect: () => open('withdraw', { goalId: id }) }] : []),
    ...(held && (id !== '' || hasGoals) ? [{ label: 'Move money', icon: ArrowLeftRight, onSelect: () => open('move', { goalId: id }) }] : []),
  ] }
  const describe = (e) => e.kind === 'transfer'
    ? { Icon: e.t.direction === 'to_savings' ? ArrowDownLeft : ArrowUpRight, title: e.t.direction === 'to_savings' ? 'Added to Savings' : 'Withdrawn to Current Balance', kind: 'Transfer',
      meta: e.t.direction === 'to_savings' ? `From Current Balance to ${name(e.t.goalId)}` : `From ${name(e.t.goalId)} to Current Balance`, amount: (e.t.direction === 'to_savings' ? '+' : '−') + money(e.t.amount), cls: '', note: e.t.note, dir: e.t.direction === 'to_savings' ? 'in' : 'out' }
    : e.kind === 'move'
      ? { Icon: ArrowLeftRight, title: 'Moved within Savings', kind: 'Reallocation', meta: `${name(e.r.fromGoalId)} to ${name(e.r.toGoalId)}`, amount: money(e.r.amount), cls: '', note: e.r.note, dir: 'mid' }
      : { Icon: e.t.type === 'income' ? ArrowDownLeft : ArrowUpRight, title: txLabel(e.t, categories), kind: e.t.type === 'income' ? 'Income' : 'Expense', meta: `${e.t.type === 'income' ? 'Added to' : 'Paid from'} ${name(e.t.goalId)}`, amount: (e.t.type === 'income' ? '+' : '−') + money(e.t.amount), cls: e.t.type === 'income' ? 'pos' : 'neg', note: e.t.notes, dir: e.t.type === 'income' ? 'in' : 'out', to: `/transactions/${e.t.id}` }
  const summary = (e) => { const d = describe(e); return `${d.title}, ${d.amount}, ${formatDate(e.date)}. ${d.meta}.` }
  const delGoal = dlg?.kind === 'delete' ? goals.find((g) => g.id === dlg.id) : null

  return (<>
    <PageHeader title="Savings" subtitle="Money you have put aside, kept separate from your Current Balance.">
      <button className="btn btn-primary" onClick={() => open('add', { goalId: '' })}>Add to Savings</button>
      <button className="btn" onClick={() => open('withdraw', { goalId: '' })} disabled={ledger.savings <= 0}>Withdraw</button>
      <button className="btn" onClick={() => open('goal')}>New goal</button></PageHeader>

    <section className="card sv-overview" aria-label="Savings overview">
      <div><div className="balance-label">Savings balance</div><div className="sv-big">{money(ledger.savings)}</div></div>
      <div><div className="muted">Set aside for goals</div><div className="sv-fig">{money(ledger.allocated)}</div><div className="muted small">Part of your Savings, not extra money</div></div>
      <div><div className="muted">Unassigned</div><div className="sv-fig">{money(ledger.unassigned)}</div><div className="muted small">Not set aside for any goal</div></div></section>

    <section className="card sv-section" aria-labelledby="sv-goals-h">
      <div className="sv-head"><h2 id="sv-goals-h">Goals</h2>{hasGoals && <button className="btn-link" onClick={() => open('goal')}>New goal</button>}</div>
      <ul className="sv-list">
        <li className="sv-item sv-general"><div className="sv-top"><span className="sv-name">General Savings</span><span className="sv-amt">{money(ledger.unassigned)}</span>
          <RowMenu label="Options for General Savings" items={rowMenu('')} /></div>
          <div className="muted small">Unassigned. Not set aside for a particular goal.</div></li>
        {activeGoals.map((g) => { const p = goalProgress(g, bucketAmount(ledger, g.id)); return (
          <li key={g.id} className="sv-item"><div className="sv-top"><span className="sv-name">{g.name}</span><span className="muted small sv-amt">{money(p.saved)} of {money(p.target)}</span>
            <RowMenu label={`Options for ${g.name}`} items={[...rowMenu(g.id), { label: 'Edit goal', icon: Pencil, onSelect: () => open('goal', { id: g.id }) }, { label: 'Delete goal', icon: Trash2, danger: true, onSelect: () => open('delete', { id: g.id }) }]} /></div>
            <div className="bar" role="progressbar" aria-valuenow={Math.round(p.pct)} aria-valuemin="0" aria-valuemax="100" aria-label={`${g.name} progress`}><div className="bar-fill ok" style={{ width: p.pct + '%' }} /></div>
            <div className="small muted bp-note">{p.reached ? 'Goal reached' : `${money(p.remaining)} to go`} · {pctText(p.pct)} saved</div></li>) })}</ul>
      {!hasGoals && <div className="empty compact"><span className="empty-icon" aria-hidden="true"><Coins size={28} strokeWidth={1.5} /></span><h2>No savings goals yet</h2>
        <p className="muted empty-text">You can save without a goal. Create one when you want to set money aside for something, like a phone or an emergency fund.</p>
        <button className="btn btn-primary" onClick={() => open('goal')}>Create a goal</button></div>}</section>

    <section className="card sv-section" aria-labelledby="sv-act-h">
      <div className="sv-head"><h2 id="sv-act-h">Savings activity</h2></div>
      {activity.length === 0 ? <div className="empty compact"><h2>No savings activity yet</h2><p className="muted empty-text">Add money to Savings, or record income straight into Savings from <Link to="/transactions/new">a new transaction</Link>.</p></div> : <>
        <ul className="sv-act" aria-label="Savings activity">{activity.slice(0, shown).map((e) => { const d = describe(e); return (
          <li key={e.kind + e.id} className="tx-li"><div className={'tx-row' + (d.note?.trim() ? ' has-note' : '')}>
            <span className={'dir-icon ' + (d.dir === 'in' ? 'in' : d.dir === 'out' ? 'out' : '')} aria-hidden="true"><d.Icon size={16} strokeWidth={2} /></span>
            <div className="tx-main">{d.to ? <Link className="tx-link" to={d.to}>{d.title}</Link> : <span className="tx-link">{d.title}</span>}<span className="muted small meta">{d.meta} · {formatDate(e.date)}</span></div>
            <div className="tx-amt"><span className={`amount ${d.cls}`}>{d.amount}</span><span className="small muted tx-kind">{d.kind}</span></div>
            <RowMenu label={`Actions for ${d.title}`} items={e.kind === 'tx' ? [{ label: 'View transaction', icon: Eye, to: d.to }] : [{ label: e.kind === 'transfer' ? 'Undo transfer' : 'Undo move', icon: Undo2, danger: true, onSelect: () => open('undo', { entry: e }) }]} /></div></li>) })}</ul>
        {activity.length > shown && <div className="sv-more"><button className="btn" onClick={() => setShown(shown + PAGE)}>Show more</button></div>}</>}</section>

    {dlg?.kind && ['add', 'withdraw', 'move'].includes(dlg.kind) && <MoveDialog mode={dlg.kind} goalId={dlg.goalId || ''} onClose={() => setDlg(null)} />}
    {dlg?.kind === 'goal' && <GoalDialog goal={dlg.id ? goals.find((g) => g.id === dlg.id) : null} onClose={() => setDlg(null)} />}
    {delGoal && <DeleteGoalDialog goal={delGoal} onClose={() => setDlg(null)} />}
    {dlg?.kind === 'undo' && <UndoDialog entry={dlg.entry} summary={summary(dlg.entry)} onClose={() => setDlg(null)} />}
  </>)
}
