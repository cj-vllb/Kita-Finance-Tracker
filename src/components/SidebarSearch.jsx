import { useEffect, useLayoutEffect, useMemo, useRef, useState, useId } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useLocation } from 'react-router-dom'
import { Search, X, Coins, ArrowLeftRight, LayoutDashboard, PiggyBank, BarChart3, Tags, Settings, User, LifeBuoy, HelpCircle, Info, FileText, ShieldCheck, Plus, KeyRound, ArrowUpRight, ArrowDownLeft, CornerDownLeft } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { signed, formatDate, txLabel } from '../utils/format.js'
import { HELP_ITEMS, helpText } from '../data/help.js'

// Destinations the search can open. Every path here is a real route in App.jsx; nothing is advertised that does not exist.
// `keys` are extra words that should find the page. Help topics (data/help.js) are searched too; they open the Help Center at that topic.
const PAGES = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, keys: 'home overview balance' },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight, keys: 'income expense history' },
  { to: '/transactions/new', label: 'Add transaction', icon: Plus, keys: 'new create record income expense' },
  { to: '/budgets', label: 'Budgets', icon: PiggyBank, keys: 'limits spending' },
  { to: '/budgets/new', label: 'Create budget', icon: Plus, keys: 'new add limit' },
  { to: '/savings', label: 'Savings', icon: Coins, keys: 'goals save transfer withdraw current balance allocate' },
  { to: '/categories', label: 'Categories', icon: Tags, keys: 'groups colors' },
  { to: '/categories/new', label: 'Create category', icon: Plus, keys: 'new add group' },
  { to: '/reports', label: 'Reports', icon: BarChart3, keys: 'charts monthly summary' },
  { to: '/settings', label: 'Settings', icon: Settings, keys: 'preferences currency theme export csv delete account' },
  { to: '/profile', label: 'Profile', icon: User, keys: 'account name email picture avatar photo' },
  { to: '/profile?password=1', label: 'Change password', icon: KeyRound, keys: 'security' },
  { to: '/help', label: 'Help Center', icon: LifeBuoy, keys: 'help support faq questions guide how to contact' },
  { to: '/settings/about', label: 'About', icon: Info, keys: 'contact version update log changelog creator' },
  { to: '/privacy', label: 'Privacy Policy', icon: ShieldCheck, keys: 'data legal' },
  { to: '/terms', label: 'Terms of Service', icon: FileText, keys: 'legal rules' },
]
const MAX_PAGES = 4, MAX_TX = 6, MAX_HELP = 3
const norm = (s) => String(s ?? '').toLowerCase()

export function useMedia(query) {
  const get = () => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches
  const [on, setOn] = useState(get)
  useEffect(() => {
    const m = window.matchMedia?.(query); if (!m) return
    const h = () => setOn(m.matches); h()
    m.addEventListener ? m.addEventListener('change', h) : m.addListener(h)
    return () => (m.removeEventListener ? m.removeEventListener('change', h) : m.removeListener(h))
  }, [query])
  return on
}

