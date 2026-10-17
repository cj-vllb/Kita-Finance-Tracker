-- 1.3.4 Category icons + presets, budget-only budgets, backup / restore, delete all data.
-- Run against a LOCAL or DEV/STAGING database only:  supabase test db   (pgTAP; everything rolls back).
-- STATUS: written alongside the migration 20261016000000; NOT YET EXECUTED (no Postgres/Docker was available where it was written).
-- Treat the first run as part of reviewing the migration: fix the test or the SQL, whichever is wrong.
begin;
select no_plan();

insert into auth.users (id, instance_id, aud, role, email) values
  ('aaaaaaaa-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','a@test.dev'),
  ('bbbbbbbb-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','b@test.dev');
-- A has one pre-existing category that has the same name as a preset (must be ADOPTED, not duplicated) and one custom category.
insert into public.categories (id, user_id, name, type, color) values
  ('aaaaaaaa-1111-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-0000000000a1','Groceries','expense','red'),
  ('aaaaaaaa-1111-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-0000000000a1','My custom','expense','blue');
insert into public.transactions (user_id, category_id, amount, type, description, transaction_date) values
  ('aaaaaaaa-0000-0000-0000-0000000000a1','aaaaaaaa-1111-0000-0000-000000000001', 100, 'expense', 'milk', '2026-10-02');
insert into public.categories (user_id, name, type) values ('bbbbbbbb-0000-0000-0000-0000000000b1','B only','expense');
insert into public.transactions (user_id, amount, type, description, transaction_date) values ('bbbbbbbb-0000-0000-0000-0000000000b1', 77, 'income', 'B pay', '2026-10-01');

-- ---------- structure and privileges ----------
select has_column('public', 'categories', 'icon', 'categories.icon');
select has_column('public', 'categories', 'preset_key', 'categories.preset_key');
select has_column('public', 'categories', 'archived_at', 'categories.archived_at');
select has_column('public', 'budgets', 'name', 'budgets.name');
select has_column('public', 'budgets', 'icon', 'budgets.icon');
select col_is_null('public', 'budgets', 'category_id', 'budgets.category_id is nullable (budget-only budgets)');
select ok(not has_function_privilege('authenticated', 'public.kita_provision_categories(uuid, boolean)', 'execute'), 'internal provisioning is not callable through the API');
select ok(not has_function_privilege('anon', 'public.restore_user_data(jsonb)', 'execute'), 'anon cannot restore');
select ok(not has_function_privilege('anon', 'public.delete_all_my_data()', 'execute'), 'anon cannot delete all data');
select ok(not has_function_privilege('anon', 'public.export_my_data()', 'execute'), 'anon cannot export');
select ok(has_function_privilege('authenticated', 'public.restore_user_data(jsonb)', 'execute'), 'signed-in users can restore their own data');
select ok(has_function_privilege('authenticated', 'public.delete_all_my_data()', 'execute'), 'signed-in users can delete their own data');
select ok((select count(*) from pg_constraint where conrelid = 'public.categories'::regclass and pg_get_constraintdef(oid) = 'UNIQUE (user_id, name, type)') = 0, 'old name uniqueness replaced by the active-only index');
select ok(exists (select 1 from pg_indexes where indexname = 'categories_user_name_type_active_idx'), 'active-only unique name index exists');

-- ---------- presets: provisioning is idempotent, adopts same-named categories, never duplicates ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-0000000000a1', true);
select public.ensure_default_categories();
select public.ensure_default_categories();
select public.ensure_default_categories();
select is((select count(*)::int from public.categories where preset_key like 'expense:%'), 19, 'A has exactly 19 expense presets after three calls');
select is((select count(*)::int from public.categories where preset_key like 'income:%'), 19, 'A has exactly 19 income presets after three calls');
select is((select count(*)::int from public.categories where name = 'Groceries'), 1, 'the existing "Groceries" was adopted, not duplicated');
select is((select id::text from public.categories where preset_key = 'expense:groceries'), 'aaaaaaaa-1111-0000-0000-000000000001', 'the adopted row is the original (transactions still point at it)');
select is((select color from public.categories where preset_key = 'expense:groceries'), 'red', 'adoption keeps the user''s own color');
select is((select icon from public.categories where preset_key = 'expense:groceries'), 'shopping-cart', 'adoption fills the missing icon');
select is((select count(*)::int from public.categories where name = 'My custom' and preset_key is null), 1, 'custom category untouched');
select is((select count(*)::int from public.categories), 39, 'A: 38 presets + 1 custom');
-- a deleted (archived) preset is not re-created by later provisioning, but can be restored on request
update public.categories set archived_at = now() where preset_key = 'expense:travel';
select public.ensure_default_categories();
select is((select count(*)::int from public.categories where preset_key = 'expense:travel'), 1, 'archived preset is not duplicated');
select ok((select archived_at is not null from public.categories where preset_key = 'expense:travel'), 'and stays deleted');
select public.ensure_default_categories(true);
select ok((select archived_at is null from public.categories where preset_key = 'expense:travel'), 'restore=true brings it back');
-- an archived category frees its name
update public.categories set archived_at = now() where id = 'aaaaaaaa-1111-0000-0000-000000000002';
select lives_ok($$insert into public.categories (name, type) values ('My custom', 'expense')$$, 'a name used only by an archived category can be reused');
select throws_ok($$insert into public.categories (name, type) values ('My custom', 'expense')$$, '23505', null, 'but two ACTIVE categories cannot share a name');

