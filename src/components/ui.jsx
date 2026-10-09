import { useEffect, useRef, useState, useId, isValidElement, cloneElement } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { initials } from '../utils/format.js'
// Shared dialog behaviour: focus moves in, Tab stays inside, Escape closes, page behind does not scroll, focus returns on close.
function useDialog(ref, onClose, focusRef) {
  const close = useRef(onClose); close.current = onClose // latest handler without re-running the effect (which would steal focus on every re-render)
  useEffect(() => {
    const prev = document.activeElement, overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'; (focusRef || ref).current?.focus()
    const key = (e) => {
      if (e.key === 'Escape') return close.current()
      if (e.key !== 'Tab' || !ref.current) return
      const items = [...ref.current.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')]
      if (!items.length) return
      const first = items[0], last = items[items.length - 1]
      if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { e.preventDefault(); last.focus() } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', key)
    return () => { document.removeEventListener('keydown', key); document.body.style.overflow = overflow; prev?.focus?.() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
}
// Profile picture, or the initials fallback when there is no picture (or it fails to load).
export function Avatar({ user, size = 32, className = '' }) {
  const [broken, setBroken] = useState(false)
  useEffect(() => setBroken(false), [user.avatarUrl])
  return (<span className={'avatar ' + className} style={{ width: size, height: size, fontSize: Math.max(11, Math.round(size * 0.36)) }}>
    {user.avatarUrl && !broken ? <img src={user.avatarUrl} alt="" onError={() => setBroken(true)} /> : initials(user)}</span>)
}
export const PageHeader = ({ title, subtitle, children }) => (
  <div className="page-header"><div><h1>{title}</h1>{subtitle && <p className="muted">{subtitle}</p>}</div>{children && <div className="actions">{children}</div>}</div>)
// Moves keyboard/screen-reader focus to the first field with an error after a failed submit.
export const focusFirstInvalid = () => requestAnimationFrame(() => document.querySelector('[aria-invalid="true"]')?.focus())
// Label, control, hint and error. The control is linked to its label and to the hint/error text, and the error is not part of the label.
// A button group (Segmented) has its own aria-label, so it gets a plain caption instead of a <label>.
export function Field({ label, error, hint, children }) {
  const id = useId(), hintId = id + '-hint', errId = id + '-err'
  const describedBy = [error && errId, hint && !error && hintId].filter(Boolean).join(' ') || undefined
  const group = isValidElement(children) && children.type === Segmented
  const control = isValidElement(children) && !group ? cloneElement(children, { id, 'aria-describedby': describedBy }) : children
  return (<div className="field">{group ? <span className="field-label">{label}</span> : <label className="field-label" htmlFor={id}>{label}</label>}{control}
    {hint && !error && <span id={hintId} className="muted small">{hint}</span>}{error && <span id={errId} className="field-error" role="alert">{error}</span>}</div>)
}
export const Segmented = ({ label, value, onChange, options, disabled }) => (
  <div role="group" aria-label={label} className="seg">{options.map(([v, text]) => <button type="button" key={v} disabled={disabled} aria-pressed={value === v} onClick={() => onChange(v)}>{text}</button>)}</div>)
export function ConfirmDialog({ title, children, confirmLabel, onConfirm, onCancel, danger = true, infoOnly, disabled = false }) {
  const ref = useRef(), cancel = useRef(), [busy, setBusy] = useState(false) // blocks double-submits while a delete is in flight
  const confirm = async () => { if (busy || disabled) return; setBusy(true); try { await onConfirm() } finally { setBusy(false) } }
  useDialog(ref, onCancel, cancel)
  return (<div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
    <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="dlg-title" ref={ref}><h2 id="dlg-title">{title}</h2><div className="dialog-body">{children}</div>
      <div className="dialog-actions"><button ref={cancel} className="btn" onClick={onCancel}>{infoOnly ? 'Close' : 'Cancel'}</button>
        {!infoOnly && <button className={'btn ' + (danger ? 'btn-danger' : 'btn-primary')} disabled={busy || disabled} onClick={confirm}>{confirmLabel}</button>}</div></div></div>)
}
export const EmptyState = ({ title, text, to, action }) => (
  <div className="empty"><h2>{title}</h2><p className="muted" style={{ margin: '4px 0 20px' }}>{text}</p>{to && <Link className="btn btn-primary" to={to}>{action}</Link>}</div>)
export function ErrorState({ title = 'Something went wrong', text = 'Try again or go back.', onRetry }) {
  const nav = useNavigate()
  return (<div className="empty" role="alert"><h2>{title}</h2><p className="muted" style={{ margin: '4px 0 20px' }}>{text}</p>
    <div className="form-actions" style={{ justifyContent: 'center' }}>{onRetry && <button className="btn btn-primary" onClick={onRetry}>Retry</button>}<button className="btn" onClick={() => nav(-1)}>Go back</button></div></div>)
}
export const LoadingState = ({ rows = 4, label = 'Loading your figures...' }) => (
  <div aria-busy="true" aria-label={label}><p className="muted small" style={{ marginBottom: 12 }}>{label}</p>
    {Array.from({ length: rows }, (_, i) => <div key={i} className="skeleton" style={{ height: 40, marginBottom: 12, width: `${100 - i * 8}%` }} />)}</div>)
export const useLoading = () => useApp().dataLoading // real loading state from the data context
// Password input with a show/hide toggle. Accepts the same props as <input>; type is managed here.
export function PasswordInput({ className = 'input', type, ...props }) {
  const [show, setShow] = useState(false)
  return (<div className="pw"><input {...props} className={className} type={show ? 'text' : 'password'} autoCapitalize="off" autoCorrect="off" spellCheck={false} />
    <button type="button" className="pw-toggle" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow(!show)}>{show ? <EyeOff size={18} strokeWidth={1.75} /> : <Eye size={18} strokeWidth={1.75} />}</button></div>)
}
// One delete confirmation for every place a transaction can be deleted.
export const DeleteTransactionDialog = ({ summary, onConfirm, onCancel }) => (
  <ConfirmDialog title="Delete transaction?" confirmLabel="Delete" onCancel={onCancel} onConfirm={onConfirm}>
    <p>Are you sure you want to delete this transaction?</p><p className="muted">{summary}</p><p className="muted small">This action cannot be undone.</p></ConfirmDialog>)
// Bottom sheet for per-row actions on small screens.
export function ActionSheet({ title, subtitle, onClose, children }) {
  const ref = useRef()
  useDialog(ref, onClose)
  return (<div className="scrim sheet-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <div className="sheet" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}><div className="sheet-head"><div className="sheet-title">{title}</div>{subtitle && <div className="muted small">{subtitle}</div>}</div>
      {children}<button type="button" className="sheet-item" onClick={onClose}>Cancel</button></div></div>)
}
