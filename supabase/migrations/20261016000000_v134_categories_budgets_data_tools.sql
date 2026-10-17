-- TrackMyKita 1.3.4: category icons + presets, budget-only custom budgets, backup / restore, delete all data.
-- Requires the 1.3.1 migration (20261014000000_savings_and_balances.sql). Apply to LOCAL or STAGING first:  supabase db push
-- Additive where possible. Nothing is dropped except ONE constraint that is replaced by an equivalent partial unique index (section 1).
-- No row is deleted or rewritten by this migration itself. Existing RLS policies are untouched. Run it once; it is safe to run again.
--
-- WHAT IT ADDS
--   categories.icon / preset_key / archived_at   icon id (see src/utils/icons.js); which built-in preset a row is; archived instead of deleted when used
--   budgets.name / icon, budgets.category_id nullable   a budget can be a BUDGET-ONLY custom budget (no expense category) or point at an expense category
--   ensure_default_categories(restore)           idempotent: gives the signed-in user their own copy of the 19 + 19 presets
--   export_my_data()                             one consistent snapshot of the signed-in user's data, as JSON (no user ids, no credentials)
--   restore_user_data(payload)                   replaces the signed-in user's app data with a validated backup, all or nothing
--   delete_all_my_data()                         empties the signed-in user's app data, restores the presets, keeps the account

-- 1) Categories -------------------------------------------------------------------------------------------------------------------------
alter table public.categories add column if not exists icon text;
alter table public.categories add column if not exists preset_key text;
alter table public.categories add column if not exists archived_at timestamptz;

do $$
declare c record;
begin
  if not exists (select 1 from pg_constraint where conname = 'categories_icon_format_chk' and conrelid = 'public.categories'::regclass) then
    alter table public.categories add constraint categories_icon_format_chk
      check (icon is null or (icon ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(icon) <= 40));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'categories_preset_key_chk' and conrelid = 'public.categories'::regclass) then
    alter table public.categories add constraint categories_preset_key_chk
      check (preset_key is null or (preset_key ~ '^(income|expense):[a-z0-9]+(-[a-z0-9]+)*$' and split_part(preset_key, ':', 1) = type));
  end if;
  -- The original UNIQUE (user_id, name, type) would make an archived category keep its name forever. It is replaced by an index that applies to
  -- ACTIVE categories only (same rule for everything the user can see). Nothing else references this constraint.
  for c in
    select conname from pg_constraint
    where conrelid = 'public.categories'::regclass and contype = 'u' and pg_get_constraintdef(oid) = 'UNIQUE (user_id, name, type)'
  loop
    execute format('alter table public.categories drop constraint %I', c.conname);
  end loop;
end $$;
create unique index if not exists categories_user_name_type_active_idx on public.categories (user_id, name, type) where archived_at is null;
create unique index if not exists categories_user_preset_key_idx on public.categories (user_id, preset_key) where preset_key is not null;

-- 2) Budgets ----------------------------------------------------------------------------------------------------------------------------
-- A budget either points at an expense category (spending is read from that category's transactions, as before) or is a budget-only custom budget
-- (category_id NULL, own name and icon, no spending is tracked). Creating a custom budget never creates a category.
-- The composite foreign keys ignore a NULL category_id, so they still guard every budget that does point at a category.
alter table public.budgets alter column category_id drop not null;
alter table public.budgets add column if not exists name text;
alter table public.budgets add column if not exists icon text;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'budgets_name_len_chk' and conrelid = 'public.budgets'::regclass) then
    alter table public.budgets add constraint budgets_name_len_chk check (name is null or length(trim(name)) between 1 and 40);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'budgets_icon_format_chk' and conrelid = 'public.budgets'::regclass) then
    alter table public.budgets add constraint budgets_icon_format_chk check (icon is null or (icon ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(icon) <= 40));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'budgets_has_target_chk' and conrelid = 'public.budgets'::regclass) then
    alter table public.budgets add constraint budgets_has_target_chk check (category_id is not null or name is not null);
  end if;
end $$;
-- unique (user_id, category_id, month) already stops two budgets for one category in a month; this does the same for budget-only budgets by name.
create unique index if not exists budgets_user_custom_name_month_idx on public.budgets (user_id, lower(trim(name)), month) where category_id is null;

