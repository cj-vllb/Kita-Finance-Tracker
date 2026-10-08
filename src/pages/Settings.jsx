import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronRight, Download, LogOut, AlertTriangle } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { CURRENCY_CODES, currencyLabel } from '../utils/currency.js'
import { buildCsv, csvFilename, downloadCsv } from '../utils/csv.js'
import { APP_VERSION } from '../version.js'
import { PageHeader, ConfirmDialog, Avatar } from '../components/ui.jsx'
const Row = ({ label, children, action, id }) => <div className="setting-row"><div className="setting-text"><div id={id}>{label}</div><div className="muted small">{children}</div></div>{action}</div>
const CONFIRM_WORD = 'DELETE'
function DeleteAccountDialog({ onCancel, onConfirm }) {
  const [text, setText] = useState('')
  return (<ConfirmDialog title="Delete your account?" confirmLabel="Delete account permanently" disabled={text !== CONFIRM_WORD} onCancel={onCancel} onConfirm={onConfirm}>
    <p><strong>This permanently deletes your TrackMyKita account.</strong> Your profile, profile picture, transactions, budgets and categories are removed from our database and cannot be recovered.</p>
    <p className="muted">If you want a copy of your transactions, cancel and use Export in Settings first.</p>
    <label className="field" style={{ marginTop: 8 }}><span className="field-label">Type {CONFIRM_WORD} to confirm</span>
      <input className="input" value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" autoCapitalize="characters" autoCorrect="off" spellCheck={false} aria-describedby="del-hint" /></label>
    <span id="del-hint" className="muted small">The button turns on when the word matches exactly.</span></ConfirmDialog>)
}
export default function Settings() {
  const { user, settings, updateSettings, transactions, categories, logout, resetAll, notify } = useApp(), nav = useNavigate(), [confirm, setConfirm] = useState(false), [out, setOut] = useState(false)
  // Export is read-only: it turns the transactions already on screen into a file. Nothing is saved or changed.
  const exportCsv = () => {
    if (!transactions.length) return notify('There are no transactions to export yet.')
    downloadCsv(buildCsv(transactions, categories, settings.currency), csvFilename())
    notify(`Exported ${transactions.length} transaction${transactions.length === 1 ? '' : 's'}.`)
  }
  return (<>
    <PageHeader title="Settings" subtitle="Your account, preferences and data" />
    <div className="settings">
      <section className="section" style={{ marginTop: 0 }} aria-labelledby="s-account"><h2 id="s-account">Account</h2>
        <div className="setting-row setting-id"><Avatar user={user} size={48} /><div className="setting-text"><div>{user.fullName}</div><div className="muted small">{user.email}</div></div><Link className="btn" to="/profile">Edit profile</Link></div>
        <Row label="Password" action={<Link className="btn" to="/profile?password=1">Change password</Link>}>Update the password you sign in with</Row></section>
      <section className="section" aria-labelledby="s-pref"><h2 id="s-pref">Preferences</h2>
        <Row id="lbl-currency" label="Currency" action={<select className="input" aria-labelledby="lbl-currency" value={settings.currency} onChange={async (e) => notify((await updateSettings({ currency: e.target.value })) || 'Currency updated.')}>{CURRENCY_CODES.map((k) => <option key={k} value={k}>{currencyLabel(k)}</option>)}</select>}>Changes the symbol shown for amounts. Amounts are not converted.</Row>
        <Row id="lbl-theme" label="Theme" action={<select className="input" aria-labelledby="lbl-theme" value={settings.theme} onChange={(e) => updateSettings({ theme: e.target.value })}><option value="light">Light</option><option value="dark">Dark</option></select>}>Applies to every page on this device.</Row></section>
      <section className="section" aria-labelledby="s-data"><h2 id="s-data">Data</h2>
        <Row label="Export transactions" action={<button className="btn" onClick={exportCsv}><Download size={16} aria-hidden="true" />Export CSV</button>}>Download all your transactions as a spreadsheet file</Row></section>
      <section className="section" aria-labelledby="s-about"><h2 id="s-about">About</h2>
        <Link to="/settings/about" className="setting-row setting-link"><div className="setting-text"><div>About TrackMyKita</div><div className="muted small">Version {APP_VERSION}, update log and creator</div></div><ChevronRight size={18} aria-hidden="true" /></Link></section>
      <section className="danger-zone" aria-labelledby="s-danger"><h2 id="s-danger"><AlertTriangle size={18} aria-hidden="true" />Danger zone</h2>
        <p>Deleting your account permanently removes your profile, transactions, budgets and categories. This cannot be undone.</p>
        <button className="btn btn-danger-outline" onClick={() => setConfirm(true)}>Delete account…</button></section>
      <section className="logout-zone" aria-label="Session"><button className="btn btn-lg" disabled={out} onClick={async () => { setOut(true); await logout(); nav('/login') }}><LogOut size={18} aria-hidden="true" />Log out</button>
        <p className="muted small">Signed in as {user.email}</p></section>
    </div>
    {confirm && <DeleteAccountDialog onCancel={() => setConfirm(false)} onConfirm={resetAll} />}
  </>)
}
