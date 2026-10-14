-- 1.3.1 Savings & balances: structure, RLS/ownership, ledger rules, atomicity, locking, account deletion.
-- Run against a LOCAL or DEV/STAGING database only:  supabase test db   (pgTAP; everything rolls back).
-- STATUS: written alongside the migration; NOT YET EXECUTED (no Postgres/Docker was available where it was written).
-- A single pgTAP session cannot create genuinely concurrent transactions. The two-session concurrency checks are in
-- supabase/tests/manual/savings_concurrency.md; the sequential "second 300 is refused" tests below are NOT proof of concurrency safety.
begin;
select no_plan();

-- ---------- fixtures (run as the test superuser; the ledger triggers still fire and every row below is valid) ----------
insert into auth.users (id, instance_id, aud, role, email) values
  ('aaaaaaaa-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','a@test.dev'),
  ('bbbbbbbb-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','b@test.dev'),
  ('cccccccc-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','c@test.dev');
insert into public.savings_goals (id, user_id, name, target_amount) values
  ('aaaaaaaa-5555-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-0000000000a1','New Phone',15000),
  ('bbbbbbbb-5555-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-0000000000b1','B Goal',1000);
insert into public.transactions (user_id, amount, type, description, transaction_date) values ('bbbbbbbb-0000-0000-0000-0000000000b1', 100, 'income', 'B pay', '2026-10-01');
insert into public.savings_transfers (user_id, direction, amount, transfer_date) values ('bbbbbbbb-0000-0000-0000-0000000000b1', 'to_savings', 50, '2026-10-02');
-- user C exists only to prove that deleting an account is never blocked by the ledger rules (see the end of the file)
insert into public.transactions (user_id, amount, type, description, transaction_date, balance) values ('cccccccc-0000-0000-0000-0000000000c1', 500, 'income', 'C pay', '2026-10-01', 'current');
insert into public.transactions (user_id, amount, type, description, transaction_date, balance) values ('cccccccc-0000-0000-0000-0000000000c1', 100, 'income', 'C saved', '2026-10-01', 'savings');
insert into public.savings_transfers (user_id, direction, amount, transfer_date) values ('cccccccc-0000-0000-0000-0000000000c1', 'to_savings', 200, '2026-10-02');

-- ---------- structure and security (as superuser) ----------
select has_table('public', 'savings_goals', 'savings_goals exists');
select has_table('public', 'savings_transfers', 'savings_transfers exists');
select has_table('public', 'savings_reallocations', 'savings_reallocations exists');
select has_column('public', 'transactions', 'balance', 'transactions.balance exists');
select has_column('public', 'transactions', 'goal_id', 'transactions.goal_id exists');
select ok((select relrowsecurity from pg_class where oid = 'public.savings_goals'::regclass), 'RLS on savings_goals');
select ok((select relrowsecurity from pg_class where oid = 'public.savings_transfers'::regclass), 'RLS on savings_transfers');
select ok((select relrowsecurity from pg_class where oid = 'public.savings_reallocations'::regclass), 'RLS on savings_reallocations');
select policies_are('public', 'savings_goals', array['savings_goals_select_own','savings_goals_insert_own','savings_goals_update_own'], 'goal policies (no delete: goals are archived)');
select policies_are('public', 'savings_transfers', array['savings_transfers_select_own','savings_transfers_insert_own','savings_transfers_delete_own'], 'transfer policies');
select policies_are('public', 'savings_reallocations', array['savings_reallocations_select_own','savings_reallocations_insert_own','savings_reallocations_delete_own'], 'reallocation policies');
select is((select count(*)::int from pg_policies where schemaname = 'public' and tablename like 'savings\_%' and roles <> '{authenticated}'), 0, 'savings policies are TO authenticated only');
select ok(not has_function_privilege('authenticated', 'public.kita_lock_user(uuid)', 'execute'), 'lock helper is not callable through the API');
select ok(not has_function_privilege('authenticated', 'public.kita_ledger_check(uuid, boolean)', 'execute'), 'ledger check is not callable through the API');
select ok(not has_function_privilege('authenticated', 'public.kita_bucket(uuid, uuid)', 'execute'), 'bucket helper is not callable through the API');
select ok(not has_function_privilege('anon', 'public.archive_savings_goal(uuid, uuid, date)', 'execute'), 'anon cannot archive goals');
select ok(has_function_privilege('authenticated', 'public.archive_savings_goal(uuid, uuid, date)', 'execute'), 'authenticated can archive their own goals');
select ok(has_column_privilege('authenticated', 'public.savings_goals', 'name', 'update'), 'clients may rename a goal');
select ok(not has_column_privilege('authenticated', 'public.savings_goals', 'archived_at', 'update'), 'clients cannot archive a goal directly');
select has_trigger('public', 'transactions', 'transactions_ledger_chk', 'ledger trigger on transactions');
select has_trigger('public', 'savings_transfers', 'savings_transfers_ledger_chk', 'ledger trigger on transfers');
select has_trigger('public', 'savings_reallocations', 'savings_reallocations_ledger_chk', 'ledger trigger on reallocations');
select has_trigger('public', 'savings_goals', 'savings_goals_ledger_chk', 'ledger trigger on goal archiving');
select is((select count(*)::int from pg_trigger where tgname like '%\_ledger\_chk' and tgdeferrable), 0, 'ledger checks run inside the writing statement (not deferred to commit)');

