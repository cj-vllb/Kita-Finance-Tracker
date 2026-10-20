-- TrackMyKita 1.3.5: savings contributions (new money added to Savings without a source balance).
-- Additive and idempotent. No row is deleted or rewritten, no existing table is altered, no existing policy is changed, nothing is dropped.
-- Requires 20261014000000 (savings) and 20261016000000 (1.3.4). Apply to LOCAL or STAGING first:  supabase db push
--
-- WHY A NEW TABLE (and not a transfer, a reallocation or an income transaction)
--   * savings_transfers always moves money BETWEEN Current Balance and Savings. Its CHECK allows only 'to_savings' / 'to_current', and every reader
--     (utils/ledger.js, the ledger triggers, reports) treats anything that is not 'to_savings' as 'to_current'. A third direction would be misread
--     as a withdrawal by any code that predates it. It is deliberately left alone.
--   * savings_reallocations only re-earmarks existing savings; it must never change the total. Left alone.
--   * An income transaction with balance = 'savings' already adds to Savings, but it is INCOME: it appears in Monthly Income, reports and
--     the income category breakdown. Someone who just wants to record "I put 500 aside" would see their income inflated. Left alone; it
--     remains available on the transaction form for money that really is income.
--   A contribution is therefore its own ledger flow: it adds to one Savings bucket (a goal, or General Savings when goal_id is NULL), it never
--   touches Current Balance, and it is not income, an expense or a transfer. Totals stay consistent because
--       Savings balance = income(savings) - expenses(savings) + transfers in - transfers out + CONTRIBUTIONS
--   and the same flow is added to kita_bucket / kita_ledger_check, so the "no bucket below zero" rule, goal archiving, undo and restore all see it.
--
-- WHAT IT CHANGES
--   new table savings_contributions (RLS: select / insert / delete own rows; no update, like transfers)
--   kita_bucket, kita_ledger_check      recreated with one extra UNION branch (everything else in them is unchanged)
--   export_my_data, restore_user_data, delete_all_my_data   recreated with the new table. restore treats the section as OPTIONAL, so backups made
--                                       by 1.3.4 and earlier restore exactly as before.

-- 1) Table ------------------------------------------------------------------------------------------------------------------------------
create table if not exists public.savings_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  goal_id uuid,                                      -- goal receiving the money. NULL = General Savings.
  amount numeric(14,2) not null check (amount > 0),
  contribution_date date not null,
  note text check (note is null or length(trim(note)) > 0),
  created_at timestamptz not null default now(),
  foreign key (goal_id, user_id) references public.savings_goals (id, user_id) on delete no action   -- a row can never point at another user's goal
);
create index if not exists savings_contributions_user_date_idx on public.savings_contributions (user_id, contribution_date desc);
create index if not exists savings_contributions_goal_idx on public.savings_contributions (goal_id) where goal_id is not null;

-- 2) Ledger helpers: contributions are one more positive flow into a bucket ---------------------------------------------------------------
create or replace function public.kita_bucket(p_user uuid, p_goal uuid) returns numeric
language sql security definer set search_path = '' as $$
  select coalesce(sum(f.d), 0) from (
    select goal_id, case type when 'income' then amount else -amount end as d from public.transactions where user_id = p_user and balance = 'savings'
    union all select goal_id, case direction when 'to_savings' then amount else -amount end from public.savings_transfers where user_id = p_user
    union all select goal_id, amount from public.savings_contributions where user_id = p_user
    union all select to_goal_id, amount from public.savings_reallocations where user_id = p_user
    union all select from_goal_id, -amount from public.savings_reallocations where user_id = p_user
  ) f where f.goal_id is not distinct from p_goal
$$;

