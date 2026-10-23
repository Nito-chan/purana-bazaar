-- Phase 5: Monetization RLS policies
--
-- Allow users to insert their own promotions and payments.
-- Admins can manage banners and audit logs.

-- Promotions: users can create their own promotion, admins can manage all.
create policy "users create their own promotions"
  on public.promotions for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "users update their own promotions"
  on public.promotions for update
  to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

grant insert (user_id, listing_id, product_id, payment_id, status, starts_at, expires_at)
  on table public.promotions to authenticated;
grant update (status, starts_at, expires_at)
  on table public.promotions to authenticated;

-- Payments: users can create their own payment records.
create policy "users create their own payments"
  on public.payments for insert
  to authenticated
  with check (user_id = auth.uid());

grant insert (user_id, provider, provider_order_id, provider_payment_id, amount_inr, currency, status, raw_payload)
  on table public.payments to authenticated;

-- Banners: admins can insert, update, delete.
create policy "admins manage banners"
  on public.banners for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant insert (title, image_path, link_url, city_id, starts_at, ends_at, is_active, sort_order)
  on table public.banners to authenticated;
grant update (title, image_path, link_url, city_id, starts_at, ends_at, is_active, sort_order)
  on table public.banners to authenticated;
grant delete on table public.banners to authenticated;

-- Admin audit log: system/insert only, admins read.
create policy "system insert audit log"
  on public.admin_audit_log for insert
  to authenticated
  with check (true);

grant insert (actor_id, action, target_type, target_id, details)
  on table public.admin_audit_log to authenticated;
