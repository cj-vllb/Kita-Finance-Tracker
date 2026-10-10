import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import { formatDate, formatDateLong, formatDateTime, signed, txLabel } from '../utils/format.js'
import { PageHeader, DeleteTransactionDialog, ErrorState, CategoryLabel } from '../components/ui.jsx'
export default function TransactionDetail() {
  const { id } = useParams(), nav = useNavigate(), { transactions, categories, deleteTransaction, notify } = useApp(), [confirm, setConfirm] = useState(false)
  const t = transactions.find((x) => x.id === id)
  if (!t) return <ErrorState title="Transaction not found" text="It may have been deleted." />
  const isIn = t.type === 'income'
  return (<>
    <PageHeader title={txLabel(t, categories)} subtitle={`${isIn ? 'Income' : 'Expense'} · Recorded ${formatDateLong(t.date)}`} />
    <p className={isIn ? 'pos' : 'neg'} style={{ fontSize: 38, fontWeight: 600, marginBottom: 24 }}>{signed(t.amount, t.type)}</p>
    <div className="form-actions" style={{ marginBottom: 32 }}><Link className="btn btn-primary" to={`/transactions/${t.id}/edit`}>Edit</Link><button className="btn btn-danger" onClick={() => setConfirm(true)}>Delete</button><Link className="btn" to="/transactions">Back to transactions</Link></div>
    <dl className="dl"><dt>Title</dt><dd>{txLabel(t, categories)}</dd><dt>Amount</dt><dd className={isIn ? 'pos' : 'neg'}>{signed(t.amount, t.type)}</dd><dt>Type</dt><dd>{isIn ? 'Income' : 'Expense'}</dd><dt>Category</dt><dd><CategoryLabel id={t.categoryId} categories={categories} /></dd>
      <dt>Date</dt><dd>{formatDateLong(t.date)}</dd><dt>Created</dt><dd>{formatDateTime(t.createdAt || t.date + 'T09:00:00')}</dd><dt>Notes</dt><dd>{t.notes || <span className="muted">No notes</span>}</dd></dl>
    {confirm && <DeleteTransactionDialog summary={`${txLabel(t, categories)}, ${signed(t.amount, t.type)}, ${formatDate(t.date)}.`} onCancel={() => setConfirm(false)} onConfirm={async () => { const e = await deleteTransaction(t.id); if (e) { setConfirm(false); notify(e); return } notify('Transaction deleted.'); nav('/transactions') }} />}
  </>)
}
