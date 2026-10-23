# Purana Bazaar — project handoff

**Status:** Phase 1 backend complete. Khargone-only free-tier demo launch is next.
**Last updated:** 23 October 2026
**Supabase project:** `hpdeuconuprnuhidjtug` (Mumbai, `ap-south-1`)
**Production data:** None. The real database is clean; only reference cities/categories remain.

The Phase 0 mock demo still works and remains the default local build. The Phase 1 Supabase
adapter is selected at build time with `VITE_USE_MOCK=false`.

---

## 1. What works

### Demo mode (default)

The app runs entirely from the in-memory mock adapter. It is the Phase 0 demo preserved for
showing the product without touching the database.

```text
Email:    demo@example.com
Password: demo1234
```

The sign-in page also has a one-click demo button. Mock data resets on reload. City, language,
sell draft, recently viewed items and dismissed banners persist in `localStorage`.

### Real Supabase mode

| Area                | Delivered                                                                                                                                                                                      |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth                | Email/password signup, login, logout, session restore, duplicate-email and invalid-login errors, password-reset request                                                                        |
| Listings            | Create with compressed WebP/JPEG photo upload, edit, add/remove photos, detail, feed, similar listings, mark sold, renew, soft delete with storage cleanup                                     |
| Ratings             | Review list and create form on listing detail; seller rating stars on listing detail and seller profile                                                                                        |
| Category attributes | Sell/edit renders category-specific fields from `categories.attributes_schema`, per-field validation, draft persistence, boolean Yes/No storage, translated labels, and listing detail display |
| Seller dashboard    | My Listings summary cards (active, total views, buyer contacts, sold) plus per-listing views/contact counts                                                                                    |
| Discovery           | City/category filters, price/condition filters, search, sort, cursor pagination, clear-refinement empty states                                                                                 |
| Account             | Profile, my listings, saved items, seller profile                                                                                                                                              |
| Messaging           | Start conversation, list chats, read chat, send message, unread count, mark read                                                                                                               |
| Notifications       | List, unread state, mark one/all read, bell and bottom-nav badges                                                                                                                              |
| Safety              | Block/unblock seller, report listing or user, masked phone until reveal, contact reveal RPC                                                                                                    |
| Data rules          | RLS on every public table, private phone table, protected listing columns, admin role table                                                                                                    |

Real-mode UI hides all Demo pills, demo-only notes and the demo-account button. The mock bundle
does not include `@supabase/supabase-js`.

### Routes

```text
/                          home feed
/:city/:category           city + category landing
/l/:id-slug                listing detail
/sell, /sell/:id           create / edit listing
/login, /signup, /forgot   auth
/me, /me/listings          profile, my listings
/saved                     saved listings
/chats, /chat/:id          conversations
/notifications             notifications
/saved-searches            saved searches
/u/:id                     seller profile
/wanted                    wanted board
/admin                     placeholder
*                          404
```

`/my-listings` is kept as an alias of `/me/listings`.

---

## 2. Backend and security

- Public schema: 23 tables, all with RLS enabled.
- Private data: phone numbers live in `profile_contacts`; roles live in `user_roles`.
- Listing writes use RPCs and column grants. Sellers cannot set `is_featured`, views, contacts or
  expiry directly.
- Storage bucket `listing-images`: public read, upload restricted to
  `<auth.uid()>/<listing_id>/…`, 1 MB per file, image MIME types only.
- RLS proof: `node scripts/phase1-smoke.mjs` checks 32 two-user and anonymous cases, including
  cross-user writes, phone privacy, chat privacy, storage-folder isolation, block filtering,
  favourites and soft deletion.
- Supabase advisors: no security or performance warnings at `warn` level after the
  `20261023090000_fix_rls_initplan.sql` migration.
- The service-role key and database password are never in client code. `.env.local` is ignored.

### Migrations

All migrations in `supabase/migrations/` are applied remotely:

- initial schema, RLS, RPCs, storage/reference data
- Phase 1 hardening, anonymous relation grants, JSON boolean defaults, favourite visibility
- RLS init-plan performance fix

Database password was shared during early setup. Rotate it in the Supabase dashboard after Phase 1
and before handing the project to anyone else. Do not put the new password in git or chat.

---

## 3. Quality gates

Run from `purana-bazaar/`:

```bash
npm run check              # lint, Prettier, i18n, mock build + strict demo budgets
npm run test:e2e           # 27 mock-mode Playwright tests at 375 / 768 / 1440
npm run build:check:real   # live-adapter production build + real budgets
npm run test:e2e:real      # live Supabase Playwright lifecycle at 375 / 768 / 1440
node scripts/phase1-smoke.mjs  # 32 RLS / storage proof checks
```

The real-mode Playwright suite creates temporary accounts and listings. It cleans up its own
listing and storage before finishing, but the test users remain. Do not run it against production,
and clean test users before launch. The RLS proof script also creates two users and a listing; it
soft-removes the listing but leaves the users.

Real-mode bundle (last measured): entry ~9.1 kB, total JS ~112 kB, CSS ~10.1 kB gzip. Mock budgets
remain strict (30 kB entry, 25 kB per chunk, 100 kB total). Real budgets are 30 kB entry, 75 kB per
chunk, 160 kB total.

---

## 4. Current database state

- 8 cities seeded; only **Khargone** is `is_active = true` and `is_launch = true`.
- 9 categories seeded; no fake listings, profiles, chats, reports, favourites or notifications.
- Storage objects in `listing-images`: 0.
- Auth users: 0.
- The real feed is empty until a real seller publishes the first listing.

This is intentional: no fake production content.

