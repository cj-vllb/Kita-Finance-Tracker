import test from 'node:test'
import assert from 'node:assert/strict'
import * as b from './backup.js'

// What export_my_data() returns for a small but complete account (categories, a goal, a deleted goal, budgets, transfers, savings activity).
const exported = () => ({
  profile: { currency: 'PHP' },
  categories: [
    { id: 'c-food', name: 'Food & Dining', type: 'expense', color: 'orange', icon: 'utensils', preset_key: 'expense:food-dining', archived_at: null, created_at: '2026-10-01T00:00:00+00:00' },
    { id: 'c-rent', name: 'Housing & Rent', type: 'expense', color: 'blue', icon: 'home', preset_key: 'expense:housing-rent', archived_at: null, created_at: '2026-10-01T00:00:00+00:00' },
    { id: 'c-sal', name: 'Salary & Wages', type: 'income', color: 'green', icon: 'banknote', preset_key: 'income:salary-wages', archived_at: null, created_at: '2026-10-01T00:00:00+00:00' },
    { id: 'c-old', name: 'Gym', type: 'expense', color: 'red', icon: 'dumbbell', preset_key: null, archived_at: '2026-10-05T00:00:00+00:00', created_at: '2026-10-02T00:00:00+00:00' },
  ],
  budgets: [
    { id: 'b1', category_id: 'c-food', name: null, icon: null, amount: 8000, month: '2026-10-01', created_at: '2026-10-02T00:00:00+00:00' },
    { id: 'b2', category_id: null, name: 'Fun money', icon: 'party-popper', amount: 1500.5, month: '2026-10-01', created_at: '2026-10-02T00:00:00+00:00' },
  ],
  transactions: [
    { id: 't1', category_id: 'c-sal', amount: 40000, type: 'income', description: 'October pay', transaction_date: '2026-10-01', notes: null, balance: 'current', goal_id: null, created_at: '2026-10-01T09:00:00+00:00' },
    { id: 't2', category_id: 'c-food', amount: 450.55, type: 'expense', description: null, transaction_date: '2026-10-12', notes: 'lunch', balance: 'current', goal_id: null, created_at: '2026-10-12T09:00:00+00:00' },
    { id: 't3', category_id: 'c-old', amount: 800, type: 'expense', description: 'Gym', transaction_date: '2026-10-03', notes: null, balance: 'savings', goal_id: 'g1', created_at: '2026-10-03T09:00:00+00:00' },
  ],
  savings_goals: [
    { id: 'g1', name: 'New Phone', target_amount: 15000, archived_at: null, created_at: '2026-10-01T00:00:00+00:00' },
    { id: 'g2', name: 'Old goal', target_amount: 500, archived_at: '2026-10-06T00:00:00+00:00', created_at: '2026-10-01T00:00:00+00:00' },
  ],
  savings_transfers: [{ id: 's1', direction: 'to_savings', amount: 3000, transfer_date: '2026-10-02', note: null, goal_id: 'g1', created_at: '2026-10-02T10:00:00+00:00' }],
  savings_reallocations: [{ id: 'r1', from_goal_id: 'g2', to_goal_id: 'g1', amount: 0.01, allocation_date: '2026-10-06', note: 'x', created_at: '2026-10-06T10:00:00+00:00' }],
})
// g2 must end at zero: give it that 0.01 so the reallocation above is valid.
const withG2 = () => { const d = exported(); d.savings_transfers.push({ id: 's2', direction: 'to_savings', amount: 0.01, transfer_date: '2026-10-02', note: null, goal_id: 'g2', created_at: '2026-10-02T11:00:00+00:00' }); return d }
const clone = (o) => JSON.parse(JSON.stringify(o))
const ok = (x) => { const r = b.validateBackup(x); assert.equal(r.ok, true, r.error); return r }
const fails = (x, re) => { const r = b.validateBackup(x); assert.equal(r.ok, false, 'should be rejected'); if (re) assert.match(r.error, re); return r }