-- 3) Bulk mode for the ledger triggers --------------------------------------------------------------------------------------------------
-- Restore and delete-all write many rows in ONE transaction, in table order, so a row-by-row check would reject perfectly valid data halfway
-- through (for example an expense paid from Savings is inserted before the transfer that funded it). Those two functions switch bulk mode on for
-- their own transaction only (set_config(..., true)), and call kita_ledger_check once at the end; any problem rolls EVERYTHING back.
-- The trigger bodies below are the 1.3.1 bodies, unchanged, plus one early return. Browsers cannot set this setting: PostgREST only runs the
-- functions exposed in the public schema.
create or replace function public.kita_tx_ledger_trg() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid;
  guard boolean := false;
  touches boolean := false;
begin
  -- v1.3.4: restore / delete-all run with bulk mode on and re-check the whole ledger once at the end (kita_ledger_check).
  if coalesce(current_setting('kita.bulk_mode', true), '') = 'on' then return null; end if;
  -- NEW only exists for INSERT/UPDATE and OLD only for UPDATE/DELETE, so each is read only inside the branch where it exists.
  if tg_op = 'DELETE' then
    uid := old.user_id;
    touches := (old.balance = 'savings');
  elsif tg_op = 'INSERT' then
    uid := new.user_id;
    touches := (new.balance = 'savings');
  else
    uid := new.user_id;
    touches := (new.balance = 'savings') or (old.balance = 'savings');
  end if;
  -- Taking income away from Current Balance (edit/delete) is refused if it would leave Current Balance negative, but only for people who have
  -- already moved money to Savings. Everyone else keeps the original behaviour.
  if tg_op <> 'INSERT' then
    if old.type = 'income' and old.balance = 'current'
       and exists (select 1 from public.savings_transfers t where t.user_id = old.user_id and t.direction = 'to_savings') then
      guard := true;
    end if;
  end if;
  if guard or touches then perform public.kita_ledger_check(uid, guard); end if;
  return null;
end $$;

create or replace function public.kita_transfer_ledger_trg() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid;
  guard boolean := false;
begin
  -- v1.3.4: restore / delete-all run with bulk mode on and re-check the whole ledger once at the end (kita_ledger_check).
  if coalesce(current_setting('kita.bulk_mode', true), '') = 'on' then return null; end if;
  -- Moving money into Savings, or undoing a withdrawal, takes money out of Current Balance, so Current Balance must stay >= 0.
  if tg_op = 'DELETE' then
    uid := old.user_id;
    guard := (old.direction = 'to_current');
  elsif tg_op = 'INSERT' then
    uid := new.user_id;
    guard := (new.direction = 'to_savings');
  else
    uid := new.user_id;
    guard := (new.direction = 'to_savings') or (old.direction = 'to_current');
  end if;
  perform public.kita_ledger_check(uid, guard);
  return null;
end $$;

create or replace function public.kita_realloc_ledger_trg() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid;
begin
  -- v1.3.4: restore / delete-all run with bulk mode on and re-check the whole ledger once at the end (kita_ledger_check).
  if coalesce(current_setting('kita.bulk_mode', true), '') = 'on' then return null; end if;
  -- Also used by savings_goals (after archiving), which has no DELETE trigger.
  if tg_op = 'DELETE' then uid := old.user_id; else uid := new.user_id; end if;
  perform public.kita_ledger_check(uid, false);
  return null;
end $$;

create or replace function public.kita_goal_ref_trg() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- v1.3.4: restore / delete-all run with bulk mode on and re-check the whole ledger once at the end (kita_ledger_check).
  if coalesce(current_setting('kita.bulk_mode', true), '') = 'on' then return new; end if;
  -- BEFORE INSERT OR UPDATE only: NEW always exists, OLD only for UPDATE.
  if tg_table_name = 'savings_reallocations' then
    if tg_op = 'INSERT' then
      perform public.kita_assert_goal_active(new.from_goal_id);
      perform public.kita_assert_goal_active(new.to_goal_id);
    else
      if new.from_goal_id is distinct from old.from_goal_id then perform public.kita_assert_goal_active(new.from_goal_id); end if;
      if new.to_goal_id is distinct from old.to_goal_id then perform public.kita_assert_goal_active(new.to_goal_id); end if;
    end if;
  else
    if tg_op = 'INSERT' then
      perform public.kita_assert_goal_active(new.goal_id);
    elsif new.goal_id is distinct from old.goal_id then
      perform public.kita_assert_goal_active(new.goal_id);
    end if;
  end if;
  return new;
end $$;

-- 4) Built-in presets -------------------------------------------------------------------------------------------------------------------
-- Each user gets their OWN rows. A preset already provisioned for the user (even if archived, i.e. deleted by them) is never created again,
-- an existing active category with the same name and type is adopted as that preset (no duplicate), and a user's edits never touch anything shared.
-- p_restore = true only brings back presets the user deleted; it does not overwrite names or icons the user changed.
create or replace function public.kita_provision_categories(p_user uuid, p_restore boolean default false) returns void
language plpgsql security definer set search_path = '' as $$
declare
  p record;
  existing_id uuid;
