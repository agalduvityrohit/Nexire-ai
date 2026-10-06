// Real persistence for jobs and candidates. Same resilience pattern as
// lib/server/keystore.js: Supabase when configured, an in-memory fallback
// (hung off globalThis, since each API route is its own bundle) otherwise —
// so the UI still works before a project is provisioned, it just won't
// survive a server restart until Supabase is wired up.

import { createClient } from "@supabase/supabase-js";
import { DEMO_COMPANY_ID } from "@/lib/server/auth";
import { loadDemoDataset } from "@/lib/demoDataset";

const JOBS_TABLE = "company_jobs";
const CANDIDATES_TABLE = "company_candidates";

const memJobs = (globalThis.__nexireJobs ||= new Map()); // companyId -> Map(jobId -> row)
const memCandidates = (globalThis.__nexireCandidates ||= new Map()); // companyId -> Map(candidateId -> row)

function supabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// The public demo never touches the database. Its 10 jobs and ~496 candidates
// ship with the app (lib/demoData.json) and are loaded into server memory on
// first use (see seedDemoOnce below), so the demo works even if Supabase is
// paused or down, and a visitor can't permanently change or delete what the
// next visitor sees — edits live in memory until that server instance recycles.
// Real companies (UUID ids) always use Supabase.
function db(companyId) {
  return supabaseConfigured() && companyId !== DEMO_COMPANY_ID;
}

function client() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

/* ------------------------------------------------------------- mapping */

function jobToRow(companyId, job) {
  return {
    id: job.id,
    company_id: companyId,
    title: job.title || "Untitled role",
    department: job.department || null,
    location: job.location || null,
    type: job.type || null,
    level: job.level || null,
    salary: job.salary || null,
    status: job.status || "Open",
    posted_at: job.postedAt || null,
    stack: job.stack || [],
    summary: job.summary || null,
    description: job.description || null,
    responsibilities: job.responsibilities || [],
    requirements: job.requirements || [],
    benefits: job.benefits || [],
    interview_slots: sanitizeSlots(job.interviewSlots),
    hiring_manager_email: job.hiringManagerEmail || null,
  };
}

// Interview slots the company offers for a job: [{ id, start (ISO), end (ISO) }].
// Anything malformed is dropped rather than stored.
export function sanitizeSlots(slots) {
  if (!Array.isArray(slots)) return [];
  const seen = new Set();
  const clean = [];
  for (const s of slots.slice(0, 60)) {
    const start = new Date(s?.start);
    const end = new Date(s?.end);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) continue;
    const id = String(s.id || `${start.getTime()}`).slice(0, 64);
    if (seen.has(id)) continue;
    seen.add(id);
    clean.push({ id, start: start.toISOString(), end: end.toISOString() });
  }
  return clean.sort((a, b) => (a.start < b.start ? -1 : 1));
}

function rowToJob(row) {
  return {
    id: row.id,
    title: row.title,
    department: row.department || "",
    location: row.location || "",
    type: row.type || "",
    level: row.level || "",
    salary: row.salary || "",
    status: row.status,
    postedAt: row.posted_at,
    stack: row.stack || [],
    summary: row.summary || "",
    description: row.description || "",
    responsibilities: row.responsibilities || [],
    requirements: row.requirements || [],
    benefits: row.benefits || [],
    interviewSlots: row.interview_slots || [],
    hiringManagerEmail: row.hiring_manager_email || "",
    isNew: false, // reloaded from storage — "just posted" only applies within the session it was created
  };
}

function candidateToRow(companyId, c) {
  return {
    id: c.id,
    company_id: companyId,
    job_id: c.jobId || null,
    name: c.name || "",
    email: c.email || null,
    phone: c.phone || null,
    location: c.location || null,
    headline: c.headline || null,
    summary: c.summary || null,
    role: c.role || null,
    status: c.status || "applied",
    source: c.source || null,
    match_score: c.matchScore || 0,
    experience_years: c.experienceYears || 0,
    resume_file: c.resumeFile || null,
    resume_hash: c.resumeHash || null,
    github_username: c.githubUsername || null,
    github_url: c.githubUrl || null,
    avatar_url: c.avatarUrl || null,
    applied_at: c.appliedAt || null,
    skills: c.skills || [],
    experience: c.experience || [],
    education: c.education || [],
    projects: c.projects || [],
    links: c.links || null,
    ai_flags: c.aiFlags || [],
    report: c.report || null,
    notice_period: c.noticePeriod || null,
    expected: c.expected || null,
    timeline: c.timeline || [],
  };
}

