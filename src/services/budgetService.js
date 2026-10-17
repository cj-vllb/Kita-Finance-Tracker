import { supabase, unwrap, fetchAll } from '../lib/supabaseClient.js'
// The UI uses 'YYYY-MM'; the database stores the first day of the month.
// categoryId is '' for a budget-only custom budget (no expense category). name / icon exist after the 1.3.4 migration.
const fromRow = (r) => ({ id: r.id, categoryId: r.category_id || '', amount: Number(r.amount), month: r.month.slice(0, 7), name: r.name || '', icon: r.icon || null })
const toRow = (x) => ({ category_id: x.categoryId || null, amount: x.amount, month: `${x.month}-01`, ...(x.withExtras ? { name: x.name?.trim() || null, icon: x.icon || null } : {}) })
export const getBudgets = async () => (await fetchAll(() => supabase.from('budgets').select('*').order('month').order('id'))).map(fromRow)
export const createBudget = (x) => supabase.from('budgets').insert(toRow(x)).select().single().then(unwrap).then(fromRow)
export const updateBudget = (x) => supabase.from('budgets').update(toRow(x)).eq('id', x.id).select().single().then(unwrap).then(fromRow)
export const deleteBudget = (id) => supabase.from('budgets').delete().eq('id', id).then(unwrap)
