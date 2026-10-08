// Inserts clearly-labelled SAMPLE events so the traffic console has something to show
// while you build or demo it. Local use only.
//
//   node scripts/seed-events.mjs --confirm-shared-db            add ~14 days of sample events
//   node scripts/seed-events.mjs --remove --confirm-shared-db   delete every sample event
//
// IMPORTANT: this project has ONE Supabase database, shared by local development and
// production. So this script can't "write somewhere safe" — instead every row it
// inserts is tagged meta.sample = true. The console ignores those rows unless you add
// ?sample=1 to the URL, and --remove deletes exactly those rows and nothing else.
//
// It refuses to run on Vercel or with NODE_ENV=production, and without the explicit
// --confirm-shared-db flag (so it can't be run by accident).

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const args = new Set(process.argv.slice(2));
const die = (msg) => { console.error("✖ " + msg); process.exit(1); };

if (process.env.VERCEL || process.env.VERCEL_ENV || process.env.NODE_ENV === "production" || process.env.CI) {
  die("Refusing to run: this seeds sample data and is for local use only (VERCEL / NODE_ENV=production / CI detected).");
}
if (!args.has("--confirm-shared-db")) {
  die(
    "This writes to the Supabase project in .env.local — which is the SAME database production uses.\n" +
      "  Sample rows are tagged meta.sample=true, hidden from the console by default, and removable with --remove.\n" +
      "  If that's fine, re-run with --confirm-shared-db."
  );
}

// Minimal .env.local loader (no dotenv dependency).
try {
  for (const line of readFileSync(resolve(".env.local"), "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
} catch {
  die("Couldn't read .env.local — run this from the project root.");
}
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) die("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are missing from .env.local.");

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

if (args.has("--remove")) {
  const { count, error } = await db.from("events").delete({ count: "exact" }).eq("meta->>sample", "true");
  if (error) die(error.message);
  console.log(`✔ Removed ${count} sample events (real events untouched).`);
  process.exit(0);
}

/* ---- deterministic pseudo-random, so re-running gives the same shape ---- */
let seed = 20261008;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = (a) => a[Math.floor(rnd() * a.length)];
const hex = (n) => Array.from({ length: n }, () => Math.floor(rnd() * 16).toString(16)).join("");
const uuid = () => `${hex(8)}-${hex(4)}-4${hex(3)}-a${hex(3)}-${hex(12)}`;

const CITIES = [["Bengaluru", "IN"], ["Mumbai", "IN"], ["Pune", "IN"], ["Hyderabad", "IN"], ["Delhi", "IN"], ["Chennai", "IN"], ["London", "GB"], ["Singapore", "SG"], ["Dubai", "AE"], ["Austin", "US"]];
const DEVICES = ["Chrome on Windows", "Chrome on macOS", "Safari on iOS", "Chrome on Android", "Edge on Windows", "Firefox on Linux", "Safari on macOS"];
const PATHS = ["/", "/", "/", "/login", "/signup", "/privacy"];
const COMPANIES = [
  { id: "sample-co-1", user: uuid(), email: "pr***@northwind-sample.test" },
  { id: "sample-co-2", user: uuid(), email: "an***@lumen-sample.test" },
  { id: "sample-co-3", user: uuid(), email: "ma***@kestrel-sample.test" },
];

const DAY = 86400000;
const now = Date.now();
const rows = [];
const add = (event_type, at, o = {}) => {
  const [city, country] = o.geo || pick(CITIES);
  rows.push({
    event_type,
    created_at: new Date(at).toISOString(),
    company_id: o.company?.id ?? null,
    user_id: o.company?.user ?? null,
    path: o.path ?? null,
    ip_hash: o.ip_hash ?? hex(64),
    city, country,
    device: o.device || pick(DEVICES),
    meta: { sample: true, env: "development", label: "SAMPLE DATA — seeded by scripts/seed-events.mjs", ...(o.meta || {}) },
  });
};

for (let d = 13; d >= 0; d--) {
  const dayStart = now - d * DAY;
  const visitors = 8 + Math.floor(rnd() * 34);
  for (let v = 0; v < visitors; v++) {
    const ip = hex(64); // one hash per visitor per day
    const views = 1 + Math.floor(rnd() * 3);
    for (let k = 0; k < views; k++) add("page_view", dayStart - rnd() * DAY * 0.9, { ip_hash: ip, path: pick(PATHS) });
  }
  COMPANIES.forEach((c, i) => {
    if (rnd() < 0.55 - i * 0.12) {
      add("login_success", dayStart - rnd() * DAY * 0.8, { company: c, path: "/login", meta: { method: rnd() < 0.5 ? "otp" : "password" } });
      if (rnd() < 0.5) add("jd_posted", dayStart - rnd() * DAY * 0.7, { company: c, path: "/dashboard/jobs/new" });
      if (rnd() < 0.6) add("resumes_ingested", dayStart - rnd() * DAY * 0.7, { company: c, path: "/dashboard/sourcing", meta: { count: 5 + Math.floor(rnd() * 90), source: "upload" } });
      if (rnd() < 0.3) add("shortlisted", dayStart - rnd() * DAY * 0.6, { company: c, path: "/dashboard/candidates" });
      if (rnd() < 0.2) add("invites_sent", dayStart - rnd() * DAY * 0.6, { company: c, path: "/dashboard/candidates" });
    }
  });
  if (rnd() < 0.35) {
    const c = pick(COMPANIES);
    add("signup", dayStart - rnd() * DAY * 0.5, { company: c, path: "/signup", meta: { method: rnd() < 0.5 ? "otp" : "password", verified: rnd() < 0.5, email_masked: c.email } });
  }
}

// A brute-force burst on one account (6 failures in ~5 minutes from 2 networks) — shows up in the Security panel.
const burst = now - 3 * 3600000;
for (let i = 0; i < 6; i++) add("login_failed", burst + i * 55000, { ip_hash: i % 2 ? "sampleburst-a".padEnd(64, "0") : "sampleburst-b".padEnd(64, "0"), path: "/login", meta: { method: "password", reason: "bad_credentials", account_hash: "sample-account-hash", email_masked: "ad***@sample.test" } });
// A couple of isolated failures, a new-device login and blocked /admin hits.
add("login_failed", now - 9 * 3600000, { path: "/login", meta: { method: "otp", reason: "wrong_code", account_hash: "sample-account-2", email_masked: "jo***@sample.test" } });
add("new_device_login", now - 5 * 3600000, { company: COMPANIES[1], path: "/login", device: "Safari on iOS", meta: { method: "password", email_masked: COMPANIES[1].email } });
add("admin_blocked", now - 2 * 3600000, { path: "/admin", meta: { reason: "signed_out" } });
add("admin_blocked", now - 26 * 3600000, { company: COMPANIES[2], path: "/admin", meta: { reason: "not_admin" } });

for (let i = 0; i < rows.length; i += 200) {
  const { error } = await db.from("events").insert(rows.slice(i, i + 200));
  if (error) die(`Insert failed: ${error.message}${/relation .*events/.test(error.message) ? "\n  Apply supabase/migrations/0008_events.sql first." : ""}`);
}
console.log(`✔ Inserted ${rows.length} sample events (tagged meta.sample=true). View them at /admin/traffic?sample=1`);
console.log("  Remove them any time with: node scripts/seed-events.mjs --remove --confirm-shared-db");
