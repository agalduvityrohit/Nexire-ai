// Guards the public demo dashboard. Runs automatically before every build
// (package.json "prebuild"), locally and on Vercel — so a deploy that would ship a
// broken or emptied demo fails instead of going live.
//
//   node scripts/verify-demo.mjs [--root <dir>]
//
// The demo has broken three times: emptied by the accounts rewrite, replaced by a
// tiny placeholder set, then hostage to a paused Supabase project. Each check below
// pins one of those down.

import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const rootArg = process.argv.indexOf("--root");
const root = resolve(rootArg > -1 ? process.argv[rootArg + 1] : join(import.meta.dirname, ".."));

// Change these only on purpose, together with a regenerated lib/demoData.json.
const EXPECT = { jobs: 10, candidates: 496, minPerJob: 40 };
const STATUSES = ["applied", "reviewed", "shortlisted", "interview", "rejected"];

const failures = [];
const fail = (msg) => failures.push(msg);
const read = (rel) => (existsSync(join(root, rel)) ? readFileSync(join(root, rel), "utf8") : null);

/* 1. The dataset itself --------------------------------------------------- */
let data = null;
try {
  data = JSON.parse(read("lib/demoData.json") ?? "");
} catch {
  fail("lib/demoData.json is missing or isn't valid JSON — the demo would be empty. Rebuild it: node scripts/build-demo-data.mjs <folder with the résumé PDFs>");
}

if (data) {
  const { jobs = [], candidates = [] } = data;
  if (jobs.length !== EXPECT.jobs) fail(`demo has ${jobs.length} jobs, expected ${EXPECT.jobs}`);
  if (candidates.length !== EXPECT.candidates) fail(`demo has ${candidates.length} candidates, expected ${EXPECT.candidates}`);

  const jobIds = new Set(jobs.map((j) => j.id));
  if (jobIds.size !== jobs.length) fail("duplicate job ids in the demo data");
  if (new Set(candidates.map((c) => c.id)).size !== candidates.length) fail("duplicate candidate ids in the demo data");

  const perJob = new Map();
  for (const c of candidates) {
    if (!jobIds.has(c.jobId)) fail(`candidate ${c.id} points at unknown job ${c.jobId}`);
    perJob.set(c.jobId, (perJob.get(c.jobId) || 0) + 1);
    for (const f of ["name", "email", "role", "headline", "summary"]) if (!c[f]) fail(`candidate ${c.id} is missing "${f}"`);
    if (!STATUSES.includes(c.status)) fail(`candidate ${c.id} has invalid status "${c.status}"`);
    if (!Array.isArray(c.skills) || !c.skills.length) fail(`candidate ${c.id} has no skills`);
    if (typeof c.appliedDaysAgo !== "number") fail(`candidate ${c.id} has no appliedDaysAgo`);
  }
  for (const j of jobs) {
    if ((perJob.get(j.id) || 0) < EXPECT.minPerJob) fail(`job "${j.title}" has only ${perJob.get(j.id) || 0} candidates (min ${EXPECT.minPerJob})`);
    if (!j.title || !Array.isArray(j.stack) || !j.stack.length) fail(`job ${j.id} is missing a title or stack`);
  }
  for (const s of STATUSES) if (!candidates.some((c) => c.status === s)) fail(`no demo candidate is "${s}" — the pipeline would look empty`);
}

/* 2. The demo must stay decoupled from the database ----------------------- */
const store = read("lib/server/dataStore.js");
if (!store) fail("lib/server/dataStore.js is missing");
else {
  if (!/supabaseConfigured\(\)\s*&&\s*companyId\s*!==\s*DEMO_COMPANY_ID/.test(store))
    fail('dataStore.js db() no longer excludes DEMO_COMPANY_ID — the demo would read Supabase again and go empty whenever it is paused. Restore: return supabaseConfigured() && companyId !== DEMO_COMPANY_ID;');
  const guarded = (store.match(/await demoReady\(companyId\)/g) || []).length;
  if (guarded < 10) fail(`only ${guarded} dataStore functions await demoReady(companyId) (expected 10) — a cold server instance could return an empty demo`);
  if (!/loadDemoDataset/.test(store)) fail("dataStore.js no longer seeds the demo from lib/demoDataset.js");
}
const loader = read("lib/demoDataset.js");
if (!loader || !/lib\/demoData\.json/.test(loader)) fail("lib/demoDataset.js doesn't load lib/demoData.json");

const keys = read("app/api/settings/keys/route.js");
if (keys && !/ctx\.demo\s*\?/.test(keys)) fail("settings/keys GET no longer short-circuits for the demo — it would hit Supabase and 500 when the database is down");

/* ----------------------------------------------------------------------- */
if (failures.length) {
  console.error(`\n✖ Demo dashboard check FAILED (${failures.length}):`);
  failures.forEach((f) => console.error("  - " + f));
  console.error("\nNot building: this would ship a broken demo dashboard.\n");
  process.exit(1);
}
console.log(`✔ Demo dashboard check passed — ${data.jobs.length} jobs, ${data.candidates.length} candidates, decoupled from the database.`);
