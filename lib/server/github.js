// Pulls a candidate's public GitHub activity so real project work counts
// toward shortlisting, not just what the résumé claims. Uses the company's
// stored GitHub token (Settings → API Connections) when connected, for the
// 5,000/hr authenticated rate limit; falls back to unauthenticated requests
// (60/hr per IP) otherwise, same tolerant pattern as the rest of the app.
//
// Deliberately a heuristic, not a model call: it has to run once per
// candidate across a whole pool, and GitHub's own metadata (stars, recency,
// language) is already a decent, explainable signal on its own.

const GITHUB_API = "https://api.github.com";
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export class GithubRateLimitError extends Error {}

function headers(token) {
  const h = { Accept: "application/vnd.github+json", "User-Agent": "nexire-ai" };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function getJson(url, token) {
  const res = await fetch(url, { headers: headers(token) });
  if (res.status === 404) return null;
  if (res.status === 403 || res.status === 429) throw new GithubRateLimitError("GitHub API rate limit hit.");
  if (!res.ok) throw new Error(`GitHub returned HTTP ${res.status}.`);
  return res.json();
}

/**
 * @param {string} username
 * @param {{token?: string, jobStack?: string[]}} opts
 * @returns {Promise<null|{score:number, reason:string, repoCount:number, starTotal:number, topRepos:Array, profileUrl:string}>}
 *   null when the username doesn't resolve to a real GitHub account.
 */
export async function scoreGithubProfile(username, { token, jobStack = [] } = {}) {
  const repos = await getJson(
    `${GITHUB_API}/users/${encodeURIComponent(username)}/repos?per_page=100&sort=pushed`,
    token
  );
  if (!repos) return null;

  const profileUrl = `https://github.com/${username}`;
  const original = repos.filter((r) => !r.fork);

  if (!original.length) {
    return {
      score: 10,
      reason: "GitHub profile found, but no original public repositories.",
      repoCount: 0,
      starTotal: 0,
      topRepos: [],
      profileUrl,
    };
  }

  const starTotal = original.reduce((n, r) => n + (r.stargazers_count || 0), 0);
  const languages = new Set(original.map((r) => r.language).filter(Boolean));
  const stackLower = new Set(jobStack.map((s) => s.toLowerCase()));
  const languageMatch = [...languages].filter((l) => stackLower.has(l.toLowerCase())).length;
  const recentlyActive = original.filter((r) => r.pushed_at && Date.now() - new Date(r.pushed_at).getTime() < ONE_YEAR_MS).length;

  // Four signals, capped and summed — evidence of real, current, relevant work.
  const volumeScore = Math.min(30, original.length * 3);
  const starScore = Math.min(30, Math.round(Math.log2(starTotal + 1) * 8));
  const activityScore = Math.min(25, recentlyActive * 5);
  const stackScore = Math.min(15, languageMatch * 8);
  const score = Math.min(100, volumeScore + starScore + activityScore + stackScore);

  const topRepos = [...original]
    .sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0))
    .slice(0, 3)
    .map((r) => ({
      name: r.name,
      stars: r.stargazers_count || 0,
      language: r.language,
      description: r.description || "",
      url: r.html_url,
    }));

  const parts = [`${original.length} original repo${original.length === 1 ? "" : "s"}`];
  if (starTotal) parts.push(`${starTotal} star${starTotal === 1 ? "" : "s"} total`);
  if (recentlyActive) parts.push(`${recentlyActive} pushed to in the last year`);
  if (languageMatch) parts.push(`${languageMatch} language${languageMatch === 1 ? "" : "s"} matching the job stack`);

  return { score, reason: `${parts.join(", ")}.`, repoCount: original.length, starTotal, topRepos, profileUrl };
}

/**
 * Real search against GitHub's public Search Users API — for finding
 * candidates outright, not just scoring someone already applied. Search has
 * its own tighter rate limit (10/min unauthenticated, 30/min authenticated),
 * separate from the core API limit used elsewhere in this file.
 *
 * @param {{keyword?: string, language?: string, location?: string}} filters
 * @param {{token?: string, limit?: number}} opts
 * @returns {Promise<Array<{login, name, avatarUrl, bio, company, location, followers, publicRepos, htmlUrl}>>}
 */