begin
  if p_user is null or not exists (select 1 from public.profiles where id = p_user) then return; end if;
  perform public.kita_lock_user(p_user);   -- two tabs provisioning at once cannot interleave
  for p in
    select * from (values
    ('expense', 'expense:housing-rent', 'Housing & Rent', 'home', 'blue'),
    ('expense', 'expense:bills-utilities', 'Bills & Utilities', 'zap', 'yellow'),
    ('expense', 'expense:groceries', 'Groceries', 'shopping-cart', 'green'),
    ('expense', 'expense:food-dining', 'Food & Dining', 'utensils', 'orange'),
    ('expense', 'expense:transportation', 'Transportation', 'car', 'cyan'),
    ('expense', 'expense:shopping', 'Shopping', 'shopping-bag', 'pink'),
    ('expense', 'expense:health-medical', 'Health & Medical', 'stethoscope', 'red'),
    ('expense', 'expense:personal-care', 'Personal Care', 'scissors', 'purple'),
    ('expense', 'expense:education', 'Education', 'graduation-cap', 'violet'),
    ('expense', 'expense:entertainment', 'Entertainment', 'film', 'purple'),
    ('expense', 'expense:travel', 'Travel', 'plane', 'teal'),
    ('expense', 'expense:family-kids', 'Family & Kids', 'baby', 'pink'),
    ('expense', 'expense:pets', 'Pets', 'paw-print', 'brown'),
    ('expense', 'expense:insurance', 'Insurance', 'shield-check', 'blue'),
    ('expense', 'expense:debt-loans', 'Debt & Loans', 'landmark', 'red'),
    ('expense', 'expense:subscriptions', 'Subscriptions', 'repeat', 'violet'),
    ('expense', 'expense:gifts-donations', 'Gifts & Donations', 'gift', 'pink'),
    ('expense', 'expense:fees-charges', 'Fees & Charges', 'receipt', 'grey'),
    ('expense', 'expense:other-expenses', 'Other Expenses', 'tags', 'grey'),
    ('income', 'income:salary-wages', 'Salary & Wages', 'banknote', 'green'),
    ('income', 'income:freelance-contract', 'Freelance & Contract', 'laptop', 'teal'),
    ('income', 'income:business-income', 'Business Income', 'briefcase', 'blue'),
    ('income', 'income:bonuses', 'Bonuses', 'award', 'yellow'),
    ('income', 'income:commissions', 'Commissions', 'percent', 'orange'),
    ('income', 'income:tips', 'Tips', 'coins', 'yellow'),
    ('income', 'income:investment-returns', 'Investment Returns', 'trending-up', 'green'),
    ('income', 'income:interest', 'Interest', 'piggy-bank', 'cyan'),
    ('income', 'income:dividends', 'Dividends', 'dollar-sign', 'teal'),
    ('income', 'income:rental-income', 'Rental Income', 'building-2', 'brown'),
    ('income', 'income:sale-of-items', 'Sale of Items', 'tag', 'orange'),
    ('income', 'income:refunds-reimbursements', 'Refunds & Reimbursements', 'refresh-cw', 'blue'),
    ('income', 'income:gifts', 'Gifts', 'gift', 'pink'),
    ('income', 'income:allowance', 'Allowance', 'wallet', 'violet'),
    ('income', 'income:pension-retirement', 'Pension & Retirement', 'umbrella', 'cyan'),
    ('income', 'income:benefits-assistance', 'Benefits & Assistance', 'heart-handshake', 'red'),
    ('income', 'income:royalties', 'Royalties', 'book-open', 'purple'),
    ('income', 'income:awards-prizes', 'Awards & Prizes', 'trophy', 'yellow'),
    ('income', 'income:other-income', 'Other Income', 'box', 'grey')
    ) as v(type, key, name, icon, color)
  loop
    if exists (select 1 from public.categories c where c.user_id = p_user and c.preset_key = p.key) then
      if p_restore then
        update public.categories c set archived_at = null
        where c.user_id = p_user and c.preset_key = p.key and c.archived_at is not null
          and not exists (select 1 from public.categories o where o.user_id = p_user and o.type = c.type and o.name = c.name and o.archived_at is null and o.id <> c.id);
      end if;
      continue;
    end if;
    existing_id := null;
    select c.id into existing_id from public.categories c
      where c.user_id = p_user and c.type = p.type and c.preset_key is null and c.archived_at is null and lower(trim(c.name)) = lower(p.name)
      order by c.created_at, c.id limit 1;
    if existing_id is not null then
      update public.categories set preset_key = p.key, icon = coalesce(icon, p.icon) where id = existing_id;
      continue;
    end if;
    insert into public.categories (user_id, name, type, color, icon, preset_key) values (p_user, p.name, p.type, p.color, p.icon, p.key) on conflict do nothing;
  end loop;
