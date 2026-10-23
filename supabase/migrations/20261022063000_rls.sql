-- Purana Bazaar — Phase 1 Row Level Security and API grants.
--
-- The public API is intentionally narrower than the database:
--   * phone numbers live in profile_contacts and are owner-only;
--   * roles live in user_roles and are never exposed directly;
--   * protected listing fields are not grantable to browser clients;
--   * chat creation, contact reveal, renew and moderation go through RPCs.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

alter table public.cities enable row level security;
alter table public.categories enable row level security;
alter table public.profiles enable row level security;
alter table public.profile_contacts enable row level security;
alter table public.user_roles enable row level security;
alter table public.listings enable row level security;
alter table public.listing_images enable row level security;
alter table public.favourites enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;
alter table public.reviews enable row level security;
alter table public.wanted_posts enable row level security;
alter table public.saved_searches enable row level security;
alter table public.listing_events enable row level security;
alter table public.promotion_products enable row level security;
alter table public.promotions enable row level security;
alter table public.payments enable row level security;
alter table public.banners enable row level security;
alter table public.admin_audit_log enable row level security;
alter table public.account_deletion_requests enable row level security;

-- Remove the broad default API grants before adding the narrow, intentional set.
revoke all on table public.cities from anon, authenticated, public;
revoke all on table public.categories from anon, authenticated, public;
revoke all on table public.profiles from anon, authenticated, public;
revoke all on table public.profile_contacts from anon, authenticated, public;
revoke all on table public.user_roles from anon, authenticated, public;
revoke all on table public.listings from anon, authenticated, public;
revoke all on table public.listing_images from anon, authenticated, public;
revoke all on table public.favourites from anon, authenticated, public;
revoke all on table public.conversations from anon, authenticated, public;
revoke all on table public.messages from anon, authenticated, public;
revoke all on table public.notifications from anon, authenticated, public;
revoke all on table public.blocks from anon, authenticated, public;
revoke all on table public.reports from anon, authenticated, public;
revoke all on table public.reviews from anon, authenticated, public;
revoke all on table public.wanted_posts from anon, authenticated, public;
revoke all on table public.saved_searches from anon, authenticated, public;
revoke all on table public.listing_events from anon, authenticated, public;
revoke all on table public.promotion_products from anon, authenticated, public;
revoke all on table public.promotions from anon, authenticated, public;
revoke all on table public.payments from anon, authenticated, public;
revoke all on table public.banners from anon, authenticated, public;
revoke all on table public.admin_audit_log from anon, authenticated, public;
revoke all on table public.account_deletion_requests from anon, authenticated, public;

-- Reference data: readable when active; admins can see everything.
create policy "active cities are public"
  on public.cities for select
  to anon, authenticated
  using (is_active or public.is_admin());

create policy "active categories are public"
  on public.categories for select
  to anon, authenticated
  using (is_active or public.is_admin());

grant select on table public.cities to anon, authenticated;
grant select on table public.categories to anon, authenticated;

-- Public profiles. Email, phone and role are deliberately not in this table.
create policy "public profiles are readable"
  on public.profiles for select
  to anon, authenticated
  using (true);

create policy "users update their own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

grant select (id, name, city_id, is_verified, rating, rating_count, member_since, bio, avatar_url, created_at, updated_at)
  on table public.profiles to anon, authenticated;
grant update (name, city_id, bio, avatar_url)
  on table public.profiles to authenticated;

-- Private contact details. The signup trigger runs as the definer and can
-- insert these rows; browser clients can only touch their own row.
create policy "users read their own contact details"
  on public.profile_contacts for select
  to authenticated
  using (user_id = auth.uid());

create policy "users insert their own contact details"
  on public.profile_contacts for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "users update their own contact details"
  on public.profile_contacts for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update on table public.profile_contacts to authenticated;

-- Listings: public rows are active (not expired), sold or expired; owners can
-- always see their own; admins can see hidden/moderation rows.
create policy "public listings are readable"
  on public.listings for select
  to anon, authenticated
  using (
    (
      status in ('active', 'sold', 'expired')
      and (status <> 'active' or expires_at > now())
    )
    or seller_id = auth.uid()
    or public.is_admin()
  );

create policy "sellers create their own active listings"
  on public.listings for insert
  to authenticated
  with check (
    seller_id = auth.uid()
    and status = 'active'
    and is_featured = false
    and views_count = 0
    and contacts_count = 0
  );

create policy "sellers update their own listings"
  on public.listings for update
  to authenticated
  using (seller_id = auth.uid() or public.is_admin())
  with check (seller_id = auth.uid() or public.is_admin());

grant select on table public.listings to anon, authenticated;
grant insert (title, description, price, is_negotiable, category_id, city_id, area, condition, attributes)
  on table public.listings to authenticated;
grant update (title, description, price, is_negotiable, category_id, city_id, area, condition, attributes)
  on table public.listings to authenticated;

-- Listing images mirror the parent listing's visibility.
create policy "images follow listing visibility"
  on public.listing_images for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.listings l
      where l.id = listing_id
        and (
          (l.status in ('active', 'sold', 'expired')
            and (l.status <> 'active' or l.expires_at > now()))
          or l.seller_id = auth.uid()
          or public.is_admin()
        )
    )
  );

create policy "sellers add images to their own listings"
  on public.listing_images for insert
  to authenticated
  with check (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and l.seller_id = auth.uid()
    )
  );

create policy "sellers update images on their own listings"
  on public.listing_images for update
  to authenticated
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and l.seller_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and l.seller_id = auth.uid()
    )
  );

create policy "sellers delete images from their own listings"
  on public.listing_images for delete
  to authenticated
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and l.seller_id = auth.uid()
    )
  );

