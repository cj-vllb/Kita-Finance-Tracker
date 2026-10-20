import { supabase, unwrap, fetchAll } from '../lib/supabaseClient.js'
// Savings goals, transfers between Current Balance and Savings, and re-earmarking inside Savings.
// All ownership and balance rules are enforced by the database (RLS, composite foreign keys, ledger triggers); this file only maps rows.
const goalFrom = (r) => ({ id: r.id, name: r.name, target: Number(r.target_amount), archived: !!r.archived_at, createdAt: r.created_at })
const transferFrom = (r) => ({ id: r.id, direction: r.direction, amount: Number(r.amount), date: r.transfer_date, note: r.note || '', goalId: r.goal_id || '', createdAt: r.created_at })
const contribFrom = (r) => ({ id: r.id, goalId: r.goal_id || '', amount: Number(r.amount), date: r.contribution_date, note: r.note || '', createdAt: r.created_at })
const reallocFrom = (r) => ({ id: r.id, fromGoalId: r.from_goal_id || '', toGoalId: r.to_goal_id || '', amount: Number(r.amount), date: r.allocation_date, note: r.note || '', createdAt: r.created_at })
// True when the 1.3.1 migration has not been applied yet. The rest of the app keeps working and Savings explains what is missing.
export const isMissingSavings = (e) => ['42P01', 'PGRST205', 'PGRST200', '42703'].includes(e?.code) || /does not exist|schema cache/i.test(e?.message || '')
const named = (e) => { if (e?.code === '23505') e.userMessage = 'You already have a goal with that name.'; throw e }
const nz = (v) => v || null
export async function getSavingsData() {
  try {
    const [g, t, r, k] = await Promise.all([
      fetchAll(() => supabase.from('savings_goals').select('*').order('created_at').order('id')),
      fetchAll(() => supabase.from('savings_transfers').select('*').order('transfer_date', { ascending: false }).order('created_at', { ascending: false }).order('id')),
      fetchAll(() => supabase.from('savings_reallocations').select('*').order('allocation_date', { ascending: false }).order('created_at', { ascending: false }).order('id')),
      // 1.3.5 table. A database that has not had the 1.3.5 update yet must not turn Savings off, so only THIS read may report "missing".
      fetchAll(() => supabase.from('savings_contributions').select('*').order('contribution_date', { ascending: false }).order('created_at', { ascending: false }).order('id'))
        .then((rows) => ({ rows }), (e) => { if (isMissingSavings(e)) return { rows: [], missing: true }; throw e }),
    ])
    return { ready: true, contributionsReady: !k.missing, goals: g.map(goalFrom), transfers: t.map(transferFrom), reallocations: r.map(reallocFrom), contributions: k.rows.map(contribFrom) }
  } catch (e) { if (isMissingSavings(e)) return { ready: false, contributionsReady: false, goals: [], transfers: [], reallocations: [], contributions: [] }; throw e }
}
export const createGoal = (x) => supabase.from('savings_goals').insert({ name: x.name.trim(), target_amount: x.target }).select().single().then(unwrap).then(goalFrom, named)
export const updateGoal = (x) => supabase.from('savings_goals').update({ name: x.name.trim(), target_amount: x.target }).eq('id', x.id).select().single().then(unwrap).then(goalFrom, named)
// One atomic call: moves whatever the goal holds to General Savings (moveTo empty) or another goal, then archives it. History is kept.
export const archiveGoal = (id, moveTo, date) => supabase.rpc('archive_savings_goal', { p_goal: id, p_move_to: nz(moveTo), p_date: date }).then(unwrap)
export const createTransfer = (x) => supabase.from('savings_transfers').insert({ direction: x.direction, amount: x.amount, transfer_date: x.date, note: x.note?.trim() || null, goal_id: nz(x.goalId) }).select().single().then(unwrap).then(transferFrom)
export const deleteTransfer = (id) => supabase.from('savings_transfers').delete().eq('id', id).then(unwrap)
export const createReallocation = (x) => supabase.from('savings_reallocations').insert({ from_goal_id: nz(x.fromGoalId), to_goal_id: nz(x.toGoalId), amount: x.amount, allocation_date: x.date, note: x.note?.trim() || null }).select().single().then(unwrap).then(reallocFrom)
// New money straight into Savings (goalId empty = General Savings). One INSERT: nothing is deducted from any balance. The database re-checks it.
export const createContribution = (x) => supabase.from('savings_contributions').insert({ goal_id: nz(x.goalId), amount: x.amount, contribution_date: x.date, note: x.note?.trim() || null }).select().single().then(unwrap).then(contribFrom)
export const deleteContribution = (id) => supabase.from('savings_contributions').delete().eq('id', id).then(unwrap)
export const deleteReallocation = (id) => supabase.from('savings_reallocations').delete().eq('id', id).then(unwrap)
