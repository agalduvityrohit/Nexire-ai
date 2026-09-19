// One interface over every supported LLM provider.
//
// Three wire formats cover all of them:
//   gemini    — generativelanguage.googleapis.com, native PDF input
//   anthropic — /v1/messages
//   openai    — /v1/chat/completions (also Groq, Cerebras, Mistral, OpenRouter)
//
// Every adapter returns parsed JSON and surfaces the provider's own error text
// verbatim, so a wrong model id or a revoked key is readable rather than
// flattened into "request failed".

import { LLM_PROVIDERS } from "@/lib/providers";
import { ROLE_LABELS } from "@/lib/roles";

export class LlmError extends Error {
  constructor(message, status, retryAfterMs) {
    super(message);
    this.name = "LlmError";
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

// Parses a Retry-After header (seconds, or an HTTP-date) into milliseconds.
function retryAfterMs(res) {
  const header = res.headers.get("retry-after");
  if (!header) return undefined;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return seconds * 1000;
  const date = Date.parse(header);
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : undefined;
}

function isRetryable(status) {
  return status === 429 || status === 503;
}

// Retries rate-limited/overloaded calls with exponential backoff + jitter,
// honoring a provider's Retry-After header when it sends one. Bulk uploads
// fan out many résumés at once, so hitting a per-minute quota mid-batch is
// the common case rather than the exception.
async function withRetry(fn, { retries = 5, baseDelayMs = 1500, maxDelayMs = 20000 } = {}) {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (error) {
      if (!(error instanceof LlmError) || !isRetryable(error.status) || attempt >= retries) throw error;
      const backoff = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
      const delay = error.retryAfterMs ?? backoff + Math.random() * 500;
      await new Promise((resolve) => setTimeout(resolve, delay));
      attempt += 1;
    }
  }
}

function config(providerId) {
  const cfg = LLM_PROVIDERS[providerId];
  if (!cfg) throw new LlmError(`Unknown LLM provider "${providerId}".`, 400);
  return cfg;
}

export function resolveModel(providerId, override) {
  return (override || "").trim() || config(providerId).defaultModel;
}

function extractJson(text) {
  if (!text) throw new LlmError("The model returned an empty response.", 502);
  try {
    return JSON.parse(text);
  } catch {
    // Some models wrap JSON in a markdown fence despite being told not to.
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    const candidate = fenced ? fenced[1] : text.match(/\{[\s\S]*\}/)?.[0];
    if (candidate) {
      try {
        return JSON.parse(candidate);
      } catch {
        /* fall through */
      }
    }
    throw new LlmError("The model did not return valid JSON.", 502);
  }
}

/* ------------------------------------------------------------------ gemini */

async function callGemini({ apiKey, model, system, user, pdfBase64, maxTokens }) {
  const parts = [{ text: `${system}\n\n${user}` }];
  if (pdfBase64) parts.push({ inlineData: { mimeType: "application/pdf", data: pdfBase64 } });

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: { temperature: 0, maxOutputTokens: maxTokens, responseMimeType: "application/json" },
      }),
    }
  );

  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new LlmError(json?.error?.message || `HTTP ${res.status}`, res.status, retryAfterMs(res));
  return json?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
}

/* --------------------------------------------------------------- anthropic */

