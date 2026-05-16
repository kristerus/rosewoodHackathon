-- Guest Agent Knowledge Store
-- Run after 0001_init.sql in the Supabase SQL Editor.
-- Each row = one atomic fact the hotel's per-guest AI agent has learned.

create table if not exists public.guest_knowledge (
  id           uuid        primary key default gen_random_uuid(),
  created_at   timestamptz not null    default now(),
  guest_id     text        not null,
  guest_name   text        not null,
  fact         text        not null,
  source       text        not null    default 'transcript',   -- 'transcript' | 'email' | 'manual' | 'checkin'
  source_ref   text,                                           -- ticket id, email id, etc.
  property_id  text        not null    default 'rosewood-sf'
);

create index if not exists guest_knowledge_guest_id_idx
  on public.guest_knowledge (guest_id, created_at desc);

create index if not exists guest_knowledge_property_idx
  on public.guest_knowledge (property_id, created_at desc);

-- Enable Realtime so the dashboard can subscribe to new facts in real time
do $$
begin
  begin
    alter publication supabase_realtime add table public.guest_knowledge;
  exception when duplicate_object then null;
  end;
end $$;

-- Row Level Security (wide open for the hackathon)
alter table public.guest_knowledge enable row level security;

drop policy if exists "guest_knowledge read all"   on public.guest_knowledge;
drop policy if exists "guest_knowledge insert all" on public.guest_knowledge;

create policy "guest_knowledge read all"   on public.guest_knowledge for select using (true);
create policy "guest_knowledge insert all" on public.guest_knowledge for insert with check (true);
