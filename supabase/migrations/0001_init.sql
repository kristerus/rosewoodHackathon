-- AI Concierge — initial schema
-- Paste into Supabase Dashboard → SQL Editor → Run.
-- See supabase/README.md for full instructions.

-- ============================================================
-- Tickets (Service Requests created from the badge)
-- ============================================================
create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  guest_name text,
  room_number text,
  department text not null,
  urgency text not null,
  intent text not null,
  action_required text not null,
  guest_facing_message text,
  internal_notes text,
  raw_transcript text not null,
  staff_id text not null,
  status text not null default 'open',
  property_id text not null default 'rosewood-sf',
  email_sent boolean not null default false,
  email_sent_to text
);

create index if not exists tickets_property_created_idx
  on public.tickets (property_id, created_at desc);

-- ============================================================
-- Live transcripts (transient "listening on badge" indicator)
-- ============================================================
create table if not exists public.transcripts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  transcript text not null,
  staff_id text not null,
  property_id text not null default 'rosewood-sf'
);

-- ============================================================
-- Enable Realtime on both tables
-- (idempotent: ignore the error if the table is already part of the publication)
-- ============================================================
do $$
begin
  begin
    alter publication supabase_realtime add table public.tickets;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.transcripts;
  exception when duplicate_object then null;
  end;
end $$;

-- ============================================================
-- Row Level Security — open for the hackathon.
-- Lock this down before going to real production.
-- ============================================================
alter table public.tickets enable row level security;
alter table public.transcripts enable row level security;

drop policy if exists "tickets read all" on public.tickets;
drop policy if exists "tickets insert all" on public.tickets;
drop policy if exists "tickets update all" on public.tickets;
drop policy if exists "transcripts read all" on public.transcripts;
drop policy if exists "transcripts insert all" on public.transcripts;

create policy "tickets read all"   on public.tickets       for select using (true);
create policy "tickets insert all" on public.tickets       for insert with check (true);
create policy "tickets update all" on public.tickets       for update using (true);
create policy "transcripts read all"   on public.transcripts for select using (true);
create policy "transcripts insert all" on public.transcripts for insert with check (true);
