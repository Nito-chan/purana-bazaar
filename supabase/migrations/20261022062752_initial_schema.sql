-- Purana Bazaar — Phase 1 schema.
-- Reference data (cities, categories, boost products) is seeded in a later migration.
-- Fake listings, profiles and conversations are intentionally not seeded here.

create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------------
-- Reference tables
-- ---------------------------------------------------------------------------

create table public.cities (
  id text primary key,
  slug text not null unique,
  name text not null,
  name_hi text,
  state text not null,
  is_active boolean not null default false,
  is_launch boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cities_slug_format check (slug ~ '^[a-z0-9-]+$')
);

create table public.categories (
  id text primary key,
  slug text not null unique,
  name_en text not null,
  name_hi text,
  sort_order integer not null default 0,
  attributes_schema jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_slug_format check (slug ~ '^[a-z0-9-]+$'),
  constraint categories_attributes_schema_array check (jsonb_typeof(attributes_schema) = 'array')
);

-- ---------------------------------------------------------------------------
-- People
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  city_id text references public.cities (id) on delete set null,
  is_verified boolean not null default false,
  rating numeric(2, 1) not null default 0 check (rating >= 0 and rating <= 5),
  rating_count integer not null default 0 check (rating_count >= 0),
  member_since timestamptz not null default now(),
  bio text not null default '',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_name_length check (char_length(name) between 1 and 60),
  constraint profiles_bio_length check (char_length(bio) <= 500)
);

-- Phone numbers are kept out of the public profiles table. Only the owner and
-- the get_listing_contact RPC can read them.
create table public.profile_contacts (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  phone text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profile_contacts_phone_format check (phone = '' or phone ~ '^[0-9]{10,15}$')
);

-- Roles are deliberately not exposed through the public API. The is_admin()
-- security-definer function is the only read path used by RLS.
create table public.user_roles (
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('admin', 'moderator')),
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

-- ---------------------------------------------------------------------------
-- Listings
-- ---------------------------------------------------------------------------

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  price integer not null default 0 check (price >= 0 and price <= 100000000),
  is_negotiable boolean not null default true,
  category_id text not null references public.categories (id),
  city_id text not null references public.cities (id),
  area text not null default '',
  condition text not null default 'good'
    check (condition in ('new', 'like_new', 'good', 'fair', 'for_parts')),
  seller_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  status text not null default 'active'
    check (status in ('active', 'sold', 'expired', 'hidden', 'removed', 'pending_review')),
  is_featured boolean not null default false,
  views_count integer not null default 0 check (views_count >= 0),
  contacts_count integer not null default 0 check (contacts_count >= 0),
  attributes jsonb not null default '{}'::jsonb,
  image_count smallint not null default 0 check (image_count >= 0 and image_count <= 5),
  search_vector tsvector generated always as (
    to_tsvector(
      'simple',
      coalesce(title, '') || ' ' ||
      coalesce(description, '') || ' ' ||
      coalesce(area, '') || ' ' ||
      coalesce(attributes::text, '')
    )
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  bumped_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  closed_at timestamptz,
  constraint listings_title_length check (char_length(title) between 1 and 80),
  constraint listings_description_length check (char_length(description) <= 2000),
  constraint listings_area_length check (char_length(area) <= 60),
  constraint listings_attributes_object check (jsonb_typeof(attributes) = 'object'),
  constraint listings_attributes_size check (pg_column_size(attributes) <= 8192)
);

create table public.listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  storage_path text not null,
  alt text,
  sort_order smallint not null default 0 check (sort_order >= 0 and sort_order < 5),
  width integer,
  height integer,
  created_at timestamptz not null default now(),
  constraint listing_images_path_not_empty check (char_length(storage_path) > 0),
  constraint listing_images_alt_length check (alt is null or char_length(alt) <= 160),
  unique (listing_id, sort_order),
  unique (storage_path)
);

create table public.favourites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

