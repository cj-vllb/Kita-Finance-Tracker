import { supabase, unwrap, fetchAll } from '../lib/supabaseClient.js'
const fromRow = (r) => ({ id: r.id, date: r.transaction_date, description: r.description, categoryId: r.category_id, type: r.type, amount: Number(r.amount), notes: r.notes || '', createdAt: r.created_at })
const toRow = (x) => ({ category_id: x.categoryId, type: x.type, amount: x.amount, description: x.description, transaction_date: x.date, notes: x.notes?.trim() || null })
export const getTransactions = async () => (await fetchAll(() => supabase.from('transactions').select('*').order('transaction_date', { ascending: false }).order('created_at', { ascending: false }).order('id'))).map(fromRow)
export const getTransaction = (id) => supabase.from('transactions').select('*').eq('id', id).maybeSingle().then(unwrap).then((r) => (r ? fromRow(r) : null))
export const createTransaction = (x) => supabase.from('transactions').insert(toRow(x)).select().single().then(unwrap).then(fromRow)
export const updateTransaction = (x) => supabase.from('transactions').update(toRow(x)).eq('id', x.id).select().single().then(unwrap).then(fromRow)
export const deleteTransaction = (id) => supabase.from('transactions').delete().eq('id', id).then(unwrap)
