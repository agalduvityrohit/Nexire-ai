// Unit tests for the traffic console's pure logic (no database needed):
//   node scripts/test-traffic.mjs
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tmp = mkdtempSync(join(tmpdir(), "nx-traffic-"));
for (const f of ["eventsCore", "trafficMath"]) writeFileSync(join(tmp, f + ".mjs"), readFileSync(join(root, `lib/server/${f}.js`), "utf8"));
const core = await import(pathToFileURL(join(tmp, "eventsCore.mjs")).href);
const math = await import(pathToFileURL(join(tmp, "trafficMath.mjs")).href);

let passed = 0;
const test = (name, fn) => { try { fn(); passed++; console.log("  ✔", name); } catch (e) { console.error("  ✖", name, "\n     ", e.message); process.exitCode = 1; } };

console.log("privacy");
delete process.env.IP_HASH_SALT;
test("no salt -> no IP hash is stored (never a guessable fallback)", () => assert.equal(core.hashIp("1.2.3.4"), null));
process.env.IP_HASH_SALT = "test-salt";
const d1 = new Date("2026-10-08T10:00:00Z"), d2 = new Date("2026-10-09T10:00:00Z");
test("hash is SHA-256 hex and never contains the IP", () => { const h = core.hashIp("203.0.113.9", d1); assert.match(h, /^[0-9a-f]{64}$/); assert.ok(!h.includes("203")); });
test("same visitor, same day -> same hash", () => assert.equal(core.hashIp("1.2.3.4", d1), core.hashIp("1.2.3.4", new Date("2026-10-08T23:59:00Z"))));
test("same visitor, next day -> different hash (can't be tracked across days)", () => assert.notEqual(core.hashIp("1.2.3.4", d1), core.hashIp("1.2.3.4", d2)));
test("different visitors -> different hashes", () => assert.notEqual(core.hashIp("1.2.3.4", d1), core.hashIp("1.2.3.5", d1)));
test("account hash is stable, case-insensitive and keyed", () => { assert.equal(core.accountHash("A@b.com"), core.accountHash(" a@B.com ")); assert.notEqual(core.accountHash("a@b.com"), core.accountHash("c@b.com")); });
test("emails are masked to 2 chars + ***@domain", () => { assert.equal(core.maskEmail("rohit@gmail.com"), "ro***@gmail.com"); assert.equal(core.maskEmail("a@x.io"), "a***@x.io"); assert.equal(core.maskEmail("nonsense"), null); });

console.log("request parsing");
const CHROME_WIN = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const SAFARI_IOS = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
test("device: Chrome on Windows", () => assert.equal(core.parseDevice(CHROME_WIN), "Chrome on Windows"));
test("device: Safari on iOS", () => assert.equal(core.parseDevice(SAFARI_IOS), "Safari on iOS"));
test("device: Edge, Firefox, Android", () => {
  assert.equal(core.parseDevice(CHROME_WIN + " Edg/126.0"), "Edge on Windows");
  assert.equal(core.parseDevice("Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0"), "Firefox on Linux");
  assert.equal(core.parseDevice("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36"), "Chrome on Android");
});
test("bots are detected, real browsers are not", () => {
  for (const ua of ["Googlebot/2.1", "curl/8.4", "Mozilla/5.0 (compatible; AhrefsBot/7.0)", "python-requests/2.31", "Slackbot-LinkExpanding", "Mozilla/5.0 HeadlessChrome/126", "", "vercel-screenshot/1.0"]) assert.ok(core.isBot(ua), ua);
  for (const ua of [CHROME_WIN, SAFARI_IOS]) assert.ok(!core.isBot(ua), ua);
});
test("clientInfo: first forwarded IP, URL-encoded city, DNT/GPC", () => {
  const h = new Map([["x-forwarded-for", "198.51.100.7, 10.0.0.1"], ["x-vercel-ip-city", "S%C3%A3o%20Paulo"], ["x-vercel-ip-country", "br"], ["user-agent", CHROME_WIN], ["sec-gpc", "1"]]);
  const i = core.clientInfo({ get: (k) => h.get(k) });
  assert.equal(i.ip, "198.51.100.7"); assert.equal(i.city, "São Paulo"); assert.equal(i.country, "BR"); assert.equal(i.bot, false); assert.equal(i.dnt, true);
});
test("tracked paths: pages yes; /admin, /api, assets, junk no", () => {
  assert.equal(core.trackablePath("/"), "/");
  assert.equal(core.trackablePath("/login?x=1#top"), "/login");
  assert.equal(core.trackablePath("/dashboard/jobs/"), "/dashboard/jobs");
  assert.equal(core.trackablePath("/schedule/abcDEF123"), "/schedule/[token]");
  for (const p of ["/admin", "/admin/traffic", "/api/jobs", "/_next/static/x.js", "/favicon.ico", "/logo.png", "//evil.com", "javascript:1", 42, null, "/" + "a".repeat(250)]) assert.equal(core.trackablePath(p), null, String(p));
});