function rowToCandidate(row) {
  return {
    id: row.id,
    jobId: row.job_id,
    name: row.name,
    email: row.email || "",
    phone: row.phone || "",
    location: row.location || "",
    headline: row.headline || "",
    summary: row.summary || "",
    role: row.role || "Other",
    status: row.status,
    source: row.source || "",
    matchScore: row.match_score || 0,
    experienceYears: Number(row.experience_years) || 0,
    resumeFile: row.resume_file || "",
    githubUsername: row.github_username || null,
    githubUrl: row.github_url || null,
    avatarUrl: row.avatar_url || null,
    appliedAt: row.applied_at,
    skills: row.skills || [],
    experience: row.experience || [],
    education: row.education || [],
    projects: row.projects || [],
    links: row.links || null,
    aiFlags: row.ai_flags || [],
    report: row.report || null,
    noticePeriod: row.notice_period || "—",
    expected: row.expected || "—",
    timeline: row.timeline || [],
    shortlistedAt: row.shortlisted_at || null,
    invitedAt: row.invited_at || null,
    interviewAt: row.interview_at || null,
  };
}

/**
 * Loads the bundled demo dataset into the demo's in-memory slot, once per server
 * instance. Memory is process-local, so a fresh serverless instance starts empty
 * and seeds itself here. Awaited at the top of every function that can touch
 * demo data — a request that lands on a cold instance (say, a status change
 * before any list call) must still find the demo's candidates.
 */
function seedDemoOnce() {
  return (globalThis.__nexireDemoSeed ||= loadDemoDataset().then(({ jobs, candidates }) => {
    const jobMap = new Map(jobs.map((j) => [j.id, jobToRow(DEMO_COMPANY_ID, j)]));
    const candMap = new Map();
    for (const c of candidates) {
      const row = candidateToRow(DEMO_COMPANY_ID, c);
      // candidateToRow doesn't carry these — they're normally set by the invite flow.
      row.shortlisted_at = c.shortlistedAt || null;
      row.invited_at = c.invitedAt || null;
      row.interview_at = c.interviewAt || null;
      candMap.set(c.id, row);
    }
    memJobs.set(DEMO_COMPANY_ID, jobMap);
    memCandidates.set(DEMO_COMPANY_ID, candMap);
  }));
}

async function demoReady(companyId) {
  if (companyId === DEMO_COMPANY_ID) await seedDemoOnce();
}

/* ----------------------------------------------------------------- jobs */

export async function listJobs(companyId) {
  await demoReady(companyId);
  if (!db(companyId)) {
    const rows = [...(memJobs.get(companyId)?.values() || [])];
    return rows.map(rowToJob).sort((a, b) => (a.postedAt < b.postedAt ? 1 : -1));
  }
  const { data, error } = await client()
    .from(JOBS_TABLE)
    .select("*")
    .eq("company_id", companyId)
    .order("posted_at", { ascending: false });
  if (error) throw new Error(`Supabase read failed: ${error.message}`);
  return (data || []).map(rowToJob);
}

export async function upsertJob(companyId, job) {
  await demoReady(companyId);
  const row = jobToRow(companyId, job);

  if (!db(companyId)) {
    if (!memJobs.has(companyId)) memJobs.set(companyId, new Map());
    memJobs.get(companyId).set(job.id, row);
    return rowToJob(row);
  }

  // Job ids are globally unique primary keys — without this check, a company
  // could upsert an id that belongs to someone else and take the row over.
  const { data: existing, error: lookupError } = await client().from(JOBS_TABLE).select("company_id").eq("id", job.id).maybeSingle();
  if (lookupError) throw new Error(`Supabase read failed: ${lookupError.message}`);
  if (existing && existing.company_id !== companyId) throw new Error("That job id is already in use.");

  const { data, error } = await client().from(JOBS_TABLE).upsert(row).select().single();
  if (error) throw new Error(`Supabase write failed: ${error.message}`);
  return rowToJob(data);
}

/** Deletes the job. Candidates tied to it aren't deleted — see releaseCandidatesFromJob. */
export async function deleteJob(companyId, jobId) {
  await demoReady(companyId);
  if (!db(companyId)) {
    memJobs.get(companyId)?.delete(jobId);
    return;
  }
  const { error } = await client().from(JOBS_TABLE).delete().eq("company_id", companyId).eq("id", jobId);
  if (error) throw new Error(`Supabase delete failed: ${error.message}`);
}

/** Un-assigns every candidate on a deleted job so they go back to the general pool instead of pointing at nothing. */
export async function releaseCandidatesFromJob(companyId, jobId) {
  await demoReady(companyId);
  if (!db(companyId)) {
    for (const row of memCandidates.get(companyId)?.values() || []) {
      if (row.job_id === jobId) row.job_id = null;
    }
    return;
  }
  const { error } = await client()
    .from(CANDIDATES_TABLE)
    .update({ job_id: null })
    .eq("company_id", companyId)
    .eq("job_id", jobId);
  if (error) throw new Error(`Supabase write failed: ${error.message}`);
}

/* ----------------------------------------------------------- candidates */

export async function listCandidates(companyId) {
  await demoReady(companyId);
  if (!db(companyId)) {
    const rows = [...(memCandidates.get(companyId)?.values() || [])];
    return rows.map(rowToCandidate).sort((a, b) => (a.appliedAt < b.appliedAt ? 1 : -1));
  }
  const { data, error } = await client()
    .from(CANDIDATES_TABLE)
    .select("*")
    .eq("company_id", companyId)
    .order("applied_at", { ascending: false });
  if (error) throw new Error(`Supabase read failed: ${error.message}`);
  return (data || []).map(rowToCandidate);
}

