# Changelog

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
