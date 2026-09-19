"use client";

// Jobs and candidates are backed by Supabase now (lib/server/dataStore.js) —
// hydrated once on mount from /api/jobs and /api/candidates, and every
// mutation below writes through in the background so a refresh doesn't throw
// away parsing work. Falls back to the same in-memory store as before when
// Supabase isn't configured, so the app still works, it just won't survive a
// server restart until it's wired up (same story as the API-key store).
//
// Every mutation follows the same shape on purpose: compute the new value,
// call setState with a PURE updater (no side effects inside it — React
// Strict Mode double-invokes updaters in dev, which would double-fire the
// persistence fetch if it lived in there), then fire the persist call after.
//
// Long-running work (résumé parsing, Gmail import, auto-shortlist) lives here
// rather than in page-local state on purpose: this provider is mounted once in
// the root layout and never unmounts while navigating the app, but a page
// component unmounts the instant you click to another screen. Keeping an
// in-flight fetch's progress/results in page state means they vanish the
// moment you navigate away — the fetch itself keeps running, but nothing is
// left to receive its result. Owning that state here means the job keeps
// going, and reappears exactly where it left off when you come back.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { employer } from "@/lib/mock-data";
import { dedupeCandidates } from "@/lib/dedupe";
import { normalizeParsedCandidate, timestamp } from "@/lib/candidates";
import { matchJobForRole } from "@/lib/roleJobMatch";
import { DEBRIEF_CANDIDATES } from "@/lib/debriefData";

const StoreContext = createContext(null);

const EMPTY_UPLOAD_JOB = {
  queue: [],
  phase: "idle", // idle | working | done
  progress: { done: 0, total: 0 },
  parsed: [],
  failed: [],
  mode: null,
  model: null,
  fatal: "",
};

const EMPTY_MAIL_JOB = {
  phase: "idle", // idle | scanning | scanned | importing | done
  scan: null,
  mailboxes: null,
  parsed: [],
  failed: [],
  mode: null,
  model: null,
  error: "",
};

const EMPTY_SHORTLIST_JOB = {
  phase: "idle", // idle | running | done
  ranked: [],
  selectedIds: [],
  mode: null,
  model: null,
  githubConsidered: 0,
  githubConnected: false,
  error: "",
};

