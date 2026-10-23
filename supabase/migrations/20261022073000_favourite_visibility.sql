-- A saved listing can disappear later (removed, expired or hidden by the seller).
-- The saved screen must return only listings the caller can still see.
create or replace function public.get_favourites()
returns jsonb
language sql
stable
set search_path = public
as $$
  with visible as (
    select
      f.created_at,
      public.listing_json(f.listing_id) as listing
    from public.favourites f
    where f.user_id = auth.uid()
  )
  select coalesce(
    jsonb_agg(listing order by created_at desc) filter (where listing is not null),
    '[]'::jsonb
  )
  from visible;
$$;

create or replace function public.get_favourite_ids()
returns jsonb
language sql
stable
set search_path = public
as $$
  select coalesce(
    jsonb_agg(f.listing_id) filter (where public.listing_json(f.listing_id) is not null),
    '[]'::jsonb
  )
  from public.favourites f
  where f.user_id = auth.uid();
$$;