-- Serializes one user's ledger writes. Transaction-level advisory lock: held until the writing transaction commits or rolls back, released
-- automatically, never leaked. Only the same user's savings writes contend; other users hash to other keys. It is the only advisory lock this
-- schema takes, so it cannot be part of a lock-order cycle.
-- Why this closes the race: under READ COMMITTED every statement takes a fresh snapshot. The caller takes this lock in one statement and reads
-- the ledger in LATER statements, so once the lock is granted the reads see everything the previous holder committed (its lock is released only
-- after its commit is visible). Under REPEATABLE READ/SERIALIZABLE the snapshot is fixed at the first query, which would defeat that, so those
-- levels are refused for ledger writes (PostgREST and the Supabase client use READ COMMITTED).
create or replace function public.kita_lock_user(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if current_setting('transaction_isolation') <> 'read committed' then
    raise exception 'KITA: Savings changes need the default READ COMMITTED isolation level.' using errcode = 'P0001';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('kita:ledger:' || p_user::text, 0));
end $$;

create or replace function public.kita_ledger_check(p_user uuid, p_guard_current boolean default false) returns void
language plpgsql security definer set search_path = '' as $$
declare
  r record;
  cur numeric;
begin
  if not exists (select 1 from public.profiles where id = p_user) then return; end if;
  perform public.kita_lock_user(p_user);
  for r in
    select b.goal_id, b.bal, g.name, (g.archived_at is not null) as archived from (
      select f.goal_id, sum(f.d) as bal from (
        select goal_id, case type when 'income' then amount else -amount end as d from public.transactions where user_id = p_user and balance = 'savings'
        union all select goal_id, case direction when 'to_savings' then amount else -amount end from public.savings_transfers where user_id = p_user
        union all select goal_id, amount from public.savings_contributions where user_id = p_user
        union all select to_goal_id, amount from public.savings_reallocations where user_id = p_user
        union all select from_goal_id, -amount from public.savings_reallocations where user_id = p_user
      ) f group by f.goal_id
    ) b left join public.savings_goals g on g.id = b.goal_id
    where b.bal < 0 or (coalesce(g.archived_at is not null, false) and b.bal <> 0)
    order by b.goal_id nulls first
  loop
    if r.goal_id is null then
      raise exception 'KITA: Not enough unassigned Savings for this. Pick a goal that has enough saved, or move more money to Savings first.' using errcode = 'P0001';
    elsif r.archived then
      raise exception 'KITA: "%" was deleted, so it cannot hold money. This change would leave it with a balance.', coalesce(r.name, 'That goal') using errcode = 'P0001';
    end if;
    raise exception 'KITA: "%" would be left with less than zero saved. Reduce the amount, or move money into that goal first.', coalesce(r.name, 'That goal') using errcode = 'P0001';
  end loop;
  if p_guard_current then
    select coalesce(sum(x.d), 0) into cur from (
      select case type when 'income' then amount else -amount end as d from public.transactions where user_id = p_user and balance = 'current'
      union all select case direction when 'to_current' then amount else -amount end from public.savings_transfers where user_id = p_user
    ) x;
    if cur < 0 then
      raise exception 'KITA: Not enough in Current Balance. That money has already been spent or moved to Savings. Move money back from Savings first.' using errcode = 'P0001';
    end if;
  end if;
end $$;

-- 3) Triggers (same pattern as savings_transfers: the check runs INSIDE the writing statement, under the per-user lock) -----------------
-- A contribution only ever adds money, so inserting one cannot break a balance; deleting one (undo) can, and the ledger check refuses that.
-- Bulk mode (restore / delete-all) is honoured exactly like the other ledger triggers: those functions re-check the whole ledger once at the end.
create or replace function public.kita_contribution_ledger_trg() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid;
begin
  if coalesce(current_setting('kita.bulk_mode', true), '') = 'on' then return null; end if;
  if tg_op = 'DELETE' then uid := old.user_id; else uid := new.user_id; end if;
  perform public.kita_ledger_check(uid, false);
  return null;
end $$;

drop trigger if exists savings_contributions_ledger_chk on public.savings_contributions;
create trigger savings_contributions_ledger_chk after insert or update or delete on public.savings_contributions
  for each row execute function public.kita_contribution_ledger_trg();
