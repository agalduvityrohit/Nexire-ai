-- Soft waitlist: real signups don't create a real account (there is no real
-- auth yet — see lib/store.jsx#signIn), so the signup form on /login captures
-- the lead here instead of failing silently or faking one.
--
-- Same trust model as every other table so far: RLS on, no policies — only
-- the service-role key our server routes use can touch this.

create table if not exists public.waitlist (
  id           text        primary key,
  name         text,
  email        text        not null,
  company_name text,
  company_size text,
  role_title   text,
  created_at   timestamptz not null default now()
);

create index if not exists waitlist_email_idx on public.waitlist (email);

alter table public.waitlist enable row level security;
