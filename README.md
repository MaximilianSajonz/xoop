# xoop

> Your Whoop, your data, your way.

A personal Whoop dashboard built with Next.js + Supabase. Pulls your fitness data from the official Whoop Developer API into your own database and renders it as charts, calendar heatmaps, behavior correlations, and per-day deep dives. Goes well beyond what the Whoop app shows.

Built because the Whoop app is mostly aggregates and trends — this gives you the raw exploration tools to slice your own data however you want.

---

## Features

- **OAuth2 connect** to Whoop (tokens stored in Supabase, auto-refreshed)
- **Sync** 30 days / 90 days / 1 year / all available on demand
- **8 tabs of analysis:**
  - **Overview** — headline stats with trend arrows, recovery chart, sleep & strain at a glance
  - **Recovery** — daily + 7-day rolling, GitHub-style calendar heatmap, HRV heatmap, recovery distribution, day-of-week pattern
  - **Sleep** — performance & hours heatmaps, stacked sleep stages, disturbances chart, naps list
  - **Strain** — strain heatmap, HR trends, energy totals
  - **Workouts** — minutes-per-day heatmap, time-by-sport breakdown (with real sport names), full table
  - **Analyse** — pick any day, see everything: recovery breakdown, strain, sleep stages bar, every workout with HR zone distribution, behaviors logged that day, surrounding 13-day context
  - **Behaviors** — import your Whoop journal entries (alcohol, stress, sex, marijuana, sleep disruption, ~30 tracked behaviors) and see the recovery delta on YES vs NO days, ranked by impact
  - **Compare** — pick two months, side-by-side stat comparison with overlay chart
  - **Insights** — auto-detected patterns: possible intimacy sessions (heuristic on duration, time-of-day, HR), late-night activities, mystery generic activities, recovery cliffs, HRV crashes
  - **Correlations** — Pearson scatter plots with trend lines and quadrant medians: sleep → next-day recovery, day-before strain → recovery, hours in bed → HRV. Plain-English interpretation included.
- **CSV import** for Whoop's in-app data export (journal entries + raw landing zone for other CSVs)
- **Dark, responsive UI** — works on phone, tablet, and desktop

## Stack

- **Next.js 16** (App Router, RSC, TypeScript strict)
- **React 19**
- **Tailwind v4**
- **Recharts** for charts
- **Supabase** (Postgres) for storage + auth-token persistence
- **pnpm** as package manager

---

## Setup

This app is single-user by design — each operator runs their own instance with their own Whoop credentials and their own Supabase project. There is no shared hosted version. The whole thing runs on your machine in under 10 minutes.

### 1. Clone and install

```bash
git clone https://github.com/MaximilianSajonz/xoop.git
cd xoop
pnpm install
```

### 2. Create a Supabase project