/** Bulk insert — used right after parsing a batch (upload, Gmail, GitHub sourcing). */
export async function insertCandidates(companyId, candidates) {
  await demoReady(companyId);
  if (!candidates.length) return [];
  const rows = candidates.map((c) => candidateToRow(companyId, c));

  if (!db(companyId)) {
    if (!memCandidates.has(companyId)) memCandidates.set(companyId, new Map());
    for (const row of rows) memCandidates.get(companyId).set(row.id, row);
    return rows.map(rowToCandidate);
  }

  const { data, error } = await client().from(CANDIDATES_TABLE).insert(rows).select();
  if (error) throw new Error(`Supabase write failed: ${error.message}`);
  return (data || []).map(rowToCandidate);
}

export async function getCandidate(companyId, candidateId) {
  await demoReady(companyId);
  if (!db(companyId)) {
    const row = memCandidates.get(companyId)?.get(candidateId);
    return row ? rowToCandidate(row) : null;
  }
  const { data, error } = await client()
    .from(CANDIDATES_TABLE)
    .select("*")
    .eq("company_id", companyId)
    .eq("id", candidateId)
    .maybeSingle();
  if (error) throw new Error(`Supabase read failed: ${error.message}`);
  return data ? rowToCandidate(data) : null;
}

export async function getJob(companyId, jobId) {
  await demoReady(companyId);
  if (!jobId) return null;
  if (!db(companyId)) {
    const row = memJobs.get(companyId)?.get(jobId);
    return row ? rowToJob(row) : null;
  }
  const { data, error } = await client().from(JOBS_TABLE).select("*").eq("company_id", companyId).eq("id", jobId).maybeSingle();
  if (error) throw new Error(`Supabase read failed: ${error.message}`);
  return data ? rowToJob(data) : null;
}

/**
 * Partial update — status changes, shortlist results, jobId assignment.
 * `server` fields (shortlisted_at, invited_at, interview_at, …) are set by our
 * own code, never taken from the request body.
 */
export async function updateCandidate(companyId, candidateId, patch, server = {}) {
  await demoReady(companyId);
  const columnPatch = { ...server };
  if ("status" in patch) columnPatch.status = patch.status;
  if ("jobId" in patch) columnPatch.job_id = patch.jobId;
  if ("matchScore" in patch) columnPatch.match_score = patch.matchScore;
  if ("aiFlags" in patch) columnPatch.ai_flags = patch.aiFlags;
  if ("timeline" in patch) columnPatch.timeline = patch.timeline;

  if (!db(companyId)) {
    const row = memCandidates.get(companyId)?.get(candidateId);
    if (!row) return null;
    Object.assign(row, columnPatch);
    return rowToCandidate(row);
  }

  const { data, error } = await client()
    .from(CANDIDATES_TABLE)
    .update(columnPatch)
    .eq("company_id", companyId)
    .eq("id", candidateId)
    .select()
    .single();
  if (error) throw new Error(`Supabase write failed: ${error.message}`);
  return rowToCandidate(data);
}

/** Bulk delete by id — e.g. clearing out every candidate in roles that aren't needed. */
export async function deleteCandidates(companyId, ids) {
  await demoReady(companyId);
  if (!ids.length) return;

  if (!db(companyId)) {
    const bucket = memCandidates.get(companyId);
    if (bucket) for (const id of ids) bucket.delete(id);
    return;
  }

  const { error } = await client().from(CANDIDATES_TABLE).delete().eq("company_id", companyId).in("id", ids);
  if (error) throw new Error(`Supabase delete failed: ${error.message}`);
}

/* -------------------------------------------------------- résumé parse cache */

export async function getCachedParse(companyId, fileHash) {
  if (!fileHash) return null;

  if (!db(companyId)) {
    return (globalThis.__nexireParseCache ||= new Map()).get(`${companyId}:${fileHash}`) || null;
  }

  const { data, error } = await client()
    .from("resume_parse_cache")
    .select("parsed, provider, model")
    .eq("company_id", companyId)
    .eq("file_hash", fileHash)
    .maybeSingle();
  if (error) throw new Error(`Supabase read failed: ${error.message}`);
  return data || null;
}

export async function saveCachedParse(companyId, fileHash, parsed, { provider, model } = {}) {
  if (!fileHash) return;

  if (!db(companyId)) {
    (globalThis.__nexireParseCache ||= new Map()).set(`${companyId}:${fileHash}`, { parsed, provider, model });
    return;
  }

  const { error } = await client()
    .from("resume_parse_cache")
    .upsert({ company_id: companyId, file_hash: fileHash, parsed, provider, model });
  if (error) throw new Error(`Supabase write failed: ${error.message}`);
}
