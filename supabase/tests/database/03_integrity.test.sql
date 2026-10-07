begin;
select no_plan();

insert into auth.users (id, instance_id, aud, role, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','a@test.dev');
insert into public.categories (id,user_id,name,type) values
  ('aaaaaaaa-1111-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','Food','expense'),
  ('aaaaaaaa-1111-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000001','Salary','income');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);

-- transactions
select throws_ok($$ insert into public.transactions (category_id,amount,type,description,transaction_date) values ('aaaaaaaa-1111-0000-0000-000000000001',0,'expense','x','2026-10-01') $$, '23514', null, 'amount 0 rejected');
select throws_ok($$ insert into public.transactions (category_id,amount,type,description,transaction_date) values ('aaaaaaaa-1111-0000-0000-000000000001',-5,'expense','x','2026-10-01') $$, '23514', null, 'negative amount rejected');
select throws_ok($$ insert into public.transactions (category_id,type,description,transaction_date) values ('aaaaaaaa-1111-0000-0000-000000000001','expense','x','2026-10-01') $$, '23502', null, 'missing amount rejected');
select throws_ok($$ insert into public.transactions (category_id,amount,type,description,transaction_date) values ('aaaaaaaa-1111-0000-0000-000000000001',5,'transfer','x','2026-10-01') $$, '23514', null, 'invalid type rejected');
select throws_ok($$ insert into public.transactions (category_id,amount,type,description,transaction_date) values ('aaaaaaaa-1111-0000-0000-000000000001',5,'expense','   ','2026-10-01') $$, '23514', null, 'blank description rejected');
select throws_ok($$ insert into public.transactions (category_id,amount,type,description,transaction_date) values ('aaaaaaaa-1111-0000-0000-000000000001',5,'expense','x','2026-13-45') $$, '22008', null, 'invalid date rejected');
select throws_ok($$ insert into public.transactions (category_id,amount,type,description,transaction_date) values ('aaaaaaaa-1111-0000-0000-000000000001',5,'expense','x',null) $$, '23502', null, 'missing date rejected');
select throws_ok($$ insert into public.transactions (category_id,amount,type,description,transaction_date) values (gen_random_uuid(),5,'expense','x','2026-10-01') $$, '23503', null, 'nonexistent category rejected');
select throws_ok($$ insert into public.transactions (category_id,amount,type,description,transaction_date) values ('aaaaaaaa-1111-0000-0000-000000000002',5,'expense','x','2026-10-01') $$, '23503', null, 'expense cannot use an income category');
select lives_ok($$ insert into public.transactions (id,category_id,amount,type,description,transaction_date) values ('aaaaaaaa-2222-0000-0000-000000000001','aaaaaaaa-1111-0000-0000-000000000001',200,'expense','Lunch','2026-10-07') $$, 'valid expense accepted');
select lives_ok($$ insert into public.transactions (category_id,amount,type,description,transaction_date) values ('aaaaaaaa-1111-0000-0000-000000000002',25000,'income','Pay','2026-10-01') $$, 'valid income accepted');

-- budgets
select throws_ok($$ insert into public.budgets (category_id,amount,month) values ('aaaaaaaa-1111-0000-0000-000000000001',0,'2026-10-01') $$, '23514', null, 'budget amount 0 rejected');
select throws_ok($$ insert into public.budgets (category_id,amount,month) values ('aaaaaaaa-1111-0000-0000-000000000001',100,'2026-10-15') $$, '23514', null, 'budget month must be first of month');
select throws_ok($$ insert into public.budgets (category_id,amount,month) values ('aaaaaaaa-1111-0000-0000-000000000002',100,'2026-10-01') $$, '23503', null, 'budget on an income category rejected');
select lives_ok($$ insert into public.budgets (category_id,amount,month) values ('aaaaaaaa-1111-0000-0000-000000000001',4000,'2026-10-01') $$, 'valid budget accepted');
select throws_ok($$ insert into public.budgets (category_id,amount,month) values ('aaaaaaaa-1111-0000-0000-000000000001',500,'2026-10-01') $$, '23505', null, 'duplicate budget (category+month) rejected');

-- categories
select throws_ok($$ insert into public.categories (name,type) values ('Food','expense') $$, '23505', null, 'duplicate category rejected');
select throws_ok($$ insert into public.categories (name,type,color) values ('X','expense','purple') $$, '23514', null, 'invalid color rejected');
select throws_ok($$ update public.categories set type = 'income' where id = 'aaaaaaaa-1111-0000-0000-000000000001' $$, '23503', null, 'category type locked while in use');

-- budget math the UI performs: 4000 budget, 1000+500+250 spent -> 1750 / 2250 / 43.75%
reset role;
insert into public.transactions (user_id,category_id,amount,type,description,transaction_date) values
  ('aaaaaaaa-0000-0000-0000-000000000001','aaaaaaaa-1111-0000-0000-000000000001',1000,'expense','a','2026-10-02'),
  ('aaaaaaaa-0000-0000-0000-000000000001','aaaaaaaa-1111-0000-0000-000000000001',500,'expense','b','2026-10-03'),
  ('aaaaaaaa-0000-0000-0000-000000000001','aaaaaaaa-1111-0000-0000-000000000001',250,'expense','c','2026-10-04'),
  ('aaaaaaaa-0000-0000-0000-000000000001','aaaaaaaa-1111-0000-0000-000000000001',9999,'expense','other month','2026-09-30');
select is((select sum(t.amount) from public.transactions t where t.category_id='aaaaaaaa-1111-0000-0000-000000000001' and t.type='expense' and t.transaction_date >= '2026-10-01' and t.transaction_date < '2026-11-01' and t.id <> 'aaaaaaaa-2222-0000-0000-000000000001'), 1750::numeric, 'October Food spend (excluding the 200 lunch) = 1750; other month ignored');

select * from finish();
rollback;
