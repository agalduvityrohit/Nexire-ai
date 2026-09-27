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
import { logWarn } from "@/lib/server/logger";

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

export function readSession(request) {
  try {
    return verify(request.cookies.get(SESSION_COOKIE)?.value);
  } catch {
    return null; // signing secret missing — treat as signed out
  }
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
export async function authorize(request, { login = false, admin = false } = {}) {
  if (!originAllowed(request)) return { ctx: null, error: fail("Cross-origin request blocked.", 403) };

  const session = readSession(request);

  if (!session) {
    if (login || admin) return { ctx: null, error: fail("Please sign in.", 401) };
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

  if (admin && check.role !== "admin") return { ctx: null, error: fail("Admins only.", 403) };

  return {
    ctx: { companyId: check.id, userId: session.uid, role: check.role, demo: false },
    error: null,
  };
}
