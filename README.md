# xoop

Personal Whoop dashboard. Pulls fitness data from the official Whoop Developer API into Supabase and renders it as charts + stats. Built so I can slice/dice my own data beyond what the Whoop app offers (custom ranges, correlations with annotations, etc.).

## Features

- OAuth2 connect to Whoop (tokens persisted in Supabase, auto-refreshed)
- Sync 30d / 90d / 1y / All on demand
- Stat cards: avg recovery, HRV, RHR, strain, sleep duration, sleep performance, workout count, workout time
- Charts: recovery score, HRV, RHR, sleep stages (stacked), daily strain, avg/max HR
- Workout list

## Stack

- **Next.js 16** (App Router, RSC, TypeScript)
- **React 19**
- **Supabase** (Postgres, row storage with raw JSON column for forward-compat)
- **Recharts** for visualization
- **Tailwind v4**
- **pnpm**

## Setup

1. `pnpm install`
2. Create a Supabase project, copy URL + `service_role` key into `.env.local` (see `.env.local.example`)
3. Run `sql/schema.sql` in the Supabase SQL editor
4. Register an app at https://developer.whoop.com:
   - Redirect URI: `http://localhost:3000/api/auth/callback`
   - Privacy policy: https://github.com/MaximilianSajonz/xoop/blob/main/privacy.md
   - Scopes: all read scopes + `offline`
5. Put Client ID + Secret into `.env.local`
6. `pnpm dev` → http://localhost:3000 → **Connect Whoop** → **Sync 1y**

## API endpoints

- `GET  /api/auth/start` — redirect to Whoop OAuth consent
- `GET  /api/auth/callback` — receive code, exchange for tokens, store in Supabase
- `POST /api/sync?days=N` — pull last N days of cycles/recovery/sleep/workouts (default 30, max ~500)

## Data model

All tables in Supabase use `text` IDs (Whoop API v2 uses UUIDs). Each row keeps the full raw API payload in a `jsonb raw` column so the schema can evolve without re-syncing.

- `whoop_tokens` — single row (id = `default`), OAuth access/refresh tokens
- `whoop_profile` — user basic info + body measurement (height, weight, max HR)
- `whoop_cycle` — daily cycle (strain, kJ, avg/max HR)
- `whoop_recovery` — daily recovery score, HRV, RHR, SpO2, skin temp
- `whoop_sleep` — sleep sessions (perf %, stage durations, disturbances, RR)
- `whoop_workout` — workouts (sport, strain, zones, distance, altitude)

## Privacy

See [privacy.md](./privacy.md). Single-user personal app; data never leaves the operator's Supabase instance.

## Roadmap

See [tasks.md](./tasks.md).