export async function searchGithubUsers({ keyword = "", language = "", location = "" } = {}, { token, limit = 12 } = {}) {
  const parts = ["type:user"];
  if (keyword.trim()) parts.push(keyword.trim());
  if (language.trim()) parts.push(`language:${language.trim()}`);
  if (location.trim()) parts.push(`location:${location.trim()}`);

  const q = parts.join(" ");
  const search = await getJson(
    `${GITHUB_API}/search/users?q=${encodeURIComponent(q)}&per_page=${Math.min(limit, 30)}`,
    token
  );
  const logins = (search?.items || []).map((u) => u.login);
  if (!logins.length) return [];

  const profiles = await Promise.all(
    logins.map(async (login) => {
      try {
        return await getJson(`${GITHUB_API}/users/${encodeURIComponent(login)}`, token);
      } catch {
        return null; // one profile failing (rate limit mid-batch) shouldn't drop the rest
      }
    })
  );

  return profiles
    .filter(Boolean)
    .map((p) => ({
      login: p.login,
      name: p.name || p.login,
      avatarUrl: p.avatar_url,
      bio: p.bio || "",
      company: p.company || "",
      location: p.location || "",
      followers: p.followers || 0,
      publicRepos: p.public_repos || 0,
      htmlUrl: p.html_url,
    }));
}

// Filler words that survive naive tokenizing but are useless as GitHub search
// terms. Used only when no LLM is connected to do this properly.
const STOPWORDS = new Set([
  "the", "a", "an", "with", "and", "or", "for", "to", "of", "in", "on", "at",
  "that", "who", "has", "have", "had", "built", "building", "build", "experience",
  "someone", "need", "needs", "needed", "looking", "want", "wants", "using",
  "able", "can", "should", "would", "like", "person", "candidate", "project",
  "we", "our", "us", "is", "are", "was", "were", "be", "been", "this", "it",
]);

/** Naive keyword extraction for when there's no LLM to do it properly. */
export function heuristicKeywords(text, limit = 6) {
  const words = String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  const seen = new Set();
  const out = [];
  for (const w of words) {
    if (w.length < 3 || STOPWORDS.has(w) || seen.has(w)) continue;
    seen.add(w);
    out.push(w);
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * Finds candidates by searching GitHub's public repositories directly for
 * ones matching a project requirement, then surfaces the repo owners — real
 * evidence of having built that kind of thing, not a claim on a résumé.
 * One person can own several matching repos; those get grouped and scored
 * together rather than listed as separate results.
 *
 * @param {{keywords: string[], language?: string}} query
 * @param {{token?: string, limit?: number}} opts
 * @returns {Promise<Array<{login, name, avatarUrl, bio, company, location, followers, publicRepos, htmlUrl, score, matchedRepos}>>}
 */
export async function findCandidatesByProject({ keywords, language = "" }, { token, limit = 10 } = {}) {
  const langPart = language.trim() ? `language:${language.trim()}` : "";

  // GitHub ANDs every keyword together, so a precise 4-term query often
  // matches nothing even when each term is reasonable on its own. Start with
  // the full set and drop the least-important (trailing) keyword each retry
  // until something matches, or there's only one left.
  let repos = [];
  for (let n = keywords.length; n >= 1 && !repos.length; n--) {
    const q = [...keywords.slice(0, n), langPart, "stars:>2"].filter(Boolean).join(" ");
    const search = await getJson(
      `${GITHUB_API}/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=30`,
      token
    );
    repos = (search?.items || []).filter((r) => r.owner?.type === "User" && !r.fork);
  }

  // Last resort: the single strongest keyword with no star floor at all.
  if (!repos.length && keywords.length) {
    const q = [keywords[0], langPart].filter(Boolean).join(" ");
    const search = await getJson(
      `${GITHUB_API}/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=30`,
      token
    );
    repos = (search?.items || []).filter((r) => r.owner?.type === "User" && !r.fork);
  }

  if (!repos.length) return [];

  const byOwner = new Map();
  for (const r of repos) {
    if (!byOwner.has(r.owner.login)) byOwner.set(r.owner.login, []);
    byOwner.get(r.owner.login).push(r);
  }

  const owners = [...byOwner.keys()].slice(0, limit);
  const profiles = await Promise.all(
    owners.map(async (login) => {
      try {
        return await getJson(`${GITHUB_API}/users/${encodeURIComponent(login)}`, token);
      } catch {
        return null;
      }
    })
  );

  return owners
    .map((login, i) => {
      const profile = profiles[i];
      const matchedRepos = byOwner
        .get(login)
        .sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0))
        .slice(0, 3)
        .map((r) => ({
          name: r.name,
          stars: r.stargazers_count || 0,
          language: r.language,
          description: r.description || "",
          url: r.html_url,
        }));

      const starTotal = matchedRepos.reduce((n, r) => n + r.stars, 0);
      const score = Math.min(100, Math.round(Math.log2(starTotal + 1) * 12 + matchedRepos.length * 8));

      return {
        login,
        name: profile?.name || login,
        avatarUrl: profile?.avatar_url || `https://github.com/${login}.png`,
        bio: profile?.bio || "",
        company: profile?.company || "",
        location: profile?.location || "",
        followers: profile?.followers || 0,
        publicRepos: profile?.public_repos || 0,
        htmlUrl: profile?.html_url || `https://github.com/${login}`,
        score,
        matchedRepos,
      };
    })
    .sort((a, b) => b.score - a.score);
}
