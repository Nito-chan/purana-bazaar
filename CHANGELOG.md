# Changelog

## [0.2.3] — 2026-10-23

### Added

- Wanted board (`/wanted`): post, view, edit, close and delete wanted posts; public read, owner write; English and Hindi translations.
- Saved searches (`/saved-searches`): save current home filters with a name, apply/edit/delete them, toggle new-match notifications; "Save search" button on the home feed captures current filters.
- PWA: `public/manifest.json` and `public/sw.js` with service-worker registration; installable on Android/desktop; app shell works offline.
- Header: "Wanted" navigation link added to top nav and profile menu.
- Hindi translations for wanted board, saved searches and PWA strings.

### Fixed

- Header nav now scrolls horizontally on tablet so the new link doesn't overflow.

## [0.2.2] — 2026-10-23

### Added

- Ratings/reviews: review list and create form on listing detail; seller rating stars on listing detail and seller profile; mock and real API (`api.reviews.list` / `api.reviews.create`); English and Hindi translations.
- Supabase Realtime publication updated to include `messages`, `notifications` and `conversations` tables (prepares for live chat/notification delivery).

### Changed

- Realtime chat client subscription not bundled: Supabase Realtime is not provisioned on this project and the client would break the strict mock bundle budget. Activate after provisioning Realtime.

## [0.2.1] — 2026-10-23

### Added

- Category-specific listing attributes: sell/edit renders fields from `categories.attributes_schema`, per-field validation, draft persistence, boolean Yes/No storage, translated labels and values, mock schema parity, and listing detail display.
- Seller performance summary on My Listings: active/total views/buyer contacts/sold summary cards plus per-listing views and contact counts.
- CSP updated to allow Supabase API, Realtime and Storage hosts in production.
- Hindi translations for category attributes and seller dashboard strings.

### Fixed

- My Listings now counts category as an active filter on the home feed and shows a "Clear filters" action on empty refined results.
- Empty home state distinguishes "no listings yet" from "no matches" for refined searches.
- Real-mode seller lifecycle test extended with category attributes and performance-summary assertions.

## [0.2.0] — 2026-10-23

### Added

- Supabase-backed API adapter with build-time selection between mock and real mode.
- Real email/password auth, session restore, profile trigger, logout and password-reset request.
- Real listing feed, detail, create/edit, photo compression and Storage upload, mark sold, renew
  and soft delete with storage cleanup.
- Real favourites, chats/messages, notifications, seller profiles, blocks, reports and meta counts.
- 23-table schema with RLS, private phone storage, column-level grants, RPC write paths and RLS
  init-plan performance hardening.
- 32-check two-user RLS/storage smoke proof and a live-Supabase Playwright lifecycle suite at
  375/768/1440.
- Separate real-mode bundle budgets and a clean real database with Khargone as the only active city.
- Real-mode UI hides all demo-only badges, notes and the demo-account button.

### Fixed

- Anonymous listing reads, saved-screen visibility and own-listing save buttons.
- Renew now returns to the active tab after success.
- Signup document title no longer repeats the app name.
- Supabase advisor warnings for RLS helper re-evaluation.

### Notes

- Phase 0 mock mode remains the default demo.
- Google OAuth, phone OTP, Turnstile, payments, realtime chat, admin MFA and push are deferred.

## [0.1.0] — 2026-10-22

### Added

- Working Phase 0 application shell, router, store and mock API adapter.
- Home feed with city/category landing pages, search, filters, sort, empty/error states,
  featured listings, infinite scroll and an accessible load-more fallback.
- Listing detail with gallery, price ticket, attributes, seller card, safety note, share and
  report actions, related listings and a mobile contact bar.
- Sell and edit listing flows with photo previews, draft persistence, query presets and
  field-level validation.
- Demo auth (login, signup, forgot password), profile, my listings, saved items, chats,
  notifications, seller profile, admin/wanted placeholders and 404.
- English and Hindi dictionaries with plural-aware interpolation and a key coverage check.
- Playwright configuration and E2E tests at 375, 768 and 1440 for routes, feeds, selling,
  saving, chat, notifications, keyboard focus and axe accessibility smoke checks.
- Bundle budget script and `npm run check` quality gate.
- README, CHANGELOG and updated project handoff.

### Fixed

- Home feed cards are direct children of the grid; two columns at 375 without overflow.
- Tablet header overflow; demo badge is hidden between 768 and 1023 px.
- Conversation and notification rows no longer overflow their cards.
- Unread badges anchor to their icon buttons.
- Page transitions no longer create a containing block that breaks fixed chat and contact bars.
- Mobile listing footer no longer sits behind the fixed action bar.
- Accessible names for city, language, filter, gallery, brand and auth controls.
- Status badge contrast and tab count spacing.

### Notes

- Phase 0 uses an in-memory mock API. Reloading signs the user out and resets demo data.
- The legacy Supabase host is NXDOMAIN; no legacy data can be recovered or migrated.
