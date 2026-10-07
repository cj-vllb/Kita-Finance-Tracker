begin;
select no_plan();

-- Two users; the on_auth_user_created trigger must give each a profile.
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data) values
  ('aaaaaaaa-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','a@test.dev','{"full_name":"Alice A"}'),
  ('bbbbbbbb-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','b@test.dev','{}');

select is((select full_name from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000001'), 'Alice A', 'trigger copies full_name metadata');
select is((select full_name from public.profiles where id = 'bbbbbbbb-0000-0000-0000-000000000002'), 'b', 'trigger falls back to email prefix without metadata');
select is((select currency from public.profiles where id = 'bbbbbbbb-0000-0000-0000-000000000002'), 'PHP', 'currency defaults to PHP');

-- seed data as postgres (bypasses RLS)
insert into public.categories (id,user_id,name,type) values
  ('aaaaaaaa-1111-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','Food','expense'),
  ('aaaaaaaa-1111-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000001','Salary','income'),
  ('bbbbbbbb-1111-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000002','Food','expense');
insert into public.transactions (id,user_id,category_id,amount,type,description,transaction_date) values
  ('aaaaaaaa-2222-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','aaaaaaaa-1111-0000-0000-000000000001',200,'expense','A lunch','2026-10-07'),
  ('bbbbbbbb-2222-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000002','bbbbbbbb-1111-0000-0000-000000000001',999,'expense','B lunch','2026-10-07');
insert into public.budgets (id,user_id,category_id,amount,month) values
  ('aaaaaaaa-3333-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','aaaaaaaa-1111-0000-0000-000000000001',4000,'2026-10-01'),
  ('bbbbbbbb-3333-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000002','bbbbbbbb-1111-0000-0000-000000000001',5000,'2026-10-01');

-- ===== act as user A =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);

-- allowed SELECT: own rows only
select is((select count(*)::int from public.profiles), 1, 'A sees exactly one profile (own)');
select is((select count(*)::int from public.categories), 2, 'A sees only own categories');
select is((select count(*)::int from public.transactions), 1, 'A sees only own transactions');
select is((select count(*)::int from public.budgets), 1, 'A sees only own budgets');
-- denied SELECT
select is_empty($$ select 1 from public.profiles where id = 'bbbbbbbb-0000-0000-0000-000000000002' $$, 'A cannot read B profile');
select is_empty($$ select 1 from public.categories where user_id = 'bbbbbbbb-0000-0000-0000-000000000002' $$, 'A cannot read B categories');
select is_empty($$ select 1 from public.transactions where user_id = 'bbbbbbbb-0000-0000-0000-000000000002' $$, 'A cannot read B transactions');
select is_empty($$ select 1 from public.budgets where user_id = 'bbbbbbbb-0000-0000-0000-000000000002' $$, 'A cannot read B budgets');

-- allowed INSERT (user_id defaults to auth.uid())
select lives_ok($$ insert into public.categories (name,type) values ('Transport','expense') $$, 'A can insert own category');
select lives_ok($$ insert into public.transactions (category_id,amount,type,description,transaction_date) values ('aaaaaaaa-1111-0000-0000-000000000001',300,'expense','A dinner','2026-10-07') $$, 'A can insert own transaction');
select lives_ok($$ insert into public.budgets (category_id,amount,month) values ((select id from public.categories where name='Transport'),1000,'2026-10-01') $$, 'A can insert own budget');

-- denied INSERT with B's user_id
select throws_ok($$ insert into public.categories (user_id,name,type) values ('bbbbbbbb-0000-0000-0000-000000000002','Hack','expense') $$, '42501', null, 'A cannot insert category as B');
select throws_ok($$ insert into public.transactions (user_id,amount,type,description,transaction_date) values ('bbbbbbbb-0000-0000-0000-000000000002',5,'expense','x','2026-10-01') $$, '42501', null, 'A cannot insert transaction as B');
select throws_ok($$ insert into public.budgets (user_id,category_id,amount,month) values ('bbbbbbbb-0000-0000-0000-000000000002','bbbbbbbb-1111-0000-0000-000000000001',10,'2026-10-01') $$, '42501', null, 'A cannot insert budget as B');
-- denied: A's own row referencing B's category
select throws_ok($$ insert into public.transactions (category_id,amount,type,description,transaction_date) values ('bbbbbbbb-1111-0000-0000-000000000001',5,'expense','x','2026-10-01') $$, '23503', null, 'A cannot use B category on a transaction');
select throws_ok($$ insert into public.budgets (category_id,amount,month) values ('bbbbbbbb-1111-0000-0000-000000000001',5,'2026-09-01') $$, '23503', null, 'A cannot use B category on a budget');

-- allowed UPDATE
select lives_ok($$ update public.transactions set amount = 300 where id = 'aaaaaaaa-2222-0000-0000-000000000001' $$, 'A can update own transaction');
select lives_ok($$ update public.profiles set full_name = 'Alice Renamed' where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$, 'A can update own profile');
-- denied UPDATE (row invisible -> 0 rows)
select is_empty($$ with u as (update public.transactions set amount = 1 where id = 'bbbbbbbb-2222-0000-0000-000000000001' returning 1) select * from u $$, 'A cannot update B transaction');
select is_empty($$ with u as (update public.budgets set amount = 1 where id = 'bbbbbbbb-3333-0000-0000-000000000001' returning 1) select * from u $$, 'A cannot update B budget');
select is_empty($$ with u as (update public.categories set name = 'x' where id = 'bbbbbbbb-1111-0000-0000-000000000001' returning 1) select * from u $$, 'A cannot update B category');
select is_empty($$ with u as (update public.profiles set full_name = 'x' where id = 'bbbbbbbb-0000-0000-0000-000000000002' returning 1) select * from u $$, 'A cannot update B profile');
-- denied UPDATE that hands a row to B (WITH CHECK)
select throws_ok($$ update public.transactions set user_id = 'bbbbbbbb-0000-0000-0000-000000000002' where id = 'aaaaaaaa-2222-0000-0000-000000000001' $$, '42501', null, 'A cannot reassign own transaction to B');
select throws_ok($$ update public.categories set user_id = 'bbbbbbbb-0000-0000-0000-000000000002' where id = 'aaaaaaaa-1111-0000-0000-000000000002' $$, '42501', null, 'A cannot reassign own category to B');
select throws_ok($$ update public.budgets set user_id = 'bbbbbbbb-0000-0000-0000-000000000002' where id = 'aaaaaaaa-3333-0000-0000-000000000001' $$, '42501', null, 'A cannot reassign own budget to B');

-- denied DELETE
select is_empty($$ with d as (delete from public.transactions where id = 'bbbbbbbb-2222-0000-0000-000000000001' returning 1) select * from d $$, 'A cannot delete B transaction');
select is_empty($$ with d as (delete from public.budgets where id = 'bbbbbbbb-3333-0000-0000-000000000001' returning 1) select * from d $$, 'A cannot delete B budget');
select is_empty($$ with d as (delete from public.categories where id = 'bbbbbbbb-1111-0000-0000-000000000001' returning 1) select * from d $$, 'A cannot delete B category');
-- category in use cannot be deleted (history protected)
select throws_ok($$ delete from public.categories where id = 'aaaaaaaa-1111-0000-0000-000000000001' $$, '23503', null, 'A cannot delete a category that transactions/budgets use');
-- allowed DELETE
select lives_ok($$ delete from public.transactions where id = 'aaaaaaaa-2222-0000-0000-000000000001' $$, 'A can delete own transaction');

-- ===== anonymous =====
reset role;
set local role anon;
select set_config('request.jwt.claims', '', true);
select set_config('request.jwt.claim.sub', '', true);
select is((select count(*)::int from public.profiles), 0, 'anon sees no profiles');
select is((select count(*)::int from public.categories), 0, 'anon sees no categories');
select is((select count(*)::int from public.transactions), 0, 'anon sees no transactions');
select is((select count(*)::int from public.budgets), 0, 'anon sees no budgets');

-- ===== back to postgres: B's data must be untouched =====
reset role;
select is((select amount from public.transactions where id = 'bbbbbbbb-2222-0000-0000-000000000001'), 999::numeric, 'B transaction unchanged');
select is((select amount from public.budgets where id = 'bbbbbbbb-3333-0000-0000-000000000001'), 5000::numeric, 'B budget unchanged');
select is((select name from public.categories where id = 'bbbbbbbb-1111-0000-0000-000000000001'), 'Food', 'B category unchanged');
select is((select full_name from public.profiles where id = 'bbbbbbbb-0000-0000-0000-000000000002'), 'b', 'B profile unchanged');

-- ===== act as user B: sees only own =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', true);
select is((select count(*)::int from public.categories), 1, 'B sees only own categories');
select is((select count(*)::int from public.transactions), 1, 'B sees only own transactions');
select is((select count(*)::int from public.budgets), 1, 'B sees only own budgets');
select is_empty($$ select 1 from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$, 'B cannot read A profile');

select * from finish();
rollback;
