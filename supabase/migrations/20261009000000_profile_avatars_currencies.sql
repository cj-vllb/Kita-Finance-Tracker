-- TrackMyKita 1.1.0 (Part 2): profile pictures + more currencies.
--
-- Additive and idempotent. No rows are deleted or rewritten, no table is dropped, RLS is untouched.
-- Apply BEFORE deploying the 1.1.0 frontend:  supabase db push
--
-- 1) profiles.avatar_path : storage path of the user's photo (NULL = use initials).
-- 2) profiles.currency    : CHECK widened from PHP/USD/EUR to the new list. Existing values stay valid.
-- 3) 'avatars' storage bucket: PRIVATE, 2 MB limit, images only, one folder per user.

-- 1) avatar column ---------------------------------------------------------------------------
alter table public.profiles add column if not exists avatar_path text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_avatar_path_owner_chk' and conrelid = 'public.profiles'::regclass) then
    -- A profile can only point at a file inside its own folder: <user id>/<file>.
    alter table public.profiles add constraint profiles_avatar_path_owner_chk
      check (avatar_path is null or avatar_path like id::text || '/%');
  end if;
end $$;

-- 2) currency list ---------------------------------------------------------------------------
-- Drop whichever CHECK currently guards profiles.currency (its generated name can differ between projects), then re-add it.
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.profiles'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%currency%'
  loop
    execute format('alter table public.profiles drop constraint %I', c.conname);
  end loop;
  alter table public.profiles add constraint profiles_currency_check check (currency in
    ('PHP','USD','EUR','GBP','JPY','CNY','KRW','SGD','AUD','CAD','HKD','NZD','INR','MYR','THB','IDR'));
end $$;

-- 3) private avatar bucket + per-user policies -----------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = false, file_size_limit = 2097152, allowed_mime_types = array['image/jpeg','image/png','image/webp'];

-- Files are stored as <auth.uid()>/<file>. Every policy checks that first folder, so a user can only
-- read, write, replace or delete inside their own folder. There is no anonymous access and no public URL;
-- the app reads photos through short-lived signed URLs.
drop policy if exists avatars_select_own on storage.objects;
drop policy if exists avatars_insert_own on storage.objects;
drop policy if exists avatars_update_own on storage.objects;
drop policy if exists avatars_delete_own on storage.objects;
create policy avatars_select_own on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy avatars_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy avatars_update_own on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy avatars_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
