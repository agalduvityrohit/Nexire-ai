// Aggregation for the traffic console — pure functions over plain event/company
// arrays, so they're testable without a database (scripts/test-traffic.mjs).
// Everything is UTC so day buckets are the same on the server and in the database.

const DAY = 86400000;

export const EVENT_LABELS = {
  page_view: "Page view",
  signup: "Signed up",
  login_success: "Logged in",
  login_failed: "Failed login",
  new_device_login: "New-device login",
  jd_posted: "Posted a job",
  resumes_ingested: "Résumés added",
  shortlisted: "Shortlisted",
  invites_sent: "Invites sent",
  admin_blocked: "Blocked /admin hit",
};

export function dayList(days, now = new Date()) {
  const out = [];
  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  for (let i = days - 1; i >= 0; i--) out.push(new Date(end - i * DAY).toISOString().slice(0, 10));
  return out;
}

export function rangeStart(days, now = new Date()) {
  return new Date(dayList(days, now)[0] + "T00:00:00.000Z");
}

const day = (e) => String(e.created_at).slice(0, 10);

/** Visitors/day = distinct ip_hash on page views (hash rotates daily, so this is daily-unique, not cross-day). */
export function buildSeries(events, days, now = new Date()) {
  const visitors = new Map();
  const logins = new Map();
  for (const e of events) {
    const d = day(e);
    if (e.event_type === "page_view" && e.ip_hash) {
      if (!visitors.has(d)) visitors.set(d, new Set());
      visitors.get(d).add(e.ip_hash);
    } else if (e.event_type === "login_success" && e.user_id) {
      if (!logins.has(d)) logins.set(d, new Set());
      logins.get(d).add(e.user_id);
    }
  }
  return dayList(days, now).map((d) => ({ day: d, visitors: visitors.get(d)?.size || 0, logins: logins.get(d)?.size || 0 }));
}

export function summarize(events, series, companies, now = new Date()) {
  const visitors = series.reduce((n, d) => n + d.visitors, 0);
  const signups = events.filter((e) => e.event_type === "signup").length;
  const loginUsers = new Set(events.filter((e) => e.event_type === "login_success" && e.user_id).map((e) => e.user_id));
  const weekAgo = now.getTime() - 7 * DAY;
  return {
    visitors,
    signups,
    signupRate: visitors ? signups / visitors : null,
    logins: loginUsers.size,
    activeCompanies7d: companies.filter((c) => c.lastLoginAt && new Date(c.lastLoginAt).getTime() >= weekAgo).length,
    failedLogins: events.filter((e) => e.event_type === "login_failed").length,
  };
}

/** [{label, count}] -> adds pct of the previous step (null for the first). */
export function funnel(steps) {
  return steps.map((s, i) => ({ ...s, pct: i === 0 ? null : steps[i - 1].count ? s.count / steps[i - 1].count : null }));
}

export function companyStatus(lastLoginAt, now = new Date()) {
  if (!lastLoginAt) return { label: "Never logged in", tone: "neutral" };
  const days = Math.floor((now.getTime() - new Date(lastLoginAt).getTime()) / DAY);
  if (days < 7) return { label: "Active", tone: "success" };
  return { label: `Quiet ${days} day${days === 1 ? "" : "s"}`, tone: "warn" };
}

/** Accounts with >= threshold failed logins inside any sliding window. */
export function detectBruteForce(events, { threshold = 5, windowMs = 10 * 60 * 1000 } = {}) {
  const byAccount = new Map();
  for (const e of events) {
    if (e.event_type !== "login_failed") continue;
    const key = e.meta?.account_hash || e.meta?.email_masked || "unknown";
    if (!byAccount.has(key)) byAccount.set(key, []);
    byAccount.get(key).push(e);
  }
  const flagged = [];
  for (const list of byAccount.values()) {
    list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    let best = 0, bestEnd = 0, lo = 0;
    for (let hi = 0; hi < list.length; hi++) {
      while (new Date(list[hi].created_at) - new Date(list[lo].created_at) > windowMs) lo++;
      if (hi - lo + 1 > best) { best = hi - lo + 1; bestEnd = hi; }
    }
    if (best >= threshold) {
      const last = list[list.length - 1];
      flagged.push({
        account: list[0].meta?.email_masked || "unknown account",
        attempts: best,
        lastAt: last.created_at,
        ips: new Set(list.map((e) => e.ip_hash).filter(Boolean)).size,
        windowEnd: list[bestEnd].created_at,
      });
    }
  }
  return flagged.sort((a, b) => b.attempts - a.attempts || new Date(b.lastAt) - new Date(a.lastAt));
}
