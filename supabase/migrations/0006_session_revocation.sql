-- Real server-side session invalidation.
--
-- Session cookies are a signed, stateless token (see lib/server/auth.js) — fast
-- to verify, but on its own a stateless token can't be revoked before it
-- expires. This column closes that gap: every session carries the epoch that
-- was current when it was issued, and authorize() rejects any token whose
-- epoch doesn't match the row. Sign-out, and any other "kill this company's
-- sessions" action, is just bumping the number.

alter table public.companies
  add column if not exists session_epoch integer not null default 1;
