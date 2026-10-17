import { useState } from 'react'
import { ConfirmDialog } from './ui.jsx'
// Delete ACCOUNT: removes the sign-in account and everything in it. (Unchanged from Settings; it now lives on the Profile page.)
// This is a different action from "Delete all data" in Settings > Data, which keeps the account. The two use different typed words.
export const CONFIRM_WORD = 'DELETE'
export default function DeleteAccountDialog({ onCancel, onConfirm }) {
  const [text, setText] = useState('')
  return (<ConfirmDialog title="Delete your account?" confirmLabel="Delete account permanently" disabled={text !== CONFIRM_WORD} onCancel={onCancel} onConfirm={onConfirm}>
    <p><strong>This permanently deletes your TrackMyKita account.</strong> Your profile, profile picture, transactions, budgets, categories, savings goals and transfers are permanently removed from our database and cannot be recovered. Copies in backups kept by our database provider may remain for a limited time.</p>
    <p className="muted">If you want a copy of your data, cancel and use Back Up Data or Export CSV in Settings first.</p>
    <label className="field" style={{ marginTop: 8 }}><span className="field-label">Type {CONFIRM_WORD} to confirm</span>
      <input className="input" value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" autoCapitalize="characters" autoCorrect="off" spellCheck={false} aria-describedby="del-hint" /></label>
    <span id="del-hint" className="muted small">The button turns on when the word matches exactly.</span></ConfirmDialog>)
}