-- ---------- budgets: budget-only budgets ----------
select lives_ok($$insert into public.budgets (name, icon, amount, month) values ('Trip fund', 'plane', 2000, '2026-10-01')$$, 'budget-only budget (no category) can be created');
select is((select count(*)::int from public.categories where name = 'Trip fund'), 0, 'creating it did not create a category');
select throws_ok($$insert into public.budgets (name, amount, month) values ('trip fund', 5, '2026-10-01')$$, '23505', null, 'same custom name in the same month is refused');
select lives_ok($$insert into public.budgets (name, amount, month) values ('Trip fund', 5, '2026-11-01')$$, 'same custom name in another month is fine');
select throws_ok($$insert into public.budgets (amount, month) values (5, '2026-10-01')$$, '23514', null, 'a budget needs a category or a name');
select lives_ok($$insert into public.budgets (category_id, amount, month) select id, 500, '2026-10-01' from public.categories where preset_key = 'expense:groceries'$$, 'category budget');
select throws_ok($$insert into public.budgets (category_id, amount, month) select id, 9, '2026-10-01' from public.categories where preset_key = 'expense:groceries'$$, '23505', null, 'one budget per category per month');
select throws_ok($$insert into public.budgets (category_id, amount, month) select id, 9, '2026-10-01' from public.categories where preset_key = 'income:salary-wages'$$, null, null, 'a budget cannot point at an income category');
select throws_ok($$insert into public.budgets (name, icon, amount, month) values ('x', 'Not An Icon', 5, '2026-10-01')$$, '23514', null, 'icon ids are validated');
select throws_ok($$update public.categories set icon = 'BAD ICON' where preset_key = 'expense:groceries'$$, '23514', null, 'category icon ids are validated');

-- ---------- export ----------
select is((select jsonb_array_length(public.export_my_data()->'transactions')), 1, 'export has A''s transaction only');
select ok(not (public.export_my_data()::text like '%user_id%') and not (public.export_my_data()::text like '%a@test.dev%'), 'export has no user id or email');
select ok(not (public.export_my_data()::text like '%B pay%') and not (public.export_my_data()::text like '%B only%'), 'export has nothing of B');
create temp table kita_snapshot as select public.export_my_data() as j;
grant all on kita_snapshot to authenticated;

-- ---------- restore: bad input changes NOTHING ----------
select throws_ok($$select public.restore_user_data('{"format":"nope"}'::jsonb)$$, 'P0001', null, 'wrong format refused');
select throws_ok($$select public.restore_user_data('[]'::jsonb)$$, 'P0001', null, 'non-object refused');
select throws_ok($$select public.restore_user_data('{"format":"trackmykita-backup","version":2}'::jsonb)$$, 'P0001', null, 'unknown version refused');
select throws_ok($$select public.restore_user_data('{"format":"trackmykita-backup","version":1,"categories":[]}'::jsonb)$$, 'P0001', null, 'missing sections refused');
select throws_ok($$select public.restore_user_data((select j || '{"format":"trackmykita-backup","version":1}'::jsonb || jsonb_build_object('transactions', jsonb_build_array(jsonb_build_object('id','x','category_id','missing','amount',5,'type','expense','transaction_date','2026-10-01','balance','current')), 'budgets','[]'::jsonb) from kita_snapshot))$$, 'P0001', null, 'dangling category reference refused');
select throws_ok($$select public.restore_user_data((select j || '{"format":"trackmykita-backup","version":1}'::jsonb || jsonb_build_object('transactions', jsonb_build_array(jsonb_build_object('id','x','amount',-5,'type','expense','transaction_date','2026-10-01','balance','current'))) from kita_snapshot))$$, 'P0001', null, 'invalid amount refused by the table rules (whole restore undone)');
select is((select count(*)::int from public.transactions), 1, 'after the failed restores A still has her transaction');
select is((select count(*)::int from public.categories), 40, 'and her categories');
select ok(coalesce(current_setting('kita.bulk_mode', true), '') <> 'on', 'bulk mode is never left switched on');

