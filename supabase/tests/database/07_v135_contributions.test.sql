-- 1.3.5 Savings contributions: new money added to Savings without a source balance.
-- Run against a LOCAL or DEV/STAGING database only:  supabase test db   (pgTAP; everything rolls back).
-- Covers: a contribution with Current Balance and Savings both at zero, goal and General targets, no income / expense / transfer side effects,
-- transfers still guarded, reallocations still total-neutral, undo guarded, deleted goals, RLS isolation, export / restore (old and new backups), delete-all.
begin;
select no_plan();

-- ---------- fixtures (run as the test superuser) ----------
insert into auth.users (id, instance_id, aud, role, email) values
  ('aaaaaaaa-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','a@test.dev'),
  ('bbbbbbbb-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','b@test.dev');
insert into public.savings_goals (id, user_id, name, target_amount) values
  ('aaaaaaaa-5555-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-0000000000a1','New Phone',15000),
  ('aaaaaaaa-5555-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-0000000000a1','Trip',9000),
  ('bbbbbbbb-5555-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-0000000000b1','B Goal',1000);

-- ---------- structure and security ----------
select has_table('public', 'savings_contributions', 'savings_contributions exists');
select ok((select relrowsecurity from pg_class where oid = 'public.savings_contributions'::regclass), 'RLS on savings_contributions');
select policies_are('public', 'savings_contributions', array['savings_contributions_select_own','savings_contributions_insert_own','savings_contributions_delete_own'], 'contribution policies (no update: undo only)');
select has_trigger('public', 'savings_contributions', 'savings_contributions_ledger_chk', 'ledger trigger on contributions');
select has_trigger('public', 'savings_contributions', 'savings_contributions_goal_ref', 'deleted-goal guard on contributions');
select is((select count(*)::int from pg_trigger where tgname like '%\_ledger\_chk' and tgdeferrable), 0, 'ledger checks still run inside the writing statement');
select ok(not has_function_privilege('authenticated', 'public.kita_contribution_ledger_trg()', 'execute'), 'contribution trigger function is not callable through the API');
select ok(not has_function_privilege('authenticated', 'public.kita_bucket(uuid, uuid)', 'execute'), 'bucket helper is still internal');

-- ---------- as user A: Current Balance = 0 and Savings = 0 ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-0000000000a1', true);

select is((select count(*)::int from public.transactions), 0, 'start: no transactions');
select is((select count(*)::int from public.savings_transfers), 0, 'start: no transfers');

-- the core case: ₱500 arrives from a source that is not tracked
select lives_ok($$ insert into public.savings_contributions (amount, contribution_date) values (500, '2026-10-18') $$, 'a General Savings contribution works with an empty Current Balance');
select lives_ok($$ insert into public.savings_contributions (goal_id, amount, contribution_date) values ('aaaaaaaa-5555-0000-0000-000000000001', 300, '2026-10-18') $$, 'a direct goal contribution works without any source balance');
-- the derived balances (internal helper, so checked as the superuser) include the contributions
reset role;
select is(public.kita_bucket('aaaaaaaa-0000-0000-0000-0000000000a1', null), 500::numeric, 'General Savings holds exactly the 500 contributed');
select is(public.kita_bucket('aaaaaaaa-0000-0000-0000-0000000000a1', 'aaaaaaaa-5555-0000-0000-000000000001'), 300::numeric, 'New Phone holds exactly the 300 contributed');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-0000000000a1', true);
select is((select coalesce(sum(amount),0) from public.savings_contributions where goal_id is null), 500::numeric, 'General contributions total 500');
select is((select coalesce(sum(amount),0) from public.savings_contributions where goal_id = 'aaaaaaaa-5555-0000-0000-000000000001'), 300::numeric, 'goal contributions total 300');

-- no side effects: not income, not an expense, not a transfer, Current Balance untouched
select is((select count(*)::int from public.transactions), 0, 'a contribution creates no transaction (no income, no expense)');
select is((select count(*)::int from public.savings_transfers), 0, 'a contribution creates no transfer (nothing leaves Current Balance)');
select is((select count(*)::int from public.savings_reallocations), 0, 'a contribution creates no reallocation');

-- constraints
select throws_ok($$ insert into public.savings_contributions (amount, contribution_date) values (0, '2026-10-18') $$, '23514', null, 'amount must be above zero');
select throws_ok($$ insert into public.savings_contributions (amount, contribution_date) values (-5, '2026-10-18') $$, '23514', null, 'a negative amount is refused');
select throws_ok($$ insert into public.savings_contributions (amount, contribution_date) values (1000000000000, '2026-10-18') $$, '22003', null, 'an amount beyond numeric(14,2) is refused');
select throws_ok($$ insert into public.savings_contributions (amount, contribution_date, note) values (5, '2026-10-18', '   ') $$, '23514', null, 'a blank note is refused');
select throws_ok($$ insert into public.savings_contributions (amount) values (5) $$, '23502', null, 'a date is required');

