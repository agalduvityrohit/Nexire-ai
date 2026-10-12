// Admin-only: the newest 50 events for the console's auto-refreshing table.

import { NextResponse } from "next/server";
import { authorize } from "@/lib/server/auth";
import { getLiveEvents } from "@/lib/server/traffic";
import { serverError } from "@/lib/server/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const { error } = await authorize(request, { admin: true });
  if (error) return error; // 404 for anyone who isn't an allow-listed admin

  try {
    const sp = request.nextUrl.searchParams;
    const events = await getLiveEvents({ includeSample: sp.get("sample") === "1", hidePageViews: sp.get("pv") === "0" });
    return NextResponse.json({ events }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: serverError("admin/traffic/live", e) }, { status: 500 });
  }
}
