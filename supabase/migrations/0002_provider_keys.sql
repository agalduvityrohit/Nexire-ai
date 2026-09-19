-- Generalised per-company credential storage.
--
-- Supersedes 0001_company_api_keys.sql, which had one column per provider and
-- could not grow to seven LLM vendors. 0001 is left in place so existing rows
-- are not destroyed; nothing reads it any more.
--
-- Values are encrypted by the application (AES-256-GCM) BEFORE insert, so this
-- table never contains plaintext credentials. RLS is on with no policies:
-- only the service-role key used by our server routes can touch it.

create table if not exists public.company_provider_keys (
  company_id     text        not null,
  provider       text        not null,
  key_ciphertext text        not null,
  key_last4      text,
  model          text,
  account        text,               -- e.g. the Gmail address the app password belongs to
  connected_at   timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  primary key (company_id, provider)
);

alter table public.company_provider_keys enable row level security;
-- Deliberately no policies. Do NOT grant anon/authenticated access here.

-- Which LLM provider a company is currently using for parsing.
create table if not exists public.company_settings (
  company_id          text primary key,
  active_llm_provider text        not null default 'gemini',
  updated_at          timestamptz not null default now()
);

alter table public.company_settings enable row level security;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists company_provider_keys_updated_at on public.company_provider_keys;
create trigger company_provider_keys_updated_at
  before update on public.company_provider_keys
  for each row execute function public.touch_updated_at();

drop trigger if exists company_settings_updated_at on public.company_settings;
create trigger company_settings_updated_at
  before update on public.company_settings
  for each row execute function public.touch_updated_at();
