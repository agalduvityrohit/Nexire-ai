// Data for the founder console (/admin/traffic). Runs only on the server, with the
// service-role key, behind the admin gate. All numbers are computed here — the page
// just renders them.

import { listCompaniesWithStats } from "@/lib/server/companies";
import { serviceClient } from "@/lib/server/supabase";
import { EVENT_LABELS, buildSeries, companyStatus, detectBruteForce, funnel, rangeStart, summarize } from "@/lib/server/trafficMath";

const PAGE = 1000;
const MAX_ROWS = 50_000; // plenty for a pilot; the console says so if it's ever hit

/**
 * Which events count:
 *  - production traffic only — a founder testing on a Preview deployment or locally
 *    shouldn't move the real numbers
 *  - clearly-labelled sample rows (scripts/seed-events.mjs) only when asked for
 */
function counts(e, includeSample) {
  if (e.meta?.sample) return includeSample;
  return !e.meta?.env || e.meta.env === "production";
}

async function fetchEvents(since, { types = null } = {}) {
  const db = serviceClient();
  const rows = [];
  let truncated = false;
  for (let from = 0; ; from += PAGE) {
    if (from >= MAX_ROWS) { truncated = true; break; }
    let q = db.from("events").select("*").gte("created_at", since.toISOString()).order("created_at", { ascending: false }).range(from, from + PAGE - 1);
    if (types) q = q.in("event_type", types);
    const { data, error } = await q;
    if (error) throw new Error(`Supabase read failed: ${error.message}`);
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  return { rows, truncated };
}

/* ---- masked emails for signed-in events (looked up on demand, cached 10 min) ---- */
const emailCache = (globalThis.__nexireEmailMask ||= new Map());
function mask(email) {
  const [local, domain] = String(email || "").split("@");
  return local && domain ? `${local.slice(0, 2)}***@${domain.toLowerCase()}` : null;
}
async function maskedEmails(userIds) {
  const db = serviceClient();
  const now = Date.now();
  await Promise.all(
    [...new Set(userIds.filter(Boolean))]
      .filter((id) => !(emailCache.get(id)?.exp > now))
      .map(async (id) => {
        try {
          const { data } = await db.auth.admin.getUserById(id);
          emailCache.set(id, { v: mask(data?.user?.email), exp: now + 600_000 });
        } catch {
          emailCache.set(id, { v: null, exp: now + 60_000 });
        }
      })
  );
  return (id) => emailCache.get(id)?.v || null;
}

function liveRow(e, companyName, emailOf) {
  return {
    id: e.id,
    at: e.created_at,
    company: e.company_id ? companyName.get(e.company_id) || "Unknown company" : null,
    email: e.meta?.email_masked || (e.user_id ? emailOf(e.user_id) : null),
    type: e.event_type,
    label: EVENT_LABELS[e.event_type] || e.event_type,
    path: e.path,
    count: Number.isFinite(e.meta?.count) ? e.meta.count : null, // how many résumés / candidates / invites
    city: [e.city, e.country].filter(Boolean).join(", ") || null,
    device: e.device,
  };
}

/** Newest 50 events, for the auto-refreshing table. */
export async function getLiveEvents({ includeSample = false, hidePageViews = false } = {}) {
  const since = new Date(Date.now() - 30 * 86400000);
  // Page views are most of the traffic; when they're hidden, look further back so the 50 rows are all people doing things.
  const [{ rows }, companies] = await Promise.all([fetchEventsLimited(since, hidePageViews ? 400 : 120), listCompaniesWithStats()]);
  const kept = rows.filter((e) => counts(e, includeSample) && !(hidePageViews && e.event_type === "page_view")).slice(0, 50);
  const emailOf = await maskedEmails(kept.map((e) => e.user_id));
  const names = new Map(companies.map((c) => [c.id, c.name]));
  return kept.map((e) => liveRow(e, names, emailOf));
}

async function fetchEventsLimited(since, limit) {
  const { data, error } = await serviceClient().from("events").select("*").gte("created_at", since.toISOString()).order("created_at", { ascending: false }).limit(limit);
  if (error) throw new Error(`Supabase read failed: ${error.message}`);
  return { rows: data };
}

/** Everything the console shows for the last `days` days. */
export async function getTrafficData(days, { includeSample = false } = {}) {
  const now = new Date();
  const since = rangeStart(days, now);

  const [{ rows, truncated }, companiesAll, invitedRes] = await Promise.all([
    fetchEvents(since),
    listCompaniesWithStats(),
    serviceClient().from("company_candidates").select("company_id").not("invited_at", "is", null).limit(100_000),
  ]);
  if (invitedRes.error) throw new Error(`Supabase read failed: ${invitedRes.error.message}`);

  const events = rows.filter((e) => counts(e, includeSample));
  const companies = companiesAll.filter((c) => c.role !== "admin");
  const names = new Map(companiesAll.map((c) => [c.id, c.name]));

  const series = buildSeries(events, days, now);
  const summary = summarize(events, series, companies, now);

  /* Funnel — companies that signed up inside the range, and how far they got. */
  const cohort = companies.filter((c) => new Date(c.signedUpAt) >= since);
  const verifiedIds = new Set(events.filter((e) => e.event_type === "signup" && e.meta?.verified === true && e.company_id).map((e) => e.company_id));
  const invitedIds = new Set((invitedRes.data || []).map((r) => r.company_id));
  const withJd = cohort.filter((c) => c.jobs > 0);
  const withPool = withJd.filter((c) => c.candidates > 0);
  const withInvites = withPool.filter((c) => invitedIds.has(c.id));
  // Steps are nested along the product flow (job -> résumés -> invites). "Verified" and
  // "posted a job" aren't gated on each other — you can post a job without verifying —
  // so both are measured against "signed up" (vs: 0) instead of the step above them.
  const funnelSteps = funnel([
    { label: "Companies signed up", count: cohort.length },
    { label: "Verified their email", count: cohort.filter((c) => verifiedIds.has(c.id)).length, vs: 0, note: "Only emailed-code signups prove the address; password signups are auto-confirmed, so they don't count here." },
    { label: "Posted a job description", count: withJd.length, vs: 0 },
    { label: "Résumés in their pool", count: withPool.length },
    { label: "Sent interview invites", count: withInvites.length },
  ]).map((s) => (s.vs != null ? { ...s, pct: cohort.length ? s.count / cohort.length : null, vsLabel: "of signed up" } : s));

  /* Companies table */
  const companyRows = companies
    .map((c) => ({
      id: c.id,
      userId: c.userId,
      name: c.name,
      users: 1, // one login per company today
      lastLoginAt: c.lastLoginAt,
      jobs: c.jobs,
      pool: c.candidates,
      status: companyStatus(c.lastLoginAt, now),
    }))
    .sort((a, b) => new Date(b.lastLoginAt || 0) - new Date(a.lastLoginAt || 0));

  /* Security */
  const emailOf = await maskedEmails(events.filter((e) => e.event_type === "new_device_login").slice(0, 20).map((e) => e.user_id));
  const security = {
    bruteForce: detectBruteForce(events),
    newDevices: events.filter((e) => e.event_type === "new_device_login").slice(0, 20).map((e) => liveRow(e, names, emailOf)),
    adminBlocked: events.filter((e) => e.event_type === "admin_blocked").slice(0, 20).map((e) => ({ ...liveRow(e, names, emailOf), reason: e.meta?.reason || null })),
  };

  return {
    days,
    series,
    summary,
    funnel: funnelSteps,
    companies: companyRows,
    security,
    truncated,
    hasEvents: events.length > 0,
    saltConfigured: Boolean(process.env.IP_HASH_SALT),
    sampleOn: includeSample,
  };
}
