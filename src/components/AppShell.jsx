import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { NavLink, Link, Outlet, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, ArrowLeftRight, Coins, PiggyBank, BarChart3, Tags, Settings, User, MoreHorizontal, ChevronDown, ChevronsUpDown, LogOut, PanelLeftClose, PanelLeftOpen, LifeBuoy, X } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { ErrorState, Avatar, Presence, useDelayedFlag, useDialog } from './ui.jsx'
import PageSkeleton from './skeletons.jsx'
import { Logo, LogoMark } from './Logo.jsx'
import NotificationBell from './Notifications.jsx'
import { QuickButton, QuickMenu, SHEETS } from './QuickAdd.jsx'
import { QUICK_EVENT } from '../utils/quickOpen.js'
import SidebarSearch, { useMedia } from './SidebarSearch.jsx'
import { greeting, firstName } from '../utils/format.js'
// Desktop shows every section in groups; Settings lives in the profile menu (all breakpoints), and Help Center is reached from Settings. Tablet uses the compact rail and phones the bottom bar: Dashboard, Transactions, the round "+" (quick add), Reports and "More".
// "More" is a flyout beside the rail on tablets and the right-side menu (MobileDrawer) on phones. The profile picture in the top header goes straight to the Profile page.
const groups = [
  [['/dashboard', 'Dashboard', LayoutDashboard]],
  [['/transactions', 'Transactions', ArrowLeftRight], ['/reports', 'Reports', BarChart3]],
  [['/budgets', 'Budgets', PiggyBank], ['/savings', 'Savings', Coins], ['/categories', 'Categories', Tags]],
]
const main = [['/dashboard', 'Dashboard', LayoutDashboard], ['/transactions', 'Transactions', ArrowLeftRight], ['/reports', 'Reports', BarChart3]]
const more = [['/budgets', 'Budgets', PiggyBank], ['/savings', 'Savings', Coins], ['/categories', 'Categories', Tags]]
// Tablet "More": a flyout beside the icon rail (see app.css). Phones use the drawer below instead. Because the tablet header's profile picture now goes straight to the
// Profile page (it used to open a small menu), Settings, Help Center and Log out live here so they stay one tap away.
const moreAccount = [['/settings', 'Settings', Settings], ['/help', 'Help Center', LifeBuoy]]
function MoreNav() {
  const [open, setOpen] = useState(false), box = useRef(), { pathname } = useLocation(), { logout } = useApp(), nav = useNavigate()
  const active = [...more, ...moreAccount].some(([to]) => pathname === to || pathname.startsWith(to + '/'))
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
    <Presence show={open}>{(state) => <><div className="more-scrim" data-state={state} aria-hidden="true" onClick={() => setOpen(false)} /><div className="more-menu" id="more-menu" data-state={state}><span className="more-grip" aria-hidden="true" />{more.map(([to, text, Icon]) => <NavLink key={to} to={to} className="more-link"><Icon size={18} strokeWidth={1.75} />{text}</NavLink>)}
      <span className="more-sep" role="separator" />{moreAccount.map(([to, text, Icon]) => <NavLink key={to} to={to} className="more-link"><Icon size={18} strokeWidth={1.75} />{text}</NavLink>)}
      <button type="button" className="more-link more-logout" onClick={async () => { setOpen(false); await logout(); nav('/login') }}><LogOut size={18} strokeWidth={1.75} />Log out</button></div></>}</Presence></div>)
}
// Phone menu (700px and below): a drawer from the right, opened by the profile tab where "More" used to be. It reuses the existing routes and the same logout
// call as the profile menu. Mounted only while open (Presence keeps it for the short exit), so there is never more than one overlay.
const drawerNav = [['/budgets', 'Budgets', PiggyBank], ['/savings', 'Savings', Coins], ['/categories', 'Categories', Tags]]
const drawerAccount = [['/profile', 'Profile', User], ['/settings', 'Settings', Settings], ['/help', 'Help Center', LifeBuoy]]
const drawerPaths = [...drawerNav, ...drawerAccount].map(([to]) => to)
function DrawerPanel({ state, onClose }) {
  const { user, logout } = useApp(), nav = useNavigate(), ref = useRef(), closeBtn = useRef()
  useDialog(ref, onClose, closeBtn) // focus moves in, Tab stays inside, Escape closes, page behind does not scroll, focus returns to the profile tab
  const link = ([to, text, Icon]) => <NavLink key={to} to={to} className="drawer-link" onClick={onClose}><Icon size={20} strokeWidth={1.75} aria-hidden="true" />{text}</NavLink>
  return createPortal(<div className="drawer-scrim" data-state={state} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <aside className="drawer" id="mobile-drawer" data-state={state} role="dialog" aria-modal="true" aria-label="Menu" ref={ref}>
      <div className="drawer-head"><Avatar user={user} size={40} /><span className="drawer-who"><span className="drawer-name">{user.fullName}</span><span className="drawer-email">{user.email}</span></span>
        <button type="button" ref={closeBtn} className="icon-btn" aria-label="Close menu" onClick={onClose}><X size={20} aria-hidden="true" /></button></div>
      <nav className="drawer-body" aria-label="Menu">
        <div className="drawer-group">{drawerNav.map(link)}</div>
        <div className="drawer-group">{drawerAccount.map(link)}</div>
        <div className="drawer-group"><button type="button" className="drawer-link drawer-logout" onClick={async () => { onClose(); await logout(); nav('/login') }}><LogOut size={20} strokeWidth={1.75} aria-hidden="true" />Log out</button></div></nav></aside></div>, document.body)
}
function MoreTab() {
  const [open, setOpen] = useState(false), { pathname } = useLocation()
  const active = drawerPaths.some((to) => pathname === to || pathname.startsWith(to + '/'))
  useEffect(() => setOpen(false), [pathname])
  return (<>
    <button type="button" className={'nav-link more-tab' + (active ? ' active' : '')} aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? 'mobile-drawer' : undefined} aria-label="More menu" onClick={() => setOpen(true)}>
      <MoreHorizontal size={20} strokeWidth={1.75} aria-hidden="true" /><span className="nav-text">More</span></button>
    <Presence show={open}>{(state) => <DrawerPanel state={state} onClose={() => setOpen(false)} />}</Presence></>)
}
// Phone and tablet header actions, right side: Notifications, then Profile (rightmost; it opens the Profile page, never a menu).
// The page title lives in the header on phones and tablets (the big page heading is hidden there, see v137.css), so pages get the height back.
const TITLES = { '/transactions': 'Transactions', '/savings': 'Savings', '/budgets': 'Budgets', '/reports': 'Reports', '/categories': 'Categories', '/settings': 'Settings', '/settings/about': 'About', '/profile': 'Profile', '/help': 'Help Center' }
const headerTitle = (pathname, user) => { const p = pathname.replace(/\/+$/, '') || '/'; return p === '/dashboard' ? (user?.fullName ? `${greeting()}, ${firstName(user)}` : greeting()) : TITLES[p] || null }
function HeaderActions() {
  const { user } = useApp()
  return (<div className="hd-actions"><NotificationBell /><NavLink to="/profile" className="hd-btn hd-profile" aria-label="Profile" title="Profile"><Avatar user={user} size={34} /></NavLink></div>)
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
      <Link to="/settings" role="menuitem"><Settings size={16} strokeWidth={1.75} aria-hidden="true" />Settings</Link>
      <button role="menuitem" className="menu-logout" onClick={async () => { await logout(); nav('/login') }}><LogOut size={16} strokeWidth={1.75} aria-hidden="true" />Log out</button></div>}</Presence></div>)
}
const SIDEBAR_KEY = 'kita:sidebar' // UI preference only (like the theme); never sent anywhere
const readCollapsed = () => { try { return localStorage.getItem(SIDEBAR_KEY) === 'collapsed' } catch { return false } }
export default function AppShell() {
  const { loggedIn, dataLoading, dataError, reload, savingsReady, user } = useApp(), { pathname } = useLocation(), showSkeleton = useDelayedFlag(dataLoading && !dataError) // a load under ~150ms never flashes a skeleton
  const [collapsed, setCollapsed] = useState(readCollapsed), wide = useMedia('(min-width: 1101px)'), phone = useMedia('(max-width: 700px)'), compact = useMedia('(max-width: 1100px)') // compact = phone + tablet: the only sizes with the "+" button and the new header
  const [menu, setMenu] = useState(false), [sheet, setSheet] = useState(null), plus = useRef() // quick add: the "+" menu and, at most one, its sheet
  const toggle = () => setCollapsed((c) => { const n = !c; try { localStorage.setItem(SIDEBAR_KEY, n ? 'collapsed' : 'expanded') } catch { /* storage unavailable: the choice just is not remembered */ } return n })
  useEffect(() => { setMenu(false) }, [pathname])
  useEffect(() => { const on = (e) => { if (compact && SHEETS[e.detail]) { setMenu(false); setSheet(e.detail) } }; window.addEventListener(QUICK_EVENT, on); return () => window.removeEventListener(QUICK_EVENT, on) }, [compact])
  useEffect(() => { if (!compact) { setMenu(false); setSheet(null) } }, [compact]) // growing to desktop width closes anything the phone/tablet UI had open
  const closeMenu = useCallback((refocus) => { setMenu(false); if (refocus === true) plus.current?.focus({ preventScroll: true }) }, [])
  const pickAction = (id) => { setMenu(false); setSheet(id) } // one overlay at a time: the menu closes, then only the chosen sheet opens
  if (!loggedIn) return <Navigate to="/login" replace />
  const Sheet = compact && sheet ? SHEETS[sheet] : null, title = compact ? headerTitle(pathname, user) : null
  const isCollapsed = wide && collapsed // the collapsed state only exists on wide screens; tablets already use the icon rail
  return (<div className={'shell' + (isCollapsed ? ' is-collapsed' : '')} data-hdr-title={title ? '' : undefined}>
    <aside className="sidebar" aria-label="Sidebar">
      <div className="side-top"><Link to="/dashboard" className="brand" aria-label="TrackMyKita home">{isCollapsed ? <LogoMark size={28} /> : <Logo size={28} />}</Link>
        <button type="button" className="side-toggle" onClick={toggle} aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!isCollapsed}>{isCollapsed ? <PanelLeftOpen size={15} strokeWidth={1.75} aria-hidden="true" /> : <PanelLeftClose size={15} strokeWidth={1.75} aria-hidden="true" />}</button></div>
      {!phone && <SidebarSearch rail={!wide || collapsed} />}
      <div className="side-nav">
        <nav className="nav-desktop" aria-label="Main">{groups.map((g, i) => <div className="nav-section" key={i}>{g.map(([to, text, Icon]) => <NavLink key={to} to={to} className="nav-link" title={isCollapsed ? text : undefined}><Icon size={18} strokeWidth={1.75} /><span className="nav-text">{text}</span></NavLink>)}</div>)}</nav>
        <nav className="nav-compact" aria-label="Main">{main.map(([to, text, Icon], i) => <Fragment key={to}>{compact && i === 2 && <QuickButton ref={plus} open={menu} onToggle={() => setMenu((o) => !o)} />}<NavLink to={to} className="nav-link" title={text}><Icon size={18} strokeWidth={1.75} /><span className="nav-text">{text}</span></NavLink></Fragment>)}{phone ? <MoreTab /> : <MoreNav />}</nav></div>
      <div className="side-bottom">{wide && <ProfileMenu tile />}</div></aside>
    <div className="shell-main"><header className="header"><Link to="/dashboard" className="header-brand" aria-label="TrackMyKita home">{compact ? <LogoMark size={26} /> : <Logo size={24} />}</Link>{title && <div className="hd-title" role="presentation">{title}</div>}{compact ? <HeaderActions /> : !phone && <ProfileMenu />}</header><main className="page">{dataError ? <ErrorState title="Unable to load your data" text="Check your connection and try again." onRetry={reload} /> : dataLoading ? (showSkeleton ? <PageSkeleton /> : null) : <div className="page-enter" key={pathname}><Outlet /></div>}</main></div>
  {compact && <QuickMenu show={menu} anchor={plus} side={phone ? 'top' : 'side'} onPick={pickAction} onClose={closeMenu} savingsReady={savingsReady} />}
  {Sheet && <Sheet onClose={() => setSheet(null)} />}
  </div>)
}
