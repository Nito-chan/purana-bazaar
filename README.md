# Purana Bazaar

A mobile-first local classifieds app for Khargone, Madhya Pradesh. Buy and sell second-hand
furniture, phones, bikes, appliances and more in Hindi or English.

**Status: Phase 1 backend complete.** The app still defaults to the in-memory mock adapter for
the Phase 0 demo. A Supabase-backed adapter is included for real auth, Postgres listings, image
storage, favourites, chats, notifications, reports and blocks. Phase 2 (production sell/search
polish) has not started.

The real backend uses the Supabase Mumbai project (`ap-south-1`), with RLS on every public table
and a private `profile_contacts` table for phone numbers. The mock demo and the real adapter share
the same API surface, selected at build time, so the demo bundle never ships the Supabase client.

## Demo

```text
Email:    demo@example.com
Password: demo1234
```

The sign-in page also has a **Use the demo account** button.

Mock data resets when the page reloads. Only the selected city, language, sell draft, recently
viewed items and dismissed banners persist in `localStorage`.

### Real Supabase mode

Create `.env.local` from `.env.example` and set the project URL and publishable/anon key. Then
override the mock flag for a real-mode dev server:

```powershell
$env:VITE_USE_MOCK='false'; npm run dev -- --port 5174
```

```bash
VITE_USE_MOCK=false npm run dev -- --port 5174
```

`npm run build:real` produces a real-mode production build. Never put the service-role key or
database password in client code, Vite variables or this repository.

## Stack

- Vite 8 and native ES modules — no UI framework
- Hand-written CSS with design tokens
- Lazy-loaded route modules
- Supabase Auth, Postgres, RLS and Storage behind the same API adapter as the mock demo
- Playwright and axe for browser, flow and accessibility tests

## Run locally

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

Vite uses port 5173 by default. If that port is taken:

```bash
npm run dev -- --port 5174
```

Production build and preview:

```bash
npm run build
npm run preview
```

## Checks

| Command                    | What it does                                                          |
| -------------------------- | --------------------------------------------------------------------- |
| `npm run lint`             | ESLint, including bans on unsafe DOM and blocking browser dialogs     |
| `npm run format`           | Format the repository with Prettier                                   |
| `npm run test:i18n`        | Verify every literal `t()` key exists in English and Hindi            |
| `npm run build:check`      | Mock build, then enforce demo JS/CSS gzip budgets                     |
| `npm run build:check:real` | Real Supabase build, then enforce the separate real-mode budgets      |
| `npm run check`            | Lint, format check, i18n check and mock bundle check                  |
| `npm run test:e2e`         | Mock build, preview on port 4174, Playwright at 375/768/1440          |
| `npm run test:e2e:real`    | Live Supabase build, preview on port 4175, Playwright at 375/768/1440 |
| `npm run test:e2e:ui`      | Playwright interactive mode                                           |

`npm run test:e2e:real` uses the credentials in `.env.local` and creates temporary Supabase
accounts and listings. Never run it against a production project, and clean test data after a
run. The RLS proof script has the same warning:

```bash
node scripts/phase1-smoke.mjs
```

The first Playwright run may need a browser:

```bash
npx playwright install chromium
```

The mock E2E suite covers:

- public and signed-in route smoke tests
- feed filtering, search and pagination
- saving a listing
- publishing and editing a listing with a photo
- opening a conversation and replying
- marking all notifications read
- keyboard skip link and focus indicators
- serious/critical axe violations on home, login and listing detail

The real-mode suite covers signup, login, logout, creating a listing with an uploaded WebP,
editing, saving another user's listing, marking sold, deleting and the empty feed after cleanup.
Every test fails on console errors, page errors or horizontal overflow where checked.

## Structure

```text
src/
  api/          API entry point, mock adapter, Supabase adapter
  i18n/         English/Hindi dictionaries and helpers
  lib/          auth, routing helpers, storage, validation, formatting
  pages/        lazy-loaded route modules
  styles/       tokens, base, components, page styles
  ui/           shell, cards, gallery, sheets, toast, icons
  router.js     History API router
  store.js      small pub/sub store
tests/e2e/      mock-mode Playwright tests
tests/e2e-real/ live Supabase Playwright tests
supabase/       applied migrations and local CLI config
scripts/        i18n, bundle and Phase 1 RLS proof scripts
legacy/         original prototype, reference only
```

## API adapters

`src/api/index.js` exports a single lazy `api` instance. Pages only call this interface. Vite
aliases `@api-adapter` to either `src/api/mock/adapter.js` or `src/api/supabase/adapter.js` at
build time, based on `VITE_USE_MOCK`. The demo bundle therefore never includes
`@supabase/supabase-js`.

The real adapter keeps private phone numbers in `profile_contacts`, roles in `user_roles`, and
serialises write access through RPCs and column grants. Public reads use RLS-safe RPCs such as
`get_feed`, `get_listing`, `get_seller` and `get_chat`.

## Accessibility and performance

- Semantic landmarks, one `h1` per page, labelled forms and visible focus rings
- Skip link and keyboard-operable tabs, sheets, gallery and filters
- `prefers-reduced-motion` support; page transitions animate opacity only
- WCAG AA colour contrast for text and status badges
- No framework runtime; route chunks are lazy-loaded
- Mock budgets: 30 kB entry JS, 25 kB per chunk, 100 kB total JS, 20 kB CSS (gzip)
- Real budgets: 30 kB entry JS, 75 kB per chunk, 160 kB total JS, 20 kB CSS (gzip)

## Deploy

The app is a static SPA and can be deployed to Vercel Hobby with the included `vercel.json`
rewrite. For the real backend, set these Vercel environment variables for Preview and Production:

```text
VITE_USE_MOCK=false
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Do not set a service-role key in Vercel client variables. The Khargone demo is intentionally
limited to one active city; the other seeded cities stay hidden until the expansion gate is met.
Phase 1 uses email/password auth with confirmation off. Google OAuth, phone OTP, Turnstile, paid
plans and a custom domain are intentionally deferred.
