# Nexire AI — UI prototype

A click-through interface prototype for Nexire AI. **Every screen is structure and design only** — no
authentication, no database, no APIs, no file uploads, no AI. All content comes from hardcoded mock data in
[`lib/mock-data.js`](lib/mock-data.js).

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Stack

- Next.js 15 (App Router) + React 19
- Tailwind CSS v4 — design tokens live in [`app/globals.css`](app/globals.css) under `@theme`
- Framer Motion for transitions, the Kanban drag, and scroll reveals
- No other runtime dependencies; icons are hand-rolled SVG in [`components/ui/Icons.jsx`](components/ui/Icons.jsx)

## Scope: employer-only

This prototype covers the **employer journey only**. All candidate-facing screens (public job listings, the
application and consent flow, and the AI interview screens) have been removed for now. The candidate report
survives only as something HR reads *inside* the dashboard.

```
/  →  /login  ──┬─ "setting up a new company" ─────────────────→ /dashboard
                └─ "joining an existing company" ─→ /join ─────→ /dashboard
```

## Screens

### Entry

| Route | Screen |
| --- | --- |
| `/` | Landing page — hero, "What we do" (4 plain-language steps), one CTA |
| `/login` | Single sign-in / sign-up screen. Email + password (mock), then a choice between setting up a new company or joining an existing one |
| `/join` | Company + role selection on one screen — search the mock company list, pick Recruiter / Hiring Manager / Interviewer / Admin |

### Employer dashboard

| Route | Screen |
| --- | --- |
| `/dashboard` | Overview — stat cards, candidate table with tabs, triage rail, pipeline snapshot |
| `/dashboard/jobs` | Job list with pipeline breakdowns |
| `/dashboard/jobs/new` | Job posting form with live preview → mock "Job posted" confirmation |
| `/dashboard/jobs/[id]` | Job detail with three tabs: **Pipeline** (Kanban), **Candidates**, **Job details** |
| `/dashboard/candidates` | All candidates, searchable and filterable |
| `/dashboard/candidates/[id]` | Candidate detail — parsed résumé, status buttons, activity timeline |
| `/dashboard/candidates/[id]/report` | AI interview report HR reads — verdict, strengths, gaps, radar, transcript evidence |
| `/dashboard/settings` | Workspace, team, screening, sources, notifications, billing |

## What is interactive

State lives in a single in-memory React context ([`lib/store.jsx`](lib/store.jsx)) and **resets on refresh** —
there is no persistence by design, including the mock session.

- **Login branching** → "new company" reveals a company-name field and goes straight to the dashboard;
  "existing company" routes through `/join`
- **Company + role selection** → carried into the dashboard sidebar
- **Post a job** → added to the jobs list and sidebar for the session
- **Kanban board** → drag cards between columns, or use the arrows that appear on card hover
- **Candidate status** → Reviewed / Shortlisted / Rejected update the table, board, and stat counts

## Design tokens

Defined once in `@theme` and used as Tailwind utilities (`bg-canvas`, `text-ink`, `border-line`,
`bg-primary`, `text-accent`, …):

- Canvas `#faf9f7` warm off-white, surfaces pure white
- Primary deep teal `#0e5c54`, warm terracotta accent `#dd6338` for CTAs
- Inter via `next/font`, tight negative tracking on headings
- Status tones: info / success / warn / danger / violet, each with a soft background pair

Fully responsive at 375px and up; every screen was checked for horizontal overflow at mobile and tablet
widths.

## Not built yet

The AI interviewer (Arjun), automated calling, open-market and GitHub sourcing at scale, a candidate
consent / data-rights flow, and per-company retention settings are not live — the site marks them
"Coming soon". Accounts, résumé import, screening, shortlist emails and interview scheduling are real.

## The public demo dashboard — read before touching it

The no-signup demo (10 jobs, 496 candidates) is **static data that ships with the app**.
It must never depend on Supabase: a free Supabase project pauses itself after about a
week of inactivity, and when the demo read from it, the demo went empty.

- **Data:** `lib/demoData.json`, loaded into server memory by `lib/demoDataset.js` and
  seeded in `lib/server/dataStore.js` (`seedDemoOnce`). Dates are stored as offsets, so
  they never go stale.
- **Rebuild it** from the 500 sample résumé PDFs + manifest:
  `node scripts/build-demo-data.mjs "<folder with the PDFs and resumes_500_manifest.csv>"`
- **Never** change `db()` in `dataStore.js` so the demo (`DEMO_COMPANY_ID`) reads the
  database, and never remove an `await demoReady(companyId)`.
- **Guarded automatically:** `scripts/verify-demo.mjs` runs before every build (including
  on Vercel) and fails the build if the dataset is wrong or the demo is coupled to the
  database again. Run it any time with `npm run check:demo`.
- **After every deploy** run `npm run check:live` — it asks the live site for the demo and
  fails if it isn't exactly 10 jobs / 496 candidates.
- Edits a visitor makes in the demo live in memory and reset when the server instance
  recycles — that is intentional.

Real accounts (UUID company ids) use Supabase. If it's paused, sign-in and real dashboards
are down until it's restored, but the demo is unaffected.
