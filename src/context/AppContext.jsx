import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import * as auth from '../services/authService.js'
import * as profiles from '../services/profileService.js'
import * as txService from '../services/transactionService.js'
import * as budgetService from '../services/budgetService.js'
import * as categoryService from '../services/categoryService.js'
import { friendlyError } from '../lib/errors.js'
import { setCurrencySymbol } from '../utils/format.js'
const Ctx = createContext(null)
export const useApp = () => useContext(Ctx)
export const CURRENCIES = { PHP: ['Philippine peso', '₱'], USD: ['US dollar', '$'], EUR: ['Euro', '€'] }
const upsert = (list, item, isNew) => (isNew ? [item, ...list] : list.map((x) => (x.id === item.id ? item : x)))
// Runs an action and returns null on success or a friendly message on failure.
const attempt = async (fn, fallback) => { try { await fn(); return null } catch (e) { return friendlyError(e, fallback) } }
export function AppProvider({ children }) {
  const [session, setSession] = useState(null), [authLoading, setAuthLoading] = useState(true)
  const [profile, setProfile] = useState(null), [transactions, setTransactions] = useState([]), [budgets, setBudgets] = useState([]), [categories, setCategories] = useState([])
  const [dataLoading, setDataLoading] = useState(true), [dataError, setDataError] = useState(false), [loadedUid, setLoadedUid] = useState(null)
  const [theme, setTheme] = useState(() => localStorage.getItem('kita:theme') || 'light') // UI preference only
  const [toast, setToast] = useState(null), timer = useRef()
  const uid = session?.user?.id
  useEffect(() => {
    let live = true
    auth.getSession().then((s) => live && setSession(s)).catch(console.error).finally(() => live && setAuthLoading(false))
    const sub = auth.onAuthChange((_event, s) => setSession(s))
    return () => { live = false; sub.unsubscribe() }
  }, [])
  const reload = useCallback(async () => {
    if (!uid) { setProfile(null); setTransactions([]); setBudgets([]); setCategories([]); setDataLoading(false); setLoadedUid(null); return }
    setDataLoading(true); setDataError(false)
    try {
      const [p, t, b, c] = await Promise.all([profiles.getProfile(), txService.getTransactions(), budgetService.getBudgets(), categoryService.getCategories()])
      setProfile(p); setTransactions(t); setBudgets(b); setCategories(c)
    } catch (e) { console.error(e); setDataError(true) } finally { setDataLoading(false); setLoadedUid(uid) }
  }, [uid])
  useEffect(() => { reload() }, [reload])
  useEffect(() => { document.documentElement.dataset.theme = theme }, [theme])
  setCurrencySymbol(CURRENCIES[profile?.currency || 'PHP'][1])
  const notify = useCallback((msg) => { setToast(msg); clearTimeout(timer.current); timer.current = setTimeout(() => setToast(null), 2800) }, [])
  const user = { fullName: profile?.full_name || session?.user?.user_metadata?.full_name || '', email: session?.user?.email || '', memberSince: (profile?.created_at || new Date().toISOString()).slice(0, 10) }
  const save = (list, setList, svc, label) => (x) => attempt(async () => {
    const isNew = !list.some((i) => i.id === x.id), saved = isNew ? await svc.create(x) : await svc.update(x)
    setList((l) => upsert(l, saved, isNew))
  }, `We couldn't save this ${label}. Please try again.`)
  const remove = (setList, fn, label) => (id) => attempt(async () => { await fn(id); setList((l) => l.filter((i) => i.id !== id)) }, `We couldn't delete this ${label}. Please try again.`)
  const value = {
    session, loggedIn: !!session, authLoading, user, settings: { currency: profile?.currency || 'PHP', theme },
    transactions, budgets, categories, dataLoading: dataLoading || (!!uid && loadedUid !== uid), dataError, reload, toast, notify,
    signIn: (email, password) => attempt(() => auth.signIn(email, password), "We couldn't sign you in. Please try again."),
    signUp: async (name, email, password) => { let r; const error = await attempt(async () => { r = await auth.signUp(name, email, password) }, "We couldn't create your account. Please try again."); return { error, needsConfirmation: !error && !r.session } },
    logout: async () => { await attempt(() => auth.signOut()); setSession(null) },
    resetPassword: (email) => attempt(() => auth.sendPasswordReset(email), "We couldn't send the reset link. Please try again."),
    updatePassword: (password) => attempt(() => auth.updatePassword(password), "We couldn't update your password. Please try again."),
    changePassword: (current, next) => attempt(async () => {
      try { await auth.signIn(user.email, current) } catch (e) { throw Object.assign(new Error('wrong password'), { wrongPassword: true }) }
      await auth.updatePassword(next)
    }, "We couldn't update your password. Please try again."),
    updateUser: ({ fullName, email }) => attempt(async () => {
      if (fullName !== undefined && fullName !== user.fullName) setProfile(await profiles.updateProfile({ fullName }))
      if (email && email !== user.email) await auth.updateEmail(email)
    }, "We couldn't update your profile. Please try again."),
    updateSettings: async (s) => {
      if (s.theme) { localStorage.setItem('kita:theme', s.theme); setTheme(s.theme) }
      if (s.currency) return attempt(async () => setProfile(await profiles.updateProfile({ currency: s.currency })), "We couldn't update your currency.")
      return null
    },
    saveTransaction: save(transactions, setTransactions, { create: txService.createTransaction, update: txService.updateTransaction }, 'transaction'),
    deleteTransaction: remove(setTransactions, txService.deleteTransaction, 'transaction'),
    saveBudget: save(budgets, setBudgets, { create: budgetService.createBudget, update: budgetService.updateBudget }, 'budget'),
    deleteBudget: remove(setBudgets, budgetService.deleteBudget, 'budget'),
    saveCategory: save(categories, setCategories, { create: categoryService.createCategory, update: categoryService.updateCategory }, 'category'),
    deleteCategory: remove(setCategories, categoryService.deleteCategory, 'category'),
    resetAll: async () => { // "Delete account" in Settings
      const e = await attempt(() => auth.deleteMyAccount(), "We couldn't delete your account. Please try again.")
      if (e) return notify(e)
      await auth.signOut().catch(() => {}); window.location.assign('/login')
    },
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
