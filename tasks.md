# xoop — tasks & roadmap

## Done

- [x] OAuth2 flow with Whoop API v2
- [x] Token persistence in Supabase (auto-refresh)
- [x] Sync route (cycles, recovery, sleep, workouts, profile, body measurement)
- [x] Dashboard: 8 stat cards + 6 charts + workout table
- [x] Range filter (14d / 30d / 90d / 1y / all)
- [x] Sync buttons (30d / 90d / 1y / all)

## Next up

### Annotations / life events
The headline feature: tag arbitrary dates/sessions with custom labels so we can correlate behavior with biometrics.

- [ ] `whoop_annotation` table: `id`, `date` (or `start_ts`+`end_ts`), `tag`, `note`, `created_at`
- [ ] Predefined tags + free-form: smoked, alcohol (units), caffeine late, late meal, fasted, sick, travel, period, stressful day, sauna, cold plunge
- [ ] UI: click a day in any chart → modal to add/edit tags
- [ ] Markers overlaid on recovery/HRV/RHR charts
- [ ] Aggregate view: "avg recovery on smoking days vs non-smoking days" with t-test or simple delta

### Thresholds & filters
- [ ] "Show me all days where recovery < 30" — filtered list with the rows + annotations
- [ ] "Show days where HRV dropped >20% vs 7-day rolling avg" — anomaly detection
- [ ] Highlight outliers in charts (red dot for recovery < 20, etc.)

### Trends & rolling stats
- [ ] 7-day & 30-day rolling avg overlay on recovery/HRV/RHR charts
- [ ] Week-over-week comparison cards (avg vs prior week, with delta arrow)
- [ ] Monthly summary view

### Correlations
- [ ] Scatter: sleep performance vs next-day recovery
- [ ] Scatter: previous-day strain vs recovery
- [ ] Scatter: bedtime vs sleep performance
- [ ] Top "what predicts a green recovery day" — simple regression on annotations + sleep + strain

### Workout breakdown
- [ ] Sport ID → name map (Whoop publishes a sports table)
- [ ] Per-sport summary: total time, avg strain, avg HR
- [ ] Heart rate zone distribution chart
- [ ] Map view if GPS coords available (Whoop returns coords on some workouts)

### Sleep details
- [ ] Sleep onset / wake time trends (when did I actually fall asleep vs target)
- [ ] Sleep consistency score chart
- [ ] Disturbances count per night
- [ ] Sleep debt rolling view

### Sync hygiene
- [ ] Auto-sync on page load (debounced, only if last sync > 6h)
- [ ] Webhook endpoint for real-time updates (Whoop supports webhooks)
- [ ] "Last synced at" timestamp shown in header
- [ ] Background re-sync of last 7 days every load (in case Whoop revises scores)

### UX polish
- [ ] Theme: dark only is fine, but tweak palette to feel less default
- [ ] Date range picker (custom from/to) in addition to preset ranges
- [ ] Export current view as CSV
- [ ] Mobile layout pass

### Deployment
- [ ] Deploy to Vercel
- [ ] Whoop dev portal: add prod redirect URI

## Ideas / not yet scoped

- Compare with Apple Health / weather / mood journal
- LLM weekly summary ("this week your recovery dropped Mon–Wed, likely from late workouts on Sunday")
- Public read-only share link for a single week
- Goals: target avg recovery 60+, weekly strain 14+ — progress bars
