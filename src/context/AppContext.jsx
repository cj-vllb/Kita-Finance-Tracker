import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react'
import * as auth from '../services/authService.js'
import * as profiles from '../services/profileService.js'
import * as txService from '../services/transactionService.js'
import * as budgetService from '../services/budgetService.js'
import * as categoryService from '../services/categoryService.js'
import * as savingsService from '../services/savingsService.js'
import * as dataService from '../services/dataService.js'
import { buildBackup, backupFilename } from '../utils/backup.js'
import { sortCategories } from '../data/presetCategories.js'
import { APP_VERSION } from '../version.js'
import { VISIBILITY_KEYS } from '../utils/balanceVisibility.js'
import { computeLedger } from '../utils/ledger.js'
import { friendlyError } from '../lib/errors.js'
import { logError } from '../lib/log.js'
import { setCurrency } from '../utils/format.js'
import { CURRENCIES, safeCurrency } from '../utils/currency.js'
import { prepareAvatar } from '../utils/image.js'
const Ctx = createContext(null)
export const useApp = () => useContext(Ctx)
export { CURRENCIES }
const upsert = (list, item, isNew) => (isNew ? [item, ...list] : list.map((x) => (x.id === item.id ? item : x)))
// Runs an action and returns null on success or a friendly message on failure.
// `onError` lets the provider re-sync after a rejected ledger write (see `resync` below).
const attempt = async (fn, fallback, onError) => { try { await fn(); return null } catch (e) { if (onError) await onError(e); return friendlyError(e, fallback) } }
export function AppProvider({ children }) {
  const [session, setSession] = useState(null), [authLoading, setAuthLoading] = useState(true)
  const [profile, setProfile] = useState(null), [transactions, setTransactions] = useState([]), [budgets, setBudgets] = useState([]), [categories, setCategories] = useState([])
  const [goals, setGoals] = useState([]), [transfers, setTransfers] = useState([]), [reallocations, setReallocations] = useState([]), [savingsReady, setSavingsReady] = useState(false)
  const [v134, setV134] = useState(false) // true once the 1.3.4 database update (category icons, backup and restore) is known to be in place
  const [dataLoading, setDataLoading] = useState(true), [dataError, setDataError] = useState(false), [loadedUid, setLoadedUid] = useState(null)
  const [theme, setTheme] = useState(() => localStorage.getItem('kita:theme') || 'dark') // UI preference only
  const [toast, setToast] = useState(null), timer = useRef(), [avatarUrl, setAvatarUrl] = useState(null)
  const uid = session?.user?.id
  useEffect(() => {
    let live = true
    auth.getSession().then((s) => live && setSession(s)).catch(logError).finally(() => live && setAuthLoading(false))
    const sub = auth.onAuthChange((_event, s) => setSession(s))
    return () => { live = false; sub.unsubscribe() }
  }, [])
  const applySavings = (s) => { setSavingsReady(s.ready); setGoals(s.goals); setTransfers(s.transfers); setReallocations(s.reallocations) }
  const reload = useCallback(async () => {
    if (!uid) { setProfile(null); setTransactions([]); setBudgets([]); setCategories([]); setGoals([]); setTransfers([]); setReallocations([]); setSavingsReady(false); setDataLoading(false); setLoadedUid(null); return }
    setDataLoading(true); setDataError(false)
    try {
      // Gives the user their own copy of the built-in categories once (safe to repeat). Older databases without the update just skip this.
      const provisioned = await categoryService.ensureDefaultCategories().catch((e) => { logError(e); return false })
      setV134(provisioned)
      const [p, t, b, c, s] = await Promise.all([profiles.getProfile(), txService.getTransactions(), budgetService.getBudgets(), categoryService.getCategories(), savingsService.getSavingsData()])
      setProfile(p); setTransactions(t); setBudgets(b); setCategories(c); applySavings(s)
    } catch (e) { logError(e); setDataError(true) } finally { setDataLoading(false); setLoadedUid(uid) }
  }, [uid])
  useEffect(() => { reload() }, [reload])
  useEffect(() => { document.documentElement.dataset.theme = theme }, [theme])
  setCurrency(profile?.currency) // unknown/missing codes fall back to PHP inside safeCurrency
  // Signed URL for the private profile picture; refreshed before it expires. Any failure just falls back to initials.
  const avatarPath = profile?.avatar_path || null
  useEffect(() => {
    if (!avatarPath) { setAvatarUrl(null); return }
    let live = true, t
    const sign = () => profiles.getAvatarUrl(avatarPath).then((u) => { if (live) { setAvatarUrl(u); t = setTimeout(sign, (profiles.AVATAR_URL_TTL - 300) * 1000) } }).catch((e) => { logError(e); if (live) setAvatarUrl(null) })
    sign(); return () => { live = false; clearTimeout(t) }
  }, [avatarPath])
  // Both balances and every goal amount come from one pure calculation over the loaded ledger rows (utils/ledger.js).
  const ledger = useMemo(() => computeLedger({ transactions, transfers, reallocations, goals }), [transactions, transfers, reallocations, goals])
  // `categories` keeps EVERY category (including deleted ones that old transactions still use) so history always shows a name and icon.
  // `activeCategories` is what pickers and the Categories page offer.
  const sortedCategories = useMemo(() => sortCategories(categories), [categories])
  const activeCategories = useMemo(() => sortedCategories.filter((c) => !c.archived), [sortedCategories])
  const activeGoals = useMemo(() => goals.filter((g) => !g.archived), [goals])
  // The database rejects a write that would break a balance or goal with a message starting "KITA: ". The write did not happen, but the screen may have
  // been built from stale data (another device, another tab), so re-read the ledger rows quietly; the user then sees the real balances, not stale ones.
  const resync = async (e) => {
    if (!/^KITA: /.test(e?.message || '')) return
    try { const [t, s] = await Promise.all([txService.getTransactions(), savingsService.getSavingsData()]); setTransactions(t); applySavings(s) } catch (x) { logError(x) }
  }
  const run = (fn, fallback) => attempt(fn, fallback, resync)
  const notify = useCallback((msg) => { setToast(msg); clearTimeout(timer.current); timer.current = setTimeout(() => setToast(null), 2800) }, [])
  const user = { avatarUrl, fullName: profile?.full_name || session?.user?.user_metadata?.full_name || '', email: session?.user?.email || '', memberSince: (profile?.created_at || new Date().toISOString()).slice(0, 10) }
  const save = (list, setList, svc, label) => (x) => run(async () => {
    const isNew = !list.some((i) => i.id === x.id), saved = isNew ? await svc.create(x) : await svc.update(x)
    setList((l) => upsert(l, saved, isNew))
  }, `We couldn't save this ${label}. Please try again.`)
  const remove = (setList, fn, label) => (id) => run(async () => { await fn(id); setList((l) => l.filter((i) => i.id !== id)) }, `We couldn't delete this ${label}. Please try again.`)
  const value = {
    session, loggedIn: !!session, authLoading, ready: !authLoading && (!uid || loadedUid === uid), user, settings: { currency: safeCurrency(profile?.currency), theme },
    transactions, budgets, categories: sortedCategories, activeCategories, dataToolsReady: v134, goals, activeGoals, transfers, reallocations, ledger, savingsReady, dataLoading: dataLoading || (!!uid && loadedUid !== uid), dataError, reload, toast, notify,
    signIn: (email, password) => attempt(() => auth.signIn(email, password), "We couldn't sign you in. Please try again."),
    signUp: async (name, email, password) => { let r; const error = await attempt(async () => { r = await auth.signUp(name, email, password) }, "We couldn't create your account. Please try again."); return { error, needsConfirmation: !error && !r.session } },
    logout: async () => { await attempt(() => auth.signOut()); setSession(null) },
    resetPassword: (email) => attempt(() => auth.sendPasswordReset(email), "We couldn't send the reset link. Please try again."),
    updatePassword: (password) => attempt(() => auth.updatePassword(password), "We couldn't update your password. Please try again."),
    // Resolves { error, othersKept }. error: message or null. othersKept: the password WAS changed, but ending the account's other sessions failed.
    changePassword: async (current, next) => {
      let othersKept = false
      const error = await attempt(async () => {
        try { await auth.signIn(user.email, current) } catch (e) { throw Object.assign(new Error('wrong password'), { wrongPassword: true }) }
        await auth.updatePassword(next)
        // The password is already changed here, so a failure below must not be reported as a failed password change.
        try { await auth.signOutOtherSessions() } catch (e) { logError(e); othersKept = true }
      }, "We couldn't update your password. Please try again.")
      return { error, othersKept }
    },
    updateUser: ({ fullName, email }) => attempt(async () => {
      if (fullName !== undefined && fullName !== user.fullName) setProfile(await profiles.updateProfile({ fullName }))
      if (email && email !== user.email) await auth.updateEmail(email)
    }, "We couldn't update your profile. Please try again."),
    updateSettings: async (s) => {
      if (s.theme) { localStorage.setItem('kita:theme', s.theme); setTheme(s.theme) }
      if (s.currency) return attempt(async () => setProfile(await profiles.updateProfile({ currency: s.currency })), "We couldn't update your currency.")
      return null
    },
    // Replaces the photo: upload new file, point the profile at it, then delete the old file (best effort).
    saveAvatar: (blob) => attempt(async () => {
      const old = profile?.avatar_path, path = await profiles.uploadAvatar(blob)
      try { setProfile(await profiles.updateProfile({ avatarPath: path })) } catch (e) { await profiles.removeAvatarFile(path).catch(() => {}); throw e }
      if (old && old !== path) profiles.removeAvatarFile(old).catch(logError)
    }, "We couldn't save your photo. Please try again."),
    removeAvatar: () => attempt(async () => {
      const old = profile?.avatar_path; if (!old) return
      setProfile(await profiles.updateProfile({ avatarPath: null })); profiles.removeAvatarFile(old).catch(logError)
    }, "We couldn't remove your photo. Please try again."),
    checkAvatar: prepareAvatar,
    saveTransaction: (x) => save(transactions, setTransactions, { create: txService.createTransaction, update: txService.updateTransaction }, 'transaction')({ ...x, withBalance: savingsReady }),
    // Savings. Every write is one statement or one function call in the database, so it succeeds or fails as a whole. The three small savings
    // tables are re-read afterwards, so what is shown is always what the database holds (and what another device will show).
    saveGoal: (x) => run(async () => { if (goals.some((g) => g.id === x.id)) await savingsService.updateGoal(x); else await savingsService.createGoal(x); applySavings(await savingsService.getSavingsData()) }, "We couldn't save this goal. Please try again."),
    deleteGoal: (id, moveTo, date) => run(async () => { await savingsService.archiveGoal(id, moveTo, date); applySavings(await savingsService.getSavingsData()) }, "We couldn't delete this goal. Please try again."),
    addTransfer: (x) => run(async () => { await savingsService.createTransfer(x); applySavings(await savingsService.getSavingsData()) }, "We couldn't move this money. Please try again."),
    moveSavings: (x) => run(async () => { await savingsService.createReallocation(x); applySavings(await savingsService.getSavingsData()) }, "We couldn't move this money. Please try again."),
    undoSavingsActivity: (kind, id) => run(async () => { await (kind === 'transfer' ? savingsService.deleteTransfer(id) : savingsService.deleteReallocation(id)); applySavings(await savingsService.getSavingsData()) }, "We couldn't undo this. Please try again."),
    deleteTransaction: remove(setTransactions, txService.deleteTransaction, 'transaction'),
    saveBudget: (x) => save(budgets, setBudgets, { create: budgetService.createBudget, update: budgetService.updateBudget }, 'budget')({ ...x, withExtras: v134 }),
    deleteBudget: remove(setBudgets, budgetService.deleteBudget, 'budget'),
    saveCategory: (x) => save(categories, setCategories, { create: categoryService.createCategory, update: categoryService.updateCategory }, 'category')({ ...x, withExtras: v134 }),
    // Deleting a category never deletes or rewrites a transaction. A built-in preset, or any category that a transaction or budget still uses, is
    // ARCHIVED (hidden from pickers; history keeps its name and icon). A custom category nothing uses is removed completely.
    deleteCategory: (id) => run(async () => {
      const cat = categories.find((c) => c.id === id); if (!cat) return
      let archived = !!cat.presetKey
      if (!archived) { try { await categoryService.deleteCategory(id) } catch (e) { if (e?.code === '23503') archived = true; else throw e } }
      if (archived) { const saved = await categoryService.archiveCategory(id); setCategories((l) => l.map((x) => (x.id === id ? saved : x))) } else setCategories((l) => l.filter((x) => x.id !== id))
    }, "We couldn't delete this category. Please try again."),
    // Brings back built-in categories the user deleted. Names and icons the user changed are left alone.
    restoreDefaultCategories: () => run(async () => { await categoryService.ensureDefaultCategories(true); setCategories(await categoryService.getCategories()) }, "We couldn't restore the default categories."),
    // Same service and same state update as saveCategory, but also hands back the saved row so a form can select it straight away.
    createCategory: async (x) => { let category = null; const error = await attempt(async () => { category = await categoryService.createCategory({ ...x, withExtras: v134 }); setCategories((l) => upsert(l, category, true)) }, "We couldn't save this category. Please try again."); return { error, category: error ? null : category } },
    // ---- Backup, restore, delete all data (Settings > Data). Each is a single database call; see services/dataService.js. ----
    // Resolves { error, file, filename }. The file is only the signed-in user's own records.
    backupData: async () => { let file = null; const error = await attempt(async () => { file = buildBackup(await dataService.exportMyData(), APP_VERSION) }, "We couldn't create the backup. Please try again."); return { error, file, filename: backupFilename() } },
    // `payload` has already been validated by utils/backup.js. The database validates it again and replaces everything, or changes nothing.
    restoreBackup: async (payload) => { let counts = null; const error = await attempt(async () => { counts = await dataService.restoreMyData(payload) }, "We couldn't restore the backup, so nothing was changed."); if (!error) await reload(); return { error, counts } },
    deleteAllData: async () => {
      const error = await attempt(() => dataService.deleteAllMyData(), "We couldn't delete your data, so nothing was changed.")
      if (!error) { Object.values(VISIBILITY_KEYS).forEach((k) => { try { localStorage.removeItem(k) } catch { /* ignore */ } }); await reload() }
      return error
    },
    resetAll: async () => { // "Delete account" (Profile page)
      // Remove every stored photo first: once the account is gone nobody is allowed to delete them. Account deletion removes every database row.
      await profiles.removeAllAvatarFiles().catch(logError)
      const e = await attempt(() => auth.deleteMyAccount(), "We couldn't delete your account. Please try again.")
      if (e) {
        // The photos are already gone, so stop the profile pointing at a missing file (it would only show initials anyway).
        if (profile?.avatar_path) await profiles.updateProfile({ avatarPath: null }).then(setProfile).catch(logError)
        return notify(e)
      }
      await auth.signOut().catch(() => {}); window.location.assign('/login')
    },
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
