# Purana Bazaar — project handoff

**Status:** CLOSED / PAUSED at Phase 0 (foundation), not deployable.
**Date closed:** 21 October 2026
**Location:** `C:\Users\tanji\Opencode\purana-bazaar`
**Build session:** `ses_ea823fdf5ffeBoQ53hQUjq3hAf` ("Purana Bazaar classifieds build plan")
**Original brief:** `PURANA BAZAAR — OPENCODE BUILD PROMPT PACK` (pasted in the session; master brief + phases 0–6)

No files were deleted. The legacy prototype is preserved in `legacy/` with redacted credentials.

---

## 1. Verdict

The project is **not a working application yet**. It is a partially built Phase 0 foundation:

- The audit, design system, helpers, i18n, UI primitives and mock data are written.
- The application shell, router, store, pages and mock API adapter were **never written**.
- `npm run build` fails because `index.html` points at a missing `src/main.js`.
- `npm run lint` fails with 2 errors.
- Nothing from Phases 1–6 has started.
- It has never run in a browser, never been tested, never been deployed, and is not in git.

The previous session stopped right after writing `src/api/mock/seed.js`. The next file was never created. There was no product decision to stop; the session simply ended.

---

## 2. What was completed

### Phase 0 — audit and legacy snapshot (done)

| Item | Detail |
|---|---|
| `AUDIT.md` | 79-line audit: 15 confirmed findings, screen/flow inventory, data-model notes, Phase 0 constraints, Phase 1 decisions |
| `legacy/Index.html` | Original 773-line prototype |
| `legacy/script.js` | Original 4,298-line script, Supabase URL/key redacted |
| `legacy/style.css` | Original 2,635-line stylesheet |
| `legacy/README.md` | Explains the snapshot is reference only |

Key confirmed fact: the old Supabase host `rwnbacquhzwbvvziddkw.supabase.co` is **NXDOMAIN**. There is no live schema or data to migrate.

### Tooling and project config (mostly done)

| File | State |
|---|---|
| `package.json` | Vite 8, ESLint 10, Playwright 1.64, axe, Prettier; scripts for dev/build/lint/format/e2e/check |
| `vite.config.js` | Port 5173/4173, ES2019 target, manifest, no sourcemaps |
| `eslint.config.js` | Flat config; bans `alert`/`confirm`/`prompt`, `innerHTML` assignment, `insertAdjacentHTML`, `var`, `==` |
| `.prettierrc`, `.prettierignore` | Present |
| `.env.example` | Mock flag, Supabase, Turnstile; service-role key only in comments |
| `.gitignore` | node_modules, dist, env, test output |
| `vercel.json` | SPA rewrite, immutable asset caching, security headers incl. CSP |
| `index.html` | Meta/OG tags, skip link, noscript, `/src/main.js` entry |
| `public/favicon.svg`, `public/robots.txt` | Present |

Missing from tooling: standalone git repo, README, CHANGELOG, `scripts/check-bundle.mjs` (referenced by `build:check`), `playwright.config.js`.

### Design system (done for the planned screens)

- `src/styles/tokens.css` — colours, type scale, spacing, radii, shadows, layout, motion, layers; Devanagari-capable stack; mobile/tablet/desktop breakpoints.
- `src/styles/base.css` — reset, typography, focus, reduced motion, skip link, utilities.
- `src/styles/components.css` — header, bottom nav, footer, buttons, chips, cards/grid, search, forms, tabs, skeletons, empty states, toast, sheet, gallery, action bar.
- `src/styles/pages.css` — home, filters, listing detail, sell, auth, profile, my listings, conversations, chat, seller, notifications, placeholders/admin/404, city/category landing, report sheet, sticky form footer, responsive tweaks.

The CSS is written for every screen in the brief. No page markup consumes it yet.

### JavaScript helpers (done except store)

