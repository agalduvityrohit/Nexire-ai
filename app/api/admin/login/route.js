// The admin door: email + password sign-in that only ever succeeds for an allow-listed
// admin. It reuses the normal password login (same throttling, same outage handling,
// same session cookie) but checks the allowlist FIRST and refuses to issue a session to
// anyone who wouldn't pass the admin gate — so this page can't be used to probe which
// customers exist, and a customer password can't open the console.

import { NextResponse } from "next/server";
import { POST as passwordLogin } from "@/app/api/auth/login/route";
import { adminEmailAllowed, authorize } from "@/lib/server/auth";
import { logEvent } from "@/lib/server/events";
import { accountHash, maskEmail } from "@/lib/server/eventsCore";
import { clientIp, rateLimited } from "@/lib/server/rateLimit";

export const runtime = "nodejs";

const WRONG = "Incorrect email or password.";

export async function POST(request) {
  const { error: originError } = await authorize(request);
  if (originError) return originError;

  let email = "";
  try {
    email = String((await request.clone().json())?.email || "").trim().toLowerCase();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const deny = async (reason) => {
    await logEvent({ type: "admin_blocked", headers: request.headers, path: "/admin/login", meta: { reason, email_masked: maskEmail(email), account_hash: accountHash(email) } });
    return NextResponse.json({ error: WRONG }, { status: 401 });
  };

  if (rateLimited(`admin-login:${clientIp(request)}`, { max: 10, windowMs: 900_000 })) {
    return NextResponse.json({ error: "Too many attempts. Wait a few minutes and try again." }, { status: 429 });
  }
  if (!adminEmailAllowed(email)) return deny("login_not_allowlisted");

  const res = await passwordLogin(request); // body is still unread: we only read a clone above
  if (res.status !== 200) return res; // wrong password / outage / throttled — its message is already generic

  // Signed in. Only hand over the session if this account really is an admin (DB role + allowlist).
  const json = await res.clone().json().catch(() => null);
  if (json?.company?.role !== "admin") return deny("login_not_admin_role");
  return res;
}