// `rail` = the sidebar is icon-only (collapsed desktop, or the tablet rail). The search then becomes one icon button that opens
// a compact panel with its own input. Otherwise the input sits in the sidebar and only the results float below it.
export default function SidebarSearch({ rail }) {
  const { transactions, categories } = useApp(), nav = useNavigate(), { pathname, search } = useLocation()
  const [q, setQ] = useState(''), [open, setOpen] = useState(false), [active, setActive] = useState(0), [pos, setPos] = useState(null)
  const anchor = useRef(), panel = useRef(), field = useRef(), uid = useId(), listId = uid + '-list'
  const query = q.trim()

  // Results come from data the app already loaded for this signed-in user (row level security applies upstream); nothing is fetched or stored here.
  const { items, moreTx } = useMemo(() => {
    if (!query) return { items: [], moreTx: 0 }
    const terms = norm(query).split(/\s+/).filter(Boolean)
    const hit = (hay) => terms.every((t) => hay.includes(t))
    const pages = PAGES.filter((p) => hit(norm(p.label + ' ' + p.keys))).slice(0, MAX_PAGES)
      .map((p) => ({ id: 'p:' + p.to, group: 'Pages', to: p.to, label: p.label, Icon: p.icon }))
    const cat = (id) => categories.find((c) => c.id === id)?.name || ''
    const found = transactions.filter((t) => hit(norm([txLabel(t, categories), t.description, t.notes, cat(t.categoryId), t.type === 'income' ? 'income' : 'expense', t.amount, t.date].join(' '))))
      .sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || ''))
    const txs = found.slice(0, MAX_TX).map((t) => ({ id: 't:' + t.id, group: 'Transactions', to: `/transactions/${t.id}`, label: txLabel(t, categories), sub: `${cat(t.categoryId) || 'Uncategorized'} · ${formatDate(t.date)}`, amount: signed(t.amount, t.type), type: t.type }))
    const more = found.length > MAX_TX ? [{ id: 'more', group: 'Transactions', to: `/transactions?q=${encodeURIComponent(query)}`, label: `See all ${found.length} matching transactions`, more: true }] : []
    // Help topics are static text bundled with the app, so searching them reads no user data.
    const help = HELP_ITEMS.filter((h) => hit(helpText(h))).slice(0, MAX_HELP).map((h) => ({ id: 'h:' + h.id, group: 'Help', to: `/help#${h.id}`, label: h.q, sub: h.groupTitle, Icon: HelpCircle }))
    return { items: [...pages, ...txs, ...more, ...help], moreTx: found.length }
  }, [query, transactions, categories])

  useEffect(() => setActive(0), [query])
  const close = () => setOpen(false)
  const pick = (it) => { if (!it) return; nav(it.to); setOpen(false); setQ('') }
  // Close after any navigation (including links elsewhere on the page).
  useEffect(() => { setOpen(false) }, [pathname, search])

  const showPanel = open && (rail || !!query)
  const place = () => {
    const a = anchor.current; if (!a) return
    const r = a.getBoundingClientRect(), pad = 8, w = rail ? 340 : Math.max(r.width, 320)
    const left = rail ? r.right + 10 : r.left, top = rail ? r.top : r.bottom + 6
    setPos({ left: Math.max(pad, Math.min(left, window.innerWidth - w - pad)), top: Math.max(pad, top), width: Math.min(w, window.innerWidth - 2 * pad), maxHeight: Math.max(160, window.innerHeight - Math.max(pad, top) - 12) })
  }
  useLayoutEffect(() => { if (showPanel) place() }, [showPanel, rail]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!showPanel) return
    const out = (e) => { if (!anchor.current?.contains(e.target) && !panel.current?.contains(e.target)) setOpen(false) }
    const onResize = () => place()
    document.addEventListener('pointerdown', out); window.addEventListener('resize', onResize)
    return () => { document.removeEventListener('pointerdown', out); window.removeEventListener('resize', onResize) }
  }, [showPanel]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (open && rail) requestAnimationFrame(() => field.current?.focus({ preventScroll: true })) }, [open, rail])
  useEffect(() => { document.getElementById(`${uid}-o${active}`)?.scrollIntoView?.({ block: 'nearest' }) }, [active, uid])

  const onKey = (e) => {
    if (e.key === 'Escape') { if (open) { e.preventDefault(); e.stopPropagation(); close(); if (rail) anchor.current?.querySelector('button')?.focus() } else if (q) setQ(''); return }
    if (!items.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((i) => (i + 1) % items.length) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setOpen(true); setActive((i) => (i - 1 + items.length) % items.length) }
    else if (e.key === 'Enter') { e.preventDefault(); pick(items[active]) }
  }

  const input = (<div className="ss-field">
    <Search size={16} aria-hidden="true" />
    <input ref={field} className="ss-input" type="text" role="combobox" aria-label="Search" aria-autocomplete="list" aria-expanded={showPanel && !!query} aria-controls={listId} aria-activedescendant={showPanel && items[active] ? `${uid}-o${active}` : undefined}
      placeholder="Search anything..." autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} enterKeyHint="search" value={q} onChange={(e) => { setQ(e.target.value); setOpen(true) }} onFocus={() => setOpen(true)} onKeyDown={onKey} />
    {q && <button type="button" className="ss-clear" aria-label="Clear search" onMouseDown={(e) => e.preventDefault()} onClick={() => { setQ(''); field.current?.focus() }}><X size={14} aria-hidden="true" /></button>}
  </div>)

  let lastGroup = null
  const results = !query ? <p className="ss-hint">Type to search pages, transactions and help.</p> : items.length === 0 ? <p className="ss-empty" role="status">No results for “{query}”.</p> : (
    <ul id={listId} role="listbox" aria-label="Search results" className="ss-list">{items.map((it, i) => {
      const head = it.group !== lastGroup ? (lastGroup = it.group, <li role="presentation" className="ss-group" key={'g' + it.group}>{it.group}</li>) : null
      return [head, <li key={it.id} id={`${uid}-o${i}`} role="option" aria-selected={i === active} className={'ss-item' + (i === active ? ' active' : '') + (it.more ? ' more' : '')} onMouseMove={() => active !== i && setActive(i)} onClick={() => pick(it)}>
        {it.Icon ? <span className="ss-ico" aria-hidden="true"><it.Icon size={16} strokeWidth={1.75} /></span> : it.type ? <span className={'ss-ico dir ' + (it.type === 'income' ? 'in' : 'out')} aria-hidden="true">{it.type === 'income' ? <ArrowDownLeft size={15} strokeWidth={2} /> : <ArrowUpRight size={15} strokeWidth={2} />}</span> : <span className="ss-ico" aria-hidden="true"><ArrowLeftRight size={16} strokeWidth={1.75} /></span>}
        <span className="ss-text"><span className="ss-label">{it.label}</span>{it.sub && <span className="ss-sub">{it.sub}</span>}</span>
        {it.amount && <span className={'ss-amt ' + (it.type === 'income' ? 'pos' : 'neg')}>{it.amount}</span>}
        {i === active && !it.amount && <CornerDownLeft size={14} className="ss-enter" aria-hidden="true" />}</li>]
    })}</ul>)

  return (<>
    {rail ? <div className="ss-rail" ref={anchor}><button type="button" className="nav-link ss-btn" title="Search" aria-label="Search" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((o) => !o)}><Search size={18} strokeWidth={1.75} aria-hidden="true" /></button></div>
      : <div className="side-search" ref={anchor}>{input}</div>}
    {showPanel && pos && createPortal(<div ref={panel} className={'ss-panel' + (rail ? ' with-input' : '')} role={rail ? 'dialog' : undefined} aria-label={rail ? 'Search' : undefined} style={{ left: pos.left, top: pos.top, width: pos.width, maxHeight: pos.maxHeight }}>
      {rail && <div className="ss-top">{input}</div>}
      <div className="ss-body" onMouseDown={(e) => e.preventDefault()}>{results}</div>
      {query && items.length > 0 && <div className="ss-foot" aria-hidden="true"><span>↑↓ to move</span><span>Enter to open</span><span>Esc to close</span></div>}
    </div>, document.body)}
  </>)
}
