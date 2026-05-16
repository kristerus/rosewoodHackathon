# Supabase setup

This project uses Supabase for persistence (Postgres) and live cross-container push (Realtime). The in-memory event bus was removed because Vercel serverless invocations don't share memory — the phone POST and the dashboard run in different containers.

## One-time setup

1. Create a project at <https://supabase.com> (free tier is fine).
2. Open the project, go to **SQL Editor** → **New query**.
3. Open `migrations/0001_init.sql` in this folder, copy the entire contents, paste into the SQL editor, click **Run**.
4. Verify the tables exist: **Database** → **Tables** → you should see `tickets` and `transcripts`.
5. Verify Realtime is on for both tables: **Database** → **Replication** → both rows should show "All events" enabled.
6. Grab your keys at **Project Settings** → **API**:
   - `NEXT_PUBLIC_SUPABASE_URL` — Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — `anon` public key (safe in browser)
   - `SUPABASE_SERVICE_ROLE_KEY` — `service_role` secret key (server-only)
7. Paste those into `.env.local` (local dev) and Vercel env vars (Production + Preview + Development).

## Schema notes

- `tickets` — every service request from the badge ends up here. Indexed on `(property_id, created_at desc)` for the dashboard hydration query.
- `transcripts` — transient "live transcript" rows used to flash the listening indicator on the dashboard. We don't read these back; they only exist so Realtime can broadcast INSERTs.
- RLS is wide open for the hackathon. Tighten before production (e.g. require authenticated role, scope by `property_id`).

## Re-running the migration

Safe to re-run — every statement is idempotent (`if not exists`, `drop policy if exists`, exception-swallowing publication block).
