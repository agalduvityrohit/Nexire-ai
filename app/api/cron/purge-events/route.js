// Daily retention purge: deletes events older than EVENT_RETENTION_DAYS (default 90).
// Triggered by Vercel Cron (vercel.json), which sends `Authorization: Bearer $CRON_SECRET`
// automatically when the CRON_SECRET env var is set. Anything else gets a 404, so
// the endpoint can't be poked from outside.

import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { purgeOldEvents } from "@/lib/server/events";
import { logInfo, serverError } from "@/lib/server/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // not configured -> never runnable
  const given = Buffer.from(request.headers.get("authorization") || "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

export async function GET(request) {
  if (!authorized(request)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  try {
    const result = await purgeOldEvents();
    logInfo("events.purged", result);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: serverError("cron/purge-events", e) }, { status: 500 });
  }
}
