// Which notifications this user has already read, remembered on this device only (like the theme and the balance eye). It stores nothing but
// notification ids, under a key that includes the signed-in user's id, so one person's list is never used for another. Storage can be missing
// or full: every function then behaves as "nothing is read yet" and never throws.
const KEY = (uid) => `kita:notif-read:${uid}`
const CAP = 300
export function readIds(uid, storage = globalThis.localStorage) {
  if (!uid) return new Set()
  try { const v = JSON.parse(storage?.getItem(KEY(uid)) || '[]'); return new Set(Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []) } catch { return new Set() }
}
export function writeIds(uid, ids, current = null, storage = globalThis.localStorage) {
  if (!uid) return
  // Ids of notifications that no longer exist are dropped so the list cannot grow forever.
  const keep = [...ids].filter((id) => !current || current.has(id)).slice(-CAP)
  try { storage?.setItem(KEY(uid), JSON.stringify(keep)) } catch { /* storage unavailable: it just is not remembered */ }
}
export function removeIds(uid, storage = globalThis.localStorage) { try { storage?.removeItem(KEY(uid)) } catch { /* ignore */ } }
