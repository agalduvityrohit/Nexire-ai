// Session + authorization for API routes.
//
// Accounts live in Supabase Auth (email + password); after a successful login
// we issue our own signed, httpOnly session cookie carrying { user, company,
// role }. Routes call authorize() and use the company id from THERE — never a
// companyId sent by the browser — which is what makes tenants isolated.
//
// Requests with no session are the public demo: they get a sandbox id whose
// data is kept in server memory only (see lib/server/dataStore.js) and never
// touches the database or the platform's API keys.

import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getSessionCheck } from "@/lib/server/companies";
import { logEvent } from "@/lib/server/events";
import { logWarn } from "@/lib/server/logger";
import { rateLimited } from "@/lib/server/rateLimit";
import { serviceClient } from "@/lib/server/supabase";

export const DEMO_COMPANY_ID = "demo-company";
export const PLATFORM_ID = "platform"; // owner of the shared API keys (company_provider_keys rows)
export const SESSION_COOKIE = "nx_session";
const SESSION_DAYS = 7; // absolute cap; re-authentication is required after this regardless of activity

/* ------------------------------------------------------------ signing */

function secret() {
  const raw = process.env.APP_ENCRYPTION_KEY;
  if (!raw) throw new Error("APP_ENCRYPTION_KEY is not set, so sessions can't be signed.");
  return crypto.createHash("sha256").update(`nexire-session:${raw}`).digest();
}

const b64 = (buf) => Buffer.from(buf).toString("base64url");

function sign(payload) {
  const body = b64(JSON.stringify(payload));
  const mac = b64(crypto.createHmac("sha256", secret()).update(body).digest());
  return `${body}.${mac}`;
}

