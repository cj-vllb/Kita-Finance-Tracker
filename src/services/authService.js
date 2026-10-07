import { supabase, unwrap } from '../lib/supabaseClient.js'
const origin = window.location.origin
export const signUp = (fullName, email, password) => supabase.auth.signUp({ email, password, options: { data: { full_name: fullName }, emailRedirectTo: `${origin}/login` } }).then(unwrap)
export const signIn = (email, password) => supabase.auth.signInWithPassword({ email, password }).then(unwrap)
export const signOut = () => supabase.auth.signOut().then(({ error }) => { if (error) throw error })
export const getSession = () => supabase.auth.getSession().then(unwrap).then((d) => d.session)
export const getCurrentUser = () => supabase.auth.getUser().then(unwrap).then((d) => d.user)
export const sendPasswordReset = (email) => supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/reset-password` }).then(unwrap)
export const updatePassword = (password) => supabase.auth.updateUser({ password }).then(unwrap)
export const updateEmail = (email) => supabase.auth.updateUser({ email }, { emailRedirectTo: `${origin}/profile` }).then(unwrap)
export const onAuthChange = (cb) => supabase.auth.onAuthStateChange(cb).data.subscription
export const deleteMyAccount = () => supabase.rpc('delete_my_account').then(unwrap)
