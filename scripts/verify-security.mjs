// Fails the build if the admin / privacy protections get quietly removed.
// Runs before every build (package.json "prebuild"), including on Vercel.
//
//   node scripts/verify-security.mjs [--root <dir>]
//
// These are tripwires, not proof — the real behaviour is exercised by the tests in
// scripts/test-traffic.mjs and the live checks — but each one pins a rule that would
// be easy to break by accident and costly to miss.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const i = process.argv.indexOf("--root");
const root = resolve(i > -1 ? process.argv[i + 1] : join(import.meta.dirname, ".."));
const read = (rel) => (existsSync(join(root, rel)) ? readFileSync(join(root, rel), "utf8") : null);
const failures = [];
const fail = (m) => failures.push(m);

function walk(dir, out = []) {
  const abs = join(root, dir);
  if (!existsSync(abs)) return out;
  for (const name of readdirSync(abs)) {
    const p = join(abs, name);
    if (statSync(p).isDirectory()) walk(join(dir, name), out);
    else if (/\.(js|jsx|mjs)$/.test(name)) out.push(relative(root, p).replaceAll("\\", "/"));
  }
  return out;
}

/* 1. /admin is gated on the server, with a real 404 ------------------------ */
const layout = read("app/admin/(console)/layout.jsx");
if (!layout) fail("app/admin/(console)/layout.jsx is missing");
else {
  if (/^\s*["']use client["']/m.test(layout)) fail('app/admin/(console)/layout.jsx is a client component — the admin gate must run on the server');
  if (!/await\s+requireAdminPage\(\)/.test(layout)) fail("app/admin/(console)/layout.jsx no longer awaits requireAdminPage() — /admin would be open");
}
const gate = read("lib/server/adminGate.js");
if (!gate || !/notFound\(\)/.test(gate) || !/resolveAdmin/.test(gate)) fail("lib/server/adminGate.js must call resolveAdmin() and notFound()");

/* 2. every admin API route is admin-only ------------------------------------ */
for (const f of walk("app/api/admin")) {
  if (!f.endsWith("route.js")) continue;
  if (f === "app/api/admin/login/route.js") continue; // the sign-in door itself: checked separately below
  const src = read(f);
  if (!/authorize\([^)]*admin:\s*true/.test(src)) fail(`${f} doesn't call authorize(request, { admin: true })`);
}
const actions = read("app/admin/(console)/traffic/actions.js");
if (!actions || !/resolveAdmin/.test(actions)) fail("app/admin/(console)/traffic/actions.js (a public endpoint) must re-check resolveAdmin() itself");

// The sign-in door must check the allowlist before logging anyone in, and must never
// hand a session to an account that wouldn't pass the admin gate.
const adminLogin = read("app/api/admin/login/route.js");
if (!adminLogin) fail("app/api/admin/login/route.js is missing");
else {
  if (!/adminEmailAllowed\(email\)/.test(adminLogin)) fail("the admin login no longer checks the ADMIN_EMAILS allowlist");
  if (adminLogin.indexOf("adminEmailAllowed(email)") > adminLogin.indexOf("passwordLogin(request)")) fail("the admin login must check the allowlist BEFORE signing anyone in");
  if (!/role !== "admin"/.test(adminLogin)) fail("the admin login no longer refuses a session to non-admin accounts");
}
if (!read("app/admin/(console)/layout.jsx") || read("app/admin/layout.jsx") == null) fail("app/admin/layout.jsx is missing");
if (read("app/admin/layout.jsx") && /requireAdminPage/.test(read("app/admin/layout.jsx"))) fail("app/admin/layout.jsx must stay gate-free (the gate lives in (console)) so /admin/login can render");

/* 3. the allowlist is real, and fails closed -------------------------------- */
const auth = read("lib/server/auth.js");
if (!auth) fail("lib/server/auth.js is missing");
else {
  if (!/ADMIN_EMAILS/.test(auth)) fail("auth.js no longer reads ADMIN_EMAILS");
  if (!/adminEmails\(\)\.length/.test(auth)) fail("auth.js no longer denies everyone when ADMIN_EMAILS is empty (it must fail closed)");
  if (!/not_allowlisted/.test(auth)) fail("auth.js no longer rejects admins who aren't on the allowlist");
  if (!/Not found\./.test(auth)) fail("auth.js admin failures must answer 404");
}

/* 4. secrets never reach the browser ---------------------------------------- */
const secretNames = ["SUPABASE_SERVICE_ROLE_KEY", "ADMIN_EMAILS", "IP_HASH_SALT", "CRON_SECRET", "APP_ENCRYPTION_KEY"];
for (const f of [...walk("app"), ...walk("components"), ...walk("lib")]) {
  const src = read(f);
  for (const n of secretNames) if (new RegExp(`NEXT_PUBLIC_${n}`).test(src)) fail(`${f} exposes ${n} as NEXT_PUBLIC_`);
  if (/^\s*["']use client["']/m.test(src) && /process\.env\.(SUPABASE_SERVICE_ROLE_KEY|ADMIN_EMAILS|IP_HASH_SALT|CRON_SECRET)/.test(src))
    fail(`${f} is a client component that reads a server-only secret`);
}

/* 5. the purge endpoint can't be called without the secret ------------------ */
const cron = read("app/api/cron/purge-events/route.js");
if (!cron || !/CRON_SECRET/.test(cron) || !/timingSafeEqual/.test(cron)) fail("the purge endpoint must require CRON_SECRET (timing-safe)");
if (!/purge-events/.test(read("vercel.json") || "")) fail("vercel.json no longer schedules /api/cron/purge-events — events would never be purged");

/* 6. privacy: no raw IPs, no passwords in the event log ---------------------- */
const events = read("lib/server/events.js") || "";
const core = read("lib/server/eventsCore.js") || "";
if (/ip:\s*info\.ip|ip_address|raw_ip/.test(events)) fail("events.js appears to store a raw IP");
if (!/ip_hash:\s*hashIp\(/.test(events)) fail("events.js must store ip_hash = hashIp(ip), never the IP");
if (!/if \(!ip \|\| !s\) return null/.test(core)) fail("hashIp() must return null (store nothing) when IP_HASH_SALT is missing");
const loginRoute = read("app/api/auth/login/route.js") || "";
// Flags a `password` VARIABLE going into meta ({ password }, { x, password }, password: x) —
// not the string label method: "password", which just says how someone logged in.
if (/meta:\s*\{(?:[^}]*,)?\s*password\s*[,:}]/.test(loginRoute.replace(/\/\/.*$/gm, ""))) fail("login route may be logging a password into event meta");
if (!/^create table if not exists public\.events/m.test(read("supabase/migrations/0008_events.sql") || "")) fail("migration 0008_events.sql is missing");
if (!/enable row level security/.test(read("supabase/migrations/0008_events.sql") || "") || !/revoke all on public\.events from anon, authenticated/.test(read("supabase/migrations/0008_events.sql") || ""))
  fail("events table must have RLS on and grants to anon/authenticated revoked");

if (failures.length) {
  console.error(`\n✖ Security check FAILED (${failures.length}):`);
  failures.forEach((f) => console.error("  - " + f));
  console.error("\nNot building: a protection the console depends on has been removed.\n");
  process.exit(1);
}
console.log("✔ Security check passed — admin gate, allowlist, secrets, purge endpoint, event-log privacy.");
