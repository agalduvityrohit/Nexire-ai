// Adapts a parsed résumé record (from /api/resumes/parse or /api/resumes/gmail —
// see lib/server/llm.js#parseAndClassify) into the richer candidate shape the
// dashboard UI reads (components/dashboard/CandidateTable.jsx, the candidate
// detail page). The parser gives us flat fields; the UI wants skills with a
// level, structured experience entries, etc. — this fills the gap with honest
// defaults rather than fabricated ones.

function slug(name = "") {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Paths that follow github.com/ but aren't a username — a résumé link to one
// of these would otherwise be misread as someone's GitHub handle.
const GITHUB_RESERVED = new Set([
  "settings", "topics", "marketplace", "sponsors", "about", "pricing",
  "features", "explore", "notifications", "issues", "pulls", "codespaces",
  "search", "apps", "orgs", "collections", "trending",
]);

function extractGithubUsername(links = []) {
  for (const raw of links) {
    const match = String(raw).match(/github\.com\/([a-zA-Z0-9](?:[a-zA-Z0-9-]){0,38})/i);
    if (match && !GITHUB_RESERVED.has(match[1].toLowerCase())) return match[1];
  }
  return null;
}

export function timestamp() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${date} · ${time}`;
}

/**
 * @param {object} parsed one record from a parse/import API response
 * @param {{source?: string, jobId?: string|null, jobTitle?: string|null}} meta
 */
export function normalizeParsedCandidate(parsed, meta = {}) {
  const name = parsed.name || parsed.filename || "Unnamed candidate";
  const skills = (parsed.skills || []).map((s) => ({ name: s, level: "Working", years: 0 }));

  const jobTitles = parsed.jobTitles || [];
  const companies = parsed.companies || [];
  const experience = jobTitles.map((role, i) => ({
    role,
    company: companies[i] || "",
    location: "",
    period: "",
    bullets: [],
  }));

  const education = (parsed.education || []).map((line) => ({
    degree: line,
    school: "",
    detail: "",
    year: "",
  }));

  const githubUsername = extractGithubUsername(parsed.links);

  return {
    id: `cand-${slug(name) || "candidate"}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    name,
    headline: parsed.headline || parsed.currentTitle || parsed.role || "",
    email: parsed.email || "",
    phone: parsed.phone || "",
    location: parsed.location || "",
    summary: parsed.roleReason || "",
    skills,
    experience,
    education,
    projects: [],
    links: parsed.links?.length ? { other: parsed.links.join(", ") } : null,
    githubUsername,
    githubUrl: githubUsername ? `https://github.com/${githubUsername}` : null,
    experienceYears: parsed.totalYearsExperience || 0,
    matchScore: Math.round((parsed.roleConfidence || 0) * 100),
    status: "applied",
    source: meta.source || "upload",
    jobId: meta.jobId || null,
    appliedAt: new Date().toISOString().slice(0, 10),
    resumeFile: parsed.filename || "",
    resumeHash: parsed.resumeHash || null,
    role: parsed.role || "Other",
    aiFlags: [],
    report: null,
    noticePeriod: "—",
    expected: "—",
    timeline: [
      {
        at: timestamp(),
        event: meta.jobId
          ? `Résumé parsed — classified as ${parsed.role || "Other"}, auto-matched to ${meta.jobTitle || "an open role"}`
          : `Résumé parsed — classified as ${parsed.role || "Other"}`,
        kind: "applied",
      },
    ],
  };
}

/**
 * Turns a real GitHub search result into a candidate record — no résumé
 * involved, so most fields are honestly empty rather than guessed. Used by
 * the "Add as candidate" action on Candidate sourcing → GitHub.
 * @param {{login, name, avatarUrl, bio, company, location, followers, publicRepos, htmlUrl}} profile
 * @param {{matchedRepos?: Array, requirements?: string, score?: number}} meta
 *   Set when found via the project-requirements search (lib/server/github.js
 *   #findCandidatesByProject) — carries the repo evidence onto the candidate
 *   instead of a plain profile lookup.
 */
export function normalizeGithubCandidate(profile, meta = {}) {
  const name = profile.name || profile.login;
  const matchedRepos = meta.matchedRepos || [];
  const foundViaProject = matchedRepos.length > 0;

  const summary = foundViaProject
    ? `Matched on project requirement via ${matchedRepos.map((r) => r.name).join(", ")}.`
    : profile.bio || "";

  return {
    id: `cand-${slug(name) || "candidate"}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    name,
    headline: profile.bio || profile.company || "",
    email: "",
    phone: "",
    location: profile.location || "",
    summary,
    skills: [...new Set(matchedRepos.map((r) => r.language).filter(Boolean))].map((l) => ({
      name: l,
      level: "Working",
      years: 0,
    })),
    experience: profile.company ? [{ role: "", company: profile.company, location: "", period: "", bullets: [] }] : [],
    education: [],
    projects: matchedRepos.map((r) => ({ name: r.name, desc: r.description, tech: [r.language].filter(Boolean) })),
    links: null,
    githubUsername: profile.login,
    githubUrl: profile.htmlUrl,
    avatarUrl: profile.avatarUrl,
    experienceYears: 0,
    matchScore: meta.score ?? 0,
    status: "applied",
    source: "github",
    jobId: null,
    appliedAt: new Date().toISOString().slice(0, 10),
    resumeFile: "",
    role: "Other",
    aiFlags: foundViaProject
      ? [{ tone: "success", text: `Found via project search: "${meta.requirements}"` }]
      : [],
    report: null,
    noticePeriod: "—",
    expected: "—",
    timeline: [
      {
        at: timestamp(),
        event: foundViaProject
          ? `Found via project search — matched ${matchedRepos.length} repo${matchedRepos.length === 1 ? "" : "s"}`
          : `Found on GitHub — ${profile.publicRepos} public repos, ${profile.followers} followers`,
        kind: "applied",
      },
    ],
  };
}
