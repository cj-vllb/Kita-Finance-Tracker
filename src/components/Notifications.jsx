import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Bell, X, AlertTriangle, PiggyBank, Megaphone, Check, CheckCheck } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { Presence } from './ui.jsx'
import { CHANGELOG } from '../data/changelog.js'
import { money } from '../utils/format.js'
import { CURRENT_MONTH } from '../utils/dates.js'
import { localToday, formatDayLong, addDays } from '../utils/dateRange.js'
import { buildNotifications } from '../utils/notifications.js'
import { readIds, writeIds } from '../utils/notificationState.js'

// Phone and tablet header: the bell and its panel. Notifications are worked out from the data the app already has (see utils/notifications.js);
// nothing is stored in the database, nothing polls, and only "which ids are read" is remembered, on this device, per signed-in user.
const ICON = { budget: AlertTriangle, savings: PiggyBank, system: Megaphone }
const when = (n) => {
  if (n.kind === 'system') return n.dateText || ''
  if (!n.at) return ''
  const t = localToday(); return n.at === t ? 'Today' : n.at === addDays(t, -1) ? 'Yesterday' : formatDayLong(n.at)
}
export function useNotifications() {
  const { session, budgets, transactions, categories, goals, ledger, transfers, contributions, reallocations } = useApp(), uid = session?.user?.id
  const list = useMemo(() => buildNotifications({ budgets, transactions, categories, goals, ledger, transfers, contributions, reallocations, changelog: CHANGELOG, month: CURRENT_MONTH }, money), [budgets, transactions, categories, goals, ledger, transfers, contributions, reallocations])
  const [read, setRead] = useState(() => readIds(uid))
  useEffect(() => { setRead(readIds(uid)) }, [uid])
  const currentIds = useMemo(() => new Set(list.map((n) => n.id)), [list])
  const save = useCallback((next) => { setRead(next); writeIds(uid, next, currentIds) }, [uid, currentIds])
  const markRead = useCallback((id) => { if (!read.has(id)) save(new Set(read).add(id)) }, [read, save])
  const markAll = useCallback(() => save(new Set([...read, ...currentIds])), [read, currentIds, save])
  const unread = list.filter((n) => !read.has(n.id)).length
  return { list, read, unread, markRead, markAll }
}

export default function NotificationBell() {
  const { list, read, unread, markRead, markAll } = useNotifications(), [open, setOpen] = useState(false), btn = useRef(), panel = useRef(), nav = useNavigate()
  const close = useCallback((refocus) => { setOpen(false); if (refocus === true) btn.current?.focus({ preventScroll: true }) }, [])
  useEffect(() => {
    if (!open) return
    const esc = (e) => { if (e.key === 'Escape') { e.preventDefault(); close(true) } }, out = (e) => { if (!panel.current?.contains(e.target) && !btn.current?.contains(e.target)) close() }
    document.addEventListener('keydown', esc); document.addEventListener('pointerdown', out)
    return () => { document.removeEventListener('keydown', esc); document.removeEventListener('pointerdown', out) }
  }, [open, close])
  useEffect(() => { if (open) panel.current?.querySelector('button')?.focus({ preventScroll: true }) }, [open])
  const go = (n) => { markRead(n.id); close(); if (n.to) nav(n.to) }
  return (<>
    <button ref={btn} type="button" className="hd-btn hd-bell" aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? 'notif-panel' : undefined} aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'} onClick={() => setOpen((o) => !o)}>
      <Bell size={20} strokeWidth={1.85} aria-hidden="true" />{unread > 0 && <span className="hd-badge" aria-hidden="true">{unread > 9 ? '9+' : unread}</span>}</button>
    {createPortal(<Presence show={open}>{(state) => (<>
      <div className="nt-scrim" data-state={state} aria-hidden="true" onClick={() => close()} />
      <section ref={panel} id="notif-panel" className="nt-panel" data-state={state} role="dialog" aria-label="Notifications">
        <div className="nt-head"><h2>Notifications</h2>
          <button type="button" className="btn-link nt-all" disabled={unread === 0} onClick={markAll}><CheckCheck size={15} aria-hidden="true" />Mark all as read</button>
          <button type="button" className="icon-btn" aria-label="Close notifications" onClick={() => close(true)}><X size={18} aria-hidden="true" /></button></div>
        {list.length === 0 ? <div className="nt-empty"><span className="nt-empty-ico" aria-hidden="true"><Bell size={22} strokeWidth={1.6} /></span><p><strong>You're all caught up</strong></p><p className="muted small">Budget alerts and savings milestones will show up here.</p></div>
          : <ul className="nt-list">{list.map((n) => { const Icon = ICON[n.kind] || Bell, isRead = read.has(n.id), stamp = when(n)
            return (<li key={n.id} className={'nt-item' + (isRead ? '' : ' unread') + ' ' + n.kind + (n.level ? ' ' + n.level : '')}>
              <button type="button" className="nt-main" onClick={() => go(n)}>
                <span className="nt-ico" aria-hidden="true"><Icon size={18} strokeWidth={1.9} /></span>
                <span className="nt-body"><span className="nt-title">{!isRead && <span className="sr-only">Unread. </span>}{n.title}</span><span className="nt-msg">{n.message}</span>{stamp && <span className="nt-time">{stamp}</span>}</span>
                {!isRead && <span className="nt-dot" aria-hidden="true" />}</button>
              {!isRead && <button type="button" className="icon-btn nt-mark" aria-label={`Mark "${n.title}" as read`} title="Mark as read" onClick={() => markRead(n.id)}><Check size={16} aria-hidden="true" /></button>}</li>) })}</ul>}
      </section></>)}</Presence>, document.body)}</>)
}
