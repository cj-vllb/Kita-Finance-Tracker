import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import { formatDate, formatDateLong, formatDateTime, signed } from '../utils/format.js'
import { PageHeader, ConfirmDialog, ErrorState } from '../components/ui.jsx'
export default function TransactionDetail() {
  const { id } = useParams(), nav = useNavigate(), { transactions, categories, deleteTransaction, notify } = useApp(), [confirm, setConfirm] = useState(false)
  const t = transactions.find((x) => x.id === id)
  if (!t) return <ErrorState title="Transaction not found" text="It may have been deleted." />
  const cat = categories.find((c) => c.id === t.categoryId)?.name ?? 'Uncategorized', isIn = t.type === 'income'
  return (<>
    <PageHeader title={t.description} subtitle={`${isIn ? 'Income' : 'Expense'} · Recorded ${formatDateLong(t.date)}`} />
    <p className={isIn ? 'pos' : 'neg'} style={{ fontSize: 38, fontWeight: 600, marginBottom: 24 }}>{signed(t.amount, t.type)}</p>
    <div className="form-actions" style={{ marginBottom: 32 }}><Link className="btn btn-primary" to={`/transactions/${t.id}/edit`}>Edit</Link><button className="btn btn-danger" onClick={() => setConfirm(true)}>Delete</button><Link className="btn" to="/transactions">Back to transactions</Link></div>
    <dl className="dl"><dt>Description</dt><dd>{t.description}</dd><dt>Amount</dt><dd className={isIn ? 'pos' : 'neg'}>{signed(t.amount, t.type)}</dd><dt>Type</dt><dd>{isIn ? 'Income' : 'Expense'}</dd><dt>Category</dt><dd>{cat}</dd>
      <dt>Date</dt><dd>{formatDateLong(t.date)}</dd><dt>Created</dt><dd>{formatDateTime(t.createdAt || t.date + 'T09:00:00')}</dd><dt>Notes</dt><dd>{t.notes || <span className="muted">No notes</span>}</dd></dl>
    {confirm && <ConfirmDialog title="Delete transaction?" confirmLabel="Delete transaction" onCancel={() => setConfirm(false)} onConfirm={async () => { const e = await deleteTransaction(t.id); if (e) { setConfirm(false); notify(e); return } notify('Transaction deleted.'); nav('/transactions') }}>
      <p className="muted">{t.description}, {signed(t.amount, t.type)}, {formatDate(t.date)}.</p><p>This action cannot be undone.</p></ConfirmDialog>}
  </>)
}