test('the file name follows TrackMyKita-Backup-YYYY-MM-DD.json using the local date', () => {
  assert.equal(b.backupFilename(new Date(2026, 9, 16, 23, 59)), 'TrackMyKita-Backup-2026-10-16.json')
  assert.equal(b.backupFilename(new Date(2026, 0, 5)), 'TrackMyKita-Backup-2026-01-05.json')
})
test('a built backup carries metadata, every section and counts', () => {
  const file = b.buildBackup(withG2(), '1.3.4', new Date('2026-10-16T08:00:00Z'))
  assert.equal(file.format, 'trackmykita-backup'); assert.equal(file.version, 1); assert.equal(file.appVersion, '1.3.4'); assert.equal(file.exportedAt, '2026-10-16T08:00:00.000Z')
  assert.deepEqual(file.counts, { categories: 4, budgets: 2, transactions: 3, savings_goals: 2, savings_transfers: 2, savings_reallocations: 1 })
  assert.equal(file.profile.currency, 'PHP')
})
test('a backup contains no user id, email, password, token or key', () => {
  const text = b.backupToText(b.buildBackup(withG2(), '1.3.4'))
  for (const word of ['user_id', 'email', 'password', 'token', 'secret', 'service_role', 'apikey', 'avatar']) assert.equal(text.toLowerCase().includes(word), false, word)
})
test('export -> text -> parse -> validate gives back exactly the same records', () => {
  const file = b.buildBackup(withG2(), '1.3.4'), r = b.parseBackupText(b.backupToText(file))
  assert.equal(r.ok, true, r.error)
  for (const s of b.SECTIONS) assert.deepEqual(r.payload[s].map((x) => x.id), file[s].map((x) => x.id), s)
  assert.deepEqual(r.counts, file.counts)
  assert.equal(r.payload.transactions[1].amount, 450.55)
  assert.equal(r.payload.budgets[1].amount, 1500.5)
  assert.equal(r.payload.categories[3].archived_at, '2026-10-05T00:00:00+00:00')
  assert.equal(r.payload.profile.currency, 'PHP')
})
test('a file with a BOM still parses', () => { assert.equal(b.parseBackupText('\uFEFF' + b.backupToText(b.buildBackup(withG2(), '1.3.4'))).ok, true) })
test('unsupported or corrupted files are rejected cleanly', () => {
  assert.equal(b.parseBackupText('').ok, false)
  assert.equal(b.parseBackupText('   ').ok, false)
  assert.match(b.parseBackupText('{not json').error, /not a TrackMyKita backup/)
  assert.equal(b.parseBackupText('[]').ok, false)
  assert.equal(b.parseBackupText('null').ok, false)
  assert.equal(b.parseBackupText('"hello"').ok, false)
  assert.equal(b.parseBackupText('x'.repeat(26 * 1024 * 1024)).ok, false)
  const f = b.buildBackup(withG2(), '1.3.4')
  fails({ ...f, format: 'something-else' }, /not a TrackMyKita backup/)
  fails({ ...f, version: 2 }, /newer version/)
  fails({ ...f, version: 0 }, /no longer supported/)
  fails({ ...f, version: '1' }, /no longer supported/)
  for (const s of b.SECTIONS) { const x = clone(f); delete x[s]; fails(x, /damaged/); x[s] = {}; fails(x, /damaged/) }
})
test('invalid records are rejected before anything could be restored', () => {
  const f = () => clone(b.buildBackup(withG2(), '1.3.4'))
  let x = f(); x.transactions[0].amount = -5; fails(x, /above zero/)
  x = f(); x.transactions[0].amount = 0; fails(x, /above zero/)
  x = f(); x.transactions[0].amount = '100'; fails(x, /not a number/)
  x = f(); x.transactions[0].amount = 10.123; fails(x, /decimal/)
  x = f(); x.transactions[0].amount = 1e15; fails(x, /too large/)
  x = f(); x.transactions[0].type = 'transfer'; fails(x, /type/)
  x = f(); x.transactions[0].transaction_date = '2026-02-30'; fails(x, /date is invalid/)
  x = f(); x.transactions[0].balance = 'wallet'; fails(x, /balance/)
  x = f(); x.transactions[0].category_id = 'nope'; fails(x, /not in the backup/)
  x = f(); x.transactions[1].category_id = 'c-sal'; fails(x, /different type/)
  x = f(); x.transactions[0].goal_id = 'g1'; fails(x, /not a Savings transaction/)
  x = f(); x.transactions[2].goal_id = 'ghost'; fails(x, /not in the backup/)
  x = f(); x.transactions[1].id = 't1'; fails(x, /twice/)
  x = f(); x.categories[0].type = 'bogus'; fails(x, /type/)
  x = f(); x.categories[0].icon = 'Bad Icon!'; fails(x, /icon/)
  x = f(); x.categories[0].color = 'neon'; fails(x, /color/)
  x = f(); x.categories[0].name = '   '; fails(x, /no name/)
  x = f(); x.categories[0].preset_key = 'income:groceries'; fails(x, /preset/)
  x = f(); x.categories[1].name = 'Food & Dining'; fails(x, /both called/)
  x = f(); x.budgets[0].category_id = 'c-sal'; fails(x, /not an expense/)
  x = f(); x.budgets[0].category_id = null; x.budgets[0].name = null; fails(x, /neither/)
  x = f(); x.budgets[0].month = '2026-10-15'; fails(x, /month is invalid/)
  x = f(); x.budgets.push({ ...x.budgets[0], id: 'b9' }); fails(x, /same category and month/)
  x = f(); x.savings_transfers[0].direction = 'sideways'; fails(x, /direction/)
  x = f(); x.savings_reallocations[0].to_goal_id = 'g2'; fails(x, /same place/)
  x = f(); x.profile.currency = 'XYZ'; fails(x, /currency/)
})
test('savings that would go below zero are caught (same rule as the database)', () => {
  const x = clone(b.buildBackup(withG2(), '1.3.4'))
  x.savings_transfers[0].amount = 100 // g1 gets 100 but 800 is paid from it
  fails(x, /do not add up/)
  const y = clone(b.buildBackup(withG2(), '1.3.4'))
  y.savings_reallocations = [] // g2 (deleted) is left holding 0.01
  fails(y, /do not add up/)
})
test('the restore payload is rebuilt from known fields only: user ids and unknown fields never get through', () => {
  const x = clone(b.buildBackup(withG2(), '1.3.4'))
  x.user_id = 'someone-else'; x.email = 'a@b.c'; x.access_token = 'secret'
  for (const s of b.SECTIONS) for (const rec of x[s]) { rec.user_id = '11111111-1111-1111-1111-111111111111'; rec.extra = 'x'; rec.updated_at = 'x' }
  const r = ok(x), text = JSON.stringify(r.payload)
  for (const word of ['user_id', 'someone-else', 'a@b.c', 'access_token', 'secret', 'extra', 'updated_at', '1111-1111']) assert.equal(text.includes(word), false, word)
  assert.deepEqual(Object.keys(r.payload).sort(), ['budgets', 'categories', 'format', 'profile', 'savings_goals', 'savings_reallocations', 'savings_transfers', 'transactions', 'version'])
})
test('an empty account makes a valid empty backup', () => {
  const r = ok(b.buildBackup({ profile: { currency: 'USD' } }, '1.3.4'))
  assert.deepEqual(r.counts, { categories: 0, budgets: 0, transactions: 0, savings_goals: 0, savings_transfers: 0, savings_reallocations: 0 })
})
