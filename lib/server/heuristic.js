// Keyword fallback used ONLY when no Gemini key is configured.
//
// This exists so the Bulk Upload screen is reviewable before credentials are
// wired up. It is deliberately unsophisticated and always reports itself as
// "heuristic" so its output is never mistaken for a real classification.
//
// It cannot read PDFs (those are handed to Gemini natively rather than parsed
// locally), so PDFs come back flagged `needsKey` instead of being guessed at.

import { ROLE_LABELS } from "@/lib/roles";

const SIGNALS = [
  ["ML Engineer", ["pytorch", "tensorflow", "machine learning", "deep learning", "mlops", "model training", "hugging face"]],
  ["Data Scientist", ["data scientist", "statistics", "regression", "scikit", "jupyter", "hypothesis", "predictive model"]],
  ["Data Analyst", ["data analyst", "power bi", "tableau", "excel", "dashboards", "sql queries", "reporting"]],
  ["DevOps Engineer", ["devops", "kubernetes", "terraform", "ci/cd", "jenkins", "ansible", "site reliability", "docker swarm"]],
  ["QA Engineer", ["qa engineer", "test automation", "selenium", "cypress", "manual testing", "test cases", "quality assurance"]],
  ["UI/UX Designer", ["figma", "ux design", "ui design", "wireframe", "prototyping", "user research", "sketch"]],
  ["Product Manager", ["product manager", "roadmap", "stakeholder", "product owner", "user stories", "backlog", "go-to-market"]],
  ["Frontend Developer", ["react", "vue", "angular", "css", "tailwind", "frontend", "javascript", "typescript", "next.js"]],
  ["Full Stack Developer", ["full stack", "fullstack", "mern", "mean", "front-end and back-end", "end-to-end development"]],
  ["Software Engineer", ["software engineer", "java", "golang", "c++", "backend", "microservices", "api", "spring boot"]],
];

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const PHONE_RE = /(\+?\d[\d\s().-]{8,}\d)/;

function guessName(text, filename) {
  const firstLine = (text.split("\n").find((l) => l.trim().length > 2) || "").trim();
  if (firstLine && firstLine.length < 60 && !firstLine.includes("@")) return firstLine;
  return filename.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
}

export function classifyHeuristically(text, filename) {
  // No locally-extractable text (i.e. a PDF): don't guess.
  if (!text || text.trim().length < 40) {
    return {
      name: filename.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim(),
      email: "",
      phone: "",
      location: "",
      headline: "",
      currentTitle: "",
      totalYearsExperience: 0,
      skills: [],
      jobTitles: [],
      companies: [],
      education: [],
      links: [],
      role: "Other",
      roleConfidence: 0,
      roleReason: "Not classified — needs a Gemini API key to read this file.",
      needsKey: true,
    };
  }

  const haystack = text.toLowerCase();

  let best = { role: "Other", hits: 0, matched: [] };
  for (const [role, keywords] of SIGNALS) {
    const matched = keywords.filter((k) => haystack.includes(k));
    if (matched.length > best.hits) best = { role, hits: matched.length, matched };
  }

  const role = ROLE_LABELS.includes(best.role) && best.hits > 0 ? best.role : "Other";

  return {
    name: guessName(text, filename),
    email: (text.match(EMAIL_RE)?.[0] || "").toLowerCase(),
    phone: text.match(PHONE_RE)?.[0]?.trim() || "",
    location: "",
    headline: "",
    currentTitle: "",
    totalYearsExperience: 0,
    skills: best.matched,
    jobTitles: [],
    companies: [],
    education: [],
    links: [],
    role,
    roleConfidence: best.hits ? Math.min(0.5, best.hits / 10) : 0,
    roleReason: best.hits
      ? `Keyword match only (${best.matched.slice(0, 3).join(", ")}). Not a real classification.`
      : "No matching keywords found.",
    needsKey: false,
  };
}
