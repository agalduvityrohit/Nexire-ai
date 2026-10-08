// Pure helpers for the visitor/usage event log — no database, no network, so they
// can be unit-tested (scripts/test-traffic.mjs).
//
// Privacy rules enforced here:
//   - never store a raw IP: ip_hash = SHA-256(ip | IP_HASH_SALT | UTC date), so the
//     same visitor hashes differently each day and can't be tracked across days
//   - if IP_HASH_SALT isn't set we store NO hash rather than fall back to a
//     guessable constant
//   - emails are only ever stored masked (first 2 chars + ***@domain) or as a keyed hash

import crypto from "node:crypto";

const salt = () => process.env.IP_HASH_SALT || "";

export function dayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

export function hashIp(ip, now = new Date()) {
  const s = salt();
  if (!ip || !s) return null;
  return crypto.createHash("sha256").update(`${ip}|${s}|${dayKey(now)}`).digest("hex");
}

/** Stable (non-rotating) keyed hash, so repeated failed logins on one account group together. */
export function accountHash(email) {
  const s = salt();
  if (!s || !email) return null;
  return crypto.createHmac("sha256", s).update(String(email).trim().toLowerCase()).digest("hex").slice(0, 32);
}

export function maskEmail(email) {
  const [local, domain] = String(email || "").trim().split("@");
  if (!local || !domain) return null;
  return `${local.slice(0, 2)}***@${domain.toLowerCase()}`;
}

const BOT_RE =
  /bot|crawl|spider|slurp|scrape|fetch|monitor|uptime|pingdom|lighthouse|headless|preview|facebookexternalhit|whatsapp|telegram|discord|curl|wget|python-requests|httpclient|go-http|java\/|axios|node-fetch|vercel|checkly|datadog|newrelic/i;

export function isBot(ua) {
  return !ua || BOT_RE.test(ua);
}

export function parseDevice(ua = "") {
  if (!ua) return null;
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\/|Opera/.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox"
    : /Chrome\/|CriOS\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Other";
  const os = /iPhone|iPad|iPod/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows"
    : /Mac OS X|Macintosh/.test(ua) ? "macOS" : /CrOS/.test(ua) ? "ChromeOS" : /Linux/.test(ua) ? "Linux" : "Other";
  return `${browser} on ${os}`;
}

function safeDecode(v) {
  if (!v) return null;
  try {
    return decodeURIComponent(v).slice(0, 80) || null;
  } catch {
    return String(v).slice(0, 80);
  }
}

/** Works with a Request's headers or the object next/headers returns. */
export function clientInfo(headers) {
  const get = (k) => headers?.get?.(k) || null;
  const fwd = get("x-forwarded-for");
  const ip = (fwd ? fwd.split(",")[0].trim() : get("x-real-ip")) || null;
  const ua = get("user-agent") || "";
  return {
    ip,
    ua,
    city: safeDecode(get("x-vercel-ip-city")),
    country: (get("x-vercel-ip-country") || "").slice(0, 2).toUpperCase() || null,
    device: parseDevice(ua),
    bot: isBot(ua),
    dnt: get("dnt") === "1" || get("sec-gpc") === "1",
  };
}

/** Normalises a client-reported path; returns null for anything we shouldn't count. */
export function trackablePath(raw) {
  if (typeof raw !== "string") return null;
  let p = raw.split("#")[0].split("?")[0].trim();
  if (!p.startsWith("/") || p.startsWith("//") || p.length > 200) return null;
  if (/^\/(admin|api|_next)(\/|$)/.test(p)) return null;
  if (/\.[a-z0-9]{1,6}$/i.test(p.split("/").pop() || "")) return null; // static asset
  if (p.length > 1) p = p.replace(/\/+$/, "");
  // Don't let per-record ids fragment the numbers: /schedule/<token> and /dashboard/jobs/<id>.
  p = p.replace(/^\/schedule\/[^/]+$/, "/schedule/[token]");
  return p;
}
