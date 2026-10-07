import { supabase, unwrap, fetchAll } from '../lib/supabaseClient.js'
const fromRow = (r) => ({ id: r.id, name: r.name, type: r.type, color: r.color })
const toRow = (x) => ({ name: x.name, type: x.type, color: x.color || 'grey' }) // user_id defaults to auth.uid() in the database
export const getCategories = async () => (await fetchAll(() => supabase.from('categories').select('*').order('created_at').order('id'))).map(fromRow)
export const createCategory = (x) => supabase.from('categories').insert(toRow(x)).select().single().then(unwrap).then(fromRow)
export const updateCategory = (x) => supabase.from('categories').update(toRow(x)).eq('id', x.id).select().single().then(unwrap).then(fromRow)
export const deleteCategory = (id) => supabase.from('categories').delete().eq('id', id).then(unwrap)