-- ---------- restore: a good backup replaces, remaps ids, keeps relations, ignores user ids ----------
select lives_ok($$select public.restore_user_data((select j || '{"format":"trackmykita-backup","version":1}'::jsonb from kita_snapshot))$$, 'restoring A''s own export works');
select is((select count(*)::int from public.transactions where description = 'milk'), 1, 'exactly one "milk" after restoring (replaced, not duplicated)');
select isnt((select id::text from public.categories where preset_key = 'expense:groceries'), 'aaaaaaaa-1111-0000-0000-000000000001', 'records got new ids');
select is((select c.preset_key from public.transactions t join public.categories c on c.id = t.category_id and c.user_id = t.user_id where t.description = 'milk'), 'expense:groceries', 'transaction still points at its category');
select is((select count(*)::int from public.categories where preset_key like 'expense:%'), 19, 'no duplicate presets after restore');
select ok((select archived_at is not null from public.categories where name = 'My custom' and archived_at is not null limit 1), 'archived categories stay archived');
select is((select count(*)::int from public.budgets where name = 'Trip fund'), 2, 'budget-only budgets restored');
reset role;
select is((select count(*)::int from public.transactions where user_id = 'bbbbbbbb-0000-0000-0000-0000000000b1'), 1, 'B''s transaction untouched by A''s restore');
select is((select count(*)::int from public.categories where user_id = 'bbbbbbbb-0000-0000-0000-0000000000b1'), 1, 'B''s category untouched');
-- a backup that carries someone else''s user ids is still restored into the CALLER only
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-0000000000b1', true);
select lives_ok($$select public.restore_user_data((select j || '{"format":"trackmykita-backup","version":1,"user_id":"aaaaaaaa-0000-0000-0000-0000000000a1"}'::jsonb from kita_snapshot))$$, 'B restoring A''s file works for B');
reset role;
select is((select count(*)::int from public.transactions where description = 'milk' and user_id = 'bbbbbbbb-0000-0000-0000-0000000000b1'), 1, 'the data landed in B''s account');
select is((select count(*)::int from public.transactions where description = 'milk' and user_id = 'aaaaaaaa-0000-0000-0000-0000000000a1'), 1, 'and A still has exactly her own copy');

-- ---------- delete all data ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-0000000000a1', true);
update public.categories set name = 'Renamed', icon = 'star' where preset_key = 'expense:pets';
insert into public.savings_goals (name, target_amount) values ('Goal', 100);
select lives_ok($$select public.delete_all_my_data()$$, 'delete all data runs');
select is((select count(*)::int from public.transactions), 0, 'no transactions');
select is((select count(*)::int from public.budgets), 0, 'no budgets');
select is((select count(*)::int from public.savings_goals), 0, 'no goals');
select is((select count(*)::int from public.categories), 38, 'only the 38 presets remain');
select is((select name from public.categories where preset_key = 'expense:pets'), 'Pets', 'edited preset is back to its default name');
select is((select icon from public.categories where preset_key = 'expense:pets'), 'paw-print', 'and its default icon');
select is((select count(*)::int from public.categories where preset_key is null), 0, 'custom categories are gone');
select ok(coalesce(current_setting('kita.bulk_mode', true), '') <> 'on', 'bulk mode is not left on');
reset role;
select is((select count(*)::int from auth.users where id = 'aaaaaaaa-0000-0000-0000-0000000000a1'), 1, 'the auth user is still there');
select is((select count(*)::int from public.profiles where id = 'aaaaaaaa-0000-0000-0000-0000000000a1'), 1, 'the profile is still there');
select is((select count(*)::int from public.transactions where user_id = 'bbbbbbbb-0000-0000-0000-0000000000b1'), 1, 'B''s data is untouched by A''s delete-all');
-- anonymous callers are refused
set local role anon;
select throws_ok($$select public.delete_all_my_data()$$, '42501', null, 'anon cannot call delete_all_my_data');

select * from finish(true);
rollback;