-- ---------- as user A ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-0000000000a1', true);

-- ownership / isolation (B has a goal, an income and a transfer)
select is((select count(*)::int from public.savings_goals), 1, 'A sees only their own goal');
select is((select count(*)::int from public.transactions), 0, 'A cannot see B''s transactions');
select is((select count(*)::int from public.savings_transfers), 0, 'A cannot see B''s transfers');
select throws_ok($$ insert into public.savings_goals (user_id, name, target_amount) values ('bbbbbbbb-0000-0000-0000-0000000000b1','x',10) $$, '42501', null, 'A cannot create a goal for B');
select throws_ok($$ insert into public.transactions (amount,type,description,transaction_date,balance,goal_id) values (10,'income','x','2026-10-01','savings','bbbbbbbb-5555-0000-0000-000000000001') $$, '23503', null, 'A cannot point income at B''s goal');
select throws_ok($$ insert into public.savings_transfers (direction,amount,transfer_date,goal_id) values ('to_savings',1,'2026-10-01','bbbbbbbb-5555-0000-0000-000000000001') $$, '23503', null, 'A cannot point a transfer at B''s goal');
select lives_ok($$ update public.savings_goals set name = 'hacked' where id = 'bbbbbbbb-5555-0000-0000-000000000001' $$, 'A updating B''s goal is silently a no-op (RLS)');
select lives_ok($$ delete from public.savings_transfers where user_id = 'bbbbbbbb-0000-0000-0000-0000000000b1' $$, 'A deleting B''s transfer is silently a no-op (RLS)');

-- constraints
select throws_ok($$ insert into public.transactions (amount,type,description,transaction_date,balance) values (10,'income','x','2026-10-01','bank') $$, '23514', null, 'balance must be current or savings');
select throws_ok($$ insert into public.transactions (amount,type,description,transaction_date,balance,goal_id) values (10,'income','x','2026-10-01','current','aaaaaaaa-5555-0000-0000-000000000001') $$, '23514', null, 'a goal needs the savings balance');
select throws_ok($$ insert into public.savings_goals (name,target_amount) values ('Zero',0) $$, '23514', null, 'goal target must be above zero');
select throws_ok($$ insert into public.savings_goals (name,target_amount) values ('new phone',5) $$, '23505', null, 'goal names are unique per user (case-insensitive)');
select throws_ok($$ insert into public.savings_transfers (direction,amount,transfer_date) values ('sideways',5,'2026-10-01') $$, '23514', null, 'transfer direction validated');
select throws_ok($$ insert into public.savings_reallocations (amount,allocation_date) values (5,'2026-10-01') $$, '23514', null, 'a move needs two different places');

