import { NextResponse } from "next/server";
import { attachSession, authorize, effectiveRole } from "@/lib/server/auth";
import { getCompanyByUser, recordLogin } from "@/lib/server/companies";
import { isNewDevice, logEvent } from "@/lib/server/events";
import { accountHash, clientInfo, maskEmail } from "@/lib/server/eventsCore";
import { clientIp, rateLimited } from "@/lib/server/rateLimit";
import { serviceClient, supabaseConfigured } from "@/lib/server/supabase";
import { logInfo, logWarn, serverError } from "@/lib/server/logger";

export const runtime = "nodejs";

// Supabase says "wrong password" with a 4xx (invalid_credentials); anything else —
// network failure, paused project, 5xx — means we couldn't check at all.
function isOutage(error) {
  if (!error) return false;
  return error.name === "AuthRetryableFetchError" || !error.status || error.status >= 500;
}

export async function POST(request) {
  const { error: originError } = await authorize(request);
  if (originError) return originError;

  if (!supabaseConfigured()) {
    return NextResponse.json({ error: "Accounts aren't available — the database isn't configured." }, { status: 503 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const email = String(body?.email || "").trim().toLowerCase();
  const password = String(body?.password || "");
  if (!email || !password) return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });

  // Only a masked email and a keyed hash are ever stored — never the password, never the raw address.
  const failedMeta = (reason) => ({ method: "password", reason, account_hash: accountHash(email), email_masked: maskEmail(email) });

  // Throttle per network AND per account, so one address can't be brute-forced from many IPs.
  const ip = clientIp(request);
  if (
    rateLimited(`login-ip:${ip}`, { max: 20, windowMs: 900_000 }) ||
    rateLimited(`login-acct:${email}`, { max: 8, windowMs: 900_000 })
  ) {
    logWarn("auth.login_rate_limited", { ip, email });
    await logEvent({ type: "login_failed", headers: request.headers, path: "/login", meta: failedMeta("rate_limited") });
    return NextResponse.json({ error: "Too many attempts. Wait a few minutes and try again." }, { status: 429 });
  }

  const { data, error } = await serviceClient().auth.signInWithPassword({ email, password });
  if (error || !data?.user) {
    if (isOutage(error)) {
      // Not a failed login — don't count it, or an outage would look like an attack.
      logWarn("auth.login_unavailable", { ip, message: error?.message });
      return NextResponse.json({ error: "Sign-in is temporarily unavailable. Please try again in a few minutes." }, { status: 503 });
    }
    logWarn("auth.login_failed", { ip, email });
    await logEvent({ type: "login_failed", headers: request.headers, path: "/login", meta: failedMeta("bad_credentials") });
    // Same message for "no such user" and "wrong password" — don't reveal which emails exist.
    return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
  }
  logInfo("auth.login_succeeded", { ip, companyUser: data.user.id });

  let company;
  try {
    company = await getCompanyByUser(data.user.id);
  } catch (e) {
    return NextResponse.json({ error: serverError("auth/login", e) }, { status: 500 });
  }
  if (!company) {
    return NextResponse.json({ error: "This login has no company attached. Contact support." }, { status: 403 });
  }

  await recordLogin(company).catch(() => {});

  // Compare against past logins BEFORE recording this one.
  const device = clientInfo(request.headers).device;
  const newDevice = await isNewDevice(data.user.id, device);
  const base = { headers: request.headers, companyId: company.id, userId: data.user.id, path: "/login" };
  await logEvent({ ...base, type: "login_success", meta: { method: "password" } });
  if (newDevice) await logEvent({ ...base, type: "new_device_login", meta: { method: "password", email_masked: maskEmail(email) } });

  const response = NextResponse.json({
    user: { email, name: data.user.user_metadata?.name || "" },
    company: { id: company.id, name: company.name, role: effectiveRole(company.role, email) },
  });
  return attachSession(response, { userId: data.user.id, company });
}
