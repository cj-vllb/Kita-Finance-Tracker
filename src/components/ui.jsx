import { useEffect, useLayoutEffect, useCallback, useRef, useState, useId, isValidElement, cloneElement } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, MoreVertical } from 'lucide-react'
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
// Motion helpers. Everything here is CSS-driven (opacity/transform); these only keep an element mounted long enough for its exit to play.
// With prefers-reduced-motion the exit is skipped entirely, so nothing is delayed.
const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const EXIT_MS = 140
// For components that are mounted/unmounted by their parent (dialogs, sheets): call dismiss() instead of onClose() to play the exit first.
function useExit(onClose) {
  const [state, setState] = useState('open'), busy = useRef(false)
  const dismiss = useCallback(() => { if (busy.current) return; busy.current = true; if (reducedMotion()) return onClose(); setState('closed'); setTimeout(onClose, EXIT_MS) }, [onClose])
  return [state, dismiss]
}
// For elements toggled by a boolean (menus): render-prop receives 'open' | 'closed' and stays mounted during the exit.
export function Presence({ show, children }) {
  const [mounted, setMounted] = useState(show)
  useEffect(() => {
    if (show) { setMounted(true); return }
    const t = setTimeout(() => setMounted(false), reducedMotion() ? 0 : EXIT_MS); return () => clearTimeout(t)
  }, [show])
  return show || mounted ? children(show ? 'open' : 'closed') : null
}
// True only once `on` has stayed true for `ms`. A load that finishes quickly never shows a skeleton, so there is no flash.
export function useDelayedFlag(on, ms = 150) {
  const [shown, setShown] = useState(false)
  useEffect(() => { if (!on) { setShown(false); return } const t = setTimeout(() => setShown(true), ms); return () => clearTimeout(t) }, [on, ms])
  return on && shown
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
export function ConfirmDialog({ title, children, confirmLabel, onConfirm, onCancel, danger = true, infoOnly, disabled = false, focusRef }) {
  const ref = useRef(), cancel = useRef(), [busy, setBusy] = useState(false) // blocks double-submits while a delete is in flight
  const [state, dismiss] = useExit(onCancel)
  const confirm = async () => { if (busy || disabled) return; setBusy(true); try { await onConfirm() } finally { setBusy(false) } }
  useDialog(ref, dismiss, focusRef || cancel)
  return (<div className="scrim" data-state={state} onMouseDown={(e) => e.target === e.currentTarget && dismiss()}>
    <div className="dialog" data-state={state} role="dialog" aria-modal="true" aria-labelledby="dlg-title" ref={ref}><h2 id="dlg-title">{title}</h2><div className="dialog-body">{children}</div>
      <div className="dialog-actions"><button ref={cancel} className="btn" onClick={dismiss}>{infoOnly ? 'Close' : 'Cancel'}</button>
        {!infoOnly && <button className={'btn ' + (danger ? 'btn-danger' : 'btn-primary')} disabled={busy || disabled} onClick={confirm}>{confirmLabel}</button>}</div></div></div>)
}
// `icon` is a lucide component. `compact` is for an empty section inside a page (e.g. one category group) rather than a whole empty page.
export const EmptyState = ({ icon: Icon, title, text, to, action, compact }) => (
  <div className={'empty' + (compact ? ' compact' : '')}>{Icon && <span className="empty-icon" aria-hidden="true"><Icon size={compact ? 28 : 36} strokeWidth={1.5} /></span>}
    <h2>{title}</h2><p className="muted empty-text">{text}</p>{to && <Link className="btn btn-primary" to={to}>{action}</Link>}</div>)
export function ErrorState({ title = 'Something went wrong', text = 'Try again or go back.', onRetry }) {
  const nav = useNavigate()
  return (<div className="empty" role="alert"><h2>{title}</h2><p className="muted" style={{ margin: '4px 0 20px' }}>{text}</p>
    <div className="form-actions" style={{ justifyContent: 'center' }}>{onRetry && <button className="btn btn-primary" onClick={onRetry}>Retry</button>}<button className="btn" onClick={() => nav(-1)}>Go back</button></div></div>)
}
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
  const ref = useRef(), [state, dismiss] = useExit(onClose)
  useDialog(ref, dismiss)
  return (<div className="scrim sheet-scrim" data-state={state} onMouseDown={(e) => e.target === e.currentTarget && dismiss()}>
    <div className="sheet" data-state={state} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}><div className="sheet-head"><div className="sheet-title">{title}</div>{subtitle && <div className="muted small">{subtitle}</div>}</div>
      {children}<button type="button" className="sheet-item" onClick={dismiss}>Cancel</button></div></div>)
}
// Compact overflow menu for one row. items: [{ label, icon, to | onSelect, danger }].
// The menu is drawn in a portal with fixed positioning, so no scrolling or overflow-hidden parent can clip it, and it is kept inside the viewport
// (flipped above the button when there is no room below). A transparent backdrop catches an outside tap so it closes the menu without also
// triggering whatever sits underneath.
export function RowMenu({ label = 'Options', items }) {
  const [open, setOpen] = useState(false), [pos, setPos] = useState(null), btn = useRef(), menu = useRef(), id = useId()
  const toggle = () => { setPos(null); setOpen((o) => !o) }
  const close = useCallback((focusButton) => { setOpen(false); if (focusButton) btn.current?.focus({ preventScroll: true }) }, [])
  useLayoutEffect(() => {
    if (!open || !menu.current || !btn.current) return
    const r = btn.current.getBoundingClientRect(), m = menu.current.getBoundingClientRect(), pad = 8
    const bottom = window.innerHeight - pad - (window.innerWidth <= 700 ? 64 : 0) // phones: stay clear of the fixed tab bar
    const left = Math.min(Math.max(pad, r.right - m.width), window.innerWidth - m.width - pad)
    let top = r.bottom + 4; if (top + m.height > bottom) top = Math.max(pad, r.top - m.height - 4)
    setPos({ top, left })
  }, [open])
  useEffect(() => { if (open && pos) menu.current?.querySelector('[role="menuitem"]')?.focus({ preventScroll: true }) }, [open, !!pos]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!open) return
    const esc = (e) => { if (e.key === 'Escape') { e.preventDefault(); close(true) } }, away = () => setOpen(false)
    document.addEventListener('keydown', esc); window.addEventListener('resize', away); window.addEventListener('scroll', away, true)
    return () => { document.removeEventListener('keydown', esc); window.removeEventListener('resize', away); window.removeEventListener('scroll', away, true) }
  }, [open, close])
  const onKey = (e) => {
    const list = [...menu.current.querySelectorAll('[role="menuitem"]')], i = list.indexOf(document.activeElement), last = list.length - 1
    const go = (n) => { e.preventDefault(); list[n]?.focus() }
    if (e.key === 'ArrowDown') go(i >= last ? 0 : i + 1); else if (e.key === 'ArrowUp') go(i <= 0 ? last : i - 1); else if (e.key === 'Home') go(0); else if (e.key === 'End') go(last)
    else if (e.key === 'Tab') setOpen(false)
  }
  const pick = (it) => { close(true); it.onSelect?.() } // focus goes back to the button first, so a dialog opened by the action returns focus there
  return (<>
    <button ref={btn} type="button" className="icon-btn row-menu-btn" aria-label={label} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined} onClick={toggle}><MoreVertical size={20} aria-hidden="true" /></button>
    {createPortal(<Presence show={open}>{(state) => (<>
      <div className="row-menu-backdrop" data-state={state} onClick={() => close(true)} />
      <div ref={menu} id={id} role="menu" aria-label={label} className="row-menu" data-state={state} style={pos ? { top: pos.top, left: pos.left } : { top: 0, left: 0, visibility: 'hidden' }} onKeyDown={onKey}>
        {items.map((it) => { const Icon = it.icon, cls = 'row-menu-item' + (it.danger ? ' danger' : ''), inner = <>{Icon && <Icon size={18} aria-hidden="true" />}{it.label}</>
          return it.to ? <Link key={it.label} role="menuitem" className={cls} to={it.to} onClick={() => pick(it)}>{inner}</Link>
            : <button key={it.label} type="button" role="menuitem" className={cls} onClick={() => pick(it)}>{inner}</button> })}</div></>)}</Presence>, document.body)}</>)
}