-- New activity may not point at an archived (deleted) goal. kita_goal_ref_trg's generic branch reads NEW.goal_id, which this table has.
drop trigger if exists savings_contributions_goal_ref on public.savings_contributions;
create trigger savings_contributions_goal_ref before insert or update on public.savings_contributions
  for each row execute function public.kita_goal_ref_trg();

-- 4) Row Level Security: same ownership rule as every other table -------------------------------------------------------------------------
alter table public.savings_contributions enable row level security;
drop policy if exists savings_contributions_select_own on public.savings_contributions;
drop policy if exists savings_contributions_insert_own on public.savings_contributions;
drop policy if exists savings_contributions_delete_own on public.savings_contributions;
create policy savings_contributions_select_own on public.savings_contributions for select to authenticated using (user_id = (select auth.uid()));
create policy savings_contributions_insert_own on public.savings_contributions for insert to authenticated with check (user_id = (select auth.uid()));
create policy savings_contributions_delete_own on public.savings_contributions for delete to authenticated using (user_id = (select auth.uid()));

-- Table privileges. Supabase's default privileges give anon and authenticated EVERY privilege on a new public table and rely on RLS alone. RLS does not
-- cover TRUNCATE (or REFERENCES / TRIGGER), and this table has no UPDATE policy, so narrow it to exactly what the app does: signed-in users may read,
-- add and delete (undo) their own rows; nothing else, and nothing for anon. service_role is deliberately NOT touched: it keeps the platform defaults
-- and bypasses RLS as it does for every other table. The security-definer functions run as the table owner and are unaffected. (Same idea as the
-- existing savings_goals hardening, which grants only name / target_amount for UPDATE.)
revoke all on public.savings_contributions from public, anon, authenticated;
grant select, insert, delete on public.savings_contributions to authenticated;

-- 5) Backup, restore, delete all data: now include contributions ---------------------------------------------------------------------------
create or replace function public.export_my_data() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'KITA: Please sign in again.' using errcode = '42501'; end if;
  return jsonb_build_object(
    'profile', (select jsonb_build_object('currency', p.currency) from public.profiles p where p.id = uid),
    'categories', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'type', c.type, 'color', c.color, 'icon', c.icon,
        'preset_key', c.preset_key, 'archived_at', c.archived_at, 'created_at', c.created_at) order by c.created_at, c.id)
      from public.categories c where c.user_id = uid), '[]'::jsonb),
    'budgets', coalesce((select jsonb_agg(jsonb_build_object('id', b.id, 'category_id', b.category_id, 'name', b.name, 'icon', b.icon,
        'amount', b.amount, 'month', b.month, 'created_at', b.created_at) order by b.month, b.created_at, b.id)
      from public.budgets b where b.user_id = uid), '[]'::jsonb),
    'transactions', coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'category_id', t.category_id, 'amount', t.amount, 'type', t.type,
        'description', t.description, 'transaction_date', t.transaction_date, 'notes', t.notes, 'balance', t.balance, 'goal_id', t.goal_id,
        'created_at', t.created_at) order by t.transaction_date, t.created_at, t.id)
      from public.transactions t where t.user_id = uid), '[]'::jsonb),
    'savings_goals', coalesce((select jsonb_agg(jsonb_build_object('id', g.id, 'name', g.name, 'target_amount', g.target_amount,
        'archived_at', g.archived_at, 'created_at', g.created_at) order by g.created_at, g.id)
      from public.savings_goals g where g.user_id = uid), '[]'::jsonb),
    'savings_transfers', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'direction', s.direction, 'amount', s.amount,
        'transfer_date', s.transfer_date, 'note', s.note, 'goal_id', s.goal_id, 'created_at', s.created_at) order by s.transfer_date, s.created_at, s.id)
      from public.savings_transfers s where s.user_id = uid), '[]'::jsonb),
    'savings_reallocations', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'from_goal_id', r.from_goal_id, 'to_goal_id', r.to_goal_id,
        'amount', r.amount, 'allocation_date', r.allocation_date, 'note', r.note, 'created_at', r.created_at) order by r.allocation_date, r.created_at, r.id)
      from public.savings_reallocations r where r.user_id = uid), '[]'::jsonb),
    'savings_contributions', coalesce((select jsonb_agg(jsonb_build_object('id', k.id, 'goal_id', k.goal_id, 'amount', k.amount,
        'contribution_date', k.contribution_date, 'note', k.note, 'created_at', k.created_at) order by k.contribution_date, k.created_at, k.id)
      from public.savings_contributions k where k.user_id = uid), '[]'::jsonb)
  );
