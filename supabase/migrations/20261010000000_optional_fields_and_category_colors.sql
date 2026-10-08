-- TrackMyKita 1.1.1: (1) re-assert that a transaction description is optional, (2) more category colors.
-- Additive and idempotent. No rows are deleted or rewritten; RLS is untouched. Safe to run even if earlier migrations already applied.
-- Apply with:  supabase db push

-- 1) Optional description. The ORIGINAL schema declared `description text not null`, which makes Postgres reject an empty
--    description with error 23502 ("Some required details are missing"). Dropping NOT NULL is a no-op if already dropped.
--    The CHECK (length(trim(description)) > 0) stays: NULL passes it, an empty or whitespace-only string is still rejected,
--    so the app stores "no description" as NULL and never as placeholder text. notes and category_id are already nullable.
alter table public.transactions alter column description drop not null;
alter table public.transactions alter column notes drop not null;
alter table public.transactions alter column category_id drop not null;

-- 2) Category colors. Old values (green, amber, brick, slate, grey) stay valid so existing categories are untouched;
--    the app shows legacy values as their nearest simple color (brick -> Red, amber -> Orange, slate -> Blue).
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.categories'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%color%'
  loop
    execute format('alter table public.categories drop constraint %I', c.conname);
  end loop;
  alter table public.categories add constraint categories_color_check check (color in
    ('green','amber','brick','slate','grey',
     'red','orange','yellow','blue','cyan','teal','purple','violet','pink','brown','gray'));
end $$;
