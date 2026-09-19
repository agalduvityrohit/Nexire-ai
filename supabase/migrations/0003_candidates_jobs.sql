-- Real persistence for jobs and candidates, plus a résumé parse cache.
--
-- Before this, jobs/candidates lived only in React state (lib/store.jsx) —
-- gone on every refresh, and every résumé got re-sent to the LLM on every
-- upload even if it had been parsed before. This fixes both: candidates and
-- jobs survive a refresh, and re-uploading a byte-identical file reuses the
-- cached parse instead of paying for another model call.
--
-- Same trust model as 0002_provider_keys.sql: RLS on, no policies — only the
-- service-role key our server routes use can touch these.

create table if not exists public.company_jobs (
  id               text        primary key,
  company_id       text        not null,
  title            text        not null,
  department       text,
  location         text,
  type             text,
  level            text,
  salary           text,
  status           text        not null default 'Open',
  posted_at        date,
  stack            jsonb       not null default '[]',
  summary          text,
  description      text,
  responsibilities jsonb       not null default '[]',
  requirements     jsonb       not null default '[]',
  benefits         jsonb       not null default '[]',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists company_jobs_company_id_idx on public.company_jobs (company_id);

alter table public.company_jobs enable row level security;

create table if not exists public.company_candidates (
  id               text        primary key,
  company_id       text        not null,
  job_id           text,
  name             text,
  email            text,
  phone            text,
  location         text,
  headline         text,
  summary          text,
  role             text,
  status           text        not null default 'applied',
  source           text,
  match_score      integer     not null default 0,
  experience_years numeric     not null default 0,
  resume_file      text,
  resume_hash      text,               -- sha256 of the uploaded file, for the parse cache
  github_username  text,
  github_url       text,
  avatar_url       text,
  applied_at       date,
  skills           jsonb       not null default '[]',
  experience       jsonb       not null default '[]',
  education        jsonb       not null default '[]',
  projects         jsonb       not null default '[]',
  links            jsonb,
  ai_flags         jsonb       not null default '[]',
  report           jsonb,
  notice_period    text,
  expected         text,
  timeline         jsonb       not null default '[]',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists company_candidates_company_id_idx on public.company_candidates (company_id);
create index if not exists company_candidates_job_id_idx on public.company_candidates (company_id, job_id);

alter table public.company_candidates enable row level security;

-- Keyed by file hash, not candidate — a résumé can be re-uploaded (or show up
-- again via a later Gmail scan) without ever becoming a stored candidate
-- (e.g. it was a duplicate that batch), so the cache has to stand on its own.
create table if not exists public.resume_parse_cache (
  company_id text        not null,
  file_hash  text        not null,
  parsed     jsonb       not null,
  provider   text,
  model      text,
  created_at timestamptz not null default now(),
  primary key (company_id, file_hash)
);

alter table public.resume_parse_cache enable row level security;

drop trigger if exists company_jobs_updated_at on public.company_jobs;
create trigger company_jobs_updated_at
  before update on public.company_jobs
  for each row execute function public.touch_updated_at();

drop trigger if exists company_candidates_updated_at on public.company_candidates;
create trigger company_candidates_updated_at
  before update on public.company_candidates
  for each row execute function public.touch_updated_at();