---

## 5. Phase tracker

| Phase | Scope                                                                     | State               |
| ----- | ------------------------------------------------------------------------- | ------------------- |
| 0     | Mock app, routing, design system, all core screens, tests                 | **Complete**        |
| 1     | Supabase schema, RLS, real auth, feed, storage, chats, safety             | **Complete**        |
| 2     | Production sell/search polish, favourites, share/OG, seller dashboard     | **Complete**        |
| 3     | Realtime chat, contact delivery, notifications, ratings, moderation tools | **Complete**        |
| 4     | PWA, push, saved searches, wanted board, referrals, SEO                   | **Complete** (core) |
| 5     | Admin, boosts/payments, storefronts, legal pages, account deletion        | **Complete** (core) |
| 6     | Android app, FCM, Play Store release                                      | Not started         |

Phase 2 must not start until the Phase 1 gate is signed off. The Phase 1 functional gate is now
green; the remaining launch items are configuration and deployment, not schema work.

### Phase 3 status

- **Contact delivery:** server-side — the `after_message_insert` trigger creates a recipient
  notification on every new message (already in schema).
- **Moderation:** server-side — `auto_hide_reported_listing` hides a listing after 3 distinct open
  reports (already in schema). Supabase Realtime publication updated for
  `messages`/`notifications`/`conversations`.
- **Ratings:** delivered — review list + create form on listing detail, mock + real API.
- **Realtime chat / live notification badge:** client subscription NOT bundled. Supabase Realtime is
  not provisioned on this project, and adding the client breaks the strict mock bundle budget. To
  activate: provision Realtime, restore the `subscribeToConversation` subscription in `chat.js`,
  and re-verify the mock bundle budget.

### Phase 4 status

- **PWA:** delivered — `public/manifest.json`, `public/sw.js`, and service-worker registration in
  `main.js`. Installable on Android/desktop; works offline for the app shell.
- **Saved searches:** delivered — `/saved-searches` lists saved searches, lets users name/apply/
  edit/delete them, and toggle new-match notifications. A "Save search" button on the home feed
  captures the current filters.
- **Wanted board:** delivered — `/wanted` replaces the placeholder; buyers can post, view, edit,
  close, and delete wanted posts (public read, owner write).
- **SEO:** page titles, descriptions, and Open Graph tags already present on all pages;
  per-listing OG images deferred to a later edge-function/prerender decision.
- **Deferred (external/infra):** push notifications (VAPID + push service), referrals (reward
  tracking), per-listing OG edge function.

### Phase 5 status

- **Boosts/payments:** delivered — promotion products (`boost-7d` ₹49, `dealer-30d` ₹199),
  `api.promotions.create` / `api.payments.create` in mock + Supabase. Boost button on listing
  detail for owners. Payments use a mock Razorpay flow; live Razorpay requires KYC setup (external).
  First 50 paid boosts require manual admin review.
- **Admin dashboard:** delivered — `/admin` replaces placeholder. Stats, report moderation,
  listing hide, banner management.
- **Account deletion:** delivered — `/account/delete` — request deletion, cancel pending requests.
- **Legal pages:** delivered — `/terms` (Terms of Service) and `/privacy` (Privacy Policy).
- **Deferred:** Razorpay KYC, Resend/SMTP, admin MFA, storefronts.

---

## 6. Launch decisions and constraints

- Khargone-only demo. Nearby cities stay seeded but inactive/hidden.
- Free tiers only: Supabase Free and Vercel Hobby. No paid plans during the demo.
- Client pays for their own domain; no custom domain during the demo.
- Email/password auth only. Confirmation is off for the demo. Google OAuth, phone OTP and Turnstile
  are deferred.
- No live Razorpay, Resend, push, Play Console app or admin MFA yet.
- Moderation defaults: 30-day expiry with free renewal, masked phone until reveal, auto-hide after
  3 unique reports, manual review of the first 50 paid boosts.
- Monetisation at launch: free basic listings, ₹49/7-day boost and ₹199/30-day boost. Payments and
  boost fulfilment are not implemented yet.
- Expansion gate: 300 active listings and 100 contact events/week for four consecutive weeks. New
  cities need 50–100 real listings before opening.
- Per-listing OG images require an edge function or prerender (a pure SPA cannot generate distinct
  previews); deferred beyond Phase 4. The listing detail share button and static OG are already present.

### Before the first public demo

1. Confirm the Supabase **Site URL** and redirect URLs for local development and the Vercel
   production URL. Password reset sends `redirectTo = <origin>/login`; without an allow-listed
   production URL, Supabase falls back to its configured Site URL.
2. Create the Vercel Hobby project and set `VITE_USE_MOCK=false`, `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY` for Preview and Production.
3. Rotate the database password; it was shared in chat during setup.
4. Keep the demo dataset clean. Do not run the real Playwright suite or RLS proof script against
   the production project without cleaning up test users.
5. Seed the first real Khargone listings through the app. No fake listings or profiles.

---

## 7. Run

```bash
npm install
npm run dev
```

If port 5173 is occupied:

```bash
npm run dev -- --port 5174
```

Real-mode dev:

```powershell
$env:VITE_USE_MOCK='false'; npm run dev -- --port 5174
```

```bash
VITE_USE_MOCK=false npm run dev -- --port 5174
```

The mock Playwright preview uses port 4174; the real suite uses port 4175.

See [`README.md`](./README.md) for scripts and structure. Historical issues from the legacy
prototype are recorded in [`AUDIT.md`](./AUDIT.md). The legacy prototype is reference only; its
Supabase host is NXDOMAIN.
