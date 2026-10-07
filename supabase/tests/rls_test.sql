-- Run in the SQL editor of a DEV project (or local Supabase). Everything rolls back at the end.
begin;
insert into auth.users (id, instance_id, aud, role, email) values
 ('aaaaaaaa-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','a@test.dev'),
 ('bbbbbbbb-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','b@test.dev');
insert into public.categories (id,user_id,name,type) values
 ('aaaaaaaa-1111-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','Food','expense'),
 ('bbbbbbbb-1111-0000-0000-000000000002','bbbbbbbb-0000-0000-0000-000000000002','Food','expense');
insert into public.transactions (user_id,category_id,amount,type,description,transaction_date) values
 ('bbbbbbbb-0000-0000-0000-000000000002','bbbbbbbb-1111-0000-0000-000000000002',200,'expense','B lunch','2026-10-07');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}',true);
do $$ declare n int; ok boolean; begin
  select count(*) into n from public.transactions; assert n = 0, 'A can read B transactions';
  select count(*) into n from public.categories where user_id <> auth.uid(); assert n = 0, 'A can read B categories';
  select count(*) into n from public.profiles where id <> auth.uid(); assert n = 0, 'A can read B profile';
  update public.transactions set amount = 1; get diagnostics n = row_count; assert n = 0, 'A updated B transaction';
  delete from public.transactions; get diagnostics n = row_count; assert n = 0, 'A deleted B transaction';
  update public.profiles set full_name = 'x' where id <> auth.uid(); get diagnostics n = row_count; assert n = 0, 'A updated B profile';
  ok := false; begin insert into public.transactions (user_id,amount,type,description,transaction_date) values ('bbbbbbbb-0000-0000-0000-000000000002',5,'expense','x','2026-10-01'); exception when insufficient_privilege then ok := true; end; assert ok, 'A inserted a transaction as B';
  ok := false; begin insert into public.categories (user_id,name,type) values ('bbbbbbbb-0000-0000-0000-000000000002','Hack','expense'); exception when insufficient_privilege then ok := true; end; assert ok, 'A inserted a category as B';
  ok := false; begin insert into public.budgets (user_id,category_id,amount,month) values ('bbbbbbbb-0000-0000-0000-000000000002','bbbbbbbb-1111-0000-0000-000000000002',10,'2026-10-01'); exception when insufficient_privilege then ok := true; end; assert ok, 'A inserted a budget as B';
  ok := false; begin insert into public.transactions (category_id,amount,type,description,transaction_date) values ('bbbbbbbb-1111-0000-0000-000000000002',5,'expense','x','2026-10-01'); exception when foreign_key_violation then ok := true; end; assert ok, 'A used B category';
  raise notice 'RLS tests passed';
end $$;
rollback;
