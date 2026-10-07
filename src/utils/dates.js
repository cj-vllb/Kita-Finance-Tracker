const now = new Date(), pad = (n) => String(n).padStart(2, '0')
export const TODAY = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
export const CURRENT_MONTH = TODAY.slice(0, 7)
