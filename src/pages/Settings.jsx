import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp, CURRENCIES } from '../context/AppContext.jsx'
import { PageHeader, ConfirmDialog } from '../components/ui.jsx'
const Row = ({ label, children, action }) => <div className="setting-row"><div><div>{label}</div><div className="muted small">{children}</div></div>{action}</div>
export default function Settings() {
  const { user, settings, updateSettings, transactions, categories, logout, resetAll, notify } = useApp(), nav = useNavigate(), [confirm, setConfirm] = useState(false)
  const exportCsv = () => {
    const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`, name = (id) => categories.find((c) => c.id === id)?.name ?? ''
    const csv = ['Date,Description,Category,Type,Amount,Notes', ...transactions.map((t) => [t.date, t.description, name(t.categoryId), t.type, t.amount, t.notes].map(q).join(','))].join('\n')
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: 'kita-transactions.csv' }); a.click(); URL.revokeObjectURL(a.href); notify('Transactions exported.')
  }
  return (<>
    <PageHeader title="Settings" subtitle="Preferences and account" />
    <section className="section" style={{ marginTop: 0 }}><h2>Profile</h2><Row label="Name" action={<Link to="/profile">Edit</Link>}>{user.fullName}</Row><Row label="Email" action={<Link to="/profile">Edit</Link>}>{user.email}</Row></section>
    <section className="section"><h2>Currency</h2><Row label="Display currency" action={<select className="input" aria-label="Display currency" value={settings.currency} onChange={async (e) => notify((await updateSettings({ currency: e.target.value })) || 'Currency updated.')}>{Object.entries(CURRENCIES).map(([k, [n, s]]) => <option key={k} value={k}>{n} ({s})</option>)}</select>}>Changes the symbol shown for amounts. Values are not converted.</Row></section>
    <section className="section"><h2>Appearance</h2><Row label="Theme" action={<select className="input" aria-label="Theme" value={settings.theme} onChange={(e) => updateSettings({ theme: e.target.value })}><option value="light">Light</option><option value="dark">Dark</option></select>}>Applies to every page.</Row></section>
    <section className="section"><h2>Data</h2><Row label="Export" action={<button className="btn" onClick={exportCsv}>Export</button>}>Download your transactions as CSV</Row></section>
    <section className="section"><h2>Account</h2><Row label="Password" action={<Link to="/profile">Change</Link>}>Update it from your profile</Row>
      <Row label="Session" action={<button className="btn" onClick={async () => { await logout(); nav('/login') }}>Log out</button>}>Signed in on this device</Row>
      <Row label="Delete account" action={<button className="btn btn-danger" onClick={() => setConfirm(true)}>Delete</button>}>Permanently removes your account and all of its data</Row></section>
    {confirm && <ConfirmDialog title="Delete account?" confirmLabel="Delete account" onCancel={() => setConfirm(false)} onConfirm={resetAll}><p>Your account and all of its transactions, budgets and categories will be removed. This action cannot be undone.</p></ConfirmDialog>}
  </>)
}
