This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Local development

1. Copy the example env file and fill in real keys:

   ```bash
   cp .env.local.example .env.local
   ```

   At minimum you need `ANTHROPIC_API_KEY`. For the phone-to-dashboard live flow you also need the three Supabase keys (see below).

2. Run the dev server:

   ```bash
   npm run dev
   ```

3. Open <http://localhost:3000>.

## Production deploy setup (Vercel + Supabase + Resend)

The phone (`/badge`) and the dashboard (`/`) run in **separate Vercel serverless invocations** that don't share memory. We use Supabase Postgres + Realtime as the message bus and Resend for department emails.

### 1. Create Supabase project

1. Sign in at <https://supabase.com> → **New project** (free tier is fine).
2. Wait for the project to provision (~1 minute).
3. Open **SQL Editor** → **New query**.
4. Paste the entire contents of [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) → click **Run**.
5. Verify under **Database** → **Tables** that `tickets` and `transcripts` exist.
6. Verify under **Database** → **Replication** that both tables have Realtime enabled.

### 2. Grab Supabase keys

In your Supabase project → **Project Settings** → **API**:

| Env var | Where to find it |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` public key |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` secret key — keep server-side only |

### 3. (Optional) Resend account for department emails

1. Sign up at <https://resend.com>.
2. **API Keys** → **Create API key** → copy the `re_...` value.
3. The sandbox sender `onboarding@resend.dev` is used by default — no domain verification needed for testing. Swap for a verified `hotel.eliaspfeffer.de` sender for production.

Without `RESEND_API_KEY` the app still works — emails are logged to the Vercel runtime console instead of sent.

### 4. Add env vars to Vercel

In your Vercel project → **Settings** → **Environment Variables**, add for **Production + Preview + Development**:

```
ANTHROPIC_API_KEY=sk-ant-api03-...
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
RESEND_API_KEY=re_...           # optional
TAVILY_API_KEY=tvly-...         # optional
```

### 5. Deploy

Push to `main` — Vercel redeploys automatically. Open the dashboard in one window, the `/badge` page on your phone, speak a request — the ticket should land on the dashboard within ~2 seconds. The dashboard's "Live · Connected" pill turns green once the Supabase Realtime channel subscribes.

## Architecture

- **`app/api/badge-transcript`** — phone POSTs the spoken transcript. Calls Claude to extract a structured ticket, inserts into Supabase, fires a Resend email to the routed department.
- **`app/api/tickets/recent`** — dashboard hits this on mount to hydrate the last 50 tickets.
- **`app/page.tsx`** — subscribes to Supabase Realtime INSERTs on `tickets` and `transcripts` for live push.
- **`lib/dept-routing.ts`** — maps each `Department` to an email address + SLA.
- **`supabase/migrations/0001_init.sql`** — schema (paste-and-run in Supabase SQL editor).

## API surface

- `POST /api/badge-transcript` — `{ transcript, staff_id, known_guests?, property_id? }` → `{ ticket, email }`
- `POST /api/extract` — `{ transcript, staff_id, known_guests }` → `{ ticket }` (does NOT persist — used by manual sample-transcript UI)
- `POST /api/guest-brief` — `{ guest_id, guests }` → `{ brief }`
- `POST /api/research` — `{ guest_id, guests }` → `{ brief }` (with web search)
- `POST /api/predictions` — `{ guest_id, guests }` → `{ predictions }`
- `GET  /api/tickets/recent?property_id=rosewood-sf&limit=50` → `{ tickets }`

Model used: `claude-sonnet-4-6`. `.env.local` is gitignored — never commit your keys.