async function callAnthropic({ apiKey, model, baseUrl, system, user, pdfBase64, maxTokens }) {
  const content = [];
  if (pdfBase64) {
    content.push({
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: pdfBase64 },
    });
  }
  content.push({ type: "text", text: user });

  const res = await fetch(`${baseUrl}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature: 0,
      system,
      messages: [{ role: "user", content }],
    }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new LlmError(json?.error?.message || `HTTP ${res.status}`, res.status, retryAfterMs(res));
  return (json?.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
}

/* ------------------------------------------------ openai-compatible family */

async function callOpenAiCompatible({ apiKey, model, baseUrl, system, user, maxTokens, json = true }) {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: maxTokens,
      ...(json ? { response_format: { type: "json_object" } } : {}),
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = body?.error?.message || body?.message || `HTTP ${res.status}`;
    throw new LlmError(detail, res.status, retryAfterMs(res));
  }
  return body?.choices?.[0]?.message?.content || "";
}

/* ------------------------------------------------------------- dispatchers */

async function callRaw({ providerId, apiKey, model, system, user, pdfBase64, maxTokens = 2048, json = true }) {
  const cfg = config(providerId);
  const resolved = resolveModel(providerId, model);

  return withRetry(() => {
    if (cfg.kind === "gemini") {
      return callGemini({ apiKey, model: resolved, system, user, pdfBase64, maxTokens });
    }
    if (cfg.kind === "anthropic") {
      return callAnthropic({ apiKey, model: resolved, baseUrl: cfg.baseUrl, system, user, pdfBase64, maxTokens });
    }
    return callOpenAiCompatible({ apiKey, model: resolved, baseUrl: cfg.baseUrl, system, user, maxTokens, json });
  });
}

/** Lightweight round-trip used by the Test Connection buttons. */
export async function testProvider({ providerId, apiKey, model }) {
  const started = Date.now();
  const resolved = resolveModel(providerId, model);

  const text = await callRaw({
    providerId,
    apiKey,
    model: resolved,
    system: "You are a health check. Reply with JSON only.",
    user: 'Reply with exactly: {"ok":true}',
    maxTokens: 64,
  });

  return {
    ok: true,
    provider: providerId,
    model: resolved,
    latencyMs: Date.now() - started,
    sample: String(text).trim().slice(0, 60),
  };
}

/* ---------------------------------------------------------------- model list */

// Ids that turn up in a provider's catalog but aren't chat models — no point
// offering them in a "pick a model to parse résumés with" list.
const NON_CHAT_MODEL = /embed|whisper|tts|dall-e|moderation|rerank|davinci|babbage|-curie|-ada\b/i;

/** Lists the models a given key can actually see, straight from the provider's own catalog. */
export async function listModels({ providerId, apiKey }) {
  const cfg = config(providerId);

  if (cfg.kind === "gemini") {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`
    );
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new LlmError(json?.error?.message || `HTTP ${res.status}`, res.status);
    return (json.models || [])
      .filter((m) => (m.supportedGenerationMethods || []).includes("generateContent"))
      .map((m) => m.name.replace(/^models\//, ""))
      .sort();
  }

  if (cfg.kind === "anthropic") {
    const res = await fetch(`${cfg.baseUrl}/models`, {
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new LlmError(json?.error?.message || `HTTP ${res.status}`, res.status);
    return (json.data || []).map((m) => m.id).sort();
  }

  // openai-compatible — Groq, Cerebras, Mistral, OpenRouter, NVIDIA NIM, OpenAI itself.
  const res = await fetch(`${cfg.baseUrl}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new LlmError(json?.error?.message || json?.message || `HTTP ${res.status}`, res.status);
  }
  return (json.data || [])
    .map((m) => m.id)
    .filter((id) => id && !NON_CHAT_MODEL.test(id))
    .sort();
}

/* ------------------------------------------------- résumé parse + classify */

const SYSTEM = `You parse candidate résumés for an applicant tracking system. You reply with JSON only — no prose, no markdown fence.`;

function buildUserPrompt({ text, filename }) {
  return `Extract the following fields from the résumé and return a single JSON object with exactly these keys:

{
  "name": string,
  "email": string,
  "phone": string,
  "location": string,
  "headline": string,
  "currentTitle": string,
  "totalYearsExperience": number,
  "skills": string[],
  "jobTitles": string[],
  "companies": string[],
  "education": string[],
  "links": string[],
  "role": one of [${ROLE_LABELS.map((r) => `"${r}"`).join(", ")}],
  "roleConfidence": number between 0 and 1,
  "roleReason": string
}

Rules:
- Copy values verbatim from the document. Invent nothing.
- Missing field: "" for strings, [] for arrays, 0 for numbers.
- "skills" means concrete technologies, tools and methods — not soft skills.
- "jobTitles": every title held, most recent first.
- Classify "role" into the SINGLE closest match from the list above, using skills,
  job titles and experience. Use "Other" when the candidate clearly fits none of them
  (a nurse, an accountant, a mechanical engineer). Never force a technical label onto
  a non-technical CV.
- "roleReason": one short sentence citing the evidence you used.

${text ? `Résumé file: ${filename}\n\n---\n${text}` : `The résumé is attached as a PDF (file: ${filename}).`}`;
}

export async function parseAndClassify({ providerId, apiKey, model, text, pdfBase64, filename }) {
  const raw = await callRaw({
    providerId,
    apiKey,
    model,
    system: SYSTEM,
    user: buildUserPrompt({ text, filename }),
    pdfBase64,
    maxTokens: 2048,
  });

  const parsed = extractJson(raw);
  if (!ROLE_LABELS.includes(parsed.role)) parsed.role = "Other";

  return {
    name: parsed.name || "",
    email: String(parsed.email || "").trim().toLowerCase(),
    phone: parsed.phone || "",
    location: parsed.location || "",
    headline: parsed.headline || parsed.currentTitle || "",
    currentTitle: parsed.currentTitle || "",
    totalYearsExperience: Number(parsed.totalYearsExperience) || 0,
    skills: Array.isArray(parsed.skills) ? parsed.skills : [],
    jobTitles: Array.isArray(parsed.jobTitles) ? parsed.jobTitles : [],
    companies: Array.isArray(parsed.companies) ? parsed.companies : [],
    education: Array.isArray(parsed.education) ? parsed.education : [],
    links: Array.isArray(parsed.links) ? parsed.links : [],
    role: parsed.role,
    roleConfidence: Number(parsed.roleConfidence) || 0,
    roleReason: parsed.roleReason || "",
  };
}

/* --------------------------------------------------- job-fit shortlisting */

const SHORTLIST_SYSTEM = `You screen job applicants for a hiring team. You reply with JSON only — no prose, no markdown fence.`;

function buildShortlistPrompt({ job, candidates }) {
  const jobBlock = `Job: ${job.title}
Level: ${job.level || "Not specified"}
Key stack/skills: ${(job.stack || []).join(", ") || "Not specified"}
Description: ${job.description || job.summary || "Not specified"}
Requirements:
${(job.requirements || []).map((r) => `- ${r}`).join("\n") || "- Not specified"}`;

  const candidateBlock = candidates
    .map(
      (c, i) => `${i + 1}. id="${c.id}" name="${c.name}"
   Headline: ${c.headline || "—"}
   Role classification: ${c.role || "—"}
   Experience: ${c.experienceYears || 0} years
   Skills: ${(c.skills || []).join(", ") || "—"}
   Notes: ${c.summary || "—"}`
    )
    .join("\n\n");

  return `${jobBlock}

Score how well each candidate below fits THIS job, from 0 (no fit) to 100 (excellent fit). Judge on skills
overlap, relevant experience, and seniority match — not on résumé length or wording.

Candidates:
${candidateBlock}

Return a single JSON object: { "rankings": [ { "id": string, "score": number, "reason": string } ] } — exactly
one entry per candidate listed above, in any order, "reason" a single short sentence citing the evidence.`;
}

/**
 * Scores a batch of candidates (already-parsed résumé summaries) against one
 * job. Always returns one result per input candidate, in the input order,
 * even if the model drops or reorders entries in its reply.
 */
export async function rankCandidatesForJob({ providerId, apiKey, model, job, candidates }) {
  const raw = await callRaw({
    providerId,
    apiKey,
    model,
    system: SHORTLIST_SYSTEM,
    user: buildShortlistPrompt({ job, candidates }),
    maxTokens: Math.min(4096, 300 + candidates.length * 90),
  });

  const parsed = extractJson(raw);
  const rankings = Array.isArray(parsed?.rankings) ? parsed.rankings : [];
  const byId = new Map(rankings.map((r) => [String(r.id), r]));

  return candidates.map((c) => {
    const r = byId.get(String(c.id));
    // `missing` (not sent to the client) tells the caller this candidate
    // wasn't in the model's reply at all — worth a heuristic fallback score
    // rather than treating a genuine 0 and "the model skipped this row" the
    // same way, which would unfairly zero someone out on a model hiccup.
    return {
      id: c.id,
      score: Math.max(0, Math.min(100, Math.round(Number(r?.score) || 0))),
      reason: r?.reason || "The model didn't return a score for this candidate.",
      missing: !r,
    };
  });
}

/* ------------------------------------------------- project-based GitHub search */

const SEARCH_TERMS_SYSTEM = `You turn a hiring manager's project requirement into a short GitHub repository search query. You reply with JSON only — no prose, no markdown fence.`;

function buildSearchTermsPrompt(requirements) {
  return `Project requirement from a hiring manager:
"""
${requirements}
"""

Extract 2-4 short GitHub search keywords that would find repositories demonstrating this kind of work.
GitHub's repository search requires EVERY keyword to literally appear in a repo's name, description, or
topics — so each one must be a single plain word or a short established term someone would actually write,
never an invented compound slug.

Good: "redis", "task queue", "golang", "job scheduler"
Bad: "go-redis-task-queue", "distributed-job-scheduler-with-retries" (too specific, hyphenated, matches nothing)

Fewer, more common words find more matches than many precise ones — GitHub ANDs every keyword together.
Also name the single most likely primary programming language if the requirement implies one, or an empty
string if it doesn't.

Return: { "keywords": string[], "language": string }`;
}

/**
 * Distills a free-text project requirement into a GitHub repository search
 * query. Used so "build a real-time chat app with websockets and Redis" turns
 * into terms GitHub's search can actually match, rather than being thrown at
 * it verbatim (a full sentence ANDs every word together and usually matches
 * nothing).
 */
export async function extractGithubSearchTerms({ providerId, apiKey, model, requirements }) {
  const raw = await callRaw({
    providerId,
    apiKey,
    model,
    system: SEARCH_TERMS_SYSTEM,
    user: buildSearchTermsPrompt(requirements),
    maxTokens: 300,
  });

  const parsed = extractJson(raw);
  return {
    keywords: Array.isArray(parsed?.keywords) ? parsed.keywords.filter(Boolean).slice(0, 4) : [],
    language: typeof parsed?.language === "string" ? parsed.language.trim() : "",
  };
}

/* ------------------------------------------------- job posting extraction */

const JOB_EXTRACT_SYSTEM = `You extract structured job postings from raw text for an applicant tracking system. You reply with JSON only — no prose, no markdown fence.`;

function buildJobExtractPrompt(text) {
  return `The text below is one or more job descriptions — possibly one, possibly several, run together or
separated by headers, page breaks, or blank lines. Identify each distinct job posting and extract it.

For each posting found, return an object with exactly these keys:

{
  "title": string,
  "department": one of ["Engineering", "Design", "Product", "Go-to-market", "Operations", "Data"] — infer from the role if not stated,
  "location": string — "Remote" if not specified,
  "type": one of ["Full-time", "Contract", "Part-time", "Internship"] — default "Full-time",
  "level": one of ["Intern", "Junior (0–2 yrs)", "Mid (3–5 yrs)", "Senior (5–8 yrs)", "Staff / Principal (8+ yrs)"] — infer from years of experience mentioned,
  "salary": string — verbatim if stated, else "",
  "summary": string — one plain-language sentence,
  "description": string — the role narrative, cleaned up prose, substance only,
  "responsibilities": string[],
  "requirements": string[],
  "benefits": string[],
  "stack": string[] — concrete technologies, tools and languages mentioned, not soft skills
}

Rules:
- Only extract what is actually in the text. Never invent a posting that is not there.
- If the text contains only one job, return an array with exactly one object.
- If a section has no clear job title, skip it rather than guessing.

Text:
"""
${text}
"""

Return: { "jobs": [ ... ] }`;
}

/**
 * Segments raw text (which may contain several job descriptions run
 * together, e.g. one PDF exported from a hiring plan doc) into individual
 * structured postings ready for lib/store.jsx#addJob.
 */
export async function extractJobPostings({ providerId, apiKey, model, text }) {
  const maxTokens = Math.min(7000, 1200 + Math.ceil(text.length / 2.5));
  const raw = await callRaw({
    providerId,
    apiKey,
    model,
    system: JOB_EXTRACT_SYSTEM,
    user: buildJobExtractPrompt(text),
    maxTokens,
  });

  const parsed = extractJson(raw);
  const jobs = Array.isArray(parsed?.jobs) ? parsed.jobs : [];

  return jobs
    .filter((j) => j?.title && String(j.title).trim())
    .map((j) => ({
      title: String(j.title).trim(),
      department: j.department || "Engineering",
      location: j.location || "Remote",
      type: j.type || "Full-time",
      level: j.level || "Mid (3–5 yrs)",
      salary: j.salary || "",
      summary: j.summary || "",
      description: j.description || "",
      responsibilities: Array.isArray(j.responsibilities) ? j.responsibilities : [],
      requirements: Array.isArray(j.requirements) ? j.requirements : [],
      benefits: Array.isArray(j.benefits) ? j.benefits : [],
      stack: Array.isArray(j.stack) ? j.stack : [],
    }));
}