end $$;

create or replace function public.ensure_default_categories(p_restore boolean default false) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'KITA: Please sign in again.' using errcode = '42501'; end if;
  perform public.kita_provision_categories(uid, coalesce(p_restore, false));
end $$;

-- 5) Backup: one consistent snapshot of the signed-in user's own data ---------------------------------------------------------------------
-- STABLE, so every query inside sees the same snapshot. No user ids, no email, no credentials, no storage paths are included.
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
      from public.savings_reallocations r where r.user_id = uid), '[]'::jsonb)
  );
end $$;

-- 6) Restore: REPLACES the signed-in user's app data with the backup, all or nothing -----------------------------------------------------
-- * The user is always auth.uid(). The payload has no user ids and any user_id inside it is ignored.
-- * Every record gets a NEW id; references between records (category, goal) are rewritten through id maps, so a backup can never collide with,
--   read or overwrite anybody else's rows, and restoring the same file twice replaces rather than duplicates.
-- * A reference to something that is not in the backup is an error (nothing is silently dropped or re-pointed).
-- * One function call is one transaction: any error (bad value, broken reference, a savings balance that would go below zero) undoes everything.
create or replace function public.restore_user_data(p_payload jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  sect text;
  n_cat int; n_bud int; n_tx int; n_goal int; n_tr int; n_re int;
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
     or exists (select 1 from jsonb_array_elements(p_payload->'savings_reallocations') r
             where (nullif(r->>'from_goal_id', '') is not null and not exists (select 1 from pg_temp.kita_map_goal m where m.old_id = r->>'from_goal_id'))
                or (nullif(r->>'to_goal_id', '') is not null and not exists (select 1 from pg_temp.kita_map_goal m where m.old_id = r->>'to_goal_id')))
  then
    raise exception 'KITA: This backup is damaged (some records point at something that is not in the file).' using errcode = 'P0001';
  end if;

  -- replace: child tables first
  delete from public.savings_reallocations where user_id = uid;
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

  if nullif(p_payload#>>'{profile,currency}', '') is not null then
    update public.profiles set currency = p_payload#>>'{profile,currency}' where id = uid;
  end if;

  perform set_config('kita.bulk_mode', 'off', true);
  perform public.kita_provision_categories(uid, false);   -- an old backup may predate some presets
  perform public.kita_ledger_check(uid, false);           -- the restored ledger as a whole must be valid, or everything is undone
  return jsonb_build_object('categories', n_cat, 'budgets', n_bud, 'transactions', n_tx, 'savings_goals', n_goal, 'savings_transfers', n_tr, 'savings_reallocations', n_re);
exception
  when sqlstate 'P0001' or sqlstate '42501' then raise;   -- our own readable messages pass through untouched
  when others then
    raise exception 'KITA: The backup could not be restored, so nothing was changed. (%)', sqlerrm using errcode = 'P0001';
end $$;

-- 7) Delete all data: empties the app data, restores the presets, KEEPS THE ACCOUNT -----------------------------------------------------
-- Touches only auth.uid()'s rows. The auth user, the profile row (name, email link, profile picture) and every other user are untouched;
-- the currency preference returns to its default (PHP). Balances are derived from the ledger rows, so they are empty because the rows are gone.
create or replace function public.delete_all_my_data() returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'KITA: Please sign in again.' using errcode = '42501'; end if;
  perform public.kita_lock_user(uid);
  perform set_config('kita.bulk_mode', 'on', true);
  delete from public.savings_reallocations where user_id = uid;
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

-- 8) Privileges -------------------------------------------------------------------------------------------------------------------------
revoke all on function public.kita_provision_categories(uuid, boolean) from public, anon, authenticated;
revoke all on function public.ensure_default_categories(boolean) from public, anon;
revoke all on function public.export_my_data() from public, anon;
revoke all on function public.restore_user_data(jsonb) from public, anon;
revoke all on function public.delete_all_my_data() from public, anon;
grant execute on function public.ensure_default_categories(boolean) to authenticated;
grant execute on function public.export_my_data() to authenticated;
grant execute on function public.restore_user_data(jsonb) to authenticated;
grant execute on function public.delete_all_my_data() to authenticated;
