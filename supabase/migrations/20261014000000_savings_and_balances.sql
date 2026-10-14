-- TrackMyKita 1.3.1: Savings & Balance Management.
-- Additive and idempotent. No rows are deleted or rewritten, no existing policy is changed, nothing is dropped.
-- Apply with:  supabase db push   (local/staging first)
--
-- MODEL (nothing is stored twice; every balance is derived from the ledger rows):
--   transactions.balance   'current' | 'savings'. For income it is the DESTINATION, for an expense the SOURCE. Existing rows get 'current',
--                          which is exactly how they were always treated (balance = income - expenses).
--   transactions.goal_id   optional savings goal. Only allowed when balance = 'savings'.
--   savings_goals          a named target. A goal holds NO money of its own; it earmarks money that already sits in Savings.
--   savings_transfers      money moved between Current Balance and Savings. Never income, never an expense.
--   savings_reallocations  money re-earmarked inside Savings (General <-> goal, goal <-> goal). Never changes either balance.
--
--   Current balance = income(current) - expenses(current) + transfers to_current - transfers to_savings
--   Savings balance = income(savings) - expenses(savings) + transfers to_savings - transfers to_current
--   Goal amount     = same flows filtered to the goal, +/- reallocations.   General (unassigned) = same flows with goal NULL.
--   => sum(goal amounts) + General = Savings balance, always. "Allocated never exceeds Savings" means General >= 0.
--
-- INTEGRITY (see section 5 for the reasoning): after every write that touches Savings, an AFTER ROW trigger takes a per-user advisory lock and then
-- re-checks that user's whole ledger in separate statements. The check therefore runs INSIDE the writing statement (so PostgREST returns the error
-- of that very request, with nothing written), and concurrent writes by the same user are serialized: the second one waits for the first to commit
-- and then sees its rows. Each user action is one statement or one function call, hence atomic. Goal deletion is an archive (history is kept).

-- 1) Savings goals ---------------------------------------------------------------------------------------------------------------------
create table if not exists public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  name text not null check (length(trim(name)) > 0 and length(name) <= 60),
  target_amount numeric(14,2) not null check (target_amount > 0),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)                              -- target for the composite foreign keys (a row can never point at another user's goal)
);
create unique index if not exists savings_goals_user_name_active_idx on public.savings_goals (user_id, lower(trim(name))) where archived_at is null;
create index if not exists savings_goals_user_idx on public.savings_goals (user_id);

-- 2) Balance + goal on transactions ---------------------------------------------------------------------------------------------------
alter table public.transactions add column if not exists balance text not null default 'current';
alter table public.transactions add column if not exists goal_id uuid;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'transactions_balance_chk' and conrelid = 'public.transactions'::regclass) then
    alter table public.transactions add constraint transactions_balance_chk check (balance in ('current','savings'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'transactions_goal_needs_savings_chk' and conrelid = 'public.transactions'::regclass) then
    alter table public.transactions add constraint transactions_goal_needs_savings_chk check (goal_id is null or balance = 'savings');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'transactions_goal_fkey' and conrelid = 'public.transactions'::regclass) then
    alter table public.transactions add constraint transactions_goal_fkey
      foreign key (goal_id, user_id) references public.savings_goals (id, user_id) on delete no action;
  end if;
end $$;
create index if not exists transactions_goal_idx on public.transactions (goal_id) where goal_id is not null;
create index if not exists transactions_user_balance_idx on public.transactions (user_id, balance);

-- 3) Transfers between the two balances (own table: transactions.type keeps meaning only income/expense) -----------------------------------
create table if not exists public.savings_transfers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  direction text not null check (direction in ('to_savings','to_current')),
  amount numeric(14,2) not null check (amount > 0),
  transfer_date date not null,
  note text check (note is null or length(trim(note)) > 0),
  goal_id uuid,                                     -- to_savings: goal receiving the money; to_current: goal the money is taken from. NULL = General Savings.
  created_at timestamptz not null default now(),
  foreign key (goal_id, user_id) references public.savings_goals (id, user_id) on delete no action
);
create index if not exists savings_transfers_user_date_idx on public.savings_transfers (user_id, transfer_date desc);
create index if not exists savings_transfers_goal_idx on public.savings_transfers (goal_id) where goal_id is not null;

