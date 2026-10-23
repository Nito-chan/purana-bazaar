-- Wrap auth helpers in scalar subqueries so Postgres can evaluate them once
-- per statement instead of once per row. This addresses Supabase advisor
-- `auth_rls_initplan` warnings without changing policy behaviour.
--
-- The loop preserves each policy's command, roles and expression shape; it
-- only rewrites the helper calls and re-applies the clause through ALTER
-- POLICY. If a policy is already rewritten, the loop leaves it untouched.
do $migration$
declare
  policy record;
  using_clause text;
  check_clause text;
begin
  for policy in
    select *
    from pg_policies
    where schemaname = 'public'
  loop
    using_clause := policy.qual;
    check_clause := policy.with_check;

    if using_clause is not null then
      using_clause := replace(using_clause, 'auth.uid()', '(select auth.uid())');
      using_clause := replace(using_clause, 'is_admin()', '(select public.is_admin())');
    end if;

    if check_clause is not null then
      check_clause := replace(check_clause, 'auth.uid()', '(select auth.uid())');
      check_clause := replace(check_clause, 'is_admin()', '(select public.is_admin())');
    end if;

    if using_clause is not null and using_clause is distinct from policy.qual then
      execute format(
        'alter policy %I on public.%I using (%s)',
        policy.policyname,
        policy.tablename,
        using_clause
      );
    end if;

    if check_clause is not null and check_clause is distinct from policy.with_check then
      execute format(
        'alter policy %I on public.%I with check (%s)',
        policy.policyname,
        policy.tablename,
        check_clause
      );
    end if;
  end loop;
end
$migration$;
