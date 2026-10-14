// Show/hide preference for the two dashboard balances. UI preference only (like the theme and sidebar state):
// stored in this browser, never sent anywhere, and it only ever holds the word "hidden" or "visible", never an amount.
export const VISIBILITY_KEYS = { current: 'kita:balance-visibility:current', savings: 'kita:balance-visibility:savings' }
export const MASK = '••••••••'
// Anything other than the exact value "hidden" (missing, malformed, unexpected) means visible.
export const parseVisibility = (value) => value !== 'hidden'
const store = (storage) => storage ?? globalThis.localStorage
export function readVisibility(key, storage) {
  try { return parseVisibility(store(storage).getItem(key)) } catch { return true } // storage unavailable: default to visible
}
export function writeVisibility(key, visible, storage) {
  try { store(storage).setItem(key, visible ? 'visible' : 'hidden') } catch { /* storage unavailable: the choice just is not remembered */ }
}
