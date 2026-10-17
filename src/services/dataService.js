import { supabase, unwrap } from '../lib/supabaseClient.js'
// Backup, restore and reset all run as ONE database call each (see migration 20261016000000), so they succeed or fail as a whole
// and only ever touch the signed-in user's own rows.
export const exportMyData = () => supabase.rpc('export_my_data').then(unwrap)
export const restoreMyData = (payload) => supabase.rpc('restore_user_data', { p_payload: payload }).then(unwrap)
export const deleteAllMyData = () => supabase.rpc('delete_all_my_data').then(unwrap)