-- ownership / isolation
select throws_ok($$ insert into public.savings_contributions (user_id, amount, contribution_date) values ('bbbbbbbb-0000-0000-0000-0000000000b1', 5, '2026-10-18') $$, '42501', null, 'A cannot add a contribution for B');
select throws_ok($$ insert into public.savings_contributions (goal_id, amount, contribution_date) values ('bbbbbbbb-5555-0000-0000-000000000001', 5, '2026-10-18') $$, '23503', null, 'A cannot point a contribution at B''s goal');
select is((select count(*)::int from public.savings_contributions), 2, 'A sees exactly their own two contributions');

-- transfers keep their rules: money must come from somewhere
select throws_ok($$ insert into public.savings_transfers (direction, amount, transfer_date) values ('to_savings', 100, '2026-10-18') $$, 'P0001', null, 'a TRANSFER into Savings still needs Current Balance (0 available)');
select is((select count(*)::int from public.savings_transfers), 0, 'the refused transfer left no row behind');

-- reallocations stay total-neutral: move 200 of General (500) into the Trip goal
select lives_ok($$ insert into public.savings_reallocations (from_goal_id, to_goal_id, amount, allocation_date) values (null, 'aaaaaaaa-5555-0000-0000-000000000002', 200, '2026-10-18') $$, 'a reallocation of contributed money works');
select throws_ok($$ insert into public.savings_reallocations (from_goal_id, to_goal_id, amount, allocation_date) values (null, 'aaaaaaaa-5555-0000-0000-000000000002', 400, '2026-10-18') $$, 'P0001', null, 'but not more than General Savings holds (300 left)');

-- an expense paid from savings uses contributed money; the contribution then cannot be undone
select lives_ok($$ insert into public.transactions (amount,type,description,transaction_date,balance,goal_id) values (250,'expense','Phone case','2026-10-18','savings','aaaaaaaa-5555-0000-0000-000000000001') $$, 'contributed goal money can be spent (250 of 300)');
select throws_ok($$ delete from public.savings_contributions where goal_id = 'aaaaaaaa-5555-0000-0000-000000000001' $$, 'P0001', null, 'undoing a contribution whose money was spent is refused');
select is((select count(*)::int from public.savings_contributions where goal_id = 'aaaaaaaa-5555-0000-0000-000000000001'), 1, 'the refused undo left the contribution in place');

-- undo of money that is still there is allowed
select lives_ok($$ insert into public.savings_contributions (amount, contribution_date) values (40, '2026-10-19') $$, 'another General contribution');
select lives_ok($$ delete from public.savings_contributions where amount = 40 $$, 'undoing an untouched contribution works');

-- a goal that holds contributed money cannot be archived directly; archive_savings_goal moves it first
select throws_ok($$ update public.savings_goals set archived_at = now() where id = 'aaaaaaaa-5555-0000-0000-000000000002' $$, '42501', null, 'clients still cannot archive directly');
select lives_ok($$ select public.archive_savings_goal('aaaaaaaa-5555-0000-0000-000000000002', null, '2026-10-19') $$, 'archiving moves the goal''s money to General Savings');
select throws_ok($$ insert into public.savings_contributions (goal_id, amount, contribution_date) values ('aaaaaaaa-5555-0000-0000-000000000002', 5, '2026-10-19') $$, 'P0001', null, 'a deleted goal cannot receive a contribution');

-- ---------- export / restore ----------
select ok((select public.export_my_data() ? 'savings_contributions'), 'export includes the contributions section');
select is((select jsonb_array_length(public.export_my_data()->'savings_contributions')), 2, 'export lists A''s two remaining contributions');
create temp table kita_snap as select public.export_my_data() as d;
grant all on kita_snap to authenticated;

-- an OLD backup (no contributions section at all) restores exactly as before
select lives_ok($$ select public.restore_user_data(jsonb_build_object('format','trackmykita-backup','version',1,'profile',jsonb_build_object('currency','PHP'),
  'categories','[]'::jsonb,'budgets','[]'::jsonb,'transactions','[]'::jsonb,'savings_goals','[]'::jsonb,'savings_transfers','[]'::jsonb,'savings_reallocations','[]'::jsonb)) $$, 'a 1.3.4 backup without the new section restores');
select is((select count(*)::int from public.savings_contributions), 0, 'restoring an old backup replaces contributions with none');

