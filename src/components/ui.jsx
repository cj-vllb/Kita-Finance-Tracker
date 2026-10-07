import { useEffect, useRef, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { Link, useNavigate } from 'react-router-dom'
export const PageHeader = ({ title, subtitle, children }) => (
  <div className="page-header"><div><h1>{title}</h1>{subtitle && <p className="muted">{subtitle}</p>}</div>{children && <div className="actions">{children}</div>}</div>)
export const Field = ({ label, error, hint, children }) => (
  <label className="field"><span className="field-label">{label}</span>{children}
    {hint && !error && <span className="muted small">{hint}</span>}{error && <span className="field-error" role="alert">{error}</span>}</label>)
export const Segmented = ({ label, value, onChange, options, disabled }) => (
  <div role="group" aria-label={label} className="seg">{options.map(([v, text]) => <button type="button" key={v} disabled={disabled} aria-pressed={value === v} onClick={() => onChange(v)}>{text}</button>)}</div>)
export function ConfirmDialog({ title, children, confirmLabel, onConfirm, onCancel, danger = true, infoOnly }) {
  const ref = useRef(), [busy, setBusy] = useState(false) // blocks double-submits while a delete is in flight
  const confirm = async () => { if (busy) return; setBusy(true); try { await onConfirm() } finally { setBusy(false) } }
  useEffect(() => { ref.current?.focus(); const k = (e) => e.key === 'Escape' && onCancel(); document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k) }, [onCancel])
  return (<div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
    <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="dlg-title"><h2 id="dlg-title">{title}</h2><div>{children}</div>
      <div className="dialog-actions"><button ref={ref} className="btn" onClick={onCancel}>{infoOnly ? 'Close' : 'Cancel'}</button>
        {!infoOnly && <button className={'btn ' + (danger ? 'btn-danger' : 'btn-primary')} disabled={busy} onClick={confirm}>{confirmLabel}</button>}</div></div></div>)
}
export const EmptyState = ({ title, text, to, action }) => (
  <div className="empty"><h2>{title}</h2><p className="muted" style={{ margin: '4px 0 20px' }}>{text}</p>{to && <Link className="btn btn-primary" to={to}>{action}</Link>}</div>)
export function ErrorState({ title = 'Something went wrong', text = 'Your records are safe. Try again or go back.', onRetry }) {
  const nav = useNavigate()
  return (<div className="empty" role="alert"><h2>{title}</h2><p className="muted" style={{ margin: '4px 0 20px' }}>{text}</p>
    <div className="form-actions" style={{ justifyContent: 'center' }}>{onRetry && <button className="btn btn-primary" onClick={onRetry}>Retry</button>}<button className="btn" onClick={() => nav(-1)}>Go back</button></div></div>)
}
export const LoadingState = ({ rows = 4, label = 'Loading your figures...' }) => (
  <div aria-busy="true" aria-label={label}><p className="muted small" style={{ marginBottom: 12 }}>{label}</p>
    {Array.from({ length: rows }, (_, i) => <div key={i} className="skeleton" style={{ height: 40, marginBottom: 12, width: `${100 - i * 8}%` }} />)}</div>)
export const useLoading = () => useApp().dataLoading // real loading state from the data context