-- ---------------------------------------------------------------------------
-- Conversations
-- ---------------------------------------------------------------------------

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  buyer_id uuid not null references public.profiles (id) on delete cascade,
  seller_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  constraint conversations_distinct_participants check (buyer_id <> seller_id),
  unique (listing_id, buyer_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint messages_body_length check (char_length(body) between 1 and 1000)
);

-- ---------------------------------------------------------------------------
-- Safety, social and engagement
-- ---------------------------------------------------------------------------

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('message', 'listing', 'saved', 'system', 'report', 'promotion', 'review')),
  title text not null,
  body text not null default '',
  link text not null default '',
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_title_length check (char_length(title) <= 160),
  constraint notifications_body_length check (char_length(body) <= 500),
  constraint notifications_link_length check (char_length(link) <= 300)
);

create table public.blocks (
  user_id uuid not null references public.profiles (id) on delete cascade,
  blocked_user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, blocked_user_id),
  constraint blocks_not_self check (user_id <> blocked_user_id)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  target_listing_id uuid references public.listings (id) on delete cascade,
  target_user_id uuid references public.profiles (id) on delete cascade,
  reason text not null check (reason in ('fake', 'wrong', 'scam', 'inappropriate', 'prohibited', 'other')),
  details text not null default '',
  status text not null default 'open'
    check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles (id) on delete set null,
  resolution text not null default '',
  constraint reports_target_present check (target_listing_id is not null or target_user_id is not null),
  constraint reports_details_length check (char_length(details) <= 500)
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  reviewer_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  seller_id uuid not null references public.profiles (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  body text not null default '',
  created_at timestamptz not null default now(),
  constraint reviews_body_length check (char_length(body) <= 1000),
  constraint reviews_not_self check (reviewer_id <> seller_id),
  unique (listing_id, reviewer_id)
);

create table public.wanted_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  city_id text not null references public.cities (id),
  category_id text references public.categories (id) on delete set null,
  title text not null,
  description text not null default '',
  budget integer check (budget is null or budget >= 0),
  status text not null default 'open' check (status in ('open', 'closed', 'removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  constraint wanted_title_length check (char_length(title) between 1 and 80),
  constraint wanted_description_length check (char_length(description) <= 1000)
);

create table public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name text not null,
  query jsonb not null default '{}'::jsonb,
  notify boolean not null default true,
  created_at timestamptz not null default now(),
  last_notified_at timestamptz,
  constraint saved_searches_name_length check (char_length(name) between 1 and 80),
  constraint saved_searches_query_object check (jsonb_typeof(query) = 'object')
);

