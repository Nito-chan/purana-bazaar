-- Purana Bazaar — Phase 1 read/write RPCs.
-- Public reads use SECURITY INVOKER so RLS remains the final authority.
-- Writes that need private data (phone, chats, moderation) use SECURITY DEFINER
-- with explicit ownership/participant checks.

-- ---------------------------------------------------------------------------
-- Shared JSON builders
-- ---------------------------------------------------------------------------

create or replace function public.profile_json(p_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'id', p.id,
    'name', p.name,
    'cityId', p.city_id,
    'city', case when c.id is null then null else jsonb_build_object(
      'id', c.id,
      'slug', c.slug,
      'name', c.name,
      'nameHi', c.name_hi,
      'state', c.state,
      'isActive', c.is_active,
      'isLaunch', c.is_launch
    ) end,
    'isVerified', p.is_verified,
    'rating', p.rating,
    'ratingCount', p.rating_count,
    'memberSince', p.member_since,
    'bio', p.bio,
    'avatarUrl', p.avatar_url
  )
  from public.profiles p
  left join public.cities c on c.id = p.city_id
  where p.id = p_id;
$$;

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
    'isMine', l.seller_id = auth.uid(),
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

create or replace function public.conversation_json(p_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'id', c.id,
    'listingId', c.listing_id,
    'buyerId', c.buyer_id,
    'sellerId', c.seller_id,
    'createdAt', c.created_at,
    'lastMessageAt', c.last_message_at,
    'listing', public.listing_json(c.listing_id),
    'otherUser', public.profile_json(
      case when c.buyer_id = auth.uid() then c.seller_id else c.buyer_id end
    ),
    'lastMessage', (
      select jsonb_build_object(
        'id', m.id,
        'conversationId', m.conversation_id,
        'senderId', m.sender_id,
        'body', m.body,
        'createdAt', m.created_at,
        'readAt', m.read_at
      )
      from public.messages m
      where m.conversation_id = c.id
      order by m.created_at desc
      limit 1
    ),
    'unreadCount', (
      select count(*)::int
      from public.messages m
      where m.conversation_id = c.id
        and m.sender_id <> auth.uid()
        and m.read_at is null
    ),
    'isBlocked', exists (
      select 1 from public.blocks b
      where b.user_id = auth.uid()
        and b.blocked_user_id = case
          when c.buyer_id = auth.uid() then c.seller_id
          else c.buyer_id
        end
    )
  )
  from public.conversations c
  where c.id = p_id
    and (c.buyer_id = auth.uid() or c.seller_id = auth.uid() or public.is_admin());
$$;

create or replace function public.get_my_profile()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', p.id,
    'name', p.name,
    'email', coalesce(u.email, ''),
    'phone', coalesce(pc.phone, ''),
    'cityId', p.city_id,
    'city', case when c.id is null then null else jsonb_build_object(
      'id', c.id,
      'slug', c.slug,
      'name', c.name,
      'nameHi', c.name_hi,
      'state', c.state,
      'isActive', c.is_active,
      'isLaunch', c.is_launch
    ) end,
    'isVerified', p.is_verified,
    'rating', p.rating,
    'ratingCount', p.rating_count,
    'memberSince', p.member_since,
    'bio', p.bio,
    'avatarUrl', p.avatar_url,
    'isAdmin', public.is_admin()
  )
  from public.profiles p
  join auth.users u on u.id = p.id
  left join public.profile_contacts pc on pc.user_id = p.id
  left join public.cities c on c.id = p.city_id
  where p.id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- Feed and detail
-- ---------------------------------------------------------------------------

