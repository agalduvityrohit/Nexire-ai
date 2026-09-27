// Step 2 of passwordless sign-up/sign-in: spend the code.
//
// An existing email logs straight in. A new email needs a company name and
// creates the account — same effect as /api/auth/signup, just reached via a
// code instead of typing a password. Either way the client then gets a normal
// session; a brand-new account still has a random, never-typed password until
// it visits /api/auth/set-password.

import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { attachSession, authorize } from "@/lib/server/auth";
import { createCompany, findAuthUserByEmail, getCompanyByUser, recordLogin } from "@/lib/server/companies";
import { verifyCode } from "@/lib/server/otp";
import { clientIp, rateLimited } from "@/lib/server/rateLimit";
import { serviceClient, supabaseConfigured } from "@/lib/server/supabase";
import { logInfo, logWarn, serverError } from "@/lib/server/logger";

export const runtime = "nodejs";

const REASON_MESSAGE = {
  no_code: "That code has expired or was never requested. Ask for a new one.",
  expired: "That code has expired. Ask for a new one.",
  too_many_attempts: "Too many wrong attempts. Ask for a new code.",
  wrong_code: "That code isn't right. Check it and try again.",
};

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

  const email = String(body?.email || "").trim().toLowerCase().slice(0, 254);
  const code = String(body?.code || "").trim();
  const companyName = String(body?.companyName || "").trim().slice(0, 120);
  const name = String(body?.name || "").trim().slice(0, 120);
  if (!email || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "Enter the 6-digit code." }, { status: 400 });
  }

  const ip = clientIp(request);
  if (rateLimited(`otp-verify:${email}`, { max: 10, windowMs: 900_000 })) {
    logWarn("auth.otp_verify_rate_limited", { ip, email });
    return NextResponse.json({ error: "Too many attempts. Wait a few minutes and try again." }, { status: 429 });
  }

  let verdict;
  try {
    verdict = await verifyCode(email, code);
  } catch (e) {
    return NextResponse.json({ error: serverError("auth/otp/verify", e, { email }) }, { status: 500 });
  }
  if (!verdict.ok) {
    logWarn("auth.otp_verify_failed", { ip, email, reason: verdict.reason });
    return NextResponse.json({ error: REASON_MESSAGE[verdict.reason] || "That code isn't right." }, { status: 401 });
  }

  const db = serviceClient();

  // ---------------------------------------------------------- existing account -> log in
  let existing;
  try {
    existing = await findAuthUserByEmail(email);
  } catch (e) {
    return NextResponse.json({ error: serverError("auth/otp/verify", e, { email }) }, { status: 500 });
  }

  if (existing) {
    let company;
    try {
      company = await getCompanyByUser(existing.id);
    } catch (e) {
      return NextResponse.json({ error: serverError("auth/otp/verify", e, { email }) }, { status: 500 });
    }
    if (!company) return NextResponse.json({ error: "This login has no company attached. Contact support." }, { status: 403 });

    await recordLogin(company).catch(() => {});
    logInfo("auth.otp_login_succeeded", { ip, companyId: company.id });
    const response = NextResponse.json({
      isNewAccount: false,
      user: { email, name: existing.user_metadata?.name || "" },
      company: { id: company.id, name: company.name, role: company.role },
    });
    return attachSession(response, { userId: existing.id, company });
  }

  // ------------------------------------------------------------- new account -> create it
  if (companyName.length < 2) {
    return NextResponse.json({ error: "Enter your company name to finish creating your account.", needsCompanyName: true }, { status: 400 });
  }

  const randomPassword = crypto.randomBytes(24).toString("base64url"); // never shown or typed; replaced in /api/auth/set-password
  const { data, error } = await db.auth.admin.createUser({
    email,
    password: randomPassword,
    email_confirm: true,
    user_metadata: { name },
  });
  if (error || !data?.user) {
    return NextResponse.json({ error: serverError("auth/otp/verify.createUser", error || new Error("no user returned"), { email }) }, { status: 500 });
  }

  let company;
  try {
    company = await createCompany(data.user.id, companyName);
  } catch (e) {
    await db.auth.admin.deleteUser(data.user.id).catch(() => {});
    const missing = /relation .*companies|schema cache/i.test(e.message);
    return NextResponse.json(
      { error: missing ? "Setup isn't finished: run the latest migration in Supabase." : serverError("auth/otp/verify.createCompany", e, { email }) },
      { status: 500 }
    );
  }

  logInfo("auth.otp_signup_succeeded", { ip, companyId: company.id });
  const response = NextResponse.json({
    isNewAccount: true,
    user: { email, name },
    company: { id: company.id, name: company.name, role: company.role },
  });
  return attachSession(response, { userId: data.user.id, company });
}
