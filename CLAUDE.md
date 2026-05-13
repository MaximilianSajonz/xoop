# CLAUDE.md — xoop

Project-specific guidance for Claude Code working on this repo.

## What this is

Personal Whoop fitness data dashboard. Owner: Maximilian Sajonz (private, side project). Hosted in `~/Documents/GitHub/xoop`. GitHub: `MaximilianSajonz/xoop` (public).

## Stack

- **Next.js 16** App Router, RSC + Client Components, **TypeScript strict**
- **React 19**
- **Tailwind v4** (via `@tailwindcss/postcss`)
- **Supabase JS** v2 — server-side admin client uses `SUPABASE_SERVICE_ROLE_KEY`
- **Recharts** for charts
- **pnpm** package manager

## Conventions

- All Supabase tables use `text` primary keys — Whoop API v2 returns UUIDs, not bigints. Do **not** revert to `bigint`.
- Every row in fact tables (`whoop_cycle`, `whoop_recovery`, `whoop_sleep`, `whoop_workout`) keeps the full Whoop response in a `raw jsonb` column. When a new derived field is needed, prefer reading from `raw` over re-syncing.
- Use **API v2 endpoints** (`/v2/cycle`, `/v2/recovery`, `/v2/activity/sleep`, `/v2/activity/workout`, `/v2/user/profile/basic`, `/v2/user/measurement/body`). v1 is dead.
- Server-only secrets: `SUPABASE_SERVICE_ROLE_KEY`, `WHOOP_CLIENT_SECRET`, `WHOOP_CLIENT_ID` (used server-side via API routes). Never import them into client components.
- Tokens live in Supabase (`whoop_tokens` table, id=`default`), not in local files. Single-user app so a singleton row is fine.
- OAuth flow goes through Next API routes (`/api/auth/start`, `/api/auth/callback`). Redirect URI in Whoop portal must match `WHOOP_REDIRECT_URI` exactly.

## File map

```
src/
├── app/
│   ├── api/
│   │   ├── auth/start/route.ts      OAuth kickoff
│   │   ├── auth/callback/route.ts   Code exchange + token storage
│   │   └── sync/route.ts            Pull from Whoop, upsert into Supabase
│   ├── dashboard.tsx                 Client component: charts + filters + stats
│   ├── sync-button.tsx               Client component: sync buttons
│   ├── page.tsx                      Server component: data fetch + layout
│   ├── layout.tsx                    Root layout
│   └── globals.css                   Tailwind
└── lib/
    ├── supabase.ts                   sbAdmin() + sbAnon() factories
    └── whoop.ts                      OAuth helpers + API client + paginator
sql/schema.sql                        Postgres schema (run in Supabase)
```

## Common commands

```bash
pnpm install
pnpm dev               # http://localhost:3000
pnpm exec tsc --noEmit # typecheck
pnpm build
```

## When adding features

- **New chart** → extend `src/app/dashboard.tsx`. Data shape comes from `page.tsx`'s server fetch — extend the select and the prop type together.
- **New derived field** → add a column to `sql/schema.sql`, then map from `raw` in `api/sync/route.ts`. Existing rows keep `raw`, so a re-sync repopulates the new column.
- **New API call** → extend `whoop` object in `src/lib/whoop.ts`. All calls go through `api<T>()` which handles auth + refresh transparently.

## Gotchas

- **Sleep rows include naps** (`nap: true`). Dashboard filters them out of avg sleep duration. Don't accidentally double-count.
- **Two cycle rows on one date** — Whoop occasionally splits a day. Show both rather than collapsing.
- **Whoop rate limit**: 100 req/min, 10k/day. Pagination uses `limit=25`. A year sync is ~50–100 requests across endpoints, well within limits.
- **`maxDuration = 300`** on the sync route — needed for full-year sync on Vercel.

## Secrets

`.env.local` is gitignored. Never write secrets to other files in the repo, never paste them into chat, never commit them.