-- a NEW backup round-trips with new ids and the goal link rewritten
select lives_ok($$ select public.restore_user_data((select d from kita_snap) || jsonb_build_object('format','trackmykita-backup','version',1)) $$, 'a 1.3.5 backup restores');
select is((select count(*)::int from public.savings_contributions), 2, 'both contributions are back');
select is((select coalesce(sum(amount),0) from public.savings_contributions), 800::numeric, 'with the same total (500 General + 300 goal)');
select is((select count(*)::int from public.savings_contributions c join public.savings_goals g on g.id = c.goal_id and g.user_id = c.user_id), 1, 'the goal contribution points at the restored goal of the same user');

-- a backup whose contribution points at a goal that is not in the file is refused, and nothing changes
select throws_ok($$ select public.restore_user_data(jsonb_build_object('format','trackmykita-backup','version',1,'profile','{}'::jsonb,
  'categories','[]'::jsonb,'budgets','[]'::jsonb,'transactions','[]'::jsonb,'savings_goals','[]'::jsonb,'savings_transfers','[]'::jsonb,'savings_reallocations','[]'::jsonb,
  'savings_contributions', jsonb_build_array(jsonb_build_object('id','x','goal_id','nope','amount',5,'contribution_date','2026-10-01')))) $$, 'P0001', null, 'a dangling goal reference is refused');
select is((select count(*)::int from public.savings_contributions), 2, 'and the refused restore changed nothing');

-- ---------- B cannot see or change A's contributions ----------
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-0000000000b1', true);
select is((select count(*)::int from public.savings_contributions), 0, 'B sees none of A''s contributions');
select lives_ok($$ delete from public.savings_contributions $$, 'B deleting A''s contributions is a silent no-op (RLS)');
select ok(not (public.export_my_data()->'savings_contributions' @> '[{"amount": 500}]'::jsonb), 'B''s export contains none of A''s contributions');
reset role;
select is((select count(*)::int from public.savings_contributions where user_id = 'aaaaaaaa-0000-0000-0000-0000000000a1'), 2, 'A''s contributions are intact');

-- ---------- delete all data ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-0000000000a1', true);
select lives_ok($$select public.delete_all_my_data()$$, 'delete all data runs');
select is((select count(*)::int from public.savings_contributions), 0, 'contributions are removed too');
reset role;
select is((select count(*)::int from public.savings_contributions where user_id = 'bbbbbbbb-0000-0000-0000-0000000000b1'), 0, 'B had none, and nothing of B''s was touched');

-- ---------- account deletion is never blocked by contributions ----------
insert into public.savings_contributions (user_id, amount, contribution_date) values ('bbbbbbbb-0000-0000-0000-0000000000b1', 10, '2026-10-01');
select lives_ok($$ delete from public.profiles where id = 'bbbbbbbb-0000-0000-0000-0000000000b1' $$, 'deleting an account with contributions works');
select is((select count(*)::int from public.savings_contributions where user_id = 'bbbbbbbb-0000-0000-0000-0000000000b1'), 0, 'its contributions are gone with it');

-- ---------- privileges (review round): least privilege on the new table, internal helpers stay internal ----------
-- (anon/authenticated start with every table privilege from the platform's default privileges; the migration narrows the new table to select/insert/delete)
select ok(has_table_privilege('authenticated', 'public.savings_contributions', 'SELECT'), 'authenticated can read contributions (RLS limits it to their own)');
select ok(has_table_privilege('authenticated', 'public.savings_contributions', 'INSERT'), 'authenticated can add contributions');
select ok(has_table_privilege('authenticated', 'public.savings_contributions', 'DELETE'), 'authenticated can undo contributions');
select ok(not has_table_privilege('authenticated', 'public.savings_contributions', 'UPDATE'), 'authenticated cannot UPDATE (contributions are add / undo only)');
select ok(not has_table_privilege('authenticated', 'public.savings_contributions', 'TRUNCATE'), 'authenticated cannot TRUNCATE (RLS would not stop it)');
select ok(not has_table_privilege('authenticated', 'public.savings_contributions', 'TRIGGER'), 'authenticated cannot create triggers on it');
select ok(not has_table_privilege('authenticated', 'public.savings_contributions', 'REFERENCES'), 'authenticated cannot add references to it');
select ok(not has_table_privilege('anon', 'public.savings_contributions', 'SELECT') and not has_table_privilege('anon', 'public.savings_contributions', 'INSERT')
      and not has_table_privilege('anon', 'public.savings_contributions', 'DELETE') and not has_table_privilege('anon', 'public.savings_contributions', 'UPDATE'), 'anon has no access at all');
select is((select count(*)::int from pg_class c, aclexplode(c.relacl) a where c.oid = 'public.savings_contributions'::regclass and a.grantee = 0), 0, 'PUBLIC has no table privileges');
select ok(not has_function_privilege('authenticated', 'public.kita_lock_user(uuid)', 'execute'), 'kita_lock_user is not callable by signed-in users');
select ok(not has_function_privilege('anon', 'public.kita_lock_user(uuid)', 'execute'), 'kita_lock_user is not callable by anon');
select is((select count(*)::int from pg_proc p, aclexplode(p.proacl) a where p.oid = 'public.kita_lock_user(uuid)'::regprocedure and a.grantee = 0), 0, 'kita_lock_user is not executable by PUBLIC');
select is((select count(*)::int from pg_proc p, aclexplode(p.proacl) a where p.oid = 'public.kita_contribution_ledger_trg()'::regprocedure and a.grantee = 0), 0, 'the contribution trigger function is not executable by PUBLIC');
select is((select proacl::text from pg_proc where oid = 'public.kita_contribution_ledger_trg()'::regprocedure), (select proacl::text from pg_proc where oid = 'public.kita_realloc_ledger_trg()'::regprocedure), 'the new trigger function has the same ACL as the existing ledger trigger functions');
select ok((select prosecdef from pg_proc where oid = 'public.kita_contribution_ledger_trg()'::regprocedure), 'the contribution trigger runs as the owner (so it can call the internal lock helper)');

-- ---------- restore edge cases (a fresh user C) ----------
insert into auth.users (id, instance_id, aud, role, email) values ('cccccccc-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','c@test.dev');
insert into public.savings_goals (id, user_id, name, target_amount) values ('cccccccc-5555-0000-0000-000000000001','cccccccc-0000-0000-0000-0000000000c1','Gadget',5000);
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'cccccccc-0000-0000-0000-0000000000c1', true);

