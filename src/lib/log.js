// Technical error details are only written to the console during development, so production visitors' consoles stay quiet.
export const logError = (e) => { if (import.meta.env.DEV) console.error(e) }
