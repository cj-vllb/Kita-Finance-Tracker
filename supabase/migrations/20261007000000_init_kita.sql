-- Kita schema: profiles, categories, transactions, budgets + constraints, indexes, triggers, RLS.
create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (length(trim(full_name)) > 0),
  currency text not null default 'PHP' check (currency in ('PHP','USD','EUR')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  type text not null check (type in ('income','expense')),
  color text not null default 'grey' check (color in ('green','amber','brick','slate','grey')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name, type),
  unique (id, user_id)            -- target for the composite foreign keys below
);

-- Composite FK (category_id, user_id) makes it impossible to reference another user's category.
-- ON DELETE NO ACTION (not RESTRICT) still blocks deleting a category in use, but lets account deletion cascade cleanly.
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  category_id uuid,
  amount numeric(14,2) not null check (amount > 0),
  type text not null check (type in ('income','expense')),
  description text not null check (length(trim(description)) > 0),
  transaction_date date not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (category_id, user_id) references public.categories(id, user_id) on delete no action
);

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  category_id uuid not null,
  amount numeric(14,2) not null check (amount > 0),
  month date not null check (extract(day from month) = 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category_id, month),
  foreign key (category_id, user_id) references public.categories(id, user_id) on delete no action
);

create index categories_user_idx on public.categories (user_id);
create index transactions_user_date_idx on public.transactions (user_id, transaction_date desc);
create index transactions_category_idx on public.transactions (category_id);
create index budgets_user_month_idx on public.budgets (user_id, month);
create index budgets_category_idx on public.budgets (category_id);

create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger categories_updated before update on public.categories for each row execute function public.set_updated_at();
create trigger transactions_updated before update on public.transactions for each row execute function public.set_updated_at();
create trigger budgets_updated before update on public.budgets for each row execute function public.set_updated_at();

-- Profile is created from the new auth user; ownership is never supplied by the browser.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), nullif(split_part(new.email, '@', 1), ''), 'User'));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Lets a signed-in user delete their own account without any secret key in the browser.
create or replace function public.delete_my_account() returns void language plpgsql security definer set search_path = '' as $$
begin delete from auth.users where id = auth.uid(); end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;

create policy profiles_select_own on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy profiles_insert_own on public.profiles for insert to authenticated with check (id = (select auth.uid()));
create policy profiles_update_own on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

do $$ declare t text; begin
  foreach t in array array['categories','transactions','budgets'] loop
    execute format('create policy %1$s_select_own on public.%1$I for select to authenticated using (user_id = (select auth.uid()))', t);
    execute format('create policy %1$s_insert_own on public.%1$I for insert to authenticated with check (user_id = (select auth.uid()))', t);
    execute format('create policy %1$s_update_own on public.%1$I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
    execute format('create policy %1$s_delete_own on public.%1$I for delete to authenticated using (user_id = (select auth.uid()))', t);
  end loop;
end $$;