create or replace function public.get_feed(
  p_city_id text default null,
  p_category_id text default null,
  p_q text default '',
  p_min_price integer default null,
  p_max_price integer default null,
  p_condition text default '',
  p_with_photos boolean default false,
  p_sort text default 'newest',
  p_limit integer default 20,
  p_cursor text default '0',
  p_featured_only boolean default false
)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with settings as (
    select
      greatest(1, least(coalesce(p_limit, 20), 40)) as page_size,
      case when coalesce(p_cursor, '') ~ '^[0-9]+$' then coalesce(p_cursor, '0')::int else 0 end as page_offset,
      coalesce(trim(p_q), '') as search_text
  ),
  filtered as (
    select
      l.id,
      l.is_featured,
      l.price,
      l.bumped_at,
      count(*) over () as total_count,
      row_number() over (
        order by
          l.is_featured desc,
          case when p_sort = 'price_asc' then l.price end asc,
          case when p_sort = 'price_desc' then l.price end desc,
          l.bumped_at desc
      ) as row_order
    from public.listings l
    join public.cities ci on ci.id = l.city_id
    join public.categories cat on cat.id = l.category_id
    join public.profiles pr on pr.id = l.seller_id
    cross join settings s
    where l.status = 'active'
      and l.expires_at > now()
      and ci.is_active
      and cat.is_active
      and (p_featured_only is false or l.is_featured)
      and (p_city_id is null or l.city_id = p_city_id)
      and (p_category_id is null or l.category_id = p_category_id)
      and (p_min_price is null or p_min_price <= 0 or l.price >= p_min_price)
      and (p_max_price is null or p_max_price <= 0 or l.price <= p_max_price)
      and (coalesce(p_condition, '') = '' or l.condition = p_condition)
      and (p_with_photos is false or l.image_count > 0)
      and not exists (
        select 1 from public.blocks b
        where b.user_id = auth.uid() and b.blocked_user_id = l.seller_id
      )
      and (
        s.search_text = ''
        or l.search_vector @@ websearch_to_tsquery('simple', s.search_text)
        or l.title ilike '%' || s.search_text || '%'
        or l.description ilike '%' || s.search_text || '%'
        or cat.name_en ilike '%' || s.search_text || '%'
        or cat.name_hi ilike '%' || s.search_text || '%'
        or pr.name ilike '%' || s.search_text || '%'
      )
  ),
  page as (
    select *
    from filtered
    order by row_order
    limit (select page_size from settings)
    offset (select page_offset from settings)
  )
  select jsonb_build_object(
    'items', coalesce(
      (
        select jsonb_agg(public.listing_json(id) order by row_order)
        from page
      ),
      '[]'::jsonb
    ),
    'total', coalesce((select max(total_count) from filtered), 0),
    'nextCursor', case
      when (select page_offset + page_size from settings) < coalesce((select max(total_count) from filtered), 0)
        then ((select page_offset + page_size from settings))::text
      else null
    end
  );
$$;

create or replace function public.get_featured(
  p_city_id text default null,
  p_limit integer default 8
)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with picked as (
    select l.id, row_number() over (order by l.bumped_at desc) as row_order
    from public.listings l
    join public.cities ci on ci.id = l.city_id
    join public.categories cat on cat.id = l.category_id
    where l.status = 'active'
      and l.expires_at > now()
      and l.is_featured
      and ci.is_active
      and cat.is_active
      and (p_city_id is null or l.city_id = p_city_id)
      and not exists (
        select 1 from public.blocks b
        where b.user_id = auth.uid() and b.blocked_user_id = l.seller_id
      )
    limit greatest(1, least(coalesce(p_limit, 8), 12))
  )
  select coalesce(jsonb_agg(public.listing_json(id) order by row_order), '[]'::jsonb)
  from picked;
$$;

