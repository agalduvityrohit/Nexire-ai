# Nexire AI — integrations setup

What is real, what is mock, and what you need to supply.

## What's real

| Piece | Status |
| --- | --- |
| Bulk résumé upload → parse → role classification | **Real.** Any connected provider. |
| Multi-provider LLM routing (8 vendors) | **Real.** Verified against each live API. |
| PDF / DOCX / TXT text extraction | **Real.** |
| Batch de-duplication | **Real.** Deterministic, no API needed. |
| Gmail résumé ingestion (IMAP) | **Real.** Needs an App Password. |
| Credential storage + Test Connection | **Real.** AES-256-GCM, Supabase-backed. |
| Job / candidate persistence | **Real.** Supabase-backed, survives a refresh. |
| Résumé parse cache | **Real.** A byte-identical file skips the model call on re-upload. |
| Interviewer dashboard | **Mock.** Layout + status model only. |
| Email / Call dashboards | **Mock.** Layout + status model only. |
| Landing outreach section | **Copy/visual only.** |

## Supported model providers

Connect any of these in **Settings → API Connections**, then pick one as the
active parsing engine. Everything downstream uses it.

| Provider | Wire format | PDFs |
| --- | --- | --- |
| Google Gemini | native | sent natively |
| Anthropic (Claude) | native | sent natively |
| OpenAI | chat/completions | text extracted locally |
| Groq | chat/completions | text extracted locally |
| Cerebras | chat/completions | text extracted locally |
| Mistral | chat/completions | text extracted locally |
| OpenRouter | chat/completions | text extracted locally |
| NVIDIA NIM | chat/completions | text extracted locally |

**Model ids drift.** Every default is editable per provider in the UI. If a
provider rejects the id, its own error is shown verbatim so you know to change
it rather than guess.

## Setup

1. `cp .env.example .env.local`
2. Generate the encryption key:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```
   Put it in `APP_ENCRYPTION_KEY`. **Losing it makes stored credentials unrecoverable.**
3. Create a Supabase project and run `supabase/migrations/0002_provider_keys.sql`.
4. Add the project URL and the **service role** key to `.env.local`.
5. Open **Settings → API Connections**, add a key for any provider, hit **Test connection**,
   then select it as the active engine.

Skip 3–4 and the app still runs — credentials live in server memory and the settings screen says so.

## Gmail ingestion

Uses **IMAP with an App Password**, not OAuth.

1. Turn on 2-Step Verification on the Google account.
2. Create an App Password at **myaccount.google.com/apppasswords**.
3. In Settings → API Connections → Gmail, enter the address and the 16-character password.
4. **Test connection** confirms login and reports the inbox message count.
5. Bulk upload → **Import from Gmail** → set mailbox, sender filter, look-back window, cap → run.

Attachments (`.pdf`, `.docx`, `.txt`) go through the identical parse pipeline as manual uploads.

**Why not OAuth:** an App Password needs no Cloud project, consent screen, redirect URI, or
token refresh, so it is testable immediately. For a multi-tenant product you want OAuth 2.0
with the `gmail.readonly` scope instead — App Passwords are per-user, can't be scoped down,
and many Workspace admins disable them. Only `lib/server/gmail.js` needs replacing; everything
downstream takes buffers.

## Degraded modes (each says so in the UI)

- **No `APP_ENCRYPTION_KEY`** → saving credentials is refused with a 503.
- **No Supabase** → credentials live in process memory, cleared on restart.
- **No LLM key** → bulk upload falls back to a keyword heuristic, labelled
  "not a real classification". PDFs still get text-extracted locally, so it
  produces something usable — but it is not a real classification.

## File support

| Format | Support |
| --- | --- |
| `.pdf` | Text extracted locally; sent natively to Gemini/Claude. Scanned PDFs need those two. |
| `.docx` | Text extracted with `mammoth`. |
| `.txt` / `.md` | Read directly. |
| `.doc` | **Not supported.** Re-save as `.docx`. |

## Things to fix before production

1. **Authentication.** `/api/settings/*` and `/api/resumes/*` are unauthenticated — they trust
   the `companyId` in the request. Anyone who can reach the server can read another company's
   masked credential status, spend their LLM quota, or trigger a Gmail scan. Put these behind
   real auth and derive `companyId` from a verified session.
2. **Rate limits and cost.** 100 résumés is 100 LLM calls, 3 at a time. 429/503 responses are
   retried with exponential backoff (honoring `Retry-After` when the provider sends one, up to
   5 attempts), so a mid-batch quota hit slows down rather than fails the file. Still no spend
   cap — a provider with a very low per-minute quota (e.g. a free tier) will still take a while
   to work through a large batch.
3. **Gmail at scale.** IMAP fetch is sequential and holds a connection for the whole scan.
   Fine for a few hundred messages; use the Gmail API with pagination beyond that.
4. **TRAI compliance before any real calling.** Automated/bulk voice calls in India fall under
   TCCCPR: consent capture, DLT registration, DND scrubbing, permitted calling windows. Legal
   review, not just a Twilio account.

## Where things live

```
lib/providers.js          provider registry (shared client/server)
lib/roles.js              the fixed role list
lib/dedupe.js             batch de-duplication (isomorphic)
lib/server/crypto.js      AES-256-GCM encrypt/decrypt
lib/server/keystore.js    per-company, per-provider credential storage
lib/server/llm.js         one interface over all 7 providers
lib/server/extract.js     PDF/DOCX/TXT handling
lib/server/pipeline.js    shared extract → parse → classify
lib/server/gmail.js       IMAP ingestion
lib/server/heuristic.js   no-key fallback classifier
app/api/settings/keys/    save / read masked / delete / set active
app/api/settings/keys/test/  real connection tests
app/api/resumes/parse/    bulk upload
app/api/resumes/gmail/    Gmail import
supabase/migrations/      0002 is current; 0001 is superseded
```

## Note on `next.config.mjs`

`pdf-parse`, `imapflow` and `mammoth` are listed in `serverExternalPackages`. They break when
webpack inlines them (dynamic pdfjs workers, raw TLS sockets, bundled resources). Removing that
line silently breaks PDF extraction — the catch returns empty text rather than throwing.
