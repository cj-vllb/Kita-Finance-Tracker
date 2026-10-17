import { useRef, useState } from 'react'
import { ShieldAlert, CheckCircle2, FileJson } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { ConfirmDialog, Modal } from './ui.jsx'
import { parseBackupText, SECTIONS, SECTION_LABELS, MAX_BACKUP_BYTES } from '../utils/backup.js'
import { formatDateTime } from '../utils/format.js'
export const RESTORE_WORD = 'RESTORE'
export const DELETE_ALL_WORD = 'DELETE ALL DATA'
export function downloadJson(text, filename) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json;charset=utf-8' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: filename, hidden: true })
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
const Typed = ({ word, value, onChange, id }) => (<label className="field" style={{ marginTop: 8 }}><span className="field-label">Type {word} to confirm</span>
  <input className="input" value={value} onChange={(e) => onChange(e.target.value)} autoComplete="off" autoCapitalize="characters" autoCorrect="off" spellCheck={false} aria-describedby={id} /><span id={id} className="muted small">The button turns on when this matches exactly.</span></label>)

// Restore: choose file -> validated here (nothing changes yet) -> preview with counts -> typed confirmation -> one all-or-nothing database call.
export function RestoreDialog({ onClose }) {
  const { restoreBackup, transactions, budgets, goals } = useApp(), fileInput = useRef()
  const [res, setRes] = useState(null), [name, setName] = useState(''), [typed, setTyped] = useState(''), [busy, setBusy] = useState(false), [err, setErr] = useState(''), [done, setDone] = useState(null)
  const pick = async (e) => {
    const file = e.target.files?.[0]; setRes(null); setErr(''); setTyped(''); if (!file) { setName(''); return }
    setName(file.name)
    if (file.size > MAX_BACKUP_BYTES) return setRes({ ok: false, error: 'This file is too large to be a TrackMyKita backup.' })
    let text; try { text = await file.text() } catch { return setRes({ ok: false, error: 'The file could not be read.' }) }
    setRes(parseBackupText(text))
  }
  const go = async () => {
    if (busy || !res?.ok) return
    setBusy(true); setErr(''); const { error, counts } = await restoreBackup(res.payload); setBusy(false)
    if (error) setErr(error); else setDone(counts || res.counts)
  }
  const ready = res?.ok && typed === RESTORE_WORD && !busy
  return (<Modal title="Restore backup" onClose={busy ? () => {} : onClose} initialFocus={fileInput} labelledBy="restore-title"
    footer={(dismiss) => done ? <button type="button" className="btn btn-primary" onClick={dismiss}>Close</button> : (<><button type="button" className="btn" disabled={busy} onClick={dismiss}>Cancel</button><button type="button" className="btn btn-danger" disabled={!ready} onClick={go}>{busy ? 'Restoring...' : 'Replace my data'}</button></>)}>
    {done ? (<div className="restore-done" role="status"><CheckCircle2 size={22} aria-hidden="true" /><div><p><strong>Backup restored.</strong></p><p className="muted small">{SECTIONS.map((s) => `${done[s] ?? 0} ${SECTION_LABELS[s].toLowerCase()}`).join(', ')}.</p></div></div>) : (<>
      <p className="muted">Choose a TrackMyKita backup file (.json) that you saved earlier. The file is checked on this device first; nothing changes until you confirm.</p>
      <label className="field"><span className="field-label">Backup file</span><input ref={fileInput} className="input file-input" type="file" accept=".json,application/json" onChange={pick} disabled={busy} /></label>
      {res && !res.ok && <p className="field-error" role="alert"><ShieldAlert size={14} aria-hidden="true" /> {res.error} Nothing was changed.</p>}
      {res?.ok && (<>
        <div className="restore-preview"><p className="small"><FileJson size={14} aria-hidden="true" /> <strong>{name}</strong>{res.meta.exportedAt ? ` · saved ${formatDateTime(res.meta.exportedAt)}` : ''}{res.meta.appVersion ? ` · TrackMyKita ${res.meta.appVersion}` : ''}</p>
          <table className="table restore-table"><caption className="sr-only">What the backup contains compared with what you have now</caption><thead><tr><th className="label">Records</th><th className="label amount">In backup</th></tr></thead>
            <tbody>{SECTIONS.map((s) => <tr key={s}><td>{SECTION_LABELS[s]}</td><td className="amount">{res.counts[s]}</td></tr>)}</tbody></table></div>
        <div className="restore-warn" role="alert"><ShieldAlert size={18} aria-hidden="true" /><div><p><strong>This replaces your current data.</strong></p>
          <p className="small">Your {transactions.length} transaction{transactions.length === 1 ? '' : 's'}, {budgets.length} budget{budgets.length === 1 ? '' : 's'}, {goals.filter((g) => !g.archived).length} savings goal{goals.filter((g) => !g.archived).length === 1 ? '' : 's'}, categories and savings history will be removed and replaced with the contents of this backup. Anything you added after the backup was made will be lost. Your account, password and profile picture are not affected. This cannot be undone, so back up your current data first if you might need it.</p></div></div>
        <Typed word={RESTORE_WORD} value={typed} onChange={setTyped} id="restore-hint" /></>)}
      {err && <p className="field-error" role="alert">{err}</p>}</>)}
  </Modal>)
}

// Delete all data (keeps the account). A different typed phrase from Delete account, so one can never confirm the other by accident.
export function DeleteAllDialog({ onClose }) {
  const { deleteAllData, notify } = useApp(), [typed, setTyped] = useState(''), [err, setErr] = useState('')
  return (<ConfirmDialog title="Delete all your data?" confirmLabel="Delete all data" disabled={typed !== DELETE_ALL_WORD} onCancel={onClose}
    onConfirm={async () => { setErr(''); const e = await deleteAllData(); if (e) { setErr(e); return } notify('All your data was deleted. Your account is still here.'); onClose() }}>
    <p><strong>This permanently deletes all your TrackMyKita data and keeps your account.</strong></p>
    <p className="muted">Removed: all transactions, budgets, savings goals and transfers, your own categories, and any changes you made to the built-in categories (they return to their defaults). Your currency setting returns to its default. You stay signed in and can start again.</p>
    <p className="muted">Not removed: your account, password and profile picture. To delete the account itself, use Delete account on the Profile page.</p>
    <p className="muted small">Want a copy first? Cancel and use Back Up Data.</p>
    <Typed word={DELETE_ALL_WORD} value={typed} onChange={setTyped} id="dad-hint" />{err && <p className="field-error" role="alert">{err}</p>}</ConfirmDialog>)
}
