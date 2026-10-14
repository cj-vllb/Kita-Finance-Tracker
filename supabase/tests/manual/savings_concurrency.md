# Savings concurrency check (manual, two database sessions)

**Status: not yet executed.** pgTAP runs in one session, so it cannot prove concurrency safety. Run this once on a **local or separate staging** database
before relying on the migration. **Never run it against production.** Use two terminals with `psql` (the Supabase SQL Editor cannot hold a transaction
open between runs). Get the connection string from your *staging* project's dashboard; do not paste it into chat, commits or scripts.

## What is being tested
The ledger triggers take a per-user advisory lock (`kita_lock_user`) at the end of each savings-touching statement and hold it until commit, then re-read the
ledger in later statements. So two concurrent writes by the same user are serialized: the second one **waits**, then sees the first one's committed rows and is
**rejected** if the money is gone. Expected, in every scenario: exactly one operation succeeds, the other fails with a `KITA: ...` message, and nothing is left
behind by the failed one. A scenario "fails" if **both** succeed.

## Setup (any session; commits)
```sql
insert into auth.users (id, instance_id, aud, role, email) values
  ('dddddddd-0000-0000-0000-0000000000d1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','concurrency-test@example.invalid');
insert into public.savings_goals (id, user_id, name, target_amount) values
  ('dddddddd-5555-0000-0000-000000000001','dddddddd-0000-0000-0000-0000000000d1','G1',5000),
  ('dddddddd-5555-0000-0000-000000000002','dddddddd-0000-0000-0000-0000000000d1','G2',5000);
insert into public.transactions (user_id, amount, type, description, transaction_date, balance) values
  ('dddddddd-0000-0000-0000-0000000000d1', 1000, 'income', 'seed savings', '2026-10-01', 'savings'),
  ('dddddddd-0000-0000-0000-0000000000d1', 1000, 'income', 'seed current', '2026-10-01', 'current');
```
Both sessions start every scenario with this preamble (acting as the test user, like the app does):
```sql
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"dddddddd-0000-0000-0000-0000000000d1","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'dddddddd-0000-0000-0000-0000000000d1', true);
```

## 1. Two allocations of the same unassigned money (1,000 unassigned; 700 + 700)
1. **Session A:** preamble, then
   `insert into public.savings_reallocations (from_goal_id,to_goal_id,amount,allocation_date) values (null,'dddddddd-5555-0000-0000-000000000001',700,'2026-10-02');` Do **not** commit.
2. **Session B:** preamble, then the same insert with `...000000000002` as the goal. **This statement should hang** (it is waiting for A's lock).
   Optional third session: `select pid, wait_event_type, wait_event from pg_stat_activity where wait_event_type = 'Lock';` shows it.
3. **Session A:** `commit;`
4. **Session B:** the pending insert now fails with `KITA: Not enough unassigned Savings for this...`. Run `rollback;`.
5. Verify (any session, as superuser): exactly one reallocation row exists; `select public.kita_bucket('dddddddd-0000-0000-0000-0000000000d1', null)` is 300,
   G1 is 700, G2 is 0. **Both succeeding (bucket for General = -400) means the lock is not working.**

## 2. Two expenses from the same Savings money (300 unassigned; 200 + 200)
Same pattern with `insert into public.transactions (amount,type,description,transaction_date,balance) values (200,'expense','race','2026-10-03','savings');` in both sessions.
Expected: the second one waits, then fails with `Not enough unassigned Savings`.

## 3. Two transfers out of the same Current Balance (1,000 current; 700 + 700)
`insert into public.savings_transfers (direction,amount,transfer_date) values ('to_savings',700,'2026-10-04');` in both sessions. Expected: the second waits, then fails with
`Not enough in Current Balance`.

## 4. Archiving a goal while money is added to it
1. **Session A:** preamble, then `select public.archive_savings_goal('dddddddd-5555-0000-0000-000000000002', null, '2026-10-05');` (do not commit).
2. **Session B:** preamble, then `insert into public.transactions (amount,type,description,transaction_date,balance,goal_id) values (50,'income','race','2026-10-05','savings','dddddddd-5555-0000-0000-000000000002');` It hangs.
3. **Session A:** `commit;` **Session B:** fails (`...was deleted...`); `rollback;`. The archived goal must hold 0.

## 5. Wrong isolation level is refused
`begin isolation level repeatable read;` + the role/claims lines + any savings insert (for example a 1 transfer to Savings). Expected: `KITA: Savings changes need the default READ COMMITTED isolation level.` then `rollback;`.

## 6. A failed operation leaves nothing behind
After scenarios 1-4: no row from a failed session exists in `savings_reallocations`, `transactions` or `savings_transfers` for the test user, and the buckets above are unchanged.

## Cleanup (commits)
```sql
delete from auth.users where id = 'dddddddd-0000-0000-0000-0000000000d1';  -- cascades; also proves deleting an account with savings activity works
```
