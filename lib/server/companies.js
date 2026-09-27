// Company accounts. One company per Supabase Auth user (see 0005 migration).

import { serviceClient } from "@/lib/server/supabase";

const ACTIVE_WINDOW_DAYS = 14;

/**
 * Supabase's admin API has no getUserByEmail, so this pages through listUsers.
 * Fine at pilot scale (tens of companies); revisit if that ever changes.
 */
export async function findAuthUserByEmail(email) {
  const db = serviceClient();
  const target = email.toLowerCase();
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`Couldn't look up the account: ${error.message}`);
    const found = data.users.find((u) => u.email?.toLowerCase() === target);
    if (found) return found;
    if (data.users.length < 200) return null; // last page
  }
  return null;
}

export async function createCompany(userId, name) {
  const { data, error } = await serviceClient()
    .from("companies")
    .insert({ user_id: userId, name: name.trim() })
    .select()
    .single();
  if (error) throw new Error(`Couldn't create the company: ${error.message}`);
  return data;
}

export async function getCompanyByUser(userId) {
  const { data, error } = await serviceClient().from("companies").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw new Error(`Supabase read failed: ${error.message}`);
  return data;
}

export async function getCompanyById(id) {
  const { data, error } = await serviceClient().from("companies").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Supabase read failed: ${error.message}`);
  return data;
}

/**
 * The small, cheap read authorize() does on every signed-in request — see
 * lib/server/auth.js. Tolerates the 0006 migration not having run yet
 * (session_epoch missing): falls back to role-only, which means sign-out still
 * clears the cookie but can't yet revoke a copied token early — the same
 * behavior as before 0006 existed, not a new failure mode. Deploys safely
 * regardless of migration order; upgrades automatically once the column exists.
 */
export async function getSessionCheck(companyId) {
  const { data, error } = await serviceClient()
    .from("companies")
    .select("id, role, session_epoch")
    .eq("id", companyId)
    .maybeSingle();

  if (error) {
    if (/session_epoch/i.test(error.message)) {
      const fallback = await serviceClient().from("companies").select("id, role").eq("id", companyId).maybeSingle();
      if (fallback.error) throw new Error(`Supabase read failed: ${fallback.error.message}`);
      return fallback.data ? { ...fallback.data, session_epoch: null } : null;
    }
    throw new Error(`Supabase read failed: ${error.message}`);
  }
  return data;
}

/**
 * Invalidates every session token issued for this company, immediately — a
 * copied or stolen cookie stops working the instant this runs, without
 * waiting for it to expire. Used on sign-out (real invalidation, not just
 * clearing the cookie client-side) and available for "sign out everywhere".
 */
export async function bumpSessionEpoch(companyId) {
  const { data, error } = await serviceClient().from("companies").select("session_epoch").eq("id", companyId).maybeSingle();
  if (error || !data) return; // 0006 not run yet, or company gone — nothing to bump
  await serviceClient().from("companies").update({ session_epoch: (data.session_epoch || 1) + 1 }).eq("id", companyId);
}

export async function recordLogin(company) {
  await serviceClient()
    .from("companies")
    .update({ last_login_at: new Date().toISOString(), login_count: (company.login_count || 0) + 1 })
    .eq("id", company.id);
}

export function isActive(lastLoginAt) {
  if (!lastLoginAt) return false;
  return Date.now() - new Date(lastLoginAt).getTime() < ACTIVE_WINDOW_DAYS * 86400000;
}

/* ------------------------------------------------------------- admin stats */

const DAY = 86400000;

function median(nums) {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function candidateMetrics(rows) {
  const shortlistDurations = rows
    .filter((r) => r.shortlisted_at && r.created_at)
    .map((r) => new Date(r.shortlisted_at) - new Date(r.created_at))
    .filter((ms) => ms >= 0);
  return {
    candidates: rows.length,
    shortlisted: rows.filter((r) => r.shortlisted_at).length,
    invited: rows.filter((r) => r.invited_at).length,
    scheduled: rows.filter((r) => r.interview_at).length,
    medianHoursToShortlist: shortlistDurations.length ? Math.round((median(shortlistDurations) / 3600000) * 10) / 10 : null,
    lastActivityAt: rows.reduce((max, r) => (r.updated_at > (max || "") ? r.updated_at : max), null),
  };
}

const CANDIDATE_STAT_COLUMNS = "company_id, job_id, status, created_at, updated_at, shortlisted_at, invited_at, interview_at";

/** Every company with usage numbers — the admin overview table. */
export async function listCompaniesWithStats() {
  const db = serviceClient();
  const [companiesRes, jobsRes, candidatesRes] = await Promise.all([
    db.from("companies").select("*").order("created_at", { ascending: false }),
    db.from("company_jobs").select("company_id, id").limit(50000),
    db.from("company_candidates").select(CANDIDATE_STAT_COLUMNS).limit(100000),
  ]);
  for (const r of [companiesRes, jobsRes, candidatesRes]) {
    if (r.error) throw new Error(`Supabase read failed: ${r.error.message}`);
  }

  const emailsById = await authEmails(companiesRes.data.map((c) => c.user_id));

  const jobsBy = new Map();
  for (const j of jobsRes.data) jobsBy.set(j.company_id, (jobsBy.get(j.company_id) || 0) + 1);
  const candsBy = new Map();
  for (const c of candidatesRes.data) {
    if (!candsBy.has(c.company_id)) candsBy.set(c.company_id, []);
    candsBy.get(c.company_id).push(c);
  }

  return companiesRes.data.map((c) => ({
    id: c.id,
    name: c.name,
    email: emailsById.get(c.user_id) || null,
    role: c.role,
    signedUpAt: c.created_at,
    lastLoginAt: c.last_login_at,
    loginCount: c.login_count,
    active: isActive(c.last_login_at),
    jobs: jobsBy.get(c.id) || 0,
    ...candidateMetrics(candsBy.get(c.id) || []),
  }));
}

/** One company in detail — jobs, funnel, recent activity. */
export async function getCompanyDetail(companyId) {
  const db = serviceClient();
  const company = await getCompanyById(companyId);
  if (!company) return null;

  const [jobsRes, candidatesRes, bookingsRes] = await Promise.all([
    db.from("company_jobs").select("id, title, status, posted_at, interview_slots").eq("company_id", companyId),
    db
      .from("company_candidates")
      .select("id, job_id, name, role, status, source, created_at, updated_at, shortlisted_at, invited_at, interview_at")
      .eq("company_id", companyId)
      .order("updated_at", { ascending: false })
      .limit(5000),
    db
      .from("interview_bookings")
      .select("candidate_name, role_title, status, created_at, booked_at, selected_slot")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  for (const r of [jobsRes, candidatesRes, bookingsRes]) {
    if (r.error) throw new Error(`Supabase read failed: ${r.error.message}`);
  }

  const cands = candidatesRes.data;
  const emails = await authEmails([company.user_id]);

  const statusCounts = {};
  const sourceCounts = {};
  for (const c of cands) {
    statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
    const src = c.source || "unknown";
    sourceCounts[src] = (sourceCounts[src] || 0) + 1;
  }

  const perJob = jobsRes.data.map((j) => {
    const pool = cands.filter((c) => c.job_id === j.id);
    return {
      id: j.id,
      title: j.title,
      status: j.status,
      postedAt: j.posted_at,
      slots: (j.interview_slots || []).length,
      candidates: pool.length,
      shortlisted: pool.filter((c) => c.shortlisted_at).length,
      scheduled: pool.filter((c) => c.interview_at).length,
    };
  });

  // Uploads per day for the last 14 days — a quick read on usage frequency.
  const perDay = {};
  for (let i = 13; i >= 0; i--) perDay[new Date(Date.now() - i * DAY).toISOString().slice(0, 10)] = 0;
  for (const c of cands) {
    const day = (c.created_at || "").slice(0, 10);
    if (day in perDay) perDay[day] += 1;
  }

  return {
    company: {
      id: company.id,
      name: company.name,
      email: emails.get(company.user_id) || null,
      role: company.role,
      signedUpAt: company.created_at,
      lastLoginAt: company.last_login_at,
      loginCount: company.login_count,
      active: isActive(company.last_login_at),
    },
    metrics: { jobs: jobsRes.data.length, ...candidateMetrics(cands) },
    statusCounts,
    sourceCounts,
    perJob,
    activity: Object.entries(perDay).map(([day, count]) => ({ day, count })),
    recentBookings: bookingsRes.data.map((b) => ({
      candidate: b.candidate_name,
      role: b.role_title,
      status: b.status,
      invitedAt: b.created_at,
      bookedAt: b.booked_at,
      slot: b.selected_slot?.start || null,
    })),
  };
}

async function authEmails(userIds) {
  const map = new Map();
  const db = serviceClient();
  await Promise.all(
    userIds.map(async (id) => {
      try {
        const { data } = await db.auth.admin.getUserById(id);
        if (data?.user?.email) map.set(id, data.user.email);
      } catch {
        // Email is a nicety in the admin table — never fail the whole page over it.
      }
    })
  );
  return map;
}
