# Purana Bazaar

A mobile-first local classifieds app for Khargone, Madhya Pradesh. Buy and sell second-hand
furniture, phones, bikes, appliances and more in Hindi or English.

**Status: Phase 0 complete.** The app runs entirely on an in-memory mock API. Phase 1 will add
Supabase auth, Postgres, storage and real data.

## Demo

```text
Email:    demo@example.com
Password: demo1234
```

The sign-in page also has a **Use the demo account** button.

Mock data resets when the page reloads. Only the selected city, language, sell draft, recently
viewed items and dismissed banners persist in `localStorage`.

## Stack

- Vite 8 and native ES modules — no UI framework
- Hand-written CSS with design tokens
- Lazy-loaded route modules
- In-memory mock API behind one adapter interface
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

| Command               | What it does                                                      |
| --------------------- | ----------------------------------------------------------------- |
| `npm run lint`        | ESLint, including bans on unsafe DOM and blocking browser dialogs |
| `npm run format`      | Format the repository with Prettier                               |
| `npm run test:i18n`   | Verify every literal `t()` key exists in English and Hindi        |
| `npm run build:check` | Build, then enforce JS/CSS gzip budgets                           |
| `npm run check`       | Lint, format check, i18n check and bundle check                   |
| `npm run test:e2e`    | Build, preview on port 4174, run Playwright at 375/768/1440       |
| `npm run test:e2e:ui` | Playwright interactive mode                                       |

The first Playwright run may need a browser:

```bash
npx playwright install chromium
```

The E2E suite covers:

- public and signed-in route smoke tests
- feed filtering, search and pagination
- saving a listing
- publishing and editing a listing with a photo
- opening a conversation and replying
- marking all notifications read
- keyboard skip link and focus indicators
- serious/critical axe violations on home, login and listing detail

Every test fails on console errors, page errors or horizontal overflow where checked.

## Structure

```text
src/
  api/          API entry point, mock adapter, seed data
  i18n/         English/Hindi dictionaries and helpers
  lib/          auth, routing helpers, storage, validation, formatting
  pages/        lazy-loaded route modules
  styles/       tokens, base, components, page styles
  ui/           shell, cards, gallery, sheets, toast, icons
  router.js     History API router
  store.js      small pub/sub store
tests/e2e/      Playwright tests
scripts/        i18n and bundle checks
legacy/         original prototype, reference only
```

## Mock API

`src/api/index.js` exports a single `api` instance. Pages only call this interface. Phase 1 will
replace the mock adapter with a Supabase-backed implementation while keeping the same methods.

Demo auth, listings, favourites, chats and notifications live in memory. The old legacy
prototype's Supabase host is no longer resolvable, so no legacy data can be migrated.

## Accessibility and performance

- Semantic landmarks, one `h1` per page, labelled forms and visible focus rings
- Skip link and keyboard-operable tabs, sheets, gallery and filters
- `prefers-reduced-motion` support; page transitions animate opacity only
- WCAG AA colour contrast for text and status badges
- No framework runtime; route chunks are lazy-loaded
- Bundle budgets: 30 kB entry JS, 25 kB per chunk, 100 kB total JS, 20 kB CSS (gzip)

## Deploy

The app is a static SPA and can be deployed to Vercel with the included `vercel.json` rewrite.
This Phase 0 build is a demo, not a production marketplace: there is no real auth, database,
storage, moderation or durable data.

Phase 1 requires a new Supabase project and the decisions listed in
[`HANDOFF.md`](./HANDOFF.md). Never commit Supabase service-role keys or other secrets; use
environment variables and `.env.example` as the template.
