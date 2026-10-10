import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import { formatDateLong } from '../utils/format.js'
import { Pencil, Upload, Trash2 } from 'lucide-react'
import { PageHeader, Field, PasswordInput, Avatar, ConfirmDialog, RowMenu, focusFirstInvalid } from '../components/ui.jsx'
export const validEmail = (s) => /^\S+@\S+\.\S+$/.test(s)
export default function Profile() {
  const { user, updateUser, changePassword, notify, saveAvatar, removeAvatar, checkAvatar } = useApp(), [sp] = useSearchParams(), [mode, setMode] = useState(() => (sp.get('password') ? 'password' : null))
  const [photo, setPhoto] = useState(null), [photoErr, setPhotoErr] = useState(''), [photoBusy, setPhotoBusy] = useState(false), [rmOpen, setRmOpen] = useState(false), fileRef = useRef()
  useEffect(() => () => photo && URL.revokeObjectURL(photo.previewUrl), [photo])
  const [f, setF] = useState({ fullName: user.fullName, email: user.email }), [p, setP] = useState({ current: '', next: '', confirm: '' }), [err, setErr] = useState({}), [busy, setBusy] = useState(false)
  const saveProfile = async (e) => { e.preventDefault(); const er = {}
    if (!f.fullName.trim()) er.fullName = 'Enter your name.'; if (!validEmail(f.email)) er.email = 'Enter a valid email address.'
    setErr(er); if (Object.keys(er).length) return focusFirstInvalid(); setBusy(true); const error = await updateUser({ fullName: f.fullName.trim(), email: f.email.trim() }); setBusy(false); if (error) return setErr({ form: error }); setMode(null); notify(f.email.trim() !== user.email ? 'Profile saved. Check your email to confirm the new address.' : 'Profile updated successfully.') }
  const savePassword = async (e) => { e.preventDefault(); const er = {}
    if (!p.current) er.current = 'Enter your current password.'; if (p.next.length < 8) er.next = 'Use at least 8 characters.'; if (p.confirm !== p.next) er.confirm = 'The passwords do not match.'
    setErr(er); if (Object.keys(er).length) return focusFirstInvalid(); setBusy(true); const { error, othersKept } = await changePassword(p.current, p.next); setBusy(false); if (error) return setErr(error === 'Current password is incorrect.' ? { current: error } : { form: error }); setP({ current: '', next: '', confirm: '' }); setMode(null); notify(othersKept ? "Password updated. We couldn't sign out your other devices; logging out will do it." : 'Password updated successfully.') }
  // Photo flow: pick -> validate + crop + shrink in the browser -> preview -> Save uploads it.
  const pick = async (e) => {
    const file = e.target.files?.[0]; e.target.value = ''; if (!file) return
    setPhotoErr(''); try { setPhoto(await checkAvatar(file)) } catch (er) { setPhoto(null); setPhotoErr(er.userMessage || 'That photo could not be used.') }
  }
  const savePhoto = async () => { setPhotoBusy(true); const error = await saveAvatar(photo.blob); setPhotoBusy(false); if (error) return setPhotoErr(error); setPhoto(null); notify('Profile picture updated.') }
  const open = (m) => { setErr({}); setF({ fullName: user.fullName, email: user.email }); setMode(m) }
  return (<>
    <PageHeader title="Profile" subtitle="Your identity on TrackMyKita" />
    <section className="avatar-edit" aria-label="Profile picture"><div className="avatar-wrap"><Avatar user={{ ...user, avatarUrl: photo ? photo.previewUrl : user.avatarUrl }} size={112} />
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={pick} />
      <RowMenu label="Profile picture options" icon={Pencil} buttonClassName="avatar-menu-btn" disabled={photoBusy} note="JPG, PNG or WebP. Cropped to a square and not shown to other users."
        items={[{ label: user.avatarUrl ? 'Change profile picture' : 'Add profile picture', icon: Upload, onSelect: () => fileRef.current?.click() }, ...(user.avatarUrl ? [{ label: 'Delete profile picture', icon: Trash2, danger: true, onSelect: () => setRmOpen(true) }] : [])]} /></div>
      <div className="avatar-side"><h2>{user.fullName}</h2><p className="muted">Member since {formatDateLong(user.memberSince)}</p>
        {photo && <><p className="small muted">Preview. Save to use this photo.</p><div className="form-actions"><button className="btn btn-primary" disabled={photoBusy} onClick={savePhoto}>{photoBusy ? 'Saving...' : 'Save photo'}</button><button className="btn" disabled={photoBusy} onClick={() => { setPhoto(null); setPhotoErr('') }}>Cancel</button></div></>}
        {photoErr && <p className="field-error" role="alert">{photoErr}</p>}</div></section>
    <dl className="dl"><dt>Name</dt><dd>{user.fullName}</dd><dt>Email</dt><dd>{user.email}</dd><dt>Account created</dt><dd>{formatDateLong(user.memberSince)}</dd></dl>
    {!mode && <div className="form-actions" style={{ marginTop: 32 }}><button className="btn btn-primary" onClick={() => open('edit')}>Edit profile</button><button className="btn" onClick={() => open('password')}>Change password</button></div>}
    {mode === 'edit' && <form className="form" style={{ marginTop: 32 }} onSubmit={saveProfile} noValidate><h2>Edit profile</h2>
      <Field label="Name" error={err.fullName}><input className="input" value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} aria-invalid={!!err.fullName} autoComplete="name" autoFocus /></Field>
      <Field label="Email" error={err.email}><input className="input" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} aria-invalid={!!err.email} autoComplete="email" /></Field>
      {err.form && <p className="field-error" role="alert">{err.form}</p>}
      <div className="form-actions"><button className="btn btn-primary" disabled={busy}>Save changes</button><button type="button" className="btn" onClick={() => setMode(null)}>Cancel</button></div></form>}
    {mode === 'password' && <form className="form" style={{ marginTop: 32 }} onSubmit={savePassword} noValidate><h2>Change password</h2>
      <Field label="Current password" error={err.current}><PasswordInput className="input" autoComplete="current-password" value={p.current} onChange={(e) => setP({ ...p, current: e.target.value })} aria-invalid={!!err.current} autoFocus /></Field>
      <Field label="New password" error={err.next} hint="At least 8 characters."><PasswordInput className="input" autoComplete="new-password" value={p.next} onChange={(e) => setP({ ...p, next: e.target.value })} aria-invalid={!!err.next} /></Field>
      <Field label="Confirm new password" error={err.confirm}><PasswordInput className="input" autoComplete="new-password" value={p.confirm} onChange={(e) => setP({ ...p, confirm: e.target.value })} aria-invalid={!!err.confirm} /></Field>
      {err.form && <p className="field-error" role="alert">{err.form}</p>}
      <div className="form-actions"><button className="btn btn-primary" disabled={busy}>Update password</button><button type="button" className="btn" onClick={() => setMode(null)}>Cancel</button></div></form>}
    {rmOpen && <ConfirmDialog danger={false} title="Remove profile picture?" confirmLabel="Remove photo" onCancel={() => setRmOpen(false)} onConfirm={async () => { const e = await removeAvatar(); setRmOpen(false); notify(e || 'Profile picture removed.') }}><p>Your initials will be shown instead. You can add a photo again at any time.</p></ConfirmDialog>}
  </>)
}
