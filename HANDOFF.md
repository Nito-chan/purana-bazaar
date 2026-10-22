# Purana Bazaar — project handoff

**Status:** Phase 0 complete — working local prototype on mock data.
**Phase 1:** Not started. Blocked on the decisions in section 6.
**Last updated:** 22 October 2026
**Legacy data:** Unrecoverable. The old Supabase host is NXDOMAIN.

This document supersedes the earlier close-out snapshot. The project has since been rebuilt as a
working application. It is still a demo: there is no real auth, database, image storage,
moderation or durable data.

---

## 1. What works

The app runs from a single `api` interface backed by an in-memory mock adapter. All routes are
lazy-loaded and work through normal links, browser Back/Forward and direct URLs.

| Area           | Delivered                                                                                                                                    |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Shell          | Header, city picker, language switch, notifications bell, account menu, mobile bottom nav, footer, route announcer                           |
| Home           | Infinite feed, accessible load-more fallback, category chips, search with Hinglish synonyms, filters, sort, featured listings, results count |
| Discovery      | City/category landing routes, query-string filters, shareable URLs, empty and error states                                                   |
| Listing detail | Gallery, price ticket, attributes, description, seller card, related listings, share, report, favourite, mobile Call/WhatsApp/Chat bar       |
| Sell           | Create and edit, photo previews, draft persistence, query presets, validation and focus management                                           |
| Account        | Demo login, signup, forgot password, profile, my listings, mark sold, delete, saved items                                                    |
| Messaging      | Conversation list, unread badges, chat detail, quick replies, send message, mark read                                                        |
| Notifications  | List, unread state, deep links, mark all read, bell badge refresh                                                                            |
| Other          | Seller profile, admin and wanted placeholders, 404, English/Hindi, toast, sheets, reduced motion                                             |

Seed data: 9 categories, 8 cities, 7 profiles, 33 listings, 3 conversations, 6 messages,
4 notifications and 2 favourites.

### Demo account

```text
demo@example.com
demo1234
```

The login screen also has a one-click demo button. Auth, listings, favourites, chats and
notifications are memory-only. Reloading resets them. City, language, sell draft, recently viewed
items and dismissed banners persist in `localStorage`.

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
/u/:id                     seller profile
/admin, /wanted            placeholders
*                          404
```

`/my-listings` is kept as an alias of `/me/listings`.

---

## 2. Quality gates

Run from the project root:

```bash
npm run check      # lint, Prettier, i18n keys, production build + bundle budgets
npm run test:e2e   # 27 Playwright tests across 375, 768 and 1440
```

The E2E suite builds the app, serves it on port 4174 and verifies:

- public and signed-in routes, including direct URLs
- clean browser console, no page errors
- no horizontal overflow on checked pages
- feed filtering, search, pagination
- saving a listing
- publishing and editing a listing with an uploaded photo
- chat reply flow and quick replies
- mark-all-read notifications and badge refresh
- skip link, keyboard focus indicators
- no serious or critical axe violations on home, login or listing detail

Current bundle sizes are approximately 22 kB entry JS, 63 kB total JS and 10 kB CSS (gzip), within
the enforced budgets.

Visual QA has been completed at 375, 768 and 1440 with a dedicated Playwright browser, including
home, listing, sell, my listings, chats, chat and notifications.

---

## 3. Constraints

- **No backend.** Mock data is created at boot and lost on reload. Multiple tabs do not share data.
- **No uploads.** Photos are data URLs in memory. Phase 2 will add Supabase Storage and compression.
- **No real contact delivery.** Phone/WhatsApp actions are prototype behaviour and must not be
  treated as a production contact path.
- **No moderation or trust system.** Reports and blocks exist only as UI placeholders.
- **No SEO/OG server rendering.** Titles and descriptions update client-side.
- **No PWA, push, payments, maps or analytics.**
- The legacy prototype in `legacy/` is reference only. Its Supabase project no longer resolves, so
  there is no schema, data or storage to migrate.

---

## 4. Phase tracker

| Phase | Scope                                                                       | State        |
| ----- | --------------------------------------------------------------------------- | ------------ |
| 0     | Audit, design system, mock app, routing, all core screens, tests            | **Complete** |
| 1     | Supabase schema, RLS, real auth, real feed and storage                      | Not started  |
| 2     | Production sell flow, search/filters, favourites, my listings, share/OG     | Not started  |
| 3     | Contact delivery, real chat, notifications, reports/blocks, ratings, safety | Not started  |
| 4     | PWA, push, saved searches, wanted board, seller dashboard, referrals, SEO   | Not started  |
| 5     | Admin, promotions, shop storefronts, ads, legal pages, account deletion     | Not started  |
| 6     | Android app, FCM, Play Store release                                        | Not started  |

Do not start Phase 2 until Phase 1 RLS proof tests pass.

---

## 5. Phase 1 outline

1. Create a new Supabase project in Mumbai (`ap-south-1`). The old project cannot be restored.
2. Add migrations for cities, categories with attribute schemas, profiles and auth trigger,
   listings, images, favourites, conversations, messages, reports, blocks, notifications,
   reviews, wanted posts, saved searches, listing events, promotions and banners.
3. Enable RLS on every table; use column-level update grants, an `is_admin()` security-definer
   function and a `listing-images` bucket restricted to `<auth.uid()>/…` with a 1 MB limit.
4. Seed cities and categories only. Do not seed fake production listings.
5. Replace mock auth with Supabase auth: session restore, email confirmation, Google OAuth,
   password reset and account deletion.
6. Replace the listings read adapter with cursor-paginated Supabase queries and RPCs for
   `get_feed`, `get_listing_contact` and `renew_listing`.
7. Add RLS proof tests: users cannot edit another user's listing, promote themselves, change
   verification/featured fields, read another user's messages or read private phone numbers.
8. Only then move to Phase 2.

The mock API surface is deliberately isolated in `src/api/index.js` so pages do not need to change
when the adapter is swapped.

---

## 6. Phase 1 gate — decisions needed

1. **Supabase:** create the new Mumbai project and provide the project ref plus an access method
   (authenticated CLI or dashboard SQL editor).
2. **Auth:** email confirmation on or off; Google OAuth client; Cloudflare Turnstile site/secret
   keys for local and production.
3. **Launch cities:** confirm Khargone active only, with nearby cities seeded but inactive.
4. **Vercel and domain:** project ownership, production domain and who controls DNS.
5. **Moderation:** listing expiry window, report handling owner, and whether phone numbers are
   always private until a contact action is chosen.
6. **Monetization gate:** keep the original threshold (roughly 300–500 active listings and
   100+ contacts per week) before charging for boosts.

Until these are answered, stay on the mock adapter. Do not add production credentials to source,
config or documentation.

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

The default Vite preview port is 4173; Playwright uses 4174 so it can run independently.

See [`README.md`](./README.md) for scripts, structure and checks. Historical issues from the
legacy prototype are recorded in [`AUDIT.md`](./AUDIT.md).
