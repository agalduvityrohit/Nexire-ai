import { NextResponse } from "next/server";
import { authorize, clearSession } from "@/lib/server/auth";
import { bumpSessionEpoch } from "@/lib/server/companies";

export const runtime = "nodejs";

export async function POST(request) {
  const { ctx } = await authorize(request, { login: true });
  // Real invalidation, not just clearing the cookie client-side: bumping the
  // epoch makes every token issued before this instant — including a copy an
  // attacker may already hold — stop working immediately, on every device.
  if (ctx) await bumpSessionEpoch(ctx.companyId).catch(() => {});
  return clearSession(NextResponse.json({ ok: true }));
}