end $$;

create or replace function public.restore_user_data(p_payload jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  sect text;
  n_cat int; n_bud int; n_tx int; n_goal int; n_tr int; n_re int; n_co int;
  contribs jsonb;
begin
  if uid is null then raise exception 'KITA: Please sign in again.' using errcode = '42501'; end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then raise exception 'KITA: This is not a TrackMyKita backup.' using errcode = 'P0001'; end if;
  if p_payload->>'format' is distinct from 'trackmykita-backup' then raise exception 'KITA: This is not a TrackMyKita backup.' using errcode = 'P0001'; end if;
  if p_payload->>'version' is distinct from '1' then raise exception 'KITA: This backup was made by a version of TrackMyKita that this one cannot restore.' using errcode = 'P0001'; end if;
  foreach sect in array array['categories', 'budgets', 'transactions', 'savings_goals', 'savings_transfers', 'savings_reallocations'] loop
    if p_payload->sect is null or jsonb_typeof(p_payload->sect) <> 'array' then
      raise exception 'KITA: This backup is damaged (the "%" section is missing or unreadable).', sect using errcode = 'P0001';
    end if;
    if jsonb_array_length(p_payload->sect) > 200000 then raise exception 'KITA: This backup is too large to restore.' using errcode = 'P0001'; end if;
  end loop;

  -- v1.3.5: contributions are an OPTIONAL section, so backups made before this version restore exactly as before.
  contribs := coalesce(nullif(p_payload->'savings_contributions', 'null'::jsonb), '[]'::jsonb);   -- a missing key and an explicit null both mean "none"
  if jsonb_typeof(contribs) <> 'array' then raise exception 'KITA: This backup is damaged (the "savings_contributions" section is unreadable).' using errcode = 'P0001'; end if;
  if jsonb_array_length(contribs) > 200000 then raise exception 'KITA: This backup is too large to restore.' using errcode = 'P0001'; end if;

  perform public.kita_lock_user(uid);
  perform set_config('kita.bulk_mode', 'on', true);   -- this transaction only; see section 3

  create temp table if not exists kita_map_cat (
    old_id text primary key,
    new_id uuid not null
  ) on commit drop;

  create temp table if not exists kita_map_goal (
    old_id text primary key,
    new_id uuid not null
  ) on commit drop;

  truncate table pg_temp.kita_map_cat, pg_temp.kita_map_goal;
  insert into pg_temp.kita_map_cat select c->>'id', gen_random_uuid() from jsonb_array_elements(p_payload->'categories') c;
  insert into pg_temp.kita_map_goal select g->>'id', gen_random_uuid() from jsonb_array_elements(p_payload->'savings_goals') g;

  -- every reference must point at a record inside the backup
  if exists (select 1 from jsonb_array_elements(p_payload->'transactions') t
             where (nullif(t->>'category_id', '') is not null and not exists (select 1 from pg_temp.kita_map_cat m where m.old_id = t->>'category_id'))
                or (nullif(t->>'goal_id', '') is not null and not exists (select 1 from pg_temp.kita_map_goal m where m.old_id = t->>'goal_id')))
     or exists (select 1 from jsonb_array_elements(p_payload->'budgets') b
             where nullif(b->>'category_id', '') is not null and not exists (select 1 from pg_temp.kita_map_cat m where m.old_id = b->>'category_id'))
     or exists (select 1 from jsonb_array_elements(p_payload->'savings_transfers') s
             where nullif(s->>'goal_id', '') is not null and not exists (select 1 from pg_temp.kita_map_goal m where m.old_id = s->>'goal_id'))
     or exists (select 1 from jsonb_array_elements(contribs) k
             where nullif(k->>'goal_id', '') is not null and not exists (select 1 from pg_temp.kita_map_goal m where m.old_id = k->>'goal_id'))
     or exists (select 1 from jsonb_array_elements(p_payload->'savings_reallocations') r
             where (nullif(r->>'from_goal_id', '') is not null and not exists (select 1 from pg_temp.kita_map_goal m where m.old_id = r->>'from_goal_id'))
                or (nullif(r->>'to_goal_id', '') is not null and not exists (select 1 from pg_temp.kita_map_goal m where m.old_id = r->>'to_goal_id')))
  then
    raise exception 'KITA: This backup is damaged (some records point at something that is not in the file).' using errcode = 'P0001';
  end if;

  -- replace: child tables first
  delete from public.savings_reallocations where user_id = uid;
  delete from public.savings_contributions where user_id = uid;
  delete from public.savings_transfers where user_id = uid;
  delete from public.transactions where user_id = uid;
  delete from public.budgets where user_id = uid;
  delete from public.savings_goals where user_id = uid;
  delete from public.categories where user_id = uid;

  insert into public.categories (id, user_id, name, type, color, icon, preset_key, archived_at, created_at)
  select m.new_id, uid, trim(c->>'name'), c->>'type', coalesce(nullif(c->>'color', ''), 'grey'), nullif(c->>'icon', ''), nullif(c->>'preset_key', ''),
         nullif(c->>'archived_at', '')::timestamptz, coalesce(nullif(c->>'created_at', '')::timestamptz, now())
  from jsonb_array_elements(p_payload->'categories') c join pg_temp.kita_map_cat m on m.old_id = c->>'id';
  get diagnostics n_cat = row_count;

  insert into public.savings_goals (id, user_id, name, target_amount, archived_at, created_at)
  select m.new_id, uid, g->>'name', (g->>'target_amount')::numeric, nullif(g->>'archived_at', '')::timestamptz, coalesce(nullif(g->>'created_at', '')::timestamptz, now())
  from jsonb_array_elements(p_payload->'savings_goals') g join pg_temp.kita_map_goal m on m.old_id = g->>'id';
  get diagnostics n_goal = row_count;

  insert into public.budgets (user_id, category_id, name, icon, amount, month, created_at)
  select uid, mc.new_id, nullif(trim(b->>'name'), ''), nullif(b->>'icon', ''), (b->>'amount')::numeric, (b->>'month')::date, coalesce(nullif(b->>'created_at', '')::timestamptz, now())
  from jsonb_array_elements(p_payload->'budgets') b left join pg_temp.kita_map_cat mc on mc.old_id = b->>'category_id';
  get diagnostics n_bud = row_count;

  insert into public.transactions (user_id, category_id, amount, type, description, transaction_date, notes, balance, goal_id, created_at)
  select uid, mc.new_id, (t->>'amount')::numeric, t->>'type', nullif(t->>'description', ''), (t->>'transaction_date')::date, nullif(t->>'notes', ''),
         coalesce(nullif(t->>'balance', ''), 'current'), mg.new_id, coalesce(nullif(t->>'created_at', '')::timestamptz, now())
  from jsonb_array_elements(p_payload->'transactions') t
  left join pg_temp.kita_map_cat mc on mc.old_id = t->>'category_id'
  left join pg_temp.kita_map_goal mg on mg.old_id = t->>'goal_id';
  get diagnostics n_tx = row_count;

  insert into public.savings_transfers (user_id, direction, amount, transfer_date, note, goal_id, created_at)
  select uid, s->>'direction', (s->>'amount')::numeric, (s->>'transfer_date')::date, nullif(s->>'note', ''), mg.new_id, coalesce(nullif(s->>'created_at', '')::timestamptz, now())
  from jsonb_array_elements(p_payload->'savings_transfers') s left join pg_temp.kita_map_goal mg on mg.old_id = s->>'goal_id';
  get diagnostics n_tr = row_count;

  insert into public.savings_reallocations (user_id, from_goal_id, to_goal_id, amount, allocation_date, note, created_at)
  select uid, mf.new_id, mt.new_id, (r->>'amount')::numeric, (r->>'allocation_date')::date, nullif(r->>'note', ''), coalesce(nullif(r->>'created_at', '')::timestamptz, now())
  from jsonb_array_elements(p_payload->'savings_reallocations') r
  left join pg_temp.kita_map_goal mf on mf.old_id = r->>'from_goal_id'
  left join pg_temp.kita_map_goal mt on mt.old_id = r->>'to_goal_id';
  get diagnostics n_re = row_count;

  insert into public.savings_contributions (user_id, goal_id, amount, contribution_date, note, created_at)
  select uid, mg.new_id, (k->>'amount')::numeric, (k->>'contribution_date')::date, case when btrim(coalesce(k->>'note', '')) = '' then null else k->>'note' end, coalesce(nullif(k->>'created_at', '')::timestamptz, now())
  from jsonb_array_elements(contribs) k left join pg_temp.kita_map_goal mg on mg.old_id = k->>'goal_id';
  get diagnostics n_co = row_count;

  if nullif(p_payload#>>'{profile,currency}', '') is not null then
    update public.profiles set currency = p_payload#>>'{profile,currency}' where id = uid;
  end if;

  perform set_config('kita.bulk_mode', 'off', true);
  perform public.kita_provision_categories(uid, false);   -- an old backup may predate some presets
  perform public.kita_ledger_check(uid, false);           -- the restored ledger as a whole must be valid, or everything is undone
  return jsonb_build_object('categories', n_cat, 'budgets', n_bud, 'transactions', n_tx, 'savings_goals', n_goal, 'savings_transfers', n_tr, 'savings_reallocations', n_re, 'savings_contributions', n_co);
exception
  when sqlstate 'P0001' or sqlstate '42501' then raise;   -- our own readable messages pass through untouched
  when others then
    raise exception 'KITA: The backup could not be restored, so nothing was changed. (%)', sqlerrm using errcode = 'P0001';
end $$;

create or replace function public.delete_all_my_data() returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'KITA: Please sign in again.' using errcode = '42501'; end if;
  perform public.kita_lock_user(uid);
  perform set_config('kita.bulk_mode', 'on', true);
  delete from public.savings_reallocations where user_id = uid;
  delete from public.savings_contributions where user_id = uid;
  delete from public.savings_transfers where user_id = uid;
  delete from public.transactions where user_id = uid;
  delete from public.budgets where user_id = uid;
  delete from public.savings_goals where user_id = uid;
  delete from public.categories where user_id = uid;
  update public.profiles set currency = 'PHP' where id = uid;
  perform set_config('kita.bulk_mode', 'off', true);
  perform public.kita_provision_categories(uid, false);
  perform public.kita_ledger_check(uid, false);
end $$;

-- 6) Function privileges (the three data tools keep their 1.3.4 grants; every internal helper is owner-only) ------------------------------------------------------
revoke all on function public.kita_bucket(uuid, uuid) from public, anon, authenticated;
revoke all on function public.kita_ledger_check(uuid, boolean) from public, anon, authenticated;
revoke all on function public.kita_contribution_ledger_trg() from public, anon, authenticated;
-- kita_lock_user(uuid) is NOT redefined here. It stays an internal helper (owner only); the security-definer ledger functions and triggers call it as the owner.
revoke all on function public.kita_lock_user(uuid) from public, anon, authenticated;
revoke all on function public.export_my_data() from public, anon;
revoke all on function public.restore_user_data(jsonb) from public, anon;
revoke all on function public.delete_all_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;
grant execute on function public.restore_user_data(jsonb) to authenticated;
grant execute on function public.delete_all_my_data() to authenticated;
