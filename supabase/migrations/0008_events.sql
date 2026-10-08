-- Visitor + usage events for the founder-only console at /admin/traffic.
--
-- New table only — nothing existing is altered. Written and read exclusively by
-- our server code with the service-role key: RLS is on with NO policies and every
-- grant to anon/authenticated is revoked, so the browser can never read or write it.
--
-- Privacy by design: no cookies, no raw IPs (ip_hash = SHA-256(ip + daily salt)),
-- no passwords, no candidate names. Purged after EVENT_RETENTION_DAYS (default 90)
-- by /api/cron/purge-events.

create table if not exists public.events (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  event_type text        not null,
  company_id text,
  user_id    uuid,
  path       text,
  ip_hash    text,
  city       text,
  country    text,
  device     text,
  meta       jsonb       not null default '{}'
);

create index if not exists events_created_at_idx on public.events (created_at desc);
create index if not exists events_event_type_idx on public.events (event_type, created_at desc);
create index if not exists events_company_id_idx on public.events (company_id, created_at desc);
create index if not exists events_user_id_idx    on public.events (user_id, created_at desc);

alter table public.events enable row level security;
revoke all on public.events from anon, authenticated;
-- Deliberately no policies. Do NOT grant anon/authenticated access here.