- `src/lib/dom.js` — safe `h()` builder, text nodes, fragment/append helpers, reduced-motion check, ids.
- `src/lib/format.js` — INR grouping, relative time, dates, counts.
- `src/lib/storage.js` — namespaced localStorage with safe fallbacks.
- `src/lib/debounce.js` — debounce/throttle.
- `src/lib/search.js` — query normalisation, Hinglish synonym expansion, matching.
- `src/lib/constants.js` — conditions, sort options, limits, route constants.
- `src/lib/validation.js` — email, Indian phone normalisation/validation, login/signup/listing/report/chat/password validators.
- `src/lib/url.js` — query/path helpers, slug/id parsing.
- `src/lib/navigation.js` — navigation handler indirection, history push/replace/back.
- `src/lib/auth.js` — session reads and auth guard. **Imports missing `src/store.js`.**

### i18n (done for Phase 0 scope)

- `src/i18n/en.json` — 27 sections (nav, header, home, filters, listing, sell, auth, profile, my listings, saved, chats, notifications, seller, report, admin, wanted, 404, validation, errors, footer, city, confirm).
- `src/i18n/hi.json` — matching Hindi dictionary.
- `src/i18n/index.js` — loader, interpolation, plural keys, fallback to English, error messages, category/city labels.

### UI primitives (done)

- `src/ui/icons.js` — inline SVG icon set (no emoji UI icons).
- `src/ui/toast.js` — accessible live region, 3-toast cap, pause on hover/focus, actions.
- `src/ui/sheet.js` — native `<dialog>` bottom sheet, focus restore, history integration so Android Back closes it.
- `src/ui/skeleton.js` — skeleton builders.
- `src/ui/empty.js` — empty/error states with actions.
- `src/ui/avatar.js` — initials avatar.

### Mock data (done, not wired up)

- `src/api/mock/seed.js` — verified by running it: **9 categories, 8 cities, 7 profiles, 33 listings, 3 conversations, 6 messages, 4 notifications, 2 favourites**.
- `src/api/mock/placeholder.js` — generated SVG data-URI listing images, per-category colours/art.
- `src/api/errors.js` — `ApiError`, auth-required, not-found, forbidden.
- `src/config.js` — mock flag, Supabase URL/key, Turnstile key, dev flag.

---

## 3. What is missing or broken

### Blocks a working Phase 0

| Missing | Consequence |
|---|---|
| `src/main.js` | **Build fails.** Referenced by `index.html`; does not exist |
| `src/store.js` | `src/lib/auth.js` imports it; app state layer absent |
| `src/router.js` | No History API routing, no Back/Forward, no route titles |
| `src/pages/*` | No screens at all |
| `src/api/index.js` + adapter | Mock data exists but no async API interface; `useMock` config unused |
| App shell | No header, city chip, search, category chips, bottom nav, footer, 404 |
| `tests/e2e/*`, `playwright.config.js` | No smoke or axe tests |
| `scripts/check-bundle.mjs` | `npm run build:check` fails even after build is fixed |
| `README.md`, `CHANGELOG.md` | No setup/deploy documentation |
| `supabase/`, `api/` | No migrations, RLS, functions, PWA, backend |

### Current verification results

```
npm run build  -> FAIL: Failed to resolve /src/main.js from index.html
npm run lint   -> FAIL: 2 errors
                  src/lib/format.js:34  'seconds' is assigned a value but never used
                  src/lib/url.js:59     unexpected control character(s) in regex
```

### Phase tracker

| Phase | Scope | State |
|---|---|---|
| 0 | Foundation: audit, Vite, shell, mock screens, tests | **Partial (~60%)** |
| 1 | Supabase schema, RLS, real auth, real feed | Not started |
| 2 | Sell flow, search/filters, listing detail, favourites, my listings, share/OG | Not started |
| 3 | Contact, real chat, notifications, reports/blocks, ratings, safety, moderation | Not started |
| 4 | PWA, push, saved searches, wanted board, seller dashboard, referrals, SEO, analytics | Not started |
| 5 | Admin panel, boosts/promotions, shop storefronts, ads, legal pages, account deletion | Not started |
| 6 | Android app (Capacitor/TWA), FCM, Play Store checklist | Not started |

---

## 4. What to do next

### To finish Phase 0 (do this before any backend work)