export function StoreProvider({ children }) {
  const [jobs, setJobs] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [toast, setToast] = useState(null);

  // Mock employer session. There is no auth — this only drives the signed-in
  // chrome (who you are, which company). Clears on refresh.
  const [session, setSession] = useState(null);
  const companyId = session?.company?.id || "demo-company";

  const notify = useCallback((message, tone = "success") => {
    setToast({ id: Date.now(), message, tone });
    setTimeout(() => setToast(null), 3600);
  }, []);

  // Hydrate once on mount (and again if the signed-in company changes) —
  // real data if Supabase is configured, otherwise stays empty just like
  // before.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [jobsRes, candidatesRes] = await Promise.all([
          fetch(`/api/jobs?companyId=${encodeURIComponent(companyId)}`),
          fetch(`/api/candidates?companyId=${encodeURIComponent(companyId)}`),
        ]);
        if (cancelled) return;
        if (jobsRes.ok) setJobs((await jobsRes.json()).jobs || []);
        if (candidatesRes.ok) setCandidates((await candidatesRes.json()).candidates || []);
      } catch {
        // Network error / Supabase unreachable — start empty, same as before.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const addJob = useCallback(
    (draft) => {
      // Random suffix, not just Date.now() — publishing several parsed jobs at
      // once (import flow's "Publish all") calls this in a tight synchronous
      // loop, and Date.now() alone can return the same millisecond twice.
      const id = `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const job = {
        id,
        title: draft.title || "Untitled role",
        department: draft.department || "Engineering",
        location: draft.location || "Remote",
        type: draft.type || "Full-time",
        level: draft.level || "Mid (3–5 yrs)",
        salary: draft.salary || "Not disclosed",
        status: draft.status || "Open",
        postedAt: new Date().toISOString().slice(0, 10),
        stack: draft.stack || [],
        summary: draft.summary || "",
        description: draft.description || "",
        responsibilities: draft.responsibilities || [],
        requirements: draft.requirements || [],
        benefits: draft.benefits || [],
        isNew: true,
      };
      setJobs((prev) => [job, ...prev]);
      fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, job }),
      }).catch(() => {});
      return job;
    },
    [companyId]
  );

  // Deletes the job and releases its candidates back to the general pool
  // (jobId cleared) rather than deleting or orphaning them.
  const removeJob = useCallback(
    async (jobId) => {
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
      setCandidates((prev) => prev.map((c) => (c.jobId === jobId ? { ...c, jobId: null } : c)));
      try {
        const res = await fetch(`/api/jobs?companyId=${encodeURIComponent(companyId)}&id=${encodeURIComponent(jobId)}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error((await res.json()).error || "Delete failed.");
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    },
    [companyId]
  );

  const setCandidateStatus = useCallback(
    (candidateId, status) => {
      setCandidates((prev) => prev.map((c) => (c.id === candidateId ? { ...c, status } : c)));
      fetch("/api/candidates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, id: candidateId, patch: { status } }),
      }).catch(() => {});
    },
    [companyId]
  );

  const addCandidate = useCallback(
    (draft) => {
      // Random suffix, not just Date.now() — bulk-add (e.g. shortlisting several
      // GitHub results at once) calls this in a tight synchronous loop, and
      // Date.now() alone can return the same millisecond for more than one call.
      const id = `cand-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const candidate = { ...draft, id, status: "applied" };
      setCandidates((prev) => [candidate, ...prev]);
      fetch("/api/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, candidates: [candidate] }),
      }).catch(() => {});
      return id;
    },
    [companyId]
  );

  // Takes a batch of parsed résumé records (already de-duplicated against each
  // other), checks them against every candidate already on the dashboard so
  // the same person uploaded in a later batch doesn't create a second entry,
  // then normalizes and stores whatever's left. Used by bulk upload and Gmail
  // import — the two résumé intake paths — so both fill the dashboard the
  // same way.
  //
  // Each record's classified role is matched against open job titles
  // (lib/roleJobMatch.js) so it lands directly in that job's Applied column
  // instead of the general unassigned pool — no manual "assign to job" step.
  const addCandidatesFromUpload = useCallback(
    (records, meta = {}) => {
      const { unique, duplicateCount } = dedupeCandidates(records, candidates);
      let autoMatched = 0;
      if (unique.length) {
        const normalized = unique.map((r) => {
          const matchedJob = matchJobForRole(r.role, jobs);
          if (matchedJob) autoMatched += 1;
          return normalizeParsedCandidate(r, {
            ...meta,
            jobId: matchedJob?.id || null,
            jobTitle: matchedJob?.title || null,
          });
        });
        setCandidates((prev) => [...normalized, ...prev]);
        fetch("/api/candidates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyId, candidates: normalized }),
        }).catch(() => {});
      }
      return { added: unique.length, duplicates: duplicateCount, autoMatched };
    },
    [candidates, companyId, jobs]
  );

  // Re-runs the role→job match (lib/roleJobMatch.js) over every candidate
  // still sitting unassigned — catches anyone uploaded before their matching
  // job existed, or before this auto-linking feature shipped. "Applied to
  // Jobs" button on the Jobs page. Leaves already-assigned candidates alone.
  const syncCandidatesToJobs = useCallback(() => {
    const matches = candidates
      .filter((c) => !c.jobId)
      .map((c) => ({ candidate: c, job: matchJobForRole(c.role, jobs) }))
      .filter((m) => m.job);

    if (!matches.length) return { matched: 0, byJob: [] };

    const patchById = new Map(
      matches.map(({ candidate, job }) => [
        candidate.id,
        {
          jobId: job.id,
          timeline: [
            ...(candidate.timeline || []),
            { at: timestamp(), event: `Auto-matched to ${job.title}'s Applied pipeline`, kind: "applied" },
          ],
        },
      ])
    );
    setCandidates((prev) =>
      prev.map((c) => (patchById.has(c.id) ? { ...c, ...patchById.get(c.id) } : c))
    );

    for (const { candidate } of matches) {
      const patch = patchById.get(candidate.id);
      fetch("/api/candidates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, id: candidate.id, patch }),
      }).catch(() => {});
    }

    const counts = new Map();
    for (const { job } of matches) counts.set(job.title, (counts.get(job.title) || 0) + 1);
    return { matched: matches.length, byJob: [...counts.entries()].map(([title, count]) => ({ title, count })) };
  }, [candidates, jobs, companyId]);

  // Bulk delete — e.g. clearing out every candidate in a role that isn't
  // needed. Takes a list of ids so the caller (role picker, individual
  // delete, whatever) decides what's in scope.
  const deleteCandidates = useCallback(
    async (ids) => {
      if (!ids.length) return { ok: true, deleted: 0 };
      const idSet = new Set(ids);
      setCandidates((prev) => prev.filter((c) => !idSet.has(c.id)));
      try {
        const res = await fetch("/api/candidates", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyId, ids }),
        });
        if (!res.ok) throw new Error((await res.json()).error || "Delete failed.");
        return { ok: true, deleted: ids.length };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    },
    [companyId]
  );

  // Applies an auto-shortlist result. Flow is Applied → Reviewed →
  // Shortlisted: every candidate the run scored (already tied to this job as
  // Applied — see lib/roleJobMatch.js) moves to "reviewed" first, since
  // they've now actually been evaluated against the role; the top picks
  // among them are then promoted a step further to "shortlisted". Anyone the
  // run didn't score (still genuinely un-reviewed) is left untouched.
  const shortlistForJob = useCallback(
    (jobId, ranked, selectedIds) => {
      const selectedSet = new Set(selectedIds);
      const rankById = new Map(ranked.map((r) => [r.id, r]));
      const patched = candidates
        .filter((c) => rankById.has(c.id))
        .map((c) => {
          const r = rankById.get(c.id);
          const selected = selectedSet.has(c.id);
          return {
            ...c,
            jobId,
            status: selected ? "shortlisted" : "reviewed",
            matchScore: r.score,
            aiFlags: [...(c.aiFlags || []), { tone: selected ? "success" : "neutral", text: r.reason }],
            timeline: [
              ...(c.timeline || []),
              {
                at: timestamp(),
                event: selected ? `Auto-shortlisted — score ${r.score}` : `Reviewed — score ${r.score}`,
                kind: selected ? "shortlisted" : "reviewed",
              },
            ],
          };
        });

      const patchById = new Map(patched.map((p) => [p.id, p]));
      setCandidates((prev) => prev.map((c) => patchById.get(c.id) || c));

      for (const c of patched) {
        fetch("/api/candidates", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companyId,
            id: c.id,
            patch: { jobId: c.jobId, status: c.status, matchScore: c.matchScore, aiFlags: c.aiFlags, timeline: c.timeline },
          }),
        }).catch(() => {});
      }
    },
    [candidates, companyId]
  );

  /* ------------------------------------------------------ bulk upload job */

  const [uploadJob, setUploadJob] = useState(EMPTY_UPLOAD_JOB);

  const setUploadQueue = useCallback((updater) => {
    setUploadJob((j) => ({
      ...j,
      queue: typeof updater === "function" ? updater(j.queue) : updater,
    }));
  }, []);

  const resetUploadJob = useCallback(() => setUploadJob(EMPTY_UPLOAD_JOB), []);

  const runUpload = useCallback(
    async (files, uploadCompanyId) => {
      if (!files?.length) return;
      const CHUNK = 4;

      setUploadJob((j) => ({
        ...j,
        phase: "working",
        fatal: "",
        parsed: [],
        failed: [],
        progress: { done: 0, total: files.length },
      }));

      const accumulated = [];
      const failures = [];

      for (let i = 0; i < files.length; i += CHUNK) {
        const chunk = files.slice(i, i + CHUNK);
        const form = new FormData();
        form.append("companyId", uploadCompanyId);
        chunk.forEach((file) => form.append("files", file));

        try {
          const res = await fetch("/api/resumes/parse", { method: "POST", body: form });
          const json = await res.json();

          if (!res.ok) {
            setUploadJob((j) => ({ ...j, phase: "idle", fatal: json.error || `Upload failed (HTTP ${res.status}).` }));
            return;
          }

          accumulated.push(...json.parsed);
          failures.push(...json.failed);
          setUploadJob((j) => ({
            ...j,
            mode: json.mode,
            model: json.model,
            parsed: [...accumulated],
            failed: [...failures],
            progress: { done: Math.min(i + CHUNK, files.length), total: files.length },
          }));
        } catch (error) {
          setUploadJob((j) => ({ ...j, phase: "idle", fatal: error.message || "Network error while uploading." }));
          return;
        }
      }

      setUploadJob((j) => ({ ...j, phase: "done" }));

      const { unique } = dedupeCandidates(accumulated);
      const { added, duplicates, autoMatched } = addCandidatesFromUpload(unique, { source: "upload" });
      const cachedCount = accumulated.filter((r) => r.cached).length;
      const parts = [`${added} new candidate${added === 1 ? "" : "s"} added to your dashboard`];
      if (autoMatched > 0) parts.push(`${autoMatched} auto-matched to an open role's Applied column`);
      if (duplicates > 0) parts.push(`${duplicates} already there`);
      if (cachedCount > 0) parts.push(`${cachedCount} reused a cached parse`);
      notify(parts.join(" · "));
    },
    [addCandidatesFromUpload, notify]
  );

  /* -------------------------------------------------------- Gmail import job */

  const [mailJob, setMailJob] = useState(EMPTY_MAIL_JOB);

  const resetMailJob = useCallback(() => setMailJob(EMPTY_MAIL_JOB), []);

  const scanMail = useCallback(async ({ companyId: scanCompanyId, mailbox, months, from, withMailboxes }) => {
    setMailJob((j) => ({ ...j, phase: "scanning", error: "", scan: null, parsed: [], failed: [] }));

    try {
      const res = await fetch("/api/resumes/gmail/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: scanCompanyId, mailbox, sinceMonths: months, from, withMailboxes }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMailJob((j) => ({ ...j, phase: "idle", error: json.error || `Couldn't read the mailbox (HTTP ${res.status}).` }));
        return;
      }
      setMailJob((j) => ({
        ...j,
        phase: "scanned",
        scan: json,
        mailboxes: json.mailboxes || j.mailboxes,
      }));
    } catch (e) {
      setMailJob((j) => ({ ...j, phase: "idle", error: e.message || "Network error while reading the mailbox." }));
    }
  }, []);

  const importMail = useCallback(
    async ({ companyId: importCompanyId, mailbox, months, from, maxFiles }) => {
      setMailJob((j) => ({ ...j, phase: "importing", error: "" }));

      try {
        const res = await fetch("/api/resumes/gmail", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyId: importCompanyId, mailbox, sinceMonths: months, from, maxFiles }),
        });
        const json = await res.json();
        if (!res.ok) {
          setMailJob((j) => ({ ...j, phase: "scanned", error: json.error || `Import failed (HTTP ${res.status}).` }));
          return;
        }

        setMailJob((j) => ({
          ...j,
          phase: "done",
          mode: json.mode,
          model: json.model,
          parsed: json.parsed || [],
          failed: json.failed || [],
        }));

        const { unique } = dedupeCandidates(json.parsed || []);
        const { added, duplicates, autoMatched } = addCandidatesFromUpload(unique, { source: "email" });
        const parts = [`${added} new candidate${added === 1 ? "" : "s"} added to your dashboard`];
        if (autoMatched > 0) parts.push(`${autoMatched} auto-matched to an open role's Applied column`);
        if (duplicates > 0) parts.push(`${duplicates} already there`);
        notify(parts.join(" · "));
      } catch (e) {
        setMailJob((j) => ({ ...j, phase: "scanned", error: e.message || "Network error during import." }));
      }
    },
    [addCandidatesFromUpload, notify]
  );

  /* -------------------------------------------------------- shortlist jobs */
  // Keyed by jobId — each job's shortlist run tracks separately.

  const [shortlistJobs, setShortlistJobs] = useState({});

  const patchShortlistJob = useCallback((jobId, patch) => {
    setShortlistJobs((prev) => ({
      ...prev,
      [jobId]: { ...(prev[jobId] || EMPTY_SHORTLIST_JOB), ...(typeof patch === "function" ? patch(prev[jobId] || EMPTY_SHORTLIST_JOB) : patch) },
    }));
  }, []);

  const resetShortlistJob = useCallback((jobId) => {
    setShortlistJobs((prev) => ({ ...prev, [jobId]: EMPTY_SHORTLIST_JOB }));
  }, []);

  const runShortlist = useCallback(
    async ({ job, pool, count, companyId: runCompanyId }) => {
      if (!pool.length) return;
      patchShortlistJob(job.id, { phase: "running", error: "" });

      try {
        const res = await fetch("/api/candidates/shortlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companyId: runCompanyId,
            job: {
              title: job.title,
              level: job.level,
              stack: job.stack,
              description: job.description,
              summary: job.summary,
              requirements: job.requirements,
            },
            candidates: pool.map((c) => ({
              id: c.id,
              name: c.name,
              headline: c.headline,
              role: c.role,
              skills: (c.skills || []).map((s) => (typeof s === "string" ? s : s.name)),
              experienceYears: c.experienceYears,
              summary: c.summary,
              githubUsername: c.githubUsername || null,
            })),
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          patchShortlistJob(job.id, { phase: "idle", error: json.error || `Shortlisting failed (HTTP ${res.status}).` });
          return;
        }

        const bounded = Math.max(1, Math.min(count || 1, pool.length));
        const top = json.ranked.slice(0, bounded);
        shortlistForJob(job.id, json.ranked, top.map((r) => r.id));

        patchShortlistJob(job.id, {
          phase: "done",
          mode: json.mode,
          model: json.model,
          ranked: json.ranked,
          selectedIds: top.map((r) => r.id),
          githubConsidered: json.githubConsidered || 0,
          githubConnected: Boolean(json.githubConnected),
        });
        notify(`${top.length} candidate${top.length === 1 ? "" : "s"} shortlisted for ${job.title}`);
      } catch (e) {
        patchShortlistJob(job.id, { phase: "idle", error: e.message || "Network error while shortlisting." });
      }
    },
    [patchShortlistJob, shortlistForJob, notify]
  );

  /* ------------------------------------------------------------ debrief */
  // Candidates who've completed the AI interview, with evidence-based
  // reports — see lib/debriefData.js. STRUCTURAL / MOCK: the interview
  // engine isn't built (same caveat as the Interviewer tab), so this seeds
  // from fixed mock data rather than /api/candidates. Status changes and
  // hire/reject overrides update this in-memory state so they survive
  // navigating away and back, same pattern as uploadJob/mailJob — but, like
  // the rest of the interview-engine surface, don't hit a real database
  // since there's no real debrief record to persist yet.

  const [debriefCandidates, setDebriefCandidates] = useState(DEBRIEF_CANDIDATES);

  const updateDebriefCandidate = useCallback((id, patch) => {
    setDebriefCandidates((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }, []);

  /* ----------------------------------------------------------- session */

  const signIn = useCallback(({ name, email, company = null, companyRole = null } = {}) => {
    const display = name?.trim() || employer.name;
    setSession({
      name: display,
      email: email?.trim() || employer.email,
      initials: display
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0])
        .join("")
        .toUpperCase(),
      company,
      companyRole,
    });
  }, []);

  const signOut = useCallback(() => setSession(null), []);

  const setSessionCompany = useCallback((company) => {
    setSession((s) => (s ? { ...s, company } : s));
  }, []);

  const setSessionRole = useCallback((companyRole) => {
    setSession((s) => (s ? { ...s, companyRole } : s));
  }, []);

  const value = useMemo(
    () => ({
      jobs,
      candidates,
      addJob,
      removeJob,
      addCandidate,
      addCandidatesFromUpload,
      syncCandidatesToJobs,
      deleteCandidates,
      shortlistForJob,
      setCandidateStatus,
      toast,
      notify,
      session,
      signIn,
      signOut,
      setSessionCompany,
      setSessionRole,
      getJob: (id) => jobs.find((j) => j.id === id),
      getCandidate: (id) => candidates.find((c) => c.id === id),
      candidatesForJob: (jobId) => candidates.filter((c) => c.jobId === jobId),
      // background jobs
      uploadJob,
      setUploadQueue,
      resetUploadJob,
      runUpload,
      mailJob,
      scanMail,
      importMail,
      resetMailJob,
      shortlistJobs,
      runShortlist,
      resetShortlistJob,
      debriefCandidates,
      updateDebriefCandidate,
    }),
    [
      jobs,
      candidates,
      addJob,
      removeJob,
      addCandidate,
      addCandidatesFromUpload,
      syncCandidatesToJobs,
      deleteCandidates,
      shortlistForJob,
      setCandidateStatus,
      toast,
      notify,
      session,
      signIn,
      signOut,
      setSessionCompany,
      setSessionRole,
      uploadJob,
      setUploadQueue,
      resetUploadJob,
      runUpload,
      mailJob,
      scanMail,
      importMail,
      resetMailJob,
      shortlistJobs,
      runShortlist,
      resetShortlistJob,
      debriefCandidates,
      updateDebriefCandidate,
    ]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}