select throws_ok($$ update public.savings_contributions set amount = 1 $$, '42501', null, 'a direct UPDATE is refused by privilege, not just by RLS');
select throws_ok($$ truncate public.savings_contributions $$, '42501', null, 'TRUNCATE is refused');

select lives_ok($$ insert into public.savings_contributions (goal_id, amount, contribution_date, note) values ('cccccccc-5555-0000-0000-000000000001', 100, '2026-10-10', 'birthday money') $$, 'C contributes 100 to the Gadget goal');
select lives_ok($$ select public.archive_savings_goal('cccccccc-5555-0000-0000-000000000001', null, '2026-10-11') $$, 'C then deletes the goal: its money moves to General Savings');
create temp table kita_snap2 as select public.export_my_data() || jsonb_build_object('format','trackmykita-backup','version',1) as d; -- the client adds the envelope
grant all on kita_snap2 to authenticated;
select is((select jsonb_array_length(d->'savings_contributions') from kita_snap2), 1, 'the export still lists the contribution that points at the now-deleted goal');
select lives_ok($$ select public.restore_user_data((select d from kita_snap2)) $$, 'a backup with a contribution to a deleted (archived) goal restores (the goal-reference guard is bulk-aware)');
select is((select count(*)::int from public.savings_contributions c join public.savings_goals g on g.id = c.goal_id where g.archived_at is not null), 1, 'the contribution is back, pointing at the restored deleted goal');
select is((select jsonb_array_length(public.export_my_data()->'savings_contributions')), 1, 'and the ledger still adds up after the restore (the final ledger check passed)');

select lives_ok($$ select public.restore_user_data(jsonb_set((select d from kita_snap2), '{savings_contributions,0,note}', '"   "'::jsonb)) $$, 'a whitespace-only note restores instead of aborting on the CHECK');
select is((select note from public.savings_contributions), null, 'and it is stored as no note');
select lives_ok($$ select public.restore_user_data(jsonb_build_object('format','trackmykita-backup','version',1,'profile',jsonb_build_object('currency','PHP'),
  'categories','[]'::jsonb,'budgets','[]'::jsonb,'transactions','[]'::jsonb,'savings_goals','[]'::jsonb,'savings_transfers','[]'::jsonb,'savings_reallocations','[]'::jsonb,'savings_contributions','null'::jsonb)) $$, 'an explicit null section restores like a missing one');
-- (stripping the contributions from a backup that still moves that money away would leave the deleted goal below zero: the final ledger check refuses it)
select throws_ok($$ select public.restore_user_data((select d from kita_snap2) || '{"savings_contributions": []}'::jsonb) $$, 'P0001', null, 'a backup whose savings no longer add up is refused, never restored half-way');
select is((select count(*)::int from public.savings_contributions), 0, 'and means no contributions');
select throws_ok($$ select public.restore_user_data((select d from kita_snap2) || '{"savings_contributions": {"a":1}}'::jsonb) $$, 'P0001', null, 'a section that is not a list is still refused');
select throws_ok($$ select public.restore_user_data((select d from kita_snap2) || '{"savings_contributions": [{"id":"x","goal_id":"not-in-this-backup","amount":5,"contribution_date":"2026-10-01"}]}'::jsonb) $$, 'P0001', null, 'a contribution to a goal the backup does not contain is refused');
reset role;

select * from finish(true);
rollback;
