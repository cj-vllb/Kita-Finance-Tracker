-- Integrity hardening: the database (not the dropdowns) guarantees that
--   * a transaction's type matches its category's type, and
--   * a budget can only point at an expense category.
-- Composite FKs also stop a category's type being changed while in use.
-- Idempotent. Existing rows are checked; if any legacy row violates a rule the constraint stays
-- NOT VALID (still enforced for new/changed rows) and a WARNING names it, so the migration never fails on old data.

alter table public.budgets add column if not exists category_type text not null default 'expense';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'budgets_category_type_expense_chk' and conrelid = 'public.budgets'::regclass) then
    alter table public.budgets add constraint budgets_category_type_expense_chk check (category_type = 'expense');
  end if;

  if not exists (select 1 from pg_constraint where conname = 'categories_id_user_type_key' and conrelid = 'public.categories'::regclass) then
    alter table public.categories add constraint categories_id_user_type_key unique (id, user_id, type);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'transactions_category_type_fkey' and conrelid = 'public.transactions'::regclass) then
    alter table public.transactions add constraint transactions_category_type_fkey
      foreign key (category_id, user_id, type) references public.categories (id, user_id, type) on delete no action not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'budgets_category_type_fkey' and conrelid = 'public.budgets'::regclass) then
    alter table public.budgets add constraint budgets_category_type_fkey
      foreign key (category_id, user_id, category_type) references public.categories (id, user_id, type) on delete no action not valid;
  end if;

  begin
    alter table public.transactions validate constraint transactions_category_type_fkey;
  exception when foreign_key_violation then
    raise warning 'transactions_category_type_fkey left NOT VALID: some existing transactions have a type that differs from their category';
  end;
  begin
    alter table public.budgets validate constraint budgets_category_type_fkey;
  exception when foreign_key_violation then
    raise warning 'budgets_category_type_fkey left NOT VALID: some existing budgets point at a non-expense category';
  end;
end $$;
