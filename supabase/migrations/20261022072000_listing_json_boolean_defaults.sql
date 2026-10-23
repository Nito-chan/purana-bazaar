-- Boolean JSON fields must be false (not null) for anonymous callers.
create or replace function public.listing_json(p_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'id', l.id,
    'title', l.title,
    'description', l.description,
    'price', l.price,
    'isNegotiable', l.is_negotiable,
    'categoryId', l.category_id,
    'cityId', l.city_id,
    'area', l.area,
    'condition', l.condition,
    'sellerId', l.seller_id,
    'status', case
      when l.status = 'active' and l.expires_at <= now() then 'expired'
      else l.status
    end,
    'isFeatured', l.is_featured,
    'viewsCount', l.views_count,
    'contactsCount', l.contacts_count,
    'createdAt', l.created_at,
    'bumpedAt', l.bumped_at,
    'expiresAt', l.expires_at,
    'closedAt', l.closed_at,
    'attributes', l.attributes,
    'imageCount', l.image_count,
    'variant', abs(hashtext(l.id::text)) % 20,
    'category', jsonb_build_object(
      'id', cat.id,
      'slug', cat.slug,
      'nameEn', cat.name_en,
      'nameHi', cat.name_hi,
      'sortOrder', cat.sort_order
    ),
    'city', jsonb_build_object(
      'id', ci.id,
      'slug', ci.slug,
      'name', ci.name,
      'nameHi', ci.name_hi,
      'state', ci.state,
      'isActive', ci.is_active,
      'isLaunch', ci.is_launch
    ),
    'seller', public.profile_json(l.seller_id),
    'images', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'path', li.storage_path,
            'alt', coalesce(li.alt, l.title || ' — photo ' || (li.sort_order + 1)),
            'sortOrder', li.sort_order
          )
          order by li.sort_order
        )
        from public.listing_images li
        where li.listing_id = l.id
      ),
      '[]'::jsonb
    ),
    'isFavourite', exists (
      select 1 from public.favourites f
      where f.listing_id = l.id and f.user_id = auth.uid()
    ),
    'isMine', coalesce(l.seller_id = auth.uid(), false),
    'isBlockedSeller', exists (
      select 1 from public.blocks b
      where b.user_id = auth.uid() and b.blocked_user_id = l.seller_id
    )
  )
  from public.listings l
  join public.categories cat on cat.id = l.category_id
  join public.cities ci on ci.id = l.city_id
  where l.id = p_id;
$$;