create or replace function public.get_listing(p_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select public.listing_json(p_id);
$$;

create or replace function public.get_similar(
  p_id uuid,
  p_limit integer default 6
)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with source as (
    select category_id from public.listings where id = p_id
  ),
  picked as (
    select l.id, row_number() over (order by l.is_featured desc, l.bumped_at desc) as row_order
    from public.listings l
    join source s on s.category_id = l.category_id
    join public.cities ci on ci.id = l.city_id
    where l.id <> p_id
      and l.status = 'active'
      and l.expires_at > now()
      and ci.is_active
    limit greatest(1, least(coalesce(p_limit, 6), 12))
  )
  select coalesce(jsonb_agg(public.listing_json(id) order by row_order), '[]'::jsonb)
  from picked;
$$;

-- ---------------------------------------------------------------------------
-- Listing interactions
-- ---------------------------------------------------------------------------

create or replace function public.record_listing_view(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.listings
  set views_count = views_count + 1
  where id = p_id
    and status <> 'removed'
  returning views_count into v_count;

  if v_count is null then
    raise exception 'listing_not_found';
  end if;

  insert into public.listing_events (listing_id, user_id, event_type)
  values (p_id, auth.uid(), 'view');

  return jsonb_build_object('viewsCount', v_count);
end;
$$;

create or replace function public.get_listing_contact(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing public.listings;
  v_name text;
  v_phone text;
begin
  if auth.uid() is null then
    raise exception 'auth_required';
  end if;

  select * into v_listing from public.listings where id = p_id;
  if v_listing.id is null then
    raise exception 'listing_not_found';
  end if;

  if v_listing.status <> 'active' or v_listing.expires_at <= now() then
    raise exception 'listing_closed';
  end if;

  if exists (
    select 1 from public.blocks b
    where (b.user_id = auth.uid() and b.blocked_user_id = v_listing.seller_id)
       or (b.user_id = v_listing.seller_id and b.blocked_user_id = auth.uid())
  ) then
    raise exception 'blocked';
  end if;

  select p.name, coalesce(pc.phone, '')
  into v_name, v_phone
  from public.profiles p
  left join public.profile_contacts pc on pc.user_id = p.id
  where p.id = v_listing.seller_id;

  update public.listings
  set contacts_count = contacts_count + 1
  where id = p_id;

  insert into public.listing_events (listing_id, user_id, event_type)
  values (p_id, auth.uid(), 'contact');

  return jsonb_build_object(
    'phone', v_phone,
    'name', v_name,
    'listingId', p_id,
    'userId', v_listing.seller_id
  );
end;
$$;

create or replace function public.mark_listing_sold(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'auth_required';
  end if;

  update public.listings
  set status = 'sold', closed_at = now()
  where id = p_id
    and seller_id = auth.uid()
    and status <> 'removed';

  if not found then
    raise exception 'forbidden';
  end if;

  return public.listing_json(p_id);
end;
$$;

create or replace function public.renew_listing(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'auth_required';
  end if;

  update public.listings
  set status = 'active',
      bumped_at = now(),
      expires_at = now() + interval '30 days',
      closed_at = null
  where id = p_id
    and seller_id = auth.uid()
    and status in ('active', 'expired');

  if not found then
    raise exception 'forbidden';
  end if;

  return public.listing_json(p_id);
end;
$$;

create or replace function public.remove_listing(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'auth_required';
  end if;

  update public.listings
  set status = 'removed', closed_at = now()
  where id = p_id
    and seller_id = auth.uid()
    and status <> 'removed';

  if not found then
    raise exception 'forbidden';
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- Conversations
-- ---------------------------------------------------------------------------

create or replace function public.start_conversation(p_listing_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing public.listings;
  v_id uuid;
  v_created boolean := false;
begin
  if auth.uid() is null then
    raise exception 'auth_required';
  end if;

  select * into v_listing from public.listings where id = p_listing_id;
  if v_listing.id is null then
    raise exception 'listing_not_found';
  end if;
  if v_listing.seller_id = auth.uid() then
    raise exception 'own_listing';
  end if;
  if v_listing.status <> 'active' or v_listing.expires_at <= now() then
    raise exception 'listing_closed';
  end if;
  if exists (
    select 1 from public.blocks b
    where (b.user_id = auth.uid() and b.blocked_user_id = v_listing.seller_id)
       or (b.user_id = v_listing.seller_id and b.blocked_user_id = auth.uid())
  ) then
    raise exception 'blocked';
  end if;

  insert into public.conversations (listing_id, buyer_id, seller_id)
  values (p_listing_id, auth.uid(), v_listing.seller_id)
  on conflict (listing_id, buyer_id) do nothing
  returning id into v_id;

  if v_id is null then
    select id into v_id
    from public.conversations
    where listing_id = p_listing_id and buyer_id = auth.uid();
  else
    v_created := true;
  end if;

  return jsonb_build_object('id', v_id, 'created', v_created);
end;
$$;

create or replace function public.send_message(p_conversation_id uuid, p_body text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conversation public.conversations;
  v_listing public.listings;
  v_body text;
  v_message public.messages;
begin
  if auth.uid() is null then
    raise exception 'auth_required';
  end if;

  select * into v_conversation
  from public.conversations
  where id = p_conversation_id
    and (buyer_id = auth.uid() or seller_id = auth.uid());

  if v_conversation.id is null then
    raise exception 'conversation_not_found';
  end if;

  select * into v_listing from public.listings where id = v_conversation.listing_id;
  if v_listing.status <> 'active' or v_listing.expires_at <= now() then
    raise exception 'listing_closed';
  end if;

  if exists (
    select 1 from public.blocks b
    where (b.user_id = auth.uid() and b.blocked_user_id = case
        when v_conversation.buyer_id = auth.uid() then v_conversation.seller_id
        else v_conversation.buyer_id
      end)
      or (b.user_id = case
        when v_conversation.buyer_id = auth.uid() then v_conversation.seller_id
        else v_conversation.buyer_id
      end and b.blocked_user_id = auth.uid())
  ) then
    raise exception 'blocked';
  end if;

  v_body := left(trim(coalesce(p_body, '')), 1000);
  if v_body = '' then
    raise exception 'empty_message';
  end if;

  insert into public.messages (conversation_id, sender_id, body)
  values (p_conversation_id, auth.uid(), v_body)
  returning * into v_message;

  return jsonb_build_object(
    'id', v_message.id,
    'conversationId', v_message.conversation_id,
    'senderId', v_message.sender_id,
    'body', v_message.body,
    'createdAt', v_message.created_at,
    'readAt', v_message.read_at,
    'isMine', true
  );
end;
$$;

create or replace function public.mark_conversation_read(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_marked integer;
begin
  if auth.uid() is null then
    raise exception 'auth_required';
  end if;

  if not exists (
    select 1 from public.conversations
    where id = p_id and (buyer_id = auth.uid() or seller_id = auth.uid())
  ) then
    raise exception 'conversation_not_found';
  end if;

  update public.messages
  set read_at = now()
  where conversation_id = p_id
    and sender_id <> auth.uid()
    and read_at is null;

  get diagnostics v_marked = row_count;
  return jsonb_build_object('marked', v_marked);
end;
$$;

create or replace function public.get_chat_list()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(
    jsonb_agg(public.conversation_json(id) order by last_message_at desc),
    '[]'::jsonb
  )
  from public.conversations
  where buyer_id = auth.uid() or seller_id = auth.uid();
$$;

create or replace function public.get_chat(p_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select case
    when public.conversation_json(p_id) is null then null
    else jsonb_build_object(
      'conversation', public.conversation_json(p_id),
      'messages', coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'id', m.id,
              'conversationId', m.conversation_id,
              'senderId', m.sender_id,
              'body', m.body,
              'createdAt', m.created_at,
              'readAt', m.read_at,
              'isMine', m.sender_id = auth.uid()
            )
            order by m.created_at
          )
          from public.messages m
          where m.conversation_id = p_id
        ),
        '[]'::jsonb
      )
    )
  end;
$$;

create or replace function public.get_unread_chat_count()
returns integer
language sql
stable
security invoker
set search_path = public
as $$
  select count(*)::int
  from public.messages m
  join public.conversations c on c.id = m.conversation_id
  where (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    and m.sender_id <> auth.uid()
    and m.read_at is null;
$$;

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------

create or replace function public.get_notifications()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', n.id,
        'userId', n.user_id,
        'type', n.type,
        'title', n.title,
        'body', n.body,
        'link', n.link,
        'read', n.read_at is not null,
        'isUnread', n.read_at is null,
        'createdAt', n.created_at
      )
      order by n.created_at desc
    ),
    '[]'::jsonb
  )
  from public.notifications n
  where n.user_id = auth.uid();
$$;

create or replace function public.get_unread_notification_count()
returns integer
language sql
stable
security invoker
set search_path = public
as $$
  select count(*)::int
  from public.notifications
  where user_id = auth.uid() and read_at is null;
$$;

create or replace function public.mark_all_notifications_read()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_marked integer;
begin
  if auth.uid() is null then
    raise exception 'auth_required';
  end if;

  update public.notifications
  set read_at = now()
  where user_id = auth.uid() and read_at is null;

  get diagnostics v_marked = row_count;
  return jsonb_build_object('marked', v_marked, 'count', 0);
end;
$$;

create or replace function public.mark_notification_read(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'auth_required';
  end if;

  update public.notifications
  set read_at = now()
  where id = p_id and user_id = auth.uid();

  if not found then
    raise exception 'notification_not_found';
  end if;

  return jsonb_build_object(
    'count', (
      select count(*)::int
      from public.notifications
      where user_id = auth.uid() and read_at is null
    )
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Favourites, seller pages and safety
-- ---------------------------------------------------------------------------

create or replace function public.get_favourite_ids()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(jsonb_agg(listing_id), '[]'::jsonb)
  from public.favourites
  where user_id = auth.uid();
$$;

create or replace function public.get_favourites()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(
    jsonb_agg(public.listing_json(f.listing_id) order by f.created_at desc),
    '[]'::jsonb
  )
  from public.favourites f
  where f.user_id = auth.uid();
$$;

create or replace function public.get_my_listings()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(
    jsonb_agg(public.listing_json(id) order by created_at desc),
    '[]'::jsonb
  )
  from public.listings
  where seller_id = auth.uid()
    and status <> 'removed';
$$;

create or replace function public.get_my_blocks()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(jsonb_agg(blocked_user_id), '[]'::jsonb)
  from public.blocks
  where user_id = auth.uid();
$$;

create or replace function public.toggle_block(p_seller_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exists boolean;
begin
  if auth.uid() is null then
    raise exception 'auth_required';
  end if;
  if p_seller_id = auth.uid() then
    raise exception 'cannot_block_self';
  end if;
  if not exists (select 1 from public.profiles where id = p_seller_id) then
    raise exception 'seller_not_found';
  end if;

  delete from public.blocks
  where user_id = auth.uid() and blocked_user_id = p_seller_id;

  if found then
    return jsonb_build_object('blocked', false);
  end if;

  insert into public.blocks (user_id, blocked_user_id)
  values (auth.uid(), p_seller_id);

  return jsonb_build_object('blocked', true);
end;
$$;

create or replace function public.create_report(
  p_listing_id uuid default null,
  p_user_id uuid default null,
  p_reason text default '',
  p_details text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'auth_required';
  end if;
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'report_reason_required';
  end if;
  if p_listing_id is null and p_user_id is null then
    raise exception 'report_target_required';
  end if;

  insert into public.reports (reporter_id, target_listing_id, target_user_id, reason, details)
  values (
    auth.uid(),
    p_listing_id,
    p_user_id,
    p_reason,
    left(coalesce(p_details, ''), 500)
  )
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

create or replace function public.get_seller(p_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'seller', public.profile_json(p_id),
    'activeCount', (
      select count(*)::int from public.listings
      where seller_id = p_id and status = 'active' and expires_at > now()
    ),
    'soldCount', (
      select count(*)::int from public.listings
      where seller_id = p_id and status = 'sold'
    ),
    'isBlocked', exists (
      select 1 from public.blocks
      where user_id = auth.uid() and blocked_user_id = p_id
    )
  );
$$;

create or replace function public.get_seller_listings(p_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(
    jsonb_agg(public.listing_json(id) order by is_featured desc, bumped_at desc),
    '[]'::jsonb
  )
  from public.listings
  where seller_id = p_id
    and status = 'active'
    and expires_at > now()
    and not exists (
      select 1 from public.blocks b
      where b.user_id = auth.uid() and b.blocked_user_id = p_id
    );
$$;

create or replace function public.get_meta_counts()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'cities', (select count(*)::int from public.cities where is_active),
    'categories', (select count(*)::int from public.categories where is_active),
    'listings', (select count(*)::int from public.listings where status = 'active' and expires_at > now()),
    'profiles', (select count(*)::int from public.profiles)
  );
$$;

-- ---------------------------------------------------------------------------
-- Grant only the intended RPC surface.
-- ---------------------------------------------------------------------------

revoke all on function public.profile_json(uuid) from public;
revoke all on function public.listing_json(uuid) from public;
revoke all on function public.conversation_json(uuid) from public;
revoke all on function public.get_my_profile() from public;
revoke all on function public.get_feed(text, text, text, integer, integer, text, boolean, text, integer, text, boolean) from public;
revoke all on function public.get_featured(text, integer) from public;
revoke all on function public.get_listing(uuid) from public;
revoke all on function public.get_similar(uuid, integer) from public;
revoke all on function public.record_listing_view(uuid) from public;
revoke all on function public.get_listing_contact(uuid) from public;
revoke all on function public.mark_listing_sold(uuid) from public;
revoke all on function public.renew_listing(uuid) from public;
revoke all on function public.remove_listing(uuid) from public;
revoke all on function public.start_conversation(uuid) from public;
revoke all on function public.send_message(uuid, text) from public;
revoke all on function public.mark_conversation_read(uuid) from public;
revoke all on function public.get_chat_list() from public;
revoke all on function public.get_chat(uuid) from public;
revoke all on function public.get_unread_chat_count() from public;
revoke all on function public.get_notifications() from public;
revoke all on function public.get_unread_notification_count() from public;
revoke all on function public.mark_all_notifications_read() from public;
revoke all on function public.mark_notification_read(uuid) from public;
revoke all on function public.get_favourite_ids() from public;
revoke all on function public.get_favourites() from public;
revoke all on function public.get_my_listings() from public;
revoke all on function public.get_my_blocks() from public;
revoke all on function public.toggle_block(uuid) from public;
revoke all on function public.create_report(uuid, uuid, text, text) from public;
revoke all on function public.get_seller(uuid) from public;
revoke all on function public.get_seller_listings(uuid) from public;
revoke all on function public.get_meta_counts() from public;

grant execute on function public.profile_json(uuid) to anon, authenticated;
grant execute on function public.listing_json(uuid) to anon, authenticated;
grant execute on function public.conversation_json(uuid) to authenticated;
grant execute on function public.get_my_profile() to anon, authenticated;
grant execute on function public.get_feed(text, text, text, integer, integer, text, boolean, text, integer, text, boolean) to anon, authenticated;
grant execute on function public.get_featured(text, integer) to anon, authenticated;
grant execute on function public.get_listing(uuid) to anon, authenticated;
grant execute on function public.get_similar(uuid, integer) to anon, authenticated;
grant execute on function public.record_listing_view(uuid) to anon, authenticated;
grant execute on function public.get_listing_contact(uuid) to authenticated;
grant execute on function public.mark_listing_sold(uuid) to authenticated;
grant execute on function public.renew_listing(uuid) to authenticated;
grant execute on function public.remove_listing(uuid) to authenticated;
grant execute on function public.start_conversation(uuid) to authenticated;
grant execute on function public.send_message(uuid, text) to authenticated;
grant execute on function public.mark_conversation_read(uuid) to authenticated;
grant execute on function public.get_chat_list() to authenticated;
grant execute on function public.get_chat(uuid) to authenticated;
grant execute on function public.get_unread_chat_count() to authenticated;
grant execute on function public.get_notifications() to authenticated;
grant execute on function public.get_unread_notification_count() to authenticated;
grant execute on function public.mark_all_notifications_read() to authenticated;
grant execute on function public.mark_notification_read(uuid) to authenticated;
grant execute on function public.get_favourite_ids() to authenticated;
grant execute on function public.get_favourites() to authenticated;
grant execute on function public.get_my_listings() to authenticated;
grant execute on function public.get_my_blocks() to authenticated;
grant execute on function public.toggle_block(uuid) to authenticated;
grant execute on function public.create_report(uuid, uuid, text, text) to authenticated;
grant execute on function public.get_seller(uuid) to anon, authenticated;
grant execute on function public.get_seller_listings(uuid) to anon, authenticated;
grant execute on function public.get_meta_counts() to anon, authenticated;
