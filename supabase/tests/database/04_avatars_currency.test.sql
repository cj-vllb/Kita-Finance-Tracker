begin;
select no_plan();

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data) values
  ('aaaaaaaa-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','a@test.dev','{"full_name":"Alice A"}'),
  ('bbbbbbbb-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','b@test.dev','{}');

select ok((select not public from storage.buckets where id = 'avatars'), 'avatars bucket exists and is private');

-- seed one file per user as postgres (bypasses RLS)
insert into storage.objects (bucket_id, name, owner) values
  ('avatars', 'aaaaaaaa-0000-0000-0000-000000000001/a.jpg', 'aaaaaaaa-0000-0000-0000-000000000001'),
  ('avatars', 'bbbbbbbb-0000-0000-0000-000000000002/b.jpg', 'bbbbbbbb-0000-0000-0000-000000000002');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);

select is((select count(*)::int from storage.objects where bucket_id = 'avatars'), 1, 'A sees only own avatar file');
select is_empty($$ select 1 from storage.objects where name like 'bbbbbbbb-%' $$, 'A cannot see B avatar file');
select lives_ok($$ insert into storage.objects (bucket_id, name, owner) values ('avatars','aaaaaaaa-0000-0000-0000-000000000001/new.jpg','aaaaaaaa-0000-0000-0000-000000000001') $$, 'A can upload into own folder');
select throws_ok($$ insert into storage.objects (bucket_id, name, owner) values ('avatars','bbbbbbbb-0000-0000-0000-000000000002/evil.jpg','aaaaaaaa-0000-0000-0000-000000000001') $$, '42501', null, 'A cannot upload into B folder');

-- profile column rules
select lives_ok($$ update public.profiles set avatar_path = 'aaaaaaaa-0000-0000-0000-000000000001/new.jpg' where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$, 'A can point own profile at own file');
select throws_ok($$ update public.profiles set avatar_path = 'bbbbbbbb-0000-0000-0000-000000000002/b.jpg' where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$, '23514', null, 'A cannot point own profile at B file');
select lives_ok($$ update public.profiles set currency = 'JPY' where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$, 'new currencies are accepted');
select throws_ok($$ update public.profiles set currency = 'XXX' where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$, '23514', null, 'unknown currencies are rejected');

select * from finish();
rollback;
