-- Phase 1 follow-up: atomic image replacement, profile updates, and a
-- security hardening pass found by the Supabase advisors.

-- The trigger helper must not be vulnerable to search_path injection.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Listing photos are uploaded by the browser and then attached in one
-- transaction. Paths are forced into the caller's own listing folder.
create or replace function public.replace_listing_images(
  p_listing_id uuid,
  p_images jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_path text;
  v_expected_prefix text;
  v_alt text;
  v_index integer := 0;
begin
  if auth.uid() is null then
    raise exception 'auth_required';
  end if;

  if not exists (
    select 1 from public.listings
    where id = p_listing_id and seller_id = auth.uid()
  ) then
    raise exception 'forbidden';
  end if;

  if jsonb_typeof(p_images) is distinct from 'array' then
    raise exception 'invalid_images';
  end if;

  if jsonb_array_length(p_images) > 5 then
    raise exception 'too_many_images';
  end if;

  v_expected_prefix := auth.uid()::text || '/' || p_listing_id::text || '/';

  for v_item in select * from jsonb_array_elements(p_images)
  loop
    v_path := coalesce(v_item ->> 'path', '');
    if v_path = '' or left(v_path, char_length(v_expected_prefix)) <> v_expected_prefix then
      raise exception 'invalid_image_path';
    end if;
    if v_path like '%..%' then
      raise exception 'invalid_image_path';
    end if;
  end loop;

  delete from public.listing_images where listing_id = p_listing_id;

  for v_item in select * from jsonb_array_elements(p_images)
  loop
    v_path := v_item ->> 'path';
    v_alt := left(
      coalesce(nullif(v_item ->> 'alt', ''), 'Listing photo ' || (v_index + 1)::text),
      160
    );
    insert into public.listing_images (listing_id, storage_path, alt, sort_order)
    values (p_listing_id, v_path, v_alt, v_index);
    v_index := v_index + 1;
  end loop;

  return public.listing_json(p_listing_id);
end;
$$;

-- A small, explicit profile editor. Email and roles are never editable here.
create or replace function public.update_my_profile(
  p_name text,
  p_phone text default null,
  p_city_id text default null,
  p_bio text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_phone text;
  v_city text;
  v_bio text;
begin
  if auth.uid() is null then
    raise exception 'auth_required';
  end if;

  v_name := left(trim(coalesce(p_name, '')), 60);
  if v_name = '' then
    raise exception 'invalid_name';
  end if;

  v_phone := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_phone := right(v_phone, 10);
  if v_phone <> '' and char_length(v_phone) < 10 then
    raise exception 'invalid_phone';
  end if;

  v_city := coalesce(nullif(p_city_id, ''), 'city-khargone');
  if not exists (select 1 from public.cities where id = v_city and is_active) then
    raise exception 'invalid_city';
  end if;

  v_bio := left(trim(coalesce(p_bio, '')), 500);

  update public.profiles
  set name = v_name,
      city_id = v_city,
      bio = v_bio
  where id = auth.uid();

  insert into public.profile_contacts (user_id, phone)
  values (auth.uid(), v_phone)
  on conflict (user_id) do update set phone = excluded.phone;

  return public.get_my_profile();
end;
$$;

revoke all on function public.replace_listing_images(uuid, jsonb) from public;
revoke all on function public.update_my_profile(text, text, text, text) from public;
grant execute on function public.replace_listing_images(uuid, jsonb) to authenticated;
grant execute on function public.update_my_profile(text, text, text, text) to authenticated;

-- All image writes go through replace_listing_images, which validates the
-- folder prefix and replaces the set atomically.
revoke insert, update, delete on table public.listing_images from authenticated;

-- The trigger helper is not callable from the API.
revoke all on function public.touch_updated_at() from public, anon, authenticated;
