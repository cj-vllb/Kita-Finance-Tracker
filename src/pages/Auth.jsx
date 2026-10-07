import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import { Field } from '../components/ui.jsx'
const validEmail = (s) => /^\S+@\S+\.\S+$/.test(s)
const Layout = ({ title, text, children }) => (<main className="auth"><div className="brand" style={{ padding: 0 }}><span className="brand-mark">K</span><span>Kita</span></div><div><h1>{title}</h1>{text && <p className="muted" style={{ marginTop: 4 }}>{text}</p>}</div>{children}</main>)
const plain = { margin: 0, padding: 0 }
// onOk may return an error message string, which is shown under the form.
const useForm = (init, rules, onOk) => {
  const [v, setV] = useState(init), [err, setErr] = useState({}), [busy, setBusy] = useState(false)
  return { v, err, busy, bind: (k, type = 'text') => ({ type, value: v[k], onChange: (e) => setV({ ...v, [k]: e.target.value }), 'aria-invalid': !!err[k], className: 'input' }),
    submit: async (e) => { e.preventDefault(); const er = rules(v); setErr(er); if (Object.keys(er).length || busy) return; setBusy(true); const msg = await onOk(v); setBusy(false); if (msg) setErr({ form: msg }) } }
}
const FormError = ({ form }) => form.err.form ? <p className="field-error" role="alert">{form.err.form}</p> : null
const Submit = ({ form, children }) => <button className="btn btn-primary" style={{ justifyContent: 'center' }} disabled={form.busy}>{form.busy ? 'Please wait...' : children}</button>
export function Login() {
  const { signIn, loggedIn } = useApp(), nav = useNavigate()
  const form = useForm({ email: '', password: '' }, (v) => ({ ...(validEmail(v.email.trim()) ? {} : { email: 'Enter a valid email address.' }), ...(v.password ? {} : { password: 'Enter your password.' }) }),
    async (v) => { const e = await signIn(v.email.trim(), v.password); if (e) return e; nav('/dashboard') })
  if (loggedIn) return <Navigate to="/dashboard" replace />
  return (<Layout title="Sign in" text="Welcome back. Enter your details to continue."><form className="auth" style={plain} onSubmit={form.submit} noValidate>
    <Field label="Email" error={form.err.email}><input {...form.bind('email', 'email')} autoComplete="email" /></Field><Field label="Password" error={form.err.password}><input {...form.bind('password', 'password')} autoComplete="current-password" /></Field>
    <FormError form={form} /><Link to="/forgot-password">Forgot password?</Link><Submit form={form}>Sign in</Submit></form><p className="muted">New here? <Link to="/signup">Create an account</Link></p></Layout>)
}
export function Signup() {
  const { signUp } = useApp(), nav = useNavigate(), [sent, setSent] = useState(null)
  const form = useForm({ name: '', email: '', password: '', confirm: '' }, (v) => ({ ...(v.name.trim() ? {} : { name: 'Enter your name.' }), ...(validEmail(v.email.trim()) ? {} : { email: 'Enter a valid email address.' }), ...(v.password.length >= 8 ? {} : { password: 'Use at least 8 characters.' }), ...(v.confirm === v.password ? {} : { confirm: 'The passwords do not match.' }) }),
    async (v) => { const { error, needsConfirmation } = await signUp(v.name.trim(), v.email.trim(), v.password); if (error) return error; if (needsConfirmation) setSent(v.email.trim()); else nav('/dashboard') })
  if (sent) return <Layout title="Check your email" text={`We sent a confirmation link to ${sent}. Open it to finish creating your account.`}><Link className="btn btn-primary" style={{ justifyContent: 'center' }} to="/login">Back to sign in</Link></Layout>
  return (<Layout title="Create your account" text="Your records are private to your account."><form className="auth" style={plain} onSubmit={form.submit} noValidate>
    <Field label="Name" error={form.err.name}><input {...form.bind('name')} autoComplete="name" /></Field><Field label="Email" error={form.err.email}><input {...form.bind('email', 'email')} autoComplete="email" /></Field>
    <Field label="Password" error={form.err.password}><input {...form.bind('password', 'password')} autoComplete="new-password" placeholder="At least 8 characters" /></Field>
    <Field label="Confirm password" error={form.err.confirm}><input {...form.bind('confirm', 'password')} autoComplete="new-password" /></Field><FormError form={form} /><Submit form={form}>Create account</Submit></form>
    <p className="muted">Already registered? <Link to="/login">Sign in</Link></p></Layout>)
}
export function ForgotPassword() {
  const { resetPassword, notify } = useApp(), [sent, setSent] = useState(null)
  const form = useForm({ email: '' }, (v) => (validEmail(v.email.trim()) ? {} : { email: 'Enter a valid email address.' }), async (v) => { const e = await resetPassword(v.email.trim()); if (e) return e; setSent(v.email.trim()) })
  if (sent) return (<Layout title="Check your email" text={`If an account exists for ${sent}, we sent a reset link. It stays valid for one hour.`}><div className="auth" style={plain}><Link className="btn btn-primary" style={{ justifyContent: 'center' }} to="/login">Open sign in</Link>
    <p className="muted">Did not arrive? <button className="btn-link" onClick={async () => notify((await resetPassword(sent)) || 'Reset link sent again.')}>Send again</button></p></div></Layout>)
  return (<Layout title="Forgot password" text="Enter your email and we will send a link to reset your password."><form className="auth" style={plain} onSubmit={form.submit} noValidate>
    <Field label="Email" error={form.err.email}><input {...form.bind('email', 'email')} autoComplete="email" /></Field><FormError form={form} /><Submit form={form}>Send reset link</Submit></form><Link to="/login">Back to sign in</Link></Layout>)
}
export function ResetPassword() {
  const { loggedIn, updatePassword, logout, notify } = useApp(), nav = useNavigate()
  const form = useForm({ password: '', confirm: '' }, (v) => ({ ...(v.password.length >= 8 ? {} : { password: 'Use at least 8 characters.' }), ...(v.confirm === v.password ? {} : { confirm: 'The passwords do not match.' }) }),
    async (v) => { const e = await updatePassword(v.password); if (e) return e; await logout(); notify('Password updated. Sign in with your new password.'); nav('/login') })
  if (!loggedIn) return <Layout title="Link expired" text="This reset link is invalid or has expired."><Link className="btn btn-primary" style={{ justifyContent: 'center' }} to="/forgot-password">Request a new link</Link></Layout>
  return (<Layout title="Choose a new password" text="Use at least 8 characters."><form className="auth" style={plain} onSubmit={form.submit} noValidate>
    <Field label="New password" error={form.err.password}><input {...form.bind('password', 'password')} autoComplete="new-password" /></Field><Field label="Confirm new password" error={form.err.confirm}><input {...form.bind('confirm', 'password')} autoComplete="new-password" /></Field>
    <FormError form={form} /><Submit form={form}>Update password</Submit></form></Layout>)
}
