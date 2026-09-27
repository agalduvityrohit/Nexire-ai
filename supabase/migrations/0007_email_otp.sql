-- One-time email codes for passwordless sign-up/sign-in.
--
-- The code itself is never stored — only its hash — so a leaked database row
-- can't be used to log in. Service-role only, same trust model as every other
-- table here: the browser never queries this directly.

create table if not exists public.email_otps (
  email       text        primary key,
  code_hash   text        not null,
  attempts    integer     not null default 0,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null
);

alter table public.email_otps enable row level security;
-- Deliberately no policies. Do NOT grant anon/authenticated access here.
