import { useEffect, useRef, useState } from 'react'
import { NavLink, Link, Outlet, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, ArrowLeftRight, PiggyBank, BarChart3, Tags, Settings } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { ErrorState, LoadingState } from './ui.jsx'
import { initials, firstName } from '../utils/format.js'
const groups = [
  ['Overview', [['/dashboard', 'Dashboard', LayoutDashboard]]],
  ['Money', [['/transactions', 'Transactions', ArrowLeftRight], ['/budgets', 'Budgets', PiggyBank], ['/reports', 'Reports', BarChart3]]],
  ['Organize', [['/categories', 'Categories', Tags]]],
  ['Account', [['/settings', 'Settings', Settings]]],
]
function ProfileMenu() {
  const { user, logout } = useApp(); const [open, setOpen] = useState(false); const nav = useNavigate(); const box = useRef(); const { pathname } = useLocation()
  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    const out = (e) => !box.current?.contains(e.target) && setOpen(false), esc = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', out); document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', out); document.removeEventListener('keydown', esc) }
  }, [])
  return (<div ref={box}>
    <button className="profile-btn" aria-haspopup="menu" aria-expanded={open} aria-label="Account menu" onClick={() => setOpen(!open)}><span className="avatar">{initials(user)}</span><span className="pname">{firstName(user)}</span></button>
    {open && <div className="menu" role="menu"><Link to="/profile" role="menuitem">Profile</Link><Link to="/settings" role="menuitem">Settings</Link>
      <button role="menuitem" onClick={async () => { await logout(); nav('/login') }}>Log out</button></div>}</div>)
}
export default function AppShell() {
  const { loggedIn, dataLoading, dataError, reload } = useApp()
  if (!loggedIn) return <Navigate to="/login" replace />
  return (<div className="shell">
    <aside className="sidebar"><div className="brand"><span className="brand-mark">K</span><span>Kita</span></div>
      <nav aria-label="Main">{groups.map(([name, items]) => <div className="nav-group" key={name}><div className="label">{name}</div>
        {items.map(([to, text, Icon]) => <NavLink key={to} to={to} className="nav-link" title={text}><Icon size={18} strokeWidth={1.75} /><span className="nav-text">{text}</span></NavLink>)}</div>)}</nav></aside>
    <div><header className="header"><Link to="/dashboard" className="header-brand" style={{ color: 'inherit' }}><span className="brand-mark">K</span>Kita</Link><ProfileMenu /></header><main className="page">{dataError ? <ErrorState title="Unable to load your data" text="Check your connection and try again." onRetry={reload} /> : dataLoading ? <LoadingState rows={5} label="Loading your data..." /> : <Outlet />}</main></div>
  </div>)
}
