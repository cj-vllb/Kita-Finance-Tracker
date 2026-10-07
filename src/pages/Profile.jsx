import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import { formatDateLong, initials } from '../utils/format.js'
import { PageHeader, Field } from '../components/ui.jsx'
export const validEmail = (s) => /^\S+@\S+\.\S+$/.test(s)
export default function Profile() {
  const { user, updateUser, changePassword, logout, notify } = useApp(), nav = useNavigate(), [mode, setMode] = useState(null)
  const [f, setF] = useState({ fullName: user.fullName, email: user.email }), [p, setP] = useState({ current: '', next: '', confirm: '' }), [err, setErr] = useState({}), [busy, setBusy] = useState(false)
  const saveProfile = async (e) => { e.preventDefault(); const er = {}
    if (!f.fullName.trim()) er.fullName = 'Enter your name.'; if (!validEmail(f.email)) er.email = 'Enter a valid email address.'
    setErr(er); if (Object.keys(er).length) return; setBusy(true); const error = await updateUser({ fullName: f.fullName.trim(), email: f.email.trim() }); setBusy(false); if (error) return setErr({ form: error }); setMode(null); notify(f.email.trim() !== user.email ? 'Profile saved. Check your email to confirm the new address.' : 'Profile updated successfully.') }
  const savePassword = async (e) => { e.preventDefault(); const er = {}
    if (!p.current) er.current = 'Enter your current password.'; if (p.next.length < 8) er.next = 'Use at least 8 characters.'; if (p.confirm !== p.next) er.confirm = 'The passwords do not match.'
    setErr(er); if (Object.keys(er).length) return; setBusy(true); const error = await changePassword(p.current, p.next); setBusy(false); if (error) return setErr(error === 'Current password is incorrect.' ? { current: error } : { form: error }); setP({ current: '', next: '', confirm: '' }); setMode(null); notify('Password updated successfully.') }
  const open = (m) => { setErr({}); setF({ fullName: user.fullName, email: user.email }); setMode(m) }
  return (<>
    <PageHeader title="Profile" subtitle="Your identity on Kita" />
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}><span className="avatar" style={{ width: 56, height: 56, fontSize: 18 }}>{initials(user)}</span><div><h2>{user.fullName}</h2><p className="muted">Member since {formatDateLong(user.memberSince)}</p></div></div>
    <dl className="dl"><dt>Name</dt><dd>{user.fullName}</dd><dt>Email</dt><dd>{user.email}</dd><dt>Account created</dt><dd>{formatDateLong(user.memberSince)}</dd></dl>
    {!mode && <div className="form-actions" style={{ marginTop: 32 }}><button className="btn btn-primary" onClick={() => open('edit')}>Edit profile</button><button className="btn" onClick={() => open('password')}>Change password</button><button className="btn" onClick={async () => { await logout(); nav('/login') }}>Log out</button></div>}
    {mode === 'edit' && <form className="form" style={{ marginTop: 32 }} onSubmit={saveProfile} noValidate><h2>Edit profile</h2>
      <Field label="Name" error={err.fullName}><input className="input" value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} autoFocus /></Field>
      <Field label="Email" error={err.email}><input className="input" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
      {err.form && <p className="field-error" role="alert">{err.form}</p>}
      <div className="form-actions"><button className="btn btn-primary" disabled={busy}>Save changes</button><button type="button" className="btn" onClick={() => setMode(null)}>Cancel</button></div></form>}
    {mode === 'password' && <form className="form" style={{ marginTop: 32 }} onSubmit={savePassword} noValidate><h2>Change password</h2>
      <Field label="Current password" error={err.current}><input className="input" type="password" autoComplete="current-password" value={p.current} onChange={(e) => setP({ ...p, current: e.target.value })} autoFocus /></Field>
      <Field label="New password" error={err.next} hint="At least 8 characters."><input className="input" type="password" autoComplete="new-password" value={p.next} onChange={(e) => setP({ ...p, next: e.target.value })} /></Field>
      <Field label="Confirm new password" error={err.confirm}><input className="input" type="password" autoComplete="new-password" value={p.confirm} onChange={(e) => setP({ ...p, confirm: e.target.value })} /></Field>
      {err.form && <p className="field-error" role="alert">{err.form}</p>}
      <div className="form-actions"><button className="btn btn-primary" disabled={busy}>Update password</button><button type="button" className="btn" onClick={() => setMode(null)}>Cancel</button></div></form>}
  </>)
}
