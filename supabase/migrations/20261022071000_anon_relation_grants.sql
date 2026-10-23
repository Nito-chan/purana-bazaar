-- Anonymous feed/detail JSON still needs table-level SELECT privileges for the
-- EXISTS checks on favourites and blocks. Both tables have RLS enabled and no
-- anon policy, so anon receives zero rows; the grants only let the expression
-- compile instead of failing with 42501.
grant select on table public.favourites to anon;
grant select on table public.blocks to anon;
