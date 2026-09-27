// Create a company account: Supabase Auth user + companies row, then sign in.

import { NextResponse } from "next/server";
import { attachSession, authorize } from "@/lib/server/auth";
import { createCompany } from "@/lib/server/companies";
import { clientIp, rateLimited } from "@/lib/server/rateLimit";
import { serviceClient, supabaseConfigured } from "@/lib/server/supabase";
import { logInfo, logWarn, serverError } from "@/lib/server/logger";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(request) {
  const { error: originError } = await authorize(request);
  if (originError) return originError;

  if (!supabaseConfigured()) {
    return NextResponse.json({ error: "Accounts aren't available — the database isn't configured." }, { status: 503 });
  }
  const ip = clientIp(request);
  if (rateLimited(`signup:${ip}`, { max: 5, windowMs: 3600_000 })) {
    logWarn("auth.signup_rate_limited", { ip });
    return NextResponse.json({ error: "Too many signups from this network. Try again later." }, { status: 429 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const companyName = String(body?.companyName || "").trim().slice(0, 120);
  const name = String(body?.name || "").trim().slice(0, 120);
  const email = String(body?.email || "").trim().toLowerCase().slice(0, 254);
  const password = String(body?.password || "");

  if (companyName.length < 2) {
    return NextResponse.json({ error: "Enter your company name." }, { status: 400 });
  }
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  if (password.length < 8 || password.length > 128) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const db = serviceClient();
  const { data, error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // pilot: no confirmation step; add SMTP + confirmation before opening signups wide
    user_metadata: { name },
  });

  if (error || !data?.user) {
    const taken = /already|registered|exists/i.test(error?.message || "");
    if (!taken) logWarn("auth.signup_create_user_failed", { ip, message: error?.message });
    return NextResponse.json(
      { error: taken ? "An account with this email already exists. Try signing in." : "Couldn't create the account." },
      { status: taken ? 409 : 500 }
    );
  }

  let company;
  try {
    company = await createCompany(data.user.id, companyName);
  } catch (e) {
    await db.auth.admin.deleteUser(data.user.id).catch(() => {}); // don't leave an orphan login behind
    const missing = /relation .*companies|schema cache/i.test(e.message);
    return NextResponse.json(
      { error: missing ? "Setup isn't finished: run the latest migration in Supabase." : serverError("auth/signup", e, { ip }) },
      { status: 500 }
    );
  }
  logInfo("auth.signup_succeeded", { ip, companyId: company.id });

  const response = NextResponse.json({
    user: { email, name },
    company: { id: company.id, name: company.name, role: company.role },
  });
  return attachSession(response, { userId: data.user.id, company });
}