1. Sign up at [supabase.com](https://supabase.com) (free tier is plenty)
2. Create a new project
3. Open **SQL Editor** and paste the contents of [`sql/schema.sql`](./sql/schema.sql), then run it
4. Open **Project Settings → API** and grab three things:
   - Project URL (e.g. `https://abcdefg.supabase.co`)
   - `anon` / `publishable` key (starts with `sb_publishable_…`)
   - `service_role` / `secret` key (starts with `sb_secret_…` — **keep this private**, never ship to a browser)

### 3. Register a Whoop developer app

1. Go to [developer.whoop.com](https://developer.whoop.com) and create an app
2. Set the redirect URI to `http://localhost:3000/api/auth/callback`
3. Tick all the read scopes you want plus `offline`
4. You'll need a **privacy policy URL**. A minimal one is included in this repo at [`privacy.md`](./privacy.md) — point Whoop at `https://github.com/<your-username>/xoop/blob/main/privacy.md` once you've forked.
5. Copy your **Client ID** and **Client Secret**

### 4. Wire up `.env.local`

Copy the example file and fill in the values:

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_…
SUPABASE_SERVICE_ROLE_KEY=sb_secret_…

WHOOP_CLIENT_ID=…
WHOOP_CLIENT_SECRET=…
WHOOP_REDIRECT_URI=http://localhost:3000/api/auth/callback
```

`.env.local` is gitignored — your secrets stay on your machine.

### 5. Run it

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000), click **Connect Whoop**, authorize, then click **Sync** → **Last year** (or **All available**). You'll see a year of your data populate within ~20 seconds.

### 6. Optional: import your journal entries

To unlock the **Behaviors** tab:

1. In the Whoop mobile app: **More → App Settings → Integrations → Data Export**
2. Request the export, wait for the email (~minutes), unzip
3. In xoop: top-right **Import** button → drag `journal_entries.csv` in
4. Open the **Behaviors** tab — every tracked behavior with its real recovery impact

The export also contains `physiological_cycles.csv`, `sleeps.csv`, `workouts.csv`. You can drop them too; they land in `whoop_import_raw` for inspection / future use. The journal is the irreplaceable one — everything else is also pulled live from the API.

---

## API endpoints (Next.js routes)

| Endpoint | Purpose |
|---|---|
| `GET  /api/auth/start` | Begin OAuth — redirects to Whoop consent |
| `GET  /api/auth/callback` | Exchange auth code for tokens, persist to Supabase |
| `POST /api/sync?days=N` | Pull last N days of cycles / recovery / sleep / workouts |
| `POST /api/import` | Multipart upload — parses CSV, dispatches to journal handler or raw landing zone |

## Data model

All tables live in your Supabase project. Every fact table keeps the full raw API response in a `jsonb raw` column so the schema can evolve without re-syncing.

| Table | Purpose |
|---|---|
| `whoop_tokens` | OAuth access/refresh tokens (single row, id = `default`) |
| `whoop_profile` | User profile + body measurement |
| `whoop_cycle` | Daily cycles (strain, kJ, avg/max HR) |
| `whoop_recovery` | Daily recovery score, HRV, RHR, SpO₂, skin temp |
| `whoop_sleep` | Sleep sessions (perf, efficiency, consistency, stage durations) |
| `whoop_workout` | Workouts (sport, strain, HR zone breakdown, energy) |
| `whoop_journal` | Behavior log from CSV import |
| `whoop_hr_sample` | Reserved for future high-resolution HR import |
| `whoop_import_raw` | Generic landing zone for unrecognized CSVs |

## Privacy & data handling

- **Single-user, self-hosted.** Each operator runs their own copy. No shared backend.
- **Your data never leaves your Supabase project.** xoop talks only to the official Whoop API and to your database.
- **Secrets stay local.** `.env.local`, `.tokens.json`, and any CSV imports never touch the repo.
- **No analytics, no tracking, no telemetry.** Just you and your numbers.

See [`privacy.md`](./privacy.md) — also linked from the Whoop developer portal.

---

## Project layout

```
src/
├── app/
│   ├── api/
│   │   ├── auth/start/route.ts       OAuth kickoff
│   │   ├── auth/callback/route.ts    Code exchange + token storage
│   │   ├── sync/route.ts             Pull from Whoop, upsert to Supabase
│   │   └── import/route.ts           CSV upload + parse
│   ├── import/page.tsx                /import drop-zone UI
│   ├── dashboard.tsx                  Big client component — all tabs
│   ├── sync-button.tsx                Sync dropdown
│   ├── page.tsx                       Server component — data fetch + layout
│   ├── layout.tsx, globals.css        App chrome
└── lib/
    ├── supabase.ts                    sbAdmin() + sbAnon() factories
    ├── whoop.ts                       OAuth helpers + API client + paginator
    ├── stats.ts                       avg / median / pearson / rolling / regression
    ├── sports.ts                      Whoop sport ID → name map
    └── insights.ts                    Heuristic activity detectors
sql/schema.sql                         Postgres schema
```

## Common commands

```bash
pnpm install
pnpm dev               # http://localhost:3000
pnpm exec tsc --noEmit # typecheck
pnpm build && pnpm start
```

## Roadmap

See [`tasks.md`](./tasks.md). Highlights still on the list: webhooks for live updates, CSV export of any chart view, per-workout HR-zone deep dive, custom date range picker, deploy guide for Vercel.

## License

MIT. Use, fork, modify freely. If you build something on top, please credit the original.

---

Made by [Maximilian Sajonz](https://github.com/MaximilianSajonz) as a personal tool — sharing it because everyone with a Whoop should have full access to their own data.