create table public.listing_events (
  id bigint generated always as identity primary key,
  listing_id uuid not null references public.listings (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  event_type text not null check (event_type in ('view', 'contact', 'share')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Monetisation and promotion
-- ---------------------------------------------------------------------------

create table public.promotion_products (
  id text primary key,
  code text not null unique,
  name text not null,
  kind text not null check (kind in ('listing_boost', 'dealer_boost')),
  duration_days integer not null check (duration_days > 0),
  price_inr integer not null check (price_inr >= 0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  provider text not null default 'razorpay',
  provider_order_id text,
  provider_payment_id text,
  amount_inr integer not null check (amount_inr >= 0),
  currency text not null default 'INR',
  status text not null default 'created'
    check (status in ('created', 'paid', 'failed', 'refunded')),
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index payments_provider_payment_id_key
  on public.payments (provider, provider_payment_id)
  where provider_payment_id is not null;

create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  listing_id uuid references public.listings (id) on delete cascade,
  product_id text not null references public.promotion_products (id),
  payment_id uuid references public.payments (id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'active', 'expired', 'cancelled', 'refunded')),
  starts_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index promotions_active_listing_idx
  on public.promotions (listing_id, expires_at)
  where status = 'active';

create table public.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  image_path text not null,
  link_url text not null default '',
  city_id text references public.cities (id) on delete cascade,
  slot text not null default 'home',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  constraint banners_title_length check (char_length(title) <= 120),
  constraint banners_link_length check (char_length(link_url) <= 300)
);

-- ---------------------------------------------------------------------------
-- Admin and account lifecycle
-- ---------------------------------------------------------------------------

create table public.admin_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null default '',
  status text not null default 'pending' check (status in ('pending', 'processed', 'cancelled')),
  requested_at timestamptz not null default now(),
  processed_at timestamptz
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index listings_feed_idx
  on public.listings (city_id, category_id, status, bumped_at desc);
create index listings_seller_idx on public.listings (seller_id, created_at desc);
create index listings_active_idx on public.listings (bumped_at desc)
  where status = 'active';
create index listings_expiry_idx on public.listings (expires_at)
  where status = 'active';
create index listings_price_idx on public.listings (price);
create index listings_condition_idx on public.listings (condition);
create index listings_search_idx on public.listings using gin (search_vector);
create index listings_title_trgm_idx on public.listings using gin (title gin_trgm_ops);
create index listings_description_trgm_idx on public.listings using gin (description gin_trgm_ops);

create index listing_images_listing_idx on public.listing_images (listing_id, sort_order);
create index favourites_listing_idx on public.favourites (listing_id);
create index conversations_buyer_idx on public.conversations (buyer_id, last_message_at desc);
create index conversations_seller_idx on public.conversations (seller_id, last_message_at desc);
create index messages_conversation_idx on public.messages (conversation_id, created_at);
create index messages_unread_idx on public.messages (conversation_id)
  where read_at is null;
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id)
  where read_at is null;
create index blocks_blocked_idx on public.blocks (blocked_user_id);
create index reports_listing_idx on public.reports (target_listing_id, status);
create index reports_user_idx on public.reports (target_user_id, status);
create index reviews_seller_idx on public.reviews (seller_id, created_at desc);
create index wanted_city_idx on public.wanted_posts (city_id, status, created_at desc);
create index saved_searches_user_idx on public.saved_searches (user_id, created_at desc);
create index listing_events_listing_idx on public.listing_events (listing_id, created_at desc);
create index listing_events_type_idx on public.listing_events (event_type, created_at desc);
create index account_deletion_user_idx on public.account_deletion_requests (user_id, status);

-- ---------------------------------------------------------------------------
-- Shared trigger functions
-- ---------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger cities_touch_updated_at
  before update on public.cities
  for each row execute function public.touch_updated_at();

create trigger categories_touch_updated_at
  before update on public.categories
  for each row execute function public.touch_updated_at();

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

create trigger profile_contacts_touch_updated_at
  before update on public.profile_contacts
  for each row execute function public.touch_updated_at();

create trigger listings_touch_updated_at
  before update on public.listings
  for each row execute function public.touch_updated_at();

create trigger wanted_posts_touch_updated_at
  before update on public.wanted_posts
  for each row execute function public.touch_updated_at();

create trigger payments_touch_updated_at
  before update on public.payments
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Auth trigger: create the public profile on every new auth user.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_phone text;
  v_city text;
begin
  v_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Neighbour'
  );
  v_phone := regexp_replace(coalesce(new.raw_user_meta_data ->> 'phone', ''), '\D', '', 'g');
  v_phone := right(v_phone, 10);
  v_city := coalesce(nullif(new.raw_user_meta_data ->> 'city_id', ''), 'city-khargone');

  if not exists (select 1 from public.cities where id = v_city) then
    v_city := 'city-khargone';
  end if;

  insert into public.profiles (id, name, city_id)
  values (new.id, left(v_name, 60), v_city)
  on conflict (id) do nothing;

  insert into public.profile_contacts (user_id, phone)
  values (new.id, v_phone)
  on conflict (user_id) do update set phone = excluded.phone;

  insert into public.notifications (user_id, type, title, body, link)
  values (
    new.id,
    'system',
    'Welcome to Purana Bazaar',
    'Buy and sell around your neighbourhood. Start with something you no longer use.',
    '/sell'
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Listing image count maintenance
-- ---------------------------------------------------------------------------

create or replace function public.sync_listing_image_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing_id uuid;
begin
  v_listing_id := coalesce(new.listing_id, old.listing_id);

  update public.listings
  set image_count = (
    select count(*)::smallint
    from public.listing_images
    where listing_id = v_listing_id
  )
  where id = v_listing_id;

  return coalesce(new, old);
end;
$$;

create trigger listing_images_sync_count
  after insert or delete or update of listing_id on public.listing_images
  for each row execute function public.sync_listing_image_count();

-- ---------------------------------------------------------------------------
-- Conversation and message guards
-- ---------------------------------------------------------------------------

create or replace function public.guard_conversation_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seller_id uuid;
begin
  select seller_id into v_seller_id
  from public.listings
  where id = new.listing_id;

  if v_seller_id is null then
    raise exception 'listing_not_found';
  end if;

  if new.seller_id <> v_seller_id then
    raise exception 'conversation_seller_mismatch';
  end if;

  return new;
end;
$$;

create trigger conversations_guard_insert
  before insert on public.conversations
  for each row execute function public.guard_conversation_insert();

create or replace function public.guard_message_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_buyer_id uuid;
  v_seller_id uuid;
begin
  select buyer_id, seller_id
  into v_buyer_id, v_seller_id
  from public.conversations
  where id = new.conversation_id;

  if v_buyer_id is null then
    raise exception 'conversation_not_found';
  end if;

  if new.sender_id not in (v_buyer_id, v_seller_id) then
    raise exception 'message_sender_not_participant';
  end if;

  return new;
end;
$$;

create trigger messages_guard_insert
  before insert on public.messages
  for each row execute function public.guard_message_insert();

-- Keep conversation ordering and create the recipient's notification in one
-- place. The RPC still performs the same checks for a friendly error message.
create or replace function public.after_message_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conversation public.conversations;
  v_recipient uuid;
  v_name text;
begin
  select * into v_conversation
  from public.conversations
  where id = new.conversation_id;

  if v_conversation.id is null then
    return new;
  end if;

  update public.conversations
  set last_message_at = new.created_at
  where id = new.conversation_id;

  v_recipient := case
    when new.sender_id = v_conversation.buyer_id then v_conversation.seller_id
    else v_conversation.buyer_id
  end;

  select name into v_name from public.profiles where id = new.sender_id;

  insert into public.notifications (user_id, type, title, body, link)
  values (
    v_recipient,
    'message',
    'New message from ' || coalesce(v_name, 'a neighbour'),
    left(new.body, 120),
    '/chat/' || v_conversation.id
  );

  return new;
end;
$$;

create trigger messages_after_insert
  after insert on public.messages
  for each row execute function public.after_message_insert();

-- ---------------------------------------------------------------------------
-- Moderation: hide a listing after three distinct open reports.
-- ---------------------------------------------------------------------------

create or replace function public.auto_hide_reported_listing()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reporters integer;
begin
  if new.target_listing_id is null then
    return new;
  end if;

  select count(distinct reporter_id) into v_reporters
  from public.reports
  where target_listing_id = new.target_listing_id
    and status = 'open';

  if v_reporters >= 3 then
    update public.listings
    set status = 'hidden', closed_at = now()
    where id = new.target_listing_id
      and status = 'active';
  end if;

  return new;
end;
$$;

create trigger reports_auto_hide
  after insert on public.reports
  for each row execute function public.auto_hide_reported_listing();

-- ---------------------------------------------------------------------------
-- Keep review seller in sync with the listing.
-- ---------------------------------------------------------------------------

create or replace function public.guard_review_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seller_id uuid;
begin
  select seller_id into v_seller_id
  from public.listings
  where id = new.listing_id;

  if v_seller_id is null then
    raise exception 'listing_not_found';
  end if;

  if new.seller_id <> v_seller_id then
    raise exception 'review_seller_mismatch';
  end if;

  return new;
end;
$$;

create trigger reviews_guard_insert
  before insert on public.reviews
  for each row execute function public.guard_review_insert();
