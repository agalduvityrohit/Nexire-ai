// Gemini REST client (no SDK — keeps the dependency surface small and the
// request shape explicit).
//
// MODEL NOTE: the spec asked for "gemini-3.5-flash-lite". I could not verify
// that this model id exists, so it is configurable via GEMINI_MODEL and the
// error surfaced on a bad id is passed through verbatim rather than swallowed.
// If the id is wrong you will see Google's own 404 in the UI.

import { ROLE_LABELS } from "@/lib/roles";

const API_ROOT = "https://generativelanguage.googleapis.com/v1beta";

export const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

export { ROLE_LABELS };

class GeminiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "GeminiError";
    this.status = status;
  }
}

async function generate({ apiKey, model = DEFAULT_MODEL, parts, responseSchema, maxOutputTokens = 2048 }) {
  const body = {
    contents: [{ role: "user", parts }],
    generationConfig: {
      temperature: 0,
      maxOutputTokens,
      ...(responseSchema ? { responseMimeType: "application/json", responseSchema } : {}),
    },
  };

  const res = await fetch(`${API_ROOT}/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const detail = json?.error?.message || `HTTP ${res.status}`;
    throw new GeminiError(detail, res.status);
  }

  const text = json?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
  if (!text) throw new GeminiError("Gemini returned an empty response.", 502);
  return text;
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    // Models occasionally wrap JSON in a fence despite responseMimeType.
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        /* fall through */
      }
    }
    throw new GeminiError("Gemini did not return valid JSON.", 502);
  }
}

/* ------------------------------------------------------------ test call */

export async function testGeminiKey(apiKey, model = DEFAULT_MODEL) {
  const started = Date.now();
  const text = await generate({
    apiKey,
    model,
    parts: [{ text: "Reply with the single word: ok" }],
    maxOutputTokens: 16,
  });
  return { ok: true, model, latencyMs: Date.now() - started, sample: text.trim().slice(0, 40) };
}

/* ------------------------------------------------- parse + classify a resume */

const RESUME_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string" },
    email: { type: "string" },
    phone: { type: "string" },
    location: { type: "string" },
    headline: { type: "string" },
    currentTitle: { type: "string" },
    totalYearsExperience: { type: "number" },
    skills: { type: "array", items: { type: "string" } },
    jobTitles: { type: "array", items: { type: "string" } },
    companies: { type: "array", items: { type: "string" } },
    education: { type: "array", items: { type: "string" } },
    links: { type: "array", items: { type: "string" } },
    role: { type: "string", enum: ROLE_LABELS },
    roleConfidence: { type: "number" },
    roleReason: { type: "string" },
  },
  required: ["name", "skills", "jobTitles", "role", "roleConfidence"],
};

const INSTRUCTION = `You are parsing a candidate résumé for an applicant tracking system.

Return JSON only, matching the provided schema.

Extraction rules:
- Copy values verbatim from the document. Do not invent anything.
- If a field is genuinely absent, use an empty string for strings, [] for arrays, 0 for numbers.
- "skills" should be concrete technologies, tools, and methods — not soft skills.
- "jobTitles" should be every job title held, most recent first.
- "totalYearsExperience" is your best numeric estimate of professional experience.

Role classification:
- Using the candidate's skills, job titles, and experience, classify them into the SINGLE closest
  matching role from this fixed list: ${ROLE_LABELS.join(", ")}.
- Use "Other" when the candidate clearly does not fit any of the listed roles (for example a nurse,
  an accountant, or a mechanical engineer). Do not force a technical label onto a non-technical CV.
- "roleConfidence" is 0..1. "roleReason" is one short sentence citing the evidence you used.`;

/**
 * @param {object} args
 * @param {string} args.apiKey
 * @param {string} [args.model]
 * @param {string} [args.text]      extracted plain text (DOCX/TXT)
 * @param {string} [args.pdfBase64] raw PDF, sent to Gemini natively
 */
export async function parseAndClassifyResume({ apiKey, model = DEFAULT_MODEL, text, pdfBase64, filename }) {
  const parts = [{ text: INSTRUCTION }];

  if (pdfBase64) {
    parts.push({ inlineData: { mimeType: "application/pdf", data: pdfBase64 } });
  } else {
    parts.push({ text: `Résumé file: ${filename}\n\n---\n${text}` });
  }

  const raw = await generate({ apiKey, model, parts, responseSchema: RESUME_SCHEMA, maxOutputTokens: 2048 });
  const parsed = parseJson(raw);

  // Never trust the model to stay inside the enum.
  if (!ROLE_LABELS.includes(parsed.role)) parsed.role = "Other";

  return {
    name: parsed.name || "",
    email: (parsed.email || "").trim().toLowerCase(),
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

export { GeminiError };
