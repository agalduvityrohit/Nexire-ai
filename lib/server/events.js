// Writes visitor + usage events (see supabase/migrations/0008_events.sql).
//
// Rules:
//  - logging is best-effort and NEVER throws or blocks a request on failure — a
//    broken log must not break a login
//  - nothing is recorded for the public demo (it isn't a real company), and
//    nothing from `next dev` unless TRACK_IN_DEV=1 (local dev shares the one
//    production database, so we don't want test traffic in the real numbers)
//  - never a raw IP, never a password, never a candidate name — see eventsCore.js

import { serviceClient, supabaseConfigured } from "@/lib/server/supabase";
import { clientInfo, hashIp } from "@/lib/server/eventsCore";
import { logWarn } from "@/lib/server/logger";

const DEMO_COMPANY_ID = "demo-company"; // literal on purpose: importing auth.js here would be a cycle

function enabled() {
  return supabaseConfigured() && (process.env.NODE_ENV === "production" || process.env.TRACK_IN_DEV === "1");
}

/**
 * @param {object} e
 * @param {string} e.type          event_type
 * @param {Headers} [e.headers]    request headers (for hashed IP, city, device)
 * @param {string|null} [e.companyId]
 * @param {string|null} [e.userId]
 * @param {string|null} [e.path]
 * @param {object} [e.meta]
 * @param {boolean} [e.skipBots]   drop obvious bots (page views only — a bot hammering /login IS worth logging)
 */
export async function logEvent({ type, headers, companyId = null, userId = null, path = null, meta = {}, skipBots = false }) {
  try {
    if (!enabled() || companyId === DEMO_COMPANY_ID) return;
    const info = headers ? clientInfo(headers) : {};
    if (skipBots && info.bot) return;

    const { error } = await serviceClient()
      .from("events")
      .insert({
        event_type: type,
        company_id: companyId,
        user_id: userId,
        path,
        ip_hash: hashIp(info.ip),
        city: info.city || null,
        country: info.country || null,
        device: info.device || null,
        meta: { env: process.env.VERCEL_ENV || process.env.NODE_ENV, ...meta },
      });
    if (error) logWarn("events.insert_failed", { type, message: error.message });
  } catch (e) {
    logWarn("events.log_failed", { type, message: e.message });
  }
}

/**
 * True when this user has logged in before but never from this browser + OS.
 * Their very first login isn't "new" — there's nothing to compare against.
 * Call BEFORE logging the current login_success.
 */
export async function isNewDevice(userId, device) {
  try {
    if (!enabled() || !userId || !device) return false;
    const db = serviceClient();
    const base = () => db.from("events").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("event_type", "login_success");
    const { count: prior } = await base();
    if (!prior) return false;
    const { count: same } = await base().eq("device", device);
    return same === 0;
  } catch {
    return false;
  }
}

/** Admin "delete this person's/company's events" — privacy erasure. Returns how many rows were removed. */
export async function deleteEventsFor({ userId = null, companyId = null }) {
  if (!userId && !companyId) throw new Error("userId or companyId is required.");
  const db = serviceClient();
  let removed = 0;
  for (const [col, val] of [["user_id", userId], ["company_id", companyId]]) {
    if (!val) continue;
    const { count, error } = await db.from("events").delete({ count: "exact" }).eq(col, val);
    if (error) throw new Error(`Couldn't delete events: ${error.message}`);
    removed += count || 0;
  }
  return removed;
}

/** Retention purge, run daily by /api/cron/purge-events. */
export async function purgeOldEvents(days = Number(process.env.EVENT_RETENTION_DAYS) || 90) {
  const cutoff = new Date(Date.now() - days * 86400000).toISOString();
  const { count, error } = await serviceClient().from("events").delete({ count: "exact" }).lt("created_at", cutoff);
  if (error) throw new Error(`Purge failed: ${error.message}`);
  return { removed: count || 0, cutoff, days };
}
