import { supabase, unwrap, fetchAll } from '../lib/supabaseClient.js'
// icon / preset_key / archived_at exist after the 1.3.4 migration. Older databases simply return rows without them, and the app falls back safely.
const fromRow = (r) => ({ id: r.id, name: r.name, type: r.type, color: r.color, icon: r.icon || null, presetKey: r.preset_key || null, archived: !!r.archived_at, createdAt: r.created_at || '' })
// `withExtras` is true once the 1.3.4 migration is known to exist, so an older database keeps working.
const toRow = (x) => ({ name: x.name, type: x.type, color: x.color || 'grey', ...(x.withExtras ? { icon: x.icon || null } : {}) }) // user_id defaults to auth.uid() in the database
export const getCategories = async () => (await fetchAll(() => supabase.from('categories').select('*').order('created_at').order('id'))).map(fromRow)
export const createCategory = (x) => supabase.from('categories').insert(toRow(x)).select().single().then(unwrap).then(fromRow)
export const updateCategory = (x) => supabase.from('categories').update(toRow(x)).eq('id', x.id).select().single().then(unwrap).then(fromRow)
export const archiveCategory = (id) => supabase.from('categories').update({ archived_at: new Date().toISOString() }).eq('id', id).select().single().then(unwrap).then(fromRow)
// Hard delete. The database refuses (23503) when a transaction or budget still uses the category.
export const deleteCategory = (id) => supabase.from('categories').delete().eq('id', id).then(unwrap)
// Idempotent: creates the signed-in user's own copy of the presets once. Returns false when the 1.3.4 migration has not been applied yet.
export const isMissingFunction = (e) => ['42883', 'PGRST202'].includes(e?.code) || /could not find the function|does not exist/i.test(e?.message || '')
export async function ensureDefaultCategories(restore = false) {
  const { error } = await supabase.rpc('ensure_default_categories', { p_restore: restore })
  if (error) { if (isMissingFunction(error)) return false; throw error }
  return true
}
