begin;
select no_plan();

select ok((select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),     'RLS enabled on profiles');
select ok((select relrowsecurity from pg_class where oid = 'public.categories'::regclass),   'RLS enabled on categories');
select ok((select relrowsecurity from pg_class where oid = 'public.transactions'::regclass), 'RLS enabled on transactions');
select ok((select relrowsecurity from pg_class where oid = 'public.budgets'::regclass),      'RLS enabled on budgets');

select policies_are('public', 'profiles',     array['profiles_select_own','profiles_insert_own','profiles_update_own'], 'profiles policies');
select policies_are('public', 'categories',   array['categories_select_own','categories_insert_own','categories_update_own','categories_delete_own'], 'categories policies');
select policies_are('public', 'transactions', array['transactions_select_own','transactions_insert_own','transactions_update_own','transactions_delete_own'], 'transactions policies');
select policies_are('public', 'budgets',      array['budgets_select_own','budgets_insert_own','budgets_update_own','budgets_delete_own'], 'budgets policies');

-- every policy is limited to the authenticated role
select is((select count(*)::int from pg_policies where schemaname = 'public' and tablename in ('profiles','categories','transactions','budgets') and roles <> '{authenticated}'), 0, 'all policies are TO authenticated only');

-- profile trigger exists and the trigger function is not callable through the API
select has_trigger('auth', 'users', 'on_auth_user_created', 'profile trigger on auth.users');
select ok(not has_function_privilege('anon', 'public.handle_new_user()', 'execute'), 'anon cannot execute handle_new_user');
select ok(not has_function_privilege('authenticated', 'public.handle_new_user()', 'execute'), 'authenticated cannot execute handle_new_user');

-- indexes backing RLS / lookups
select ok(exists (select 1 from pg_indexes where schemaname='public' and tablename='transactions' and indexdef ilike '%(user_id, transaction_date%'), 'transactions index on user_id, transaction_date');
select ok(exists (select 1 from pg_indexes where schemaname='public' and tablename='budgets' and indexdef ilike '%(user_id, month)%'), 'budgets index on user_id, month');
select ok(exists (select 1 from pg_indexes where schemaname='public' and tablename='categories' and indexdef ilike '%(user_id)%'), 'categories index on user_id');

select * from finish();
rollback;