-- backward compatibility: a plain transaction (no balance given) is Current Balance
select lives_ok($$ insert into public.transactions (id,amount,type,description,transaction_date) values ('aaaaaaaa-6666-0000-0000-000000000001',2000,'income','Pay','2026-10-01') $$, 'legacy-style insert works');
select is((select balance from public.transactions where id = 'aaaaaaaa-6666-0000-0000-000000000001'), 'current', 'default balance is current');

-- transfers: 500 to Savings; not income or expense
select lives_ok($$ insert into public.savings_transfers (direction,amount,transfer_date) values ('to_savings',500,'2026-10-02') $$, 'transfer 500 to Savings with 2000 available');
select is((select count(*)::int from public.transactions), 1, 'a transfer creates no income or expense row');
select throws_ok($$ insert into public.savings_transfers (direction,amount,transfer_date) values ('to_savings',5000,'2026-10-02') $$, 'P0001', null, 'cannot move more than Current Balance holds');
select throws_ok($$ insert into public.savings_transfers (direction,amount,transfer_date) values ('to_current',900,'2026-10-02') $$, 'P0001', null, 'cannot withdraw more than Savings holds');
select is((select count(*)::int from public.savings_transfers), 1, 'rejected transfers left no row behind');

-- allocations: 300 of the 500 unassigned to New Phone; a second 300 does not fit (sequential, not a concurrency test)
select lives_ok($$ insert into public.savings_reallocations (from_goal_id,to_goal_id,amount,allocation_date) values (null,'aaaaaaaa-5555-0000-0000-000000000001',300,'2026-10-02') $$, 'allocate 300 of unassigned Savings to New Phone');
select throws_ok($$ insert into public.savings_reallocations (from_goal_id,to_goal_id,amount,allocation_date) values (null,'aaaaaaaa-5555-0000-0000-000000000001',300,'2026-10-02') $$, 'P0001', null, 'cannot allocate more than the unassigned Savings (only 200 left)');
select is((select count(*)::int from public.savings_reallocations), 1, 'the rejected allocation left no row behind');

-- expenses from Savings must not eat money set aside for a goal
select throws_ok($$ insert into public.transactions (amount,type,description,transaction_date,balance) values (250,'expense','x','2026-10-03','savings') $$, 'P0001', null, 'expense from Savings cannot eat money set aside for a goal');
select lives_ok($$ insert into public.transactions (id,amount,type,description,transaction_date,balance) values ('aaaaaaaa-6666-0000-0000-000000000002',150,'expense','x','2026-10-03','savings') $$, 'expense from unassigned Savings within its limit');
select lives_ok($$ insert into public.transactions (id,amount,type,description,transaction_date,balance,goal_id) values ('aaaaaaaa-6666-0000-0000-000000000003',100,'expense','Phone case','2026-10-03','savings','aaaaaaaa-5555-0000-0000-000000000001') $$, 'expense from a goal within what it holds');
select is((select coalesce(sum(amount),0) from public.transactions where type = 'expense'), 250::numeric, 'expenses paid from Savings are recorded exactly once');

-- editing / deleting cannot silently invalidate downstream activity
select throws_ok($$ delete from public.transactions where id = 'aaaaaaaa-6666-0000-0000-000000000001' $$, 'P0001', null, 'cannot delete income whose money was already moved to Savings');
select throws_ok($$ update public.transactions set amount = 400 where id = 'aaaaaaaa-6666-0000-0000-000000000003' $$, 'P0001', null, 'cannot raise a goal expense above what the goal holds');
select is((select amount from public.transactions where id = 'aaaaaaaa-6666-0000-0000-000000000003'), 100::numeric, 'a rejected edit changed nothing');

