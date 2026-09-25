import { NextResponse } from "next/server";
import { authorize, clearSession } from "@/lib/server/auth";

export const runtime = "nodejs";

export async function POST(request) {
  const { error } = await authorize(request);
  if (error) return error;
  return clearSession(NextResponse.json({ ok: true }));
}
