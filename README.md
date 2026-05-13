# xoop

Personal Whoop dashboard. Next.js + Supabase.

## Setup

1. `pnpm install`
2. Run `sql/schema.sql` in the Supabase SQL editor.
3. Put `SUPABASE_SERVICE_ROLE_KEY` into `.env.local` (Supabase dashboard → Project Settings → API).
4. In the Whoop developer portal, set the redirect URI to `http://localhost:3000/api/auth/callback`.
5. `pnpm dev` → open http://localhost:3000 → click **Connect Whoop** → then **Sync 30d**.

## Privacy policy

https://github.com/MaximilianSajonz/xoop/blob/main/privacy.md