-- goals: rename is allowed, archiving only through the function
select lives_ok($$ update public.savings_goals set name = 'Phone' where id = 'aaaaaaaa-5555-0000-0000-000000000001' $$, 'a goal can be renamed');
select throws_ok($$ update public.savings_goals set archived_at = now() where id = 'aaaaaaaa-5555-0000-0000-000000000001' $$, '42501', null, 'a goal cannot be archived by a direct update');

-- ---------- ledger figures (read as the test superuser: the helper is not exposed to clients) ----------
reset role;
select is(public.kita_bucket('aaaaaaaa-0000-0000-0000-0000000000a1', null), 50::numeric, 'unassigned Savings: 500 - 300 - 150 = 50');
select is(public.kita_bucket('aaaaaaaa-0000-0000-0000-0000000000a1', 'aaaaaaaa-5555-0000-0000-000000000001'), 200::numeric, 'New Phone: 300 - 100 = 200');
select is((select name from public.savings_goals where id = 'bbbbbbbb-5555-0000-0000-000000000001'), 'B Goal', 'B''s goal was untouched by A');
select is((select count(*)::int from public.savings_transfers where user_id = 'bbbbbbbb-0000-0000-0000-0000000000b1'), 1, 'B''s transfer was untouched by A');

-- ---------- archive a goal that holds money (one atomic call) ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-0000000000a1', true);
select lives_ok($$ select public.archive_savings_goal('aaaaaaaa-5555-0000-0000-000000000001', null, '2026-10-04') $$, 'archive moves the goal''s money to General Savings');
select is((select archived_at is not null from public.savings_goals where id = 'aaaaaaaa-5555-0000-0000-000000000001'), true, 'goal is archived, not deleted');
select throws_ok($$ insert into public.savings_transfers (direction,amount,transfer_date,goal_id) values ('to_savings',1,'2026-10-05','aaaaaaaa-5555-0000-0000-000000000001') $$, 'P0001', null, 'new activity cannot use an archived goal');
select throws_ok($$ update public.transactions set amount = 101 where id = 'aaaaaaaa-6666-0000-0000-000000000003' $$, 'P0001', null, 'an old record of an archived goal cannot be edited into a balance');
select throws_ok($$ select public.archive_savings_goal('bbbbbbbb-5555-0000-0000-000000000001', null, '2026-10-04') $$, 'P0001', null, 'A cannot archive B''s goal');
-- plain top-level write (not inside lives_ok), used to check the lock below
insert into public.transactions (amount,type,description,transaction_date,balance) values (10,'income','top-level','2026-10-06','savings');
reset role;
select is(public.kita_bucket('aaaaaaaa-0000-0000-0000-0000000000a1', 'aaaaaaaa-5555-0000-0000-000000000001'), 0::numeric, 'the archived goal holds nothing');
select is(public.kita_bucket('aaaaaaaa-0000-0000-0000-0000000000a1', null), 260::numeric, 'General Savings: 50 + 200 (from the goal) + 10');
select is((select count(*)::int from public.savings_goals where id = 'aaaaaaaa-5555-0000-0000-000000000001'), 1, 'history is kept after a goal is deleted');
select ok(exists (select 1 from pg_locks where locktype = 'advisory' and pid = pg_backend_pid() and granted), 'a savings write holds the per-user advisory lock until the transaction ends');

-- transfers and moves are never income: income is still only the legacy 2000 + 10 recorded as income
select is((select coalesce(sum(amount),0) from public.transactions where type = 'income' and user_id = 'aaaaaaaa-0000-0000-0000-0000000000a1'), 2010::numeric, 'income total counts only real income');

-- ---------- deleting an account is never blocked by the ledger rules ----------
select lives_ok($$ delete from auth.users where id = 'cccccccc-0000-0000-0000-0000000000c1' $$, 'deleting a user with savings activity succeeds');
select is((select count(*)::int from public.transactions where user_id = 'cccccccc-0000-0000-0000-0000000000c1')
        + (select count(*)::int from public.savings_transfers where user_id = 'cccccccc-0000-0000-0000-0000000000c1'), 0, 'the deleted user''s ledger rows are gone');

select * from finish();
rollback;
