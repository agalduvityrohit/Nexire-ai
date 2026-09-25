import { NextResponse } from "next/server";
import { attachSession, authorize } from "@/lib/server/auth";
import { getCompanyByUser, recordLogin } from "@/lib/server/companies";
import { clientIp, rateLimited } from "@/lib/server/rateLimit";
import { serviceClient, supabaseConfigured } from "@/lib/server/supabase";

export const runtime = "nodejs";

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

  // Throttle per network AND per account, so one address can't be brute-forced from many IPs.
  if (
    rateLimited(`login-ip:${clientIp(request)}`, { max: 20, windowMs: 900_000 }) ||
    rateLimited(`login-acct:${email}`, { max: 8, windowMs: 900_000 })
  ) {
    return NextResponse.json({ error: "Too many attempts. Wait a few minutes and try again." }, { status: 429 });
  }

  const { data, error } = await serviceClient().auth.signInWithPassword({ email, password });
  if (error || !data?.user) {
    // Same message for "no such user" and "wrong password" — don't reveal which emails exist.
    return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
  }

  let company;
  try {
    company = await getCompanyByUser(data.user.id);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
  if (!company) {
    return NextResponse.json({ error: "This login has no company attached. Contact support." }, { status: 403 });
  }

  await recordLogin(company).catch(() => {});

  const response = NextResponse.json({
    user: { email, name: data.user.user_metadata?.name || "" },
    company: { id: company.id, name: company.name, role: company.role },
  });
  return attachSession(response, { userId: data.user.id, company });
}
