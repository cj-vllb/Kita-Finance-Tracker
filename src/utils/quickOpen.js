// Lets any screen ask the phone/tablet shell to open one of the quick-add sheets ("transaction", "savings" or "transfer"), for example the
// "Add your first transaction" prompts. The shell is the only listener and ignores the request on desktop, so desktop links keep their pages.
export const QUICK_EVENT = 'kita:quick-add'
export const openQuickAdd = (id) => window.dispatchEvent(new CustomEvent(QUICK_EVENT, { detail: id }))
