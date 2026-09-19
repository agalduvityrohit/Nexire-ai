// Matches a candidate's classified role (lib/roles.js#ROLE_LABELS) against a
// company's open job titles, so a parsed résumé lands directly in the right
// job's Applied column instead of a general unassigned pool. Job titles are
// free text ("Senior Frontend Engineer (Remote)"), so this checks for
// discriminating keywords per role rather than an exact string match.

const ROLE_MATCH_KEYWORDS = {
  "Software Engineer": ["software engineer", "backend", "back-end", "back end", "server side"],
  "Frontend Developer": ["frontend", "front-end", "front end", "react developer", "web developer", "ui developer"],
  "Full Stack Developer": ["full stack", "fullstack", "full-stack"],
  "Data Scientist": ["data scientist", "data science"],
  "Data Analyst": ["data analyst", "business analyst", "analytics"],
  "DevOps Engineer": ["devops", "site reliability", " sre", "infrastructure engineer", "cloud engineer", "platform engineer"],
  "ML Engineer": ["machine learning", "ml engineer", "ai engineer", "artificial intelligence"],
  "Product Manager": ["product manager", "product management", "pm "],
  "UI/UX Designer": ["designer", " ux", "ui/ux", "product design"],
  "QA Engineer": ["qa engineer", "quality assurance", "test engineer", "automation engineer", "sdet", " qa "],
};

/**
 * Returns the best-matching open job for a candidate's classified role, or
 * null if the role is "Other"/unrecognized or no open job's title matches.
 * When more than one open job matches, the most recently posted one wins —
 * `jobs` is already newest-first (see addJob).
 */
export function matchJobForRole(role, jobs) {
  if (!role || role === "Other" || !jobs?.length) return null;
  const keywords = ROLE_MATCH_KEYWORDS[role];
  if (!keywords) return null;

  for (const job of jobs) {
    if (job.status !== "Open") continue;
    const title = ` ${(job.title || "").toLowerCase()} `;
    if (keywords.some((kw) => title.includes(kw))) return job;
  }
  return null;
}
