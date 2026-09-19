// Scores a pool of candidates against one job on two signals:
//   1. Résumé fit — the LLM provider the company has connected, or a
//      keyword/experience heuristic when none is configured.
//   2. GitHub projects — real public repos for whoever's résumé linked a
//      GitHub profile (lib/candidates.js extracts the username at parse
//      time). Candidates without one are scored on résumé fit alone.
//
// Candidate pools can be large, so both signals are fetched with bounded
// concurrency rather than one call at a time.

import { mapWithConcurrency } from "@/lib/server/pipeline";
import { rankCandidatesForJob } from "@/lib/server/llm";
import { scoreGithubProfile } from "@/lib/server/github";

const CHUNK_SIZE = 25;
const CONCURRENCY = 3;
const GITHUB_CONCURRENCY = 4;

// How much weight real GitHub project evidence carries once it's available.
// Résumé fit still dominates — a project score is corroborating evidence,
// not a replacement for matching the job.
const GITHUB_WEIGHT = 0.35;

function normalise(s) {
  return String(s).toLowerCase().trim();
}

function scoreHeuristically(job, candidate) {
  const stack = new Set((job.stack || []).map(normalise));
  const skills = new Set((candidate.skills || []).map(normalise));
  let overlap = 0;
  for (const s of stack) if (skills.has(s)) overlap += 1;

  const skillScore = stack.size ? (overlap / stack.size) * 80 : 40;
  const expScore = Math.min(20, (candidate.experienceYears || 0) * 2.5);

  return {
    id: candidate.id,
    score: Math.round(Math.min(100, skillScore + expScore)),
    reason: overlap
      ? `Keyword overlap on ${overlap} of ${stack.size} listed skills — heuristic only, no model connected.`
      : "No overlap with the listed stack — heuristic only, no model connected.",
  };
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function scoreResumes(job, candidates, llm) {
  if (!llm) return candidates.map((c) => scoreHeuristically(job, c));

  const byId = new Map(candidates.map((c) => [c.id, c]));
  const chunks = chunk(candidates, CHUNK_SIZE);
  const results = await mapWithConcurrency(chunks, CONCURRENCY, (batch) =>
    rankCandidatesForJob({ providerId: llm.providerId, apiKey: llm.apiKey, model: llm.model, job, candidates: batch })
  );

  // A candidate the model dropped from its reply isn't a genuine 0 — fall
  // back to the same heuristic used when there's no model at all, so one
  // skipped row on a batch doesn't unfairly tank an otherwise strong fit.
  return results.flat().map((r) => {
    if (!r.missing) return r;
    const fallback = scoreHeuristically(job, byId.get(r.id));
    return { ...fallback, reason: `Model didn't score this one — used a keyword-overlap estimate instead. ${fallback.reason}` };
  });
}

/** Map of candidateId -> GitHub profile score, for whoever has a detected username. */
async function scoreGithub(candidates, { githubToken, jobStack }) {
  const withGithub = candidates.filter((c) => c.githubUsername);
  if (!withGithub.length) return new Map();

  const entries = await mapWithConcurrency(withGithub, GITHUB_CONCURRENCY, async (c) => {
    try {
      return [c.id, await scoreGithubProfile(c.githubUsername, { token: githubToken, jobStack })];
    } catch {
      // Rate-limited or unreachable — degrade to résumé-only for this
      // candidate rather than failing the whole shortlist run.
      return [c.id, null];
    }
  });

  return new Map(entries.filter(([, profile]) => profile));
}

/**
 * @param {{title, level, stack, description, summary, requirements}} job
 * @param {Array<{id, name, headline, role, skills, experienceYears, summary, githubUsername}>} candidates
 * @param {{providerId, apiKey, model}|null} llm null means no key configured — heuristic mode
 * @param {string|null} githubToken company's stored GitHub token, if connected
 * @returns {Promise<Array<{id, score, resumeScore, githubScore, github, reason}>>}
 */
export async function shortlistCandidates({ job, candidates, llm, githubToken }) {
  const [resumeScores, githubScores] = await Promise.all([
    scoreResumes(job, candidates, llm),
    scoreGithub(candidates, { githubToken, jobStack: job.stack || [] }),
  ]);

  return resumeScores.map((r) => {
    const gh = githubScores.get(r.id);
    if (!gh) return { id: r.id, score: r.score, resumeScore: r.score, githubScore: null, github: null, reason: r.reason };

    const score = Math.round(r.score * (1 - GITHUB_WEIGHT) + gh.score * GITHUB_WEIGHT);
    return {
      id: r.id,
      score,
      resumeScore: r.score,
      githubScore: gh.score,
      github: gh,
      reason: `${r.reason} GitHub: ${gh.reason}`,
    };
  });
}
