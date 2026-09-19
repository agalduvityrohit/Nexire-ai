-- Nexire AI — per-company API key storage.
--
-- Values are encrypted by the application (AES-256-GCM) BEFORE insert, so this
-- table never contains plaintext credentials. RLS is enabled with no policies,
-- which means the anon/authenticated keys cannot read or write it at all —
-- only the service-role key used by our server routes can.

create table if not exists public.company_api_keys (
  company_id              text primary key,

  github_token_ciphertext text,
  github_token_last4      text,
  github_connected_at     timestamptz,

  gemini_key_ciphertext   text,
  gemini_key_last4        text,
  gemini_connected_at     timestamptz,

  updated_at              timestamptz not null default now()
);

alter table public.company_api_keys enable row level security;

-- Deliberately no policies: service role bypasses RLS, everyone else is denied.
-- Do NOT add a policy granting anon/authenticated access to this table.

create or replace function public.touch_company_api_keys_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists company_api_keys_updated_at on public.company_api_keys;
create trigger company_api_keys_updated_at
  before update on public.company_api_keys
  for each row execute function public.touch_company_api_keys_updated_at();