1. Create `src/store.js` — tiny pub/sub for auth, city, language, filters, unread counts.
2. Create `src/router.js` — History API routes (`/`, `/l/:id-slug`, `/sell`, `/login`, `/signup`, `/me`, `/my-listings`, `/saved`, `/chats`, `/chat/:id`, `/u/:id`, `/notifications`, `/wanted`, `/admin`, `/:city/:category`, 404), per-route titles, scroll restoration, Back/Forward.
3. Create the mock API adapter behind one interface (`src/api/index.js`): listings feed with 20-item cursor pagination, search/filter/sort, detail, favourites, auth, chats, notifications, reports. Keep it swappable for Supabase.
4. Create `src/main.js` and the app shell: header (logo, city chip, language, bell), search, category chips, `Fresh in Khargone` 2-column grid, featured strip, bottom nav (Home, Saved, Sell, Chats, Profile), footer.
5. Build all pages: home, listing detail (gallery, attributes, seller, safety, sticky Call/WhatsApp/Chat), 3-step sell, login/signup/forgot, profile, my listings, saved, chats/chat, seller, notifications, report sheet, wanted/admin placeholders, 404, city/category landing.
6. Fix the two lint errors; add `scripts/check-bundle.mjs` and `playwright.config.js`.
7. Add Playwright smoke + axe tests at 360×640 with Fast 3G: signup → post with photo → search → open → contact → favourite → logout.
8. Verify in a real browser at 375 / 768 / 1440, console clean, no overflow, reduced motion, keyboard focus.
9. Write `README.md` + `CHANGELOG.md`; run `git init`, commit Phase 0, create the `phase-0-foundation` branch.
10. Only then start Phase 1.

### Phase 1 prerequisites (need owner decisions)

- Create a **new Supabase project** in Mumbai (`ap-south-1`). The old project cannot be restored or migrated.
- Provide the project ref and authenticate the CLI (`npx supabase login`), or approve using the dashboard SQL editor.
- Decide: email confirmation on/off; Google OAuth client; Cloudflare Turnstile keys (test keys for local).
- Confirm launch cities: Khargone active only, nearby cities seeded inactive.
- Confirm Vercel project ownership and production domain.

### Phase 1 outline

1. Write migrations for cities, categories (with `attribute_schema`), profiles + auth trigger, listings, listing_images, favourites, conversations, messages, reports, blocks, notifications, reviews, wanted_posts, saved_searches, listing_events, promotions, banners.
2. Enable RLS on every table; column-level update grants; `is_admin()` security definer; storage bucket `listing-images` with `<auth.uid()>/…` writes and 1 MB limit; abuse-limit triggers.
3. Seed cities/categories only (no fake production listings).
4. Replace mock auth with real Supabase auth (`onAuthStateChange`, Google, reset, email-confirmation state).
5. Swap the listings read adapter to Supabase with cursor pagination; write `get_feed`, `get_listing_contact`, `renew_listing` RPCs.
6. Write RLS proof tests: cannot edit another user's listing, cannot set `featured_until`/`is_admin`/`is_verified`, cannot read others' messages or phone numbers.

Then proceed Phase 2 → 6 in the original brief order. Do not start Phase 2 until Phase 1 RLS tests pass.

---

## 5. Owner decisions still open

1. Is this project being resumed, or permanently shelved?
2. Supabase: new project ref + access method; region Mumbai.
3. Auth: email confirmation, Google OAuth, Turnstile.
4. Launch cities: Khargone only, or Khargone + inactive nearby rows.
5. Git/Vercel: standalone repo (recommended) and who owns the Vercel project/domain.
6. Design signature: keep the "market ticket" price-tag treatment, or drop it.
7. Monetization gate: keep the brief's gate (~300–500 active listings, 100+ contacts/week) before charging.

---

## 6. How to resume

```powershell
cd C:\Users\tanji\Opencode\purana-bazaar
npm install
npm run dev
```

It will fail until `src/main.js` exists. The fastest path back in is step 1–4 above (store, router, mock adapter, main + shell), then pages.

**Do not deploy this state.** It is a design/data foundation, not an app.