function verify(token) {
  if (!token || typeof token !== "string") return null;
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  const expected = crypto.createHmac("sha256", secret()).update(body).digest();
  const given = Buffer.from(mac, "base64url");
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

/* ----------------------------------------------------------- cookies */

export function attachSession(response, { userId, company }) {
  const token = sign({
    uid: userId,
    cid: company.id,
    role: company.role,
    epoch: company.session_epoch || 1,
    exp: Date.now() + SESSION_DAYS * 86400000,
  });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
  return response;
}

export function clearSession(response) {
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}

/** For server components, which read the cookie via next/headers instead of a Request. */
export function verifySessionToken(token) {
  try {
    return verify(token);
  } catch {
    return null;
  }
}

export function readSession(request) {
  try {
    return verify(request.cookies.get(SESSION_COOKIE)?.value);
  } catch {
    return null; // signing secret missing — treat as signed out
  }
}

/* ------------------------------------------------------------- admin */

// Admin = the database says role "admin" AND the account's email is in ADMIN_EMAILS.
// Two independent checks on purpose: a stray role flip alone, or a leaked allowlist
// entry alone, isn't enough. If ADMIN_EMAILS is unset, nobody is admin (fails closed).
function adminEmails() {
  return (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
}

export function adminEmailAllowed(email) {
  return Boolean(email) && adminEmails().includes(String(email).trim().toLowerCase());
}

/** What role to *show* a user: "admin" only if they'd actually pass the admin gate. */
export function effectiveRole(role, email) {
  return role === "admin" && adminEmailAllowed(email) ? "admin" : "company";
}

/**
 * Full admin check for an already-verified session. Server-side only; the cookie's
 * own role claim is never trusted.
 * @returns {{ ok: true, userId, companyId, email } | { ok: false, reason: string, companyId?: string }}
 *   reason "error" means we couldn't tell (database unreachable) — callers should
 *   surface a server error, not a 404, so an outage isn't mistaken for "no access".
 */
export async function resolveAdmin(session) {
  let check;
  try {
    check = await getSessionCheck(session.cid);
  } catch {
    return { ok: false, reason: "error" };
  }
  if (!check || (check.session_epoch || 1) !== session.epoch) return { ok: false, reason: "revoked" };
  if (check.role !== "admin") return { ok: false, reason: "not_admin", companyId: check.id };
  if (!adminEmails().length) {
    logWarn("auth.admin_allowlist_empty", { note: "ADMIN_EMAILS is not set, so nobody can open /admin" });
    return { ok: false, reason: "no_allowlist", companyId: check.id };
  }
  let email = null;
  try {
    const { data, error } = await serviceClient().auth.admin.getUserById(session.uid);
    if (error) return { ok: false, reason: "error" };
    email = data?.user?.email || null;
  } catch {
    return { ok: false, reason: "error" };
  }
  if (!adminEmailAllowed(email)) return { ok: false, reason: "not_allowlisted", companyId: check.id };
  return { ok: true, userId: session.uid, companyId: check.id, email };
}

/** Records a blocked attempt on /admin (rate-limited so a scanner can't flood the log). */
export async function recordAdminBlocked({ headers, session, reason, companyId = null, path = "/admin" }) {
  const fwd = headers?.get?.("x-forwarded-for") || "unknown";
  if (rateLimited(`admin-blocked:${fwd.split(",")[0].trim()}`, { max: 10, windowMs: 60_000 })) return;
  await logEvent({ type: "admin_blocked", headers, userId: session?.uid || null, companyId: companyId || session?.cid || null, path, meta: { reason } });
}

/* --------------------------------------------------------- authorize */

const fail = (message, status) => NextResponse.json({ error: message }, { status });

/** State-changing requests must come from our own origin (blocks cross-site form posts). */
function originAllowed(request) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return true;
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}

/**
 * @returns {{ ctx: { companyId, userId, role, demo }, error: null } | { ctx: null, error: NextResponse }}
 *  - signed in  -> ctx for that company (any companyId in the request is ignored)
 *  - signed out -> the demo sandbox, unless `login` / `admin` is required
 *  - admin      -> role is re-checked against the database, not just the cookie
 *
 * Every signed-in request does one cheap lookup (id, role, session_epoch) and
 * compares it against the cookie. This is what makes sign-out (and a company
 * getting promoted/demoted) take effect immediately rather than only once the
 * cookie's 7-day expiry passes — a stateless signed cookie can't otherwise be
 * revoked before then.
 */
export async function authorize(request, { login = false, admin = false, quiet = false } = {}) {
  if (!originAllowed(request)) return { ctx: null, error: fail("Cross-origin request blocked.", 403) };

  const session = readSession(request);

  // Admin-only routes answer 404 to everyone who isn't an admin — signed out, a
  // regular company, or an admin not on the allowlist — so they don't reveal
  // that the route exists. `quiet` is for harmless "am I admin?" probes, which
  // must not be logged as attack attempts.
  const notFound = async (reason, companyId) => {
    if (!quiet) await recordAdminBlocked({ headers: request.headers, session, reason, companyId, path: new URL(request.url).pathname });
    return { ctx: null, error: fail("Not found.", 404) };
  };

  if (admin) {
    if (!session) return notFound("signed_out");
    const result = await resolveAdmin(session);
    if (!result.ok) {
      if (result.reason === "error") return { ctx: null, error: fail("Couldn't verify your account.", 500) };
      return notFound(result.reason, result.companyId);
    }
    return { ctx: { companyId: result.companyId, userId: result.userId, role: "admin", demo: false }, error: null };
  }

  if (!session) {
    if (login) return { ctx: null, error: fail("Please sign in.", 401) };
    return { ctx: { companyId: DEMO_COMPANY_ID, userId: null, role: "demo", demo: true }, error: null };
  }

  let check;
  try {
    check = await getSessionCheck(session.cid);
  } catch {
    return { ctx: null, error: fail("Couldn't verify your account.", 500) };
  }
  if (!check || (check.session_epoch || 1) !== session.epoch) {
    // Company deleted, or this token was revoked by a sign-out since it was issued.
    logWarn("auth.revoked_session_used", { companyId: session.cid });
    return { ctx: null, error: clearSession(fail("Your session has ended. Please sign in again.", 401)) };
  }

  return {
    ctx: { companyId: check.id, userId: session.uid, role: check.role, demo: false },
    error: null,
  };
}
