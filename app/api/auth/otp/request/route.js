// Step 1 of passwordless sign-up/sign-in: email a 6-digit code.
//
// Works for both a brand-new email (about to become a signup) and an existing
// account's email (an alternative to typing a password) — the verify step
// decides which, since this step can't safely reveal whether the address is
// already registered.

import { NextResponse } from "next/server";
import { authorize } from "@/lib/server/auth";
import { generateCode, storeCode } from "@/lib/server/otp";
import { sendEmail, otpEmail } from "@/lib/server/email";
import { clientIp, rateLimited } from "@/lib/server/rateLimit";
import { supabaseConfigured } from "@/lib/server/supabase";
import { logInfo, logWarn, serverError } from "@/lib/server/logger";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

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
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });

  const ip = clientIp(request);
  if (
    rateLimited(`otp-req-email:${email}`, { max: 5, windowMs: 3600_000 }) ||
    rateLimited(`otp-req-ip:${ip}`, { max: 15, windowMs: 3600_000 })
  ) {
    logWarn("auth.otp_request_rate_limited", { ip, email });
    return NextResponse.json({ error: "Too many codes requested. Wait a bit and try again." }, { status: 429 });
  }

  const code = generateCode();
  try {
    await storeCode(email, code);
  } catch (e) {
    if (/relation .*email_otps|schema cache/i.test(e.message)) {
      // 0007 migration hasn't run yet — same "not set up" framing as no Resend
      // key, so the client falls back to password signup either way.
      return NextResponse.json({ error: "Email sign-in isn't set up yet on this deployment. Use a password to create the first account instead." }, { status: 503 });
    }
    return NextResponse.json({ error: serverError("auth/otp/request", e, { email }) }, { status: 500 });
  }

  const result = await sendEmail({ to: email, ...otpEmail({ code }) });
  if (!result.sent) {
    logWarn("auth.otp_email_not_sent", { email, reason: result.reason });
    return NextResponse.json(
      {
        error:
          result.reason === "not_configured"
            ? "Email sign-in isn't set up yet on this deployment. Use a password to create the first account instead."
            : "Couldn't send the code. Try again in a moment.",
      },
      { status: 503 }
    );
  }

  logInfo("auth.otp_requested", { ip, email });
  return NextResponse.json({ ok: true, expiresInSeconds: 600 });
}