console.log("aggregation");
const NOW = new Date("2026-10-08T12:00:00Z");
const ev = (type, iso, o = {}) => ({ event_type: type, created_at: iso, ...o });
test("day list is UTC, oldest first, ends today", () => { const l = math.dayList(3, NOW); assert.deepEqual(l, ["2026-10-06", "2026-10-07", "2026-10-08"]); });
test("visitors = distinct IP hashes per day; logins = distinct users per day", () => {
  const events = [
    ev("page_view", "2026-10-08T01:00:00Z", { ip_hash: "a" }), ev("page_view", "2026-10-08T02:00:00Z", { ip_hash: "a" }), ev("page_view", "2026-10-08T03:00:00Z", { ip_hash: "b" }),
    ev("page_view", "2026-10-07T03:00:00Z", { ip_hash: "a" }), ev("page_view", "2026-10-07T04:00:00Z", { ip_hash: null }),
    ev("login_success", "2026-10-08T05:00:00Z", { user_id: "u1" }), ev("login_success", "2026-10-08T06:00:00Z", { user_id: "u1" }), ev("login_success", "2026-10-08T07:00:00Z", { user_id: "u2" }),
  ];
  const s = math.buildSeries(events, 3, NOW);
  assert.deepEqual(s, [{ day: "2026-10-06", visitors: 0, logins: 0 }, { day: "2026-10-07", visitors: 1, logins: 0 }, { day: "2026-10-08", visitors: 2, logins: 2 }]);
});
test("summary: signup % of visitors, distinct login users, 7-day active, failed logins", () => {
  const events = [ev("signup", "2026-10-08T01:00:00Z"), ev("login_success", "2026-10-08T01:00:00Z", { user_id: "u1" }), ev("login_success", "2026-10-07T01:00:00Z", { user_id: "u1" }), ev("login_failed", "2026-10-08T01:00:00Z")];
  const series = [{ day: "x", visitors: 40, logins: 1 }];
  const companies = [{ lastLoginAt: "2026-10-07T00:00:00Z" }, { lastLoginAt: "2026-09-01T00:00:00Z" }, { lastLoginAt: null }];
  const s = math.summarize(events, series, companies, NOW);
  assert.deepEqual(s, { visitors: 40, signups: 1, signupRate: 0.025, logins: 1, activeCompanies7d: 1, failedLogins: 1 });
  assert.equal(math.summarize([], [{ visitors: 0 }], [], NOW).signupRate, null);
});
test("funnel: % of the previous step, guards divide-by-zero", () => {
  const f = math.funnel([{ label: "a", count: 10 }, { label: "b", count: 5 }, { label: "c", count: 0 }, { label: "d", count: 0 }]);
  assert.deepEqual(f.map((x) => x.pct), [null, 0.5, 0, null]);
});
test("company status: Active / Quiet N days / Never logged in", () => {
  assert.deepEqual(math.companyStatus("2026-10-07T00:00:00Z", NOW), { label: "Active", tone: "success" });
  assert.equal(math.companyStatus("2026-09-28T12:00:00Z", NOW).label, "Quiet 10 days");
  assert.equal(math.companyStatus(null, NOW).label, "Never logged in");
});
const fails = (n, startMin, stepMin, acct = "h1") => Array.from({ length: n }, (_, i) => ev("login_failed", new Date(Date.UTC(2026, 9, 8, 10, startMin + i * stepMin)).toISOString(), { ip_hash: "ip" + (i % 2), meta: { account_hash: acct, email_masked: "ro***@x.com" } }));
test("brute force: 5 failures within 10 minutes is flagged", () => { const r = math.detectBruteForce(fails(5, 0, 2)); assert.equal(r.length, 1); assert.equal(r[0].attempts, 5); assert.equal(r[0].account, "ro***@x.com"); assert.equal(r[0].ips, 2); });
test("brute force: 4 failures, or 5 spread over 40 minutes, is NOT flagged", () => { assert.equal(math.detectBruteForce(fails(4, 0, 1)).length, 0); assert.equal(math.detectBruteForce(fails(5, 0, 10)).length, 0); });
test("brute force: failures on different accounts aren't pooled", () => assert.equal(math.detectBruteForce([...fails(3, 0, 1, "a"), ...fails(3, 0, 1, "b")]).length, 0));
test("brute force: finds the bad burst inside a longer quiet history", () => { const r = math.detectBruteForce([...fails(2, 0, 30), ...fails(6, 120, 1)]); assert.equal(r[0].attempts, 6); });

console.log(`\n${passed} passed${process.exitCode ? " — SOME FAILED" : ""}`);
