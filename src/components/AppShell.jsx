import { useEffect, useRef, useState } from 'react'
import { NavLink, Link, Outlet, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, ArrowLeftRight, PiggyBank, BarChart3, Tags, Settings, User, MoreHorizontal, ChevronDown } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { ErrorState, LoadingState, Avatar } from './ui.jsx'
import { Logo } from './Logo.jsx'
import { firstName } from '../utils/format.js'
// Desktop shows every section, in groups. Tablet/phone use the compact bar: three main sections plus "More".
const groups = [
  [['/dashboard', 'Dashboard', LayoutDashboard]],
  [['/transactions', 'Transactions', ArrowLeftRight], ['/reports', 'Reports', BarChart3]],
  [['/budgets', 'Budgets', PiggyBank], ['/categories', 'Categories', Tags]],
  [['/settings', 'Settings', Settings]],
]
const main = [['/dashboard', 'Dashboard', LayoutDashboard], ['/transactions', 'Transactions', ArrowLeftRight], ['/reports', 'Reports', BarChart3]]
const more = [['/budgets', 'Budgets', PiggyBank], ['/categories', 'Categories', Tags], ['/settings', 'Settings', Settings], ['/profile', 'Profile', User]]
// Inline list in the wide sidebar, flyout beside the icon rail on tablets, sheet above the tab bar on phones (see app.css).
function MoreNav() {
  const [open, setOpen] = useState(false), box = useRef(), { pathname } = useLocation()
  const active = more.some(([to]) => pathname === to || pathname.startsWith(to + '/'))
  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    if (!open) return
    const out = (e) => !box.current?.contains(e.target) && setOpen(false), esc = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', out); document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('pointerdown', out); document.removeEventListener('keydown', esc) }
  }, [open])
  return (<div className="more" ref={box}>
    <button type="button" className={'nav-link more-btn' + (active ? ' active' : '')} title="More" aria-expanded={open} aria-controls="more-menu" onClick={() => setOpen(!open)}>
      <MoreHorizontal size={18} strokeWidth={1.75} /><span className="nav-text">More</span><ChevronDown size={16} className={'chev' + (open ? ' up' : '')} aria-hidden="true" /></button>
    {open && <div className="more-menu" id="more-menu">{more.map(([to, text, Icon]) => <NavLink key={to} to={to} className="more-link"><Icon size={18} strokeWidth={1.75} />{text}</NavLink>)}</div>}</div>)
}
function ProfileMenu() {
  const { user, logout } = useApp(); const [open, setOpen] = useState(false); const nav = useNavigate(); const box = useRef(); const btn = useRef(); const { pathname } = useLocation()
  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    const out = (e) => !box.current?.contains(e.target) && setOpen(false), esc = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', out); document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('pointerdown', out); document.removeEventListener('keydown', esc) }
  }, [])
  useEffect(() => { if (open) box.current?.querySelector('[role="menuitem"]')?.focus() }, [open]) // keyboard users land on the first item
  // Menu keyboard pattern: arrows move between items, Home/End jump, Escape closes and returns focus to the button.
  const onMenuKey = (e) => {
    const list = [...box.current.querySelectorAll('[role="menuitem"]')], i = list.indexOf(document.activeElement), last = list.length - 1
    const go = (n) => { e.preventDefault(); list[n]?.focus() }
    if (e.key === 'ArrowDown') go(i >= last ? 0 : i + 1)
    else if (e.key === 'ArrowUp') go(i <= 0 ? last : i - 1)
    else if (e.key === 'Home') go(0)
    else if (e.key === 'End') go(last)
    else if (e.key === 'Escape') { setOpen(false); btn.current?.focus() }
  }
  return (<div ref={box}>
    <button ref={btn} className="profile-btn" aria-haspopup="menu" aria-expanded={open} aria-label="Account menu" onClick={() => setOpen(!open)} onKeyDown={(e) => { if (e.key === 'ArrowDown' && !open) { e.preventDefault(); setOpen(true) } }}><Avatar user={user} size={32} /><span className="pname">{firstName(user)}</span></button>
    {open && <div className="menu" role="menu" onKeyDown={onMenuKey}><Link to="/profile" role="menuitem">Profile</Link><Link to="/settings" role="menuitem">Settings</Link>
      <button role="menuitem" onClick={async () => { await logout(); nav('/login') }}>Log out</button></div>}</div>)
}
export default function AppShell() {
  const { loggedIn, dataLoading, dataError, reload } = useApp()
  if (!loggedIn) return <Navigate to="/login" replace />
  return (<div className="shell">
    <aside className="sidebar"><Link to="/dashboard" className="brand" aria-label="TrackMyKita home"><Logo size={26} /></Link>
      <nav className="nav-desktop" aria-label="Main">{groups.map((g, i) => <div className="nav-section" key={i}>{g.map(([to, text, Icon]) => <NavLink key={to} to={to} className="nav-link"><Icon size={18} strokeWidth={1.75} /><span className="nav-text">{text}</span></NavLink>)}</div>)}</nav>
      <nav className="nav-compact" aria-label="Main">{main.map(([to, text, Icon]) => <NavLink key={to} to={to} className="nav-link" title={text}><Icon size={18} strokeWidth={1.75} /><span className="nav-text">{text}</span></NavLink>)}<MoreNav /></nav></aside>
    <div className="shell-main"><header className="header"><Link to="/dashboard" className="header-brand" aria-label="TrackMyKita home"><Logo size={24} /></Link><ProfileMenu /></header><main className="page">{dataError ? <ErrorState title="Unable to load your data" text="Check your connection and try again." onRetry={reload} /> : dataLoading ? <LoadingState rows={5} label="Loading your data..." /> : <Outlet />}</main></div>
  </div>)
}
