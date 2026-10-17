import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronRight, Download, LogOut, DatabaseBackup, Upload, Trash2 } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { CURRENCY_CODES, currencyLabel } from '../utils/currency.js'
import { buildCsv, csvFilename, downloadCsv } from '../utils/csv.js'
import { APP_VERSION } from '../version.js'
import { PageHeader, Avatar } from '../components/ui.jsx'
import { RestoreDialog, DeleteAllDialog, downloadJson } from '../components/DataDialogs.jsx'
import { backupToText } from '../utils/backup.js'
const Row = ({ label, children, action, id }) => <div className="setting-row"><div className="setting-text"><div id={id}>{label}</div><div className="muted small">{children}</div></div>{action}</div>
export default function Settings() {
  const { user, settings, updateSettings, transactions, categories, logout, notify, backupData, dataToolsReady } = useApp(), nav = useNavigate(), [out, setOut] = useState(false), [dialog, setDialog] = useState(null), [backing, setBacking] = useState(false)
  // Export is read-only: it turns the transactions already on screen into a file. Nothing is saved or changed.
  const exportCsv = () => {
    if (!transactions.length) return notify('There are no transactions to export yet.')
    downloadCsv(buildCsv(transactions, categories, settings.currency), csvFilename())
    notify(`Exported ${transactions.length} transaction${transactions.length === 1 ? '' : 's'}.`)
  }
  // Backup: the database returns one consistent snapshot of THIS user's records; the file is created here and saved to the device. Nothing is uploaded anywhere.
  const backUp = async () => {
    if (backing) return; setBacking(true); const { error, file, filename } = await backupData(); setBacking(false)
    if (error) return notify(error)
    downloadJson(backupToText(file), filename); notify(`Backup saved as ${filename}.`)
  }
  const needsUpdate = dataToolsReady ? null : ' Not available until the latest database update is applied.'
  return (<>
    <PageHeader title="Settings" />
    <div className="settings settings-grid">
      <div className="settings-col">
      <section className="card" aria-labelledby="s-account"><h2 id="s-account">Account</h2>
        <div className="setting-row setting-id"><Avatar user={user} size={48} /><div className="setting-text"><div>{user.fullName}</div><div className="muted small">{user.email}</div></div><Link className="btn" to="/profile">Edit profile</Link></div>
        <Row label="Password" action={<Link className="btn" to="/profile?password=1">Change password</Link>}>Update the password you sign in with</Row></section>
      <section className="card" aria-labelledby="s-pref"><h2 id="s-pref">Preferences</h2>
        <Row id="lbl-currency" label="Currency" action={<select className="input" aria-labelledby="lbl-currency" value={settings.currency} onChange={async (e) => notify((await updateSettings({ currency: e.target.value })) || 'Currency updated.')}>{CURRENCY_CODES.map((k) => <option key={k} value={k}>{currencyLabel(k)}</option>)}</select>}>Changes the symbol shown for amounts. Amounts are not converted.</Row>
        <Row id="lbl-theme" label="Theme" action={<select className="input" aria-labelledby="lbl-theme" value={settings.theme} onChange={(e) => updateSettings({ theme: e.target.value })}><option value="light">Light</option><option value="dark">Dark</option></select>}>Applies to every page on this device.</Row></section>
      <section className="card" aria-labelledby="s-data"><h2 id="s-data">Data</h2>
        <Row label="Export transactions" action={<button className="btn" onClick={exportCsv}><Download size={16} aria-hidden="true" />Export CSV</button>}>Download all your transactions as a spreadsheet file</Row>
        <Row label="Back up data" action={<button className="btn" onClick={backUp} disabled={backing || !dataToolsReady}><DatabaseBackup size={16} aria-hidden="true" />{backing ? 'Preparing...' : 'Back Up Data'}</button>}>Save a complete copy of your TrackMyKita data as a JSON file on this device. It contains your financial records, so store it somewhere secure. It is not uploaded anywhere.{needsUpdate}</Row>
        <Row label="Restore backup" action={<button className="btn" onClick={() => setDialog('restore')} disabled={!dataToolsReady}><Upload size={16} aria-hidden="true" />Restore Backup</button>}>Replace your current data with a backup file you saved earlier.{needsUpdate}</Row>
        <Row label="Delete all data" action={<button className="btn btn-danger-outline" onClick={() => setDialog('delete')} disabled={!dataToolsReady}><Trash2 size={16} aria-hidden="true" />Delete All Data</button>}>Remove all your transactions, budgets, savings and categories, and start fresh. Your account is kept.{needsUpdate}</Row></section>
      </div>
      <div className="settings-col">
      <section className="card" aria-labelledby="s-help"><h2 id="s-help">Help</h2>
        <Link to="/help" className="setting-row setting-link"><div className="setting-text"><div>Help Center</div><div className="muted small">Answers about using TrackMyKita</div></div><ChevronRight size={18} aria-hidden="true" /></Link></section>
      <section className="card" aria-labelledby="s-about"><h2 id="s-about">About</h2>
        <Link to="/settings/about" className="setting-row setting-link"><div className="setting-text"><div>About TrackMyKita</div><div className="muted small">Version {APP_VERSION}, update log and creator</div></div><ChevronRight size={18} aria-hidden="true" /></Link>
        <Link to="/privacy" className="setting-row setting-link"><div className="setting-text"><div>Privacy Policy</div><div className="muted small">What information TrackMyKita collects and why</div></div><ChevronRight size={18} aria-hidden="true" /></Link>
        <Link to="/terms" className="setting-row setting-link"><div className="setting-text"><div>Terms of Service</div><div className="muted small">The rules for using TrackMyKita</div></div><ChevronRight size={18} aria-hidden="true" /></Link></section>
      <section className="logout-zone" aria-label="Session"><button className="btn btn-lg" disabled={out} onClick={async () => { setOut(true); await logout(); nav('/login') }}><LogOut size={18} aria-hidden="true" />Log out</button>
        <p className="muted small">Signed in as {user.email}</p></section>
      </div>
    </div>
    {dialog === 'restore' && <RestoreDialog onClose={() => setDialog(null)} />}
    {dialog === 'delete' && <DeleteAllDialog onClose={() => setDialog(null)} />}
  </>)
}