grant select on table public.listing_images to anon, authenticated;
grant insert, update, delete on table public.listing_images to authenticated;

-- Favourites are private to their owner.
create policy "users read their own favourites"
  on public.favourites for select
  to authenticated
  using (user_id = auth.uid());

create policy "users add their own favourites"
  on public.favourites for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "users remove their own favourites"
  on public.favourites for delete
  to authenticated
  using (user_id = auth.uid());

grant select, insert, delete on table public.favourites to authenticated;

-- Conversations and messages are visible only to participants. Writes go
-- through security-definer RPCs so listing ownership and blocks are checked.
create policy "participants read their conversations"
  on public.conversations for select
  to authenticated
  using (buyer_id = auth.uid() or seller_id = auth.uid() or public.is_admin());

create policy "participants read their messages"
  on public.messages for select
  to authenticated
  using (
    exists (
      select 1
      from public.conversations c
      where c.id = conversation_id
        and (c.buyer_id = auth.uid() or c.seller_id = auth.uid() or public.is_admin())
    )
  );

grant select on table public.conversations to authenticated;
grant select on table public.messages to authenticated;

-- Notifications are private. Only the read marker can be changed directly.
create policy "users read their notifications"
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid());

create policy "users mark their notifications read"
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select on table public.notifications to authenticated;
grant update (read_at) on table public.notifications to authenticated;

-- Blocks are private to the person doing the blocking.
create policy "users read their own blocks"
  on public.blocks for select
  to authenticated
  using (user_id = auth.uid());

create policy "users create their own blocks"
  on public.blocks for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "users remove their own blocks"
  on public.blocks for delete
  to authenticated
  using (user_id = auth.uid());

grant select, insert, delete on table public.blocks to authenticated;

-- Reports: a reporter can create and see their own report. Reviewing is admin-only.
create policy "users create reports"
  on public.reports for insert
  to authenticated
  with check (reporter_id = auth.uid());

create policy "users read their own reports"
  on public.reports for select
  to authenticated
  using (reporter_id = auth.uid() or public.is_admin());

create policy "admins review reports"
  on public.reports for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on table public.reports to authenticated;
grant insert (target_listing_id, target_user_id, reason, details)
  on table public.reports to authenticated;
grant update (status, reviewed_at, reviewed_by, resolution)
  on table public.reports to authenticated;

-- Reviews are public; only the reviewer can create their own.
create policy "reviews are public"
  on public.reviews for select
  to anon, authenticated
  using (true);

create policy "users create their own reviews"
  on public.reviews for insert
  to authenticated
  with check (reviewer_id = auth.uid());

grant select on table public.reviews to anon, authenticated;
grant insert (listing_id, reviewer_id, seller_id, rating, body)
  on table public.reviews to authenticated;

-- Wanted board.
create policy "open wanted posts are public"
  on public.wanted_posts for select
  to anon, authenticated
  using (status = 'open' or user_id = auth.uid() or public.is_admin());

create policy "users create their own wanted posts"
  on public.wanted_posts for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "users update their own wanted posts"
  on public.wanted_posts for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "users delete their own wanted posts"
  on public.wanted_posts for delete
  to authenticated
  using (user_id = auth.uid());

grant select on table public.wanted_posts to anon, authenticated;
grant insert (user_id, city_id, category_id, title, description, budget, status, expires_at)
  on table public.wanted_posts to authenticated;
grant update (city_id, category_id, title, description, budget, status, expires_at)
  on table public.wanted_posts to authenticated;
grant delete on table public.wanted_posts to authenticated;

-- Saved searches are private.
create policy "users read their saved searches"
  on public.saved_searches for select
  to authenticated
  using (user_id = auth.uid());

create policy "users create their saved searches"
  on public.saved_searches for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "users update their saved searches"
  on public.saved_searches for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "users delete their saved searches"
  on public.saved_searches for delete
  to authenticated
  using (user_id = auth.uid());

grant select, insert, update, delete on table public.saved_searches to authenticated;

-- Listing events are written by RPCs and read by admins/service jobs only.
-- No browser grants are intentionally issued.

-- Promotion catalogue is public; purchases are owned by the buyer.
create policy "active promotion products are public"
  on public.promotion_products for select
  to anon, authenticated
  using (is_active or public.is_admin());

create policy "users read their promotions"
  on public.promotions for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "users read their payments"
  on public.payments for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "admins read banners"
  on public.banners for select
  to anon, authenticated
  using (
    public.is_admin()
    or (
      is_active
      and starts_at <= now()
      and (ends_at is null or ends_at > now())
    )
  );

grant select on table public.promotion_products to anon, authenticated;
grant select on table public.promotions to authenticated;
grant select on table public.payments to authenticated;
grant select on table public.banners to anon, authenticated;

-- Account deletion requests are visible to their owner and admins.
create policy "users read their deletion requests"
  on public.account_deletion_requests for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "users create their deletion requests"
  on public.account_deletion_requests for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "users cancel their deletion requests"
  on public.account_deletion_requests for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select on table public.account_deletion_requests to authenticated;
grant insert (user_id, reason) on table public.account_deletion_requests to authenticated;
grant update (status) on table public.account_deletion_requests to authenticated;

-- Trigger helpers must not be callable as API functions.
revoke all on function public.touch_updated_at() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.sync_listing_image_count() from public, anon, authenticated;
revoke all on function public.guard_conversation_insert() from public, anon, authenticated;
revoke all on function public.guard_message_insert() from public, anon, authenticated;
revoke all on function public.after_message_insert() from public, anon, authenticated;
revoke all on function public.auto_hide_reported_listing() from public, anon, authenticated;
revoke all on function public.guard_review_insert() from public, anon, authenticated;
