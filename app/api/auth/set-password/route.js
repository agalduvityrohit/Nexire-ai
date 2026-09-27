// Lets a signed-in company set (or change) their password — the step after an
// OTP signup, so next time they can use /login directly instead of requesting
// a fresh code. Requires an active session; there is no "forgot password" flow
// yet (out of scope for the pilot — see lib/server/auth.js's session model).

import { NextResponse } from "next/server";
import { authorize } from "@/lib/server/auth";
import { serviceClient } from "@/lib/server/supabase";
import { logInfo, serverError } from "@/lib/server/logger";

export const runtime = "nodejs";

export async function POST(request) {
  const { ctx, error } = await authorize(request, { login: true });
  if (error) return error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const password = String(body?.password || "");
  if (password.length < 8 || password.length > 128) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const { error: updateError } = await serviceClient().auth.admin.updateUserById(ctx.userId, { password });
  if (updateError) {
    return NextResponse.json({ error: serverError("auth/set-password", updateError, { companyId: ctx.companyId }) }, { status: 500 });
  }

  logInfo("auth.password_set", { companyId: ctx.companyId });
  return NextResponse.json({ ok: true });
}
