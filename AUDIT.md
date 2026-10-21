# Purana Bazaar — Phase 0 legacy audit

Date: 21 October 2026
Scope: `legacy/Index.html` (773 lines), `legacy/script.js` (4,298 lines), `legacy/style.css` (2,635 lines)

## Executive summary

The prototype proves the core idea and the visual direction, but it is a single-page script with no framework, router, tests, or reliable data layer. The Supabase project it points at (`rwnbacquhzwbvvziddkw.supabase.co`) no longer resolves, so the app cannot authenticate or load live listings. Phase 0 replaces the prototype with a Vite + vanilla ES modules application, a mock data adapter, a History API router, and a real design system while keeping the warm, local visual character.

## Critical findings

| # | Area | Finding | Evidence | Fix |
|---|------|---------|----------|-----|
| 1 | Backend | Supabase host is dead (NXDOMAIN) | legacy `script.js:5` | New Supabase project in Phase 1; mock adapter in Phase 0 |
| 2 | Security | 24 direct `innerHTML` writes mix server/user data into markup | `script.js` (24 occurrences) | DOM builders and `textContent`; ESLint ban |
| 3 | UX | 41 `alert()` calls and 5 `confirm()` calls block the page | `script.js` | Toasts, sheets, inline validation; ESLint ban |
| 4 | Auth | Session is a localStorage user object; no `getSession`, `onAuthStateChange`, OAuth or reset | `script.js` | Real Supabase auth in Phase 1; mock auth in Phase 0 |
| 5 | State | 30 localStorage uses, including products, chats and favourites | `script.js` | Server state for domain data; localStorage only for city, language, draft, recently viewed and dismissed banners |
| 6 | Data model | Inserts use `image_url`/`seller_id`; reads use `image`, `sellerName`, `sellerMobile`, `emoji` | `script.js` | One typed domain model and adapter API |
| 7 | Code health | Large duplicate blocks and redeclared globals | lines 182/2653, 233/2664, 261/2680, 930/2034, 2066/2923, 2085/2937, 1637/3486, 1812/3974, 1956/4074 | Feature-based ES modules |
| 8 | CSS | Stray `}/` invalidates the `.market-sections` rule | `style.css:2060–2066` | Rebuilt token-based CSS |
| 9 | Navigation | No router or deep-link handling; screen visibility is toggled by script | `Index.html`, `script.js` | History API router with back/forward and per-route titles |
| 10 | Home order | Product grid appears before the hero, market sections, filters and result count | `Index.html:89–98`, `134`, `169`, `226`, `380` | Fixed order: header → search → categories → filter toolbar → result count → grid → featured |
| 11 | Accessibility | Emoji-only controls, unclear focus, no dialog semantics, no reduced-motion handling | `Index.html`, `style.css` | SVG icons with labels, 44px targets, visible focus, native dialogs, reduced motion |
| 12 | Performance | One 4,298-line script, no code splitting, no image dimensions, unbounded listeners | `script.js` | Small ES modules, lazy images, skeleton states, <150 KB initial JS budget |
| 13 | SEO | No semantic headings, canonical metadata or clean URLs | `Index.html` | Per-page titles/descriptions, semantic landmarks, History API routes |
| 14 | Responsiveness | Fixed desktop-oriented layout and overflow risks | `style.css` | Mobile-first tokens, fluid grids, safe-area handling |
| 15 | Trust | Contact details appear without login or safety guidance | `script.js` | Auth-gated contact, safety copy, reporting and blocks |

## Screen and flow inventory

| Screen | Legacy behaviour | Phase 0 target |
|--------|------------------|----------------|
| Home | Grid, then hero, markets, filters and count in the wrong order | Search, category chips, filter toolbar, count, fresh grid, pagination, featured strip |
| Listing detail | Gallery, price, description, seller and contact in one long page | Sticky actions, gallery, attributes, seller card, safety note, similar items |
| Sell | Single long form with alerts | Validated form, photo previews, auth guard, mock publish, edit mode |
| Auth | Email/password and a fake localStorage session | Login/signup tabs, validation, safe `next` redirect, mock session |
| Profile | Basic user card | Profile, menu, language/city settings, logout |
| My listings | Local-only rows | Active/sold/expired tabs, view counts, edit, mark sold, renew, delete |
| Saved | localStorage favourites | Server-style favourites via mock API |
| Chats | localStorage messages | Conversation list, thread, quick replies, send, report/block |
| Seller | Seller card and listings | Public seller profile, listings, report/block |
| Notifications | localStorage | Unread badge, mark read/all, deep links |
| Report | Inline form | Accessible report sheet from listing, seller and chat |
| Admin / Wanted | Ad-hoc sections | Guarded placeholders with clear Phase 5/4 messaging |
| 404 | None | Friendly recovery page |

## Data and backend notes

- The old project is unreachable. There is no live schema or data to migrate.
- The intended schema (profiles, categories, cities, listings, favourites, conversations, messages, notifications, reports, blocks) will be created in Phase 1.
- `listings` should reference `seller_id`, `category_id` and `city_id`; the client should read one consistent shape from the adapter.
- Category-specific fields belong in a JSONB `attributes` column with per-category validation in Phase 2.
- RLS must be the source of truth. Client-side guards are UX only.
- Cities and categories are server-managed; adding a city is a row insert, not a deploy.

## Constraints carried into Phase 0

- Vite + vanilla ES modules, no React/Next.
- Mobile-first at 360×640; usable at 320px and on desktop.
- All routes work on direct load and browser back/forward.
- No `alert()` or `confirm()`.
- No user data through `innerHTML`.
- All domain data goes through the adapter (mock in Phase 0).
- WCAG AA: contrast, focus, labels, keyboard dialogs, reduced motion, 44px controls.
- Initial JS under 150 KB gzipped.
- English and Hindi copy with persisted language choice.

## Open decisions for Phase 1

1. New Supabase project organization/region (Mumbai `ap-south-1` recommended).
2. Launch activation: Khargone only, or Khargone plus nearby city rows marked inactive.
3. Auth providers for launch: email/password plus Google, or email/password first.
4. Turnstile site key and domain configuration for production.
5. Production domain and Vercel project ownership.

## Sign-off

Phase 0 is complete when lint, build, bundle budget and Playwright smoke/accessibility tests pass on the new app. Legacy files remain in `legacy/` only as an audit snapshot.
