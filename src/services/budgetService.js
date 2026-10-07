import { supabase, unwrap, fetchAll } from '../lib/supabaseClient.js'
// The UI uses 'YYYY-MM'; the database stores the first day of the month.
const fromRow = (r) => ({ id: r.id, categoryId: r.category_id, amount: Number(r.amount), month: r.month.slice(0, 7) })
const toRow = (x) => ({ category_id: x.categoryId, amount: x.amount, month: `${x.month}-01` })
export const getBudgets = async () => (await fetchAll(() => supabase.from('budgets').select('*').order('month').order('id'))).map(fromRow)
export const createBudget = (x) => supabase.from('budgets').insert(toRow(x)).select().single().then(unwrap).then(fromRow)
export const updateBudget = (x) => supabase.from('budgets').update(toRow(x)).eq('id', x.id).select().single().then(unwrap).then(fromRow)
export const deleteBudget = (id) => supabase.from('budgets').delete().eq('id', id).then(unwrap)
