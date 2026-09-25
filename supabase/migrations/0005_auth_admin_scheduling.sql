-- Real accounts, tenant isolation, admin role, and interview scheduling.
--
-- Run AFTER 0001-0004. Safe to re-run (everything is "if not exists" / guarded).
--
-- Trust model: the browser never talks to Supabase directly. Every request goes
-- through our API routes, which use the service-role key and derive the company
-- from a signed session cookie. The RLS policies below are defence in depth —
-- if the anon/authenticated keys are ever used against these tables, a user can
-- still only see rows belonging to their own company.

/* ------------------------------------------------------------ companies */

create table if not exists public.companies (
  id            text        primary key default gen_random_uuid()::text,
  user_id       uuid        not null unique references auth.users (id) on delete cascade,
  name          text        not null,
  role          text        not null default 'company' check (role in ('company', 'admin')),
  created_at    timestamptz not null default now(),
  last_login_at timestamptz,
  login_count   integer     not null default 0
);

alter table public.companies enable row level security;

-- A signed-in user may READ their own company row. Nothing else: no client-side
-- insert/update/delete, so nobody can promote themselves to admin.
drop policy if exists companies_select_own on public.companies;
create policy companies_select_own on public.companies
  for select to authenticated
  using (user_id = auth.uid());

/* ------------------------------------------- tenant policies on data tables */

drop policy if exists jobs_tenant on public.company_jobs;
create policy jobs_tenant on public.company_jobs
  for all to authenticated
  using (company_id in (select id from public.companies where user_id = auth.uid()))
  with check (company_id in (select id from public.companies where user_id = auth.uid()));

drop policy if exists candidates_tenant on public.company_candidates;
create policy candidates_tenant on public.company_candidates
  for all to authenticated
  using (company_id in (select id from public.companies where user_id = auth.uid()))
  with check (company_id in (select id from public.companies where user_id = auth.uid()));

-- company_provider_keys, company_settings, resume_parse_cache stay policy-less
-- (service-role only) on purpose.

/* ------------------------------------------------- jobs: interview slots */

alter table public.company_jobs
  add column if not exists interview_slots       jsonb not null default '[]',
  add column if not exists hiring_manager_email  text;

/* ------------------------------------- candidates: shortlist + scheduling */

alter table public.company_candidates
  add column if not exists shortlisted_at       timestamptz,
  add column if not exists invited_at           timestamptz,
  add column if not exists interview_at         timestamptz,
  add column if not exists interview_slot_id    text;

/* --------------------------------------------------- interview bookings */
-- One row per invitation. The token in the emailed link is the only credential
-- the candidate needs (no login), so it is long, random and expires.

create table if not exists public.interview_bookings (
  token           text        primary key,
  company_id      text        not null,
  job_id          text,
  candidate_id    text        not null,
  candidate_name  text,
  candidate_email text        not null,
  role_title      text,
  company_name    text,
  manager_email   text,
  slots           jsonb       not null default '[]',   -- snapshot of what was offered
  status          text        not null default 'pending' check (status in ('pending', 'booked', 'cancelled')),
  slot_id         text,
  selected_slot   jsonb,
  created_at      timestamptz not null default now(),
  expires_at      timestamptz not null default (now() + interval '30 days'),
  booked_at       timestamptz
);

create index if not exists interview_bookings_company_idx on public.interview_bookings (company_id);
create index if not exists interview_bookings_candidate_idx on public.interview_bookings (company_id, candidate_id);

-- A slot can be taken by only one candidate per job. This makes double-booking
-- impossible even if two candidates click at the same instant.
create unique index if not exists interview_bookings_one_per_slot
  on public.interview_bookings (company_id, job_id, slot_id)
  where status = 'booked';

alter table public.interview_bookings enable row level security;
-- No policies: service-role only (the public scheduling page goes through our API).

/* --------------------------------------------------- make yourself admin */
-- After you have signed up once through /signup, run (with YOUR email):
--
--   update public.companies
--      set role = 'admin'
--    where user_id = (select id from auth.users where email = 'you@example.com');
--
-- To move the data that used to live under the shared "demo-company" id into
-- your new company (replace <your-company-id> with companies.id):
--
--   update public.company_jobs        set company_id = '<your-company-id>' where company_id = 'demo-company';
--   update public.company_candidates  set company_id = '<your-company-id>' where company_id = 'demo-company';
--   update public.resume_parse_cache  set company_id = '<your-company-id>' where company_id = 'demo-company';
