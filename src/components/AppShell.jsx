import { useEffect, useRef, useState } from 'react'
import { NavLink, Link, Outlet, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, ArrowLeftRight, Coins, PiggyBank, BarChart3, Tags, Settings, LifeBuoy, User, MoreHorizontal, ChevronDown, ChevronsUpDown, LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { ErrorState, Avatar, Presence, useDelayedFlag } from './ui.jsx'
import PageSkeleton from './skeletons.jsx'
import { Logo, LogoMark } from './Logo.jsx'
import SidebarSearch, { useMedia } from './SidebarSearch.jsx'
import { firstName } from '../utils/format.js'
// Desktop shows every section in groups; Settings sits with the account actions at the bottom of the sidebar. Tablet/phone use the compact bar: three main sections plus "More".
const groups = [
  [['/dashboard', 'Dashboard', LayoutDashboard]],
  [['/transactions', 'Transactions', ArrowLeftRight], ['/reports', 'Reports', BarChart3]],
  [['/budgets', 'Budgets', PiggyBank], ['/savings', 'Savings', Coins], ['/categories', 'Categories', Tags]],
]
const main = [['/dashboard', 'Dashboard', LayoutDashboard], ['/transactions', 'Transactions', ArrowLeftRight], ['/reports', 'Reports', BarChart3]]
const more = [['/budgets', 'Budgets', PiggyBank], ['/savings', 'Savings', Coins], ['/categories', 'Categories', Tags], ['/help', 'Help Center', LifeBuoy], ['/settings', 'Settings', Settings], ['/profile', 'Profile', User]]
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
    <Presence show={open}>{(state) => <><div className="more-scrim" data-state={state} aria-hidden="true" onClick={() => setOpen(false)} /><div className="more-menu" id="more-menu" data-state={state}><span className="more-grip" aria-hidden="true" />{more.map(([to, text, Icon]) => <NavLink key={to} to={to} className="more-link"><Icon size={18} strokeWidth={1.75} />{text}</NavLink>)}</div></>}</Presence></div>)
}
function ProfileMenu({ tile = false }) {
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
  return (<div ref={box} className={tile ? 'account-tile-wrap' : 'account-top'}>
    <button ref={btn} className={tile ? 'profile-btn account-tile' : 'profile-btn'} aria-haspopup="menu" aria-expanded={open} aria-label="Account menu" title={tile ? user.fullName : undefined} onClick={() => setOpen(!open)} onKeyDown={(e) => { if (e.key === 'ArrowDown' && !open) { e.preventDefault(); setOpen(true) } }}>{tile ? <><Avatar user={user} size={34} /><span className="acct-text"><span className="acct-name">{user.fullName}</span><span className="acct-email">{user.email}</span></span><ChevronsUpDown size={16} aria-hidden="true" className="acct-chev" /></> : <><Avatar user={user} size={34} /><span className="pname">{firstName(user)}</span></>}</button>
    <Presence show={open}>{(state) => <div className={'menu' + (tile ? ' tile-menu' : '')} role="menu" data-state={state} onKeyDown={onMenuKey}><Link to="/profile" role="menuitem"><User size={16} strokeWidth={1.75} aria-hidden="true" />Profile</Link>
      <button role="menuitem" className="menu-logout" onClick={async () => { await logout(); nav('/login') }}><LogOut size={16} strokeWidth={1.75} aria-hidden="true" />Log out</button></div>}</Presence></div>)
}
const SIDEBAR_KEY = 'kita:sidebar' // UI preference only (like the theme); never sent anywhere
const readCollapsed = () => { try { return localStorage.getItem(SIDEBAR_KEY) === 'collapsed' } catch { return false } }
export default function AppShell() {
  const { loggedIn, dataLoading, dataError, reload } = useApp(), { pathname } = useLocation(), showSkeleton = useDelayedFlag(dataLoading && !dataError) // a load under ~150ms never flashes a skeleton
  const [collapsed, setCollapsed] = useState(readCollapsed), wide = useMedia('(min-width: 1101px)'), phone = useMedia('(max-width: 700px)')
  const toggle = () => setCollapsed((c) => { const n = !c; try { localStorage.setItem(SIDEBAR_KEY, n ? 'collapsed' : 'expanded') } catch { /* storage unavailable: the choice just is not remembered */ } return n })
  if (!loggedIn) return <Navigate to="/login" replace />
  const isCollapsed = wide && collapsed // the collapsed state only exists on wide screens; tablets already use the icon rail
  return (<div className={'shell' + (isCollapsed ? ' is-collapsed' : '')}>
    <aside className="sidebar" aria-label="Sidebar">
      <div className="side-top"><Link to="/dashboard" className="brand" aria-label="TrackMyKita home">{isCollapsed ? <LogoMark size={28} /> : <Logo size={28} />}</Link>
        <button type="button" className="side-toggle" onClick={toggle} aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!isCollapsed}>{isCollapsed ? <PanelLeftOpen size={15} strokeWidth={1.75} aria-hidden="true" /> : <PanelLeftClose size={15} strokeWidth={1.75} aria-hidden="true" />}</button></div>
      {!phone && <SidebarSearch rail={!wide || collapsed} />}
      <div className="side-nav">
        <nav className="nav-desktop" aria-label="Main">{groups.map((g, i) => <div className="nav-section" key={i}>{g.map(([to, text, Icon]) => <NavLink key={to} to={to} className="nav-link" title={isCollapsed ? text : undefined}><Icon size={18} strokeWidth={1.75} /><span className="nav-text">{text}</span></NavLink>)}</div>)}</nav>
        <nav className="nav-compact" aria-label="Main">{main.map(([to, text, Icon]) => <NavLink key={to} to={to} className="nav-link" title={text}><Icon size={18} strokeWidth={1.75} /><span className="nav-text">{text}</span></NavLink>)}<MoreNav /></nav></div>
      <div className="side-bottom"><NavLink to="/help" className="nav-link" title={isCollapsed ? 'Help Center' : undefined}><LifeBuoy size={18} strokeWidth={1.75} /><span className="nav-text">Help Center</span></NavLink>
        <NavLink to="/settings" className="nav-link" title={isCollapsed ? 'Settings' : undefined}><Settings size={18} strokeWidth={1.75} /><span className="nav-text">Settings</span></NavLink>
        <ProfileMenu tile /></div></aside>
    <div className="shell-main"><header className="header"><Link to="/dashboard" className="header-brand" aria-label="TrackMyKita home"><Logo size={24} /></Link><ProfileMenu /></header><main className="page">{dataError ? <ErrorState title="Unable to load your data" text="Check your connection and try again." onRetry={reload} /> : dataLoading ? (showSkeleton ? <PageSkeleton /> : null) : <div className="page-enter" key={pathname}><Outlet /></div>}</main></div>
  </div>)
}
