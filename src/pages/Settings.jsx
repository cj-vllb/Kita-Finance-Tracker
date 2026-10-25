import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronRight, Download, LogOut, DatabaseBackup, Upload, Trash2 } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { CURRENCY_CODES, currencyLabel } from '../utils/currency.js'
import { buildCsv, csvFilename, downloadCsv } from '../utils/csv.js'
import { APP_VERSION } from '../version.js'
import { PageHeader, Avatar, InfoTip } from '../components/ui.jsx'
import { RestoreDialog, DeleteAllDialog, downloadJson } from '../components/DataDialogs.jsx'
import { backupToText } from '../utils/backup.js'
// `info` is an optional explanation behind an info icon; `children` is only for text that must stay visible (for example a "needs update" notice).
const Row = ({ label, children, action, id, info }) => <div className="setting-row"><div className="setting-text"><div className="setting-label"><span id={id}>{label}</span>{info && <InfoTip>{info}</InfoTip>}</div>{children && <div className="muted small">{children}</div>}</div>{action}</div>
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
  const needsUpdate = dataToolsReady ? null : 'Needs the latest database update.'
  return (<>
    <PageHeader title="Settings" />
    <div className="settings settings-grid">
      <div className="settings-col">
      <section className="card" aria-labelledby="s-account"><h2 id="s-account">Account</h2>
        <div className="setting-row setting-id"><Avatar user={user} size={48} /><div className="setting-text"><div>{user.fullName}</div><div className="muted small">{user.email}</div></div><Link className="btn" to="/profile" aria-label="Edit profile">Edit</Link></div>
        <Row label="Password" action={<Link className="btn" to="/profile?password=1" aria-label="Change password">Change</Link>} /></section>
      <section className="card" aria-labelledby="s-pref"><h2 id="s-pref">Preferences</h2>
        <Row id="lbl-currency" label="Currency" info="Only the symbol changes. Nothing is converted." action={<select className="input" aria-labelledby="lbl-currency" value={settings.currency} onChange={async (e) => notify((await updateSettings({ currency: e.target.value })) || 'Currency updated.')}>{CURRENCY_CODES.map((k) => <option key={k} value={k}>{currencyLabel(k)}</option>)}</select>} />
        <Row id="lbl-theme" label="Theme" action={<select className="input" aria-labelledby="lbl-theme" value={settings.theme} onChange={(e) => updateSettings({ theme: e.target.value })}><option value="light">Light</option><option value="dark">Dark</option></select>} /></section>
      <section className="card" aria-labelledby="s-data"><h2 id="s-data">Data</h2>
        <Row label="Export transactions" info="Saves your transactions as a CSV file." action={<button className="btn" onClick={exportCsv} aria-label="Export transactions as CSV"><Download size={16} aria-hidden="true" />Export</button>} />
        <Row label="Back up data" info="Saved to this device only. Keep the file private." action={<button className="btn" onClick={backUp} disabled={backing || !dataToolsReady} aria-label="Back up data"><DatabaseBackup size={16} aria-hidden="true" />{backing ? 'Preparing...' : 'Export'}</button>}>{needsUpdate}</Row>
        <Row label="Restore backup" info="Replaces your data with a backup you saved earlier." action={<button className="btn" onClick={() => setDialog('restore')} disabled={!dataToolsReady} aria-label="Restore backup"><Upload size={16} aria-hidden="true" />Restore</button>}>{needsUpdate}</Row>
        <Row label="Delete all data" info="Erases your records so you can start fresh. Your account stays." action={<button className="btn btn-danger-outline" onClick={() => setDialog('delete')} disabled={!dataToolsReady} aria-label="Delete all data"><Trash2 size={16} aria-hidden="true" />Delete</button>}>{needsUpdate}</Row></section>
      </div>
      <div className="settings-col">
      <section className="card" aria-labelledby="s-help"><h2 id="s-help">Help</h2>
        <Link to="/help" className="setting-row setting-link"><div className="setting-text"><div>Help Center</div></div><ChevronRight size={18} aria-hidden="true" /></Link></section>
      <section className="card" aria-labelledby="s-about"><h2 id="s-about">About</h2>
        <Link to="/settings/about" className="setting-row setting-link"><div className="setting-text"><div>About TrackMyKita</div><div className="muted small">Version {APP_VERSION}</div></div><ChevronRight size={18} aria-hidden="true" /></Link>
        <Link to="/privacy" className="setting-row setting-link"><div className="setting-text"><div>Privacy Policy</div></div><ChevronRight size={18} aria-hidden="true" /></Link>
        <Link to="/terms" className="setting-row setting-link"><div className="setting-text"><div>Terms of Service</div></div><ChevronRight size={18} aria-hidden="true" /></Link></section>
      <section className="logout-zone" aria-label="Session"><button className="btn btn-lg" disabled={out} onClick={async () => { setOut(true); await logout(); nav('/login') }}><LogOut size={18} aria-hidden="true" />Log out</button></section>
      </div>
    </div>
    {dialog === 'restore' && <RestoreDialog onClose={() => setDialog(null)} />}
    {dialog === 'delete' && <DeleteAllDialog onClose={() => setDialog(null)} />}
  </>)
}