-- 4) Re-earmarking money inside Savings (does not touch either balance). NULL goal = General Savings -------------------------------------
create table if not exists public.savings_reallocations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  from_goal_id uuid,
  to_goal_id uuid,
  amount numeric(14,2) not null check (amount > 0),
  allocation_date date not null,
  note text check (note is null or length(trim(note)) > 0),
  created_at timestamptz not null default now(),
  check (from_goal_id is distinct from to_goal_id),
  foreign key (from_goal_id, user_id) references public.savings_goals (id, user_id) on delete no action,
  foreign key (to_goal_id, user_id) references public.savings_goals (id, user_id) on delete no action
);
create index if not exists savings_reallocations_user_date_idx on public.savings_reallocations (user_id, allocation_date desc);
create index if not exists savings_reallocations_from_idx on public.savings_reallocations (from_goal_id) where from_goal_id is not null;
create index if not exists savings_reallocations_to_idx on public.savings_reallocations (to_goal_id) where to_goal_id is not null;

drop trigger if exists savings_goals_updated on public.savings_goals;
create trigger savings_goals_updated before update on public.savings_goals for each row execute function public.set_updated_at();

-- 5) Ledger helpers (internal: not callable through the API) ---------------------------------------------------------------------------
-- Money currently earmarked for one goal (p_goal NULL = General Savings / unassigned).
create or replace function public.kita_bucket(p_user uuid, p_goal uuid) returns numeric
language sql security definer set search_path = '' as $$
  select coalesce(sum(f.d), 0) from (
    select goal_id, case type when 'income' then amount else -amount end as d from public.transactions where user_id = p_user and balance = 'savings'
    union all select goal_id, case direction when 'to_savings' then amount else -amount end from public.savings_transfers where user_id = p_user
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

-- Raises if the ledger is invalid: any goal or General Savings below zero, or a deleted (archived) goal holding any money.
-- p_guard_current additionally refuses to push Current Balance below zero (used only when money that was already moved to Savings is taken
-- away; ordinary expenses keep the app's long-standing behaviour of being allowed to exceed the balance).
-- Takes the user lock FIRST, in its own statement, then reads (see kita_lock_user). Does nothing for a user that no longer exists, so deleting an
-- account (which cascades through these tables in an arbitrary order) is never blocked.
create or replace function public.kita_ledger_check(p_user uuid, p_guard_current boolean default false) returns void
language plpgsql security definer set search_path = '' as $$
declare r record; cur numeric;
begin
  if not exists (select 1 from public.profiles where id = p_user) then return; end if;
  perform public.kita_lock_user(p_user);
  for r in
    select b.goal_id, b.bal, g.name, (g.archived_at is not null) as archived from (
      select f.goal_id, sum(f.d) as bal from (
        select goal_id, case type when 'income' then amount else -amount end as d from public.transactions where user_id = p_user and balance = 'savings'
        union all select goal_id, case direction when 'to_savings' then amount else -amount end from public.savings_transfers where user_id = p_user
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

create or replace function public.kita_assert_goal_active(p_goal uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_goal is not null and exists (select 1 from public.savings_goals where id = p_goal and archived_at is not null) then
    raise exception 'KITA: That savings goal was deleted. Choose another goal or General Savings.' using errcode = 'P0001';
  end if;
end $$;

-- 6) Triggers ----------------------------------------------------------------------------------------------------------------------------
create or replace function public.kita_tx_ledger_trg() returns trigger
language plpgsql security definer set search_path = '' as $$
declare uid uuid := coalesce(new.user_id, old.user_id), guard boolean := false, touches boolean;
begin
  -- Taking income away from Current Balance (edit/delete) is refused if it would leave Current Balance negative, but only for people who have
  -- already moved money to Savings. Everyone else keeps the original behaviour.
  if tg_op in ('UPDATE','DELETE') and old.type = 'income' and old.balance = 'current'
     and exists (select 1 from public.savings_transfers t where t.user_id = old.user_id and t.direction = 'to_savings') then guard := true; end if;
  touches := guard or (tg_op <> 'DELETE' and new.balance = 'savings') or (tg_op <> 'INSERT' and old.balance = 'savings');
  if touches then perform public.kita_ledger_check(uid, guard); end if;
  return null;
end $$;

create or replace function public.kita_transfer_ledger_trg() returns trigger
language plpgsql security definer set search_path = '' as $$
declare uid uuid := coalesce(new.user_id, old.user_id), guard boolean;
begin
  guard := (tg_op <> 'DELETE' and new.direction = 'to_savings') or (tg_op <> 'INSERT' and old.direction = 'to_current');
  perform public.kita_ledger_check(uid, guard);
  return null;
end $$;

create or replace function public.kita_realloc_ledger_trg() returns trigger
language plpgsql security definer set search_path = '' as $$
begin perform public.kita_ledger_check(coalesce(new.user_id, old.user_id), false); return null; end $$;

-- New activity may not point at an archived (deleted) goal.
create or replace function public.kita_goal_ref_trg() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'savings_reallocations' then
    if tg_op = 'INSERT' or new.from_goal_id is distinct from old.from_goal_id then perform public.kita_assert_goal_active(new.from_goal_id); end if;
    if tg_op = 'INSERT' or new.to_goal_id is distinct from old.to_goal_id then perform public.kita_assert_goal_active(new.to_goal_id); end if;
  elsif tg_op = 'INSERT' or new.goal_id is distinct from old.goal_id then
    perform public.kita_assert_goal_active(new.goal_id);
  end if;
  return new;
end $$;

-- A goal can only be archived once it holds nothing, so earmarked money can never get stuck in a hidden goal.
create or replace function public.kita_goal_archive_trg() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.archived_at is null and new.archived_at is not null and public.kita_bucket(new.user_id, new.id) <> 0 then
    raise exception 'KITA: This goal still holds money. Move it to General Savings or another goal first.' using errcode = 'P0001';
  end if;
  return new;
end $$;

-- AFTER ROW triggers (not deferred): they run at the end of the writing statement, inside it, so a violation is an ordinary statement error that
-- PostgREST returns for that request and that undoes the whole statement. They take the user lock and re-check the ledger (kita_ledger_check).
drop trigger if exists transactions_ledger_chk on public.transactions;
create trigger transactions_ledger_chk after insert or update or delete on public.transactions
  for each row execute function public.kita_tx_ledger_trg();
drop trigger if exists savings_transfers_ledger_chk on public.savings_transfers;
create trigger savings_transfers_ledger_chk after insert or update or delete on public.savings_transfers
  for each row execute function public.kita_transfer_ledger_trg();
drop trigger if exists savings_reallocations_ledger_chk on public.savings_reallocations;
create trigger savings_reallocations_ledger_chk after insert or update or delete on public.savings_reallocations
  for each row execute function public.kita_realloc_ledger_trg();
drop trigger if exists savings_goals_ledger_chk on public.savings_goals;
create trigger savings_goals_ledger_chk after update of archived_at on public.savings_goals
  for each row execute function public.kita_realloc_ledger_trg();

drop trigger if exists transactions_goal_ref on public.transactions;
create trigger transactions_goal_ref before insert or update on public.transactions for each row execute function public.kita_goal_ref_trg();
drop trigger if exists savings_transfers_goal_ref on public.savings_transfers;
create trigger savings_transfers_goal_ref before insert or update on public.savings_transfers for each row execute function public.kita_goal_ref_trg();
drop trigger if exists savings_reallocations_goal_ref on public.savings_reallocations;
create trigger savings_reallocations_goal_ref before insert or update on public.savings_reallocations for each row execute function public.kita_goal_ref_trg();
drop trigger if exists savings_goals_archive_chk on public.savings_goals;
create trigger savings_goals_archive_chk before update on public.savings_goals for each row execute function public.kita_goal_archive_trg();

-- 7) Delete a goal safely (one atomic call): move whatever it holds to General Savings or another goal, then archive it. -----------------------
-- The goal row and all history stay; the goal just disappears from lists and pickers.
create or replace function public.archive_savings_goal(p_goal uuid, p_move_to uuid default null, p_date date default current_date) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(), g public.savings_goals; bal numeric;
begin
  if uid is null then raise exception 'KITA: Please sign in again.' using errcode = '42501'; end if;
  select * into g from public.savings_goals where id = p_goal and user_id = uid and archived_at is null;
  if not found then raise exception 'KITA: That savings goal was not found.' using errcode = 'P0001'; end if;
  if p_move_to is not null and p_move_to = p_goal then raise exception 'KITA: Choose a different place for the saved money.' using errcode = 'P0001'; end if;
  perform public.kita_lock_user(uid);   -- first statement of the critical section: the balance below is read AFTER the lock is granted
  bal := public.kita_bucket(uid, g.id);
  if bal > 0 then
    insert into public.savings_reallocations (user_id, from_goal_id, to_goal_id, amount, allocation_date, note)
    values (uid, g.id, p_move_to, bal, coalesce(p_date, current_date), left('Goal deleted: ' || g.name, 120));
  end if;
  update public.savings_goals set archived_at = now() where id = g.id;
end $$;

-- Internal helpers and trigger functions are not part of the API.
revoke all on function public.kita_bucket(uuid, uuid) from public, anon, authenticated;
revoke all on function public.kita_lock_user(uuid) from public, anon, authenticated;
revoke all on function public.kita_ledger_check(uuid, boolean) from public, anon, authenticated;
revoke all on function public.kita_assert_goal_active(uuid) from public, anon, authenticated;
revoke all on function public.kita_tx_ledger_trg() from public, anon, authenticated;
revoke all on function public.kita_transfer_ledger_trg() from public, anon, authenticated;
revoke all on function public.kita_realloc_ledger_trg() from public, anon, authenticated;
revoke all on function public.kita_goal_ref_trg() from public, anon, authenticated;
revoke all on function public.kita_goal_archive_trg() from public, anon, authenticated;
revoke all on function public.archive_savings_goal(uuid, uuid, date) from public, anon;
grant execute on function public.archive_savings_goal(uuid, uuid, date) to authenticated;

-- Clients may only rename a goal or change its target. Archiving (and so un-archiving) goes through archive_savings_goal() alone, which moves the
-- goal's money first and holds the user lock, so a direct UPDATE can neither strand money in a hidden goal nor deadlock with that function.
revoke update on public.savings_goals from authenticated, anon;
grant update (name, target_amount) on public.savings_goals to authenticated;

-- 8) Row Level Security: same ownership rule as every other table. Goals are archived, never deleted by the client (no DELETE policy);
--    transfers and reallocations cannot be edited, only undone (delete), and the ledger check refuses an undo that would break a balance.
alter table public.savings_goals enable row level security;
alter table public.savings_transfers enable row level security;
alter table public.savings_reallocations enable row level security;

do $$
declare t text; op text;
begin
  foreach t in array array['savings_goals','savings_transfers','savings_reallocations'] loop
    foreach op in array case t when 'savings_goals' then array['select','insert','update'] else array['select','insert','delete'] end loop
      execute format('drop policy if exists %1$s_%2$s_own on public.%1$I', t, op);
    end loop;
    execute format('create policy %1$s_select_own on public.%1$I for select to authenticated using (user_id = (select auth.uid()))', t);
    execute format('create policy %1$s_insert_own on public.%1$I for insert to authenticated with check (user_id = (select auth.uid()))', t);
    if t = 'savings_goals' then
      execute format('create policy %1$s_update_own on public.%1$I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
    else
      execute format('create policy %1$s_delete_own on public.%1$I for delete to authenticated using (user_id = (select auth.uid()))', t);
    end if;
  end loop;
end $$;
