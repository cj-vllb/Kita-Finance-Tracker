-- Repair migration: authoritative profile initialization for auth users.
-- Idempotent: safe whether or not the init migration's trigger/policies already exist in the remote project.

-- 1) Trigger function (security definer, empty search_path, fully schema-qualified).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, currency)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
      nullif(split_part(new.email, '@', 1), ''),
      'User'
    ),
    'PHP'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Only the trigger should run this; never callable through the API.
revoke all on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2) Backfill existing auth users that have no profile.
insert into public.profiles (id, full_name, currency)
select
  u.id,
  coalesce(
    nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(u.raw_user_meta_data ->> 'name'), ''),
    nullif(split_part(u.email, '@', 1), ''),
    'User'
  ),
  'PHP'
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;

-- 3) Re-assert RLS and ownership policies (RLS stays enabled; every policy is scoped to auth.uid()).
alter table public.profiles     enable row level security;
alter table public.categories   enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets      enable row level security;

drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_select_own on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy profiles_insert_own on public.profiles for insert to authenticated with check (id = (select auth.uid()));
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

do $$
declare t text;
begin
  foreach t in array array['categories','transactions','budgets'] loop
    execute format('drop policy if exists %1$s_select_own on public.%1$I', t);
    execute format('drop policy if exists %1$s_insert_own on public.%1$I', t);
    execute format('drop policy if exists %1$s_update_own on public.%1$I', t);
    execute format('drop policy if exists %1$s_delete_own on public.%1$I', t);
    execute format('create policy %1$s_select_own on public.%1$I for select to authenticated using (user_id = (select auth.uid()))', t);
    execute format('create policy %1$s_insert_own on public.%1$I for insert to authenticated with check (user_id = (select auth.uid()))', t);
    execute format('create policy %1$s_update_own on public.%1$I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
    execute format('create policy %1$s_delete_own on public.%1$I for delete to authenticated using (user_id = (select auth.uid()))', t);
  end loop;
end $$;
