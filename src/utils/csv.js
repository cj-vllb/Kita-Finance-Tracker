// CSV export. Pure functions: they read the data already in memory and never write anything anywhere.
const BOM = '\uFEFF' // makes Excel read UTF-8 (₱, é, 日本語) correctly
// Spreadsheet apps run text starting with = + - @ as a formula. Prefixing an apostrophe keeps imported text inert.
const guard = (s) => (/^[=+\-@\t\r]/.test(s) ? "'" + s : s)
const cell = (v) => `"${guard(String(v ?? '')).replace(/"/g, '""')}"`
export const CSV_HEADERS = ['Date', 'Description', 'Category', 'Type', 'Amount', 'Currency', 'Notes']
export function buildCsv(transactions, categories = [], currency = '') {
  const name = (id) => categories.find((c) => c.id === id)?.name || 'Uncategorized'
  const rows = [...transactions].sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || ''))
    .map((t) => [cell(t.date), cell(t.description), cell(name(t.categoryId)), cell(t.type), Number(t.amount).toFixed(2), cell(currency), cell(t.notes)].join(','))
  return BOM + [CSV_HEADERS.map(cell).join(','), ...rows].join('\r\n') + '\r\n'
}
export const csvFilename = (d = new Date()) => `trackmykita-transactions-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.csv`
export function downloadCsv(text, filename) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: filename, hidden: true })
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000) // some browsers need the URL alive until the download starts
}
