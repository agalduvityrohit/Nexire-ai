// Rebuilds lib/demoData.json — the sample dataset the public demo dashboard shows
// (10 jobs, ~496 candidates) — from the 500 synthetic résumé PDFs + manifest CSV.
//
//   node scripts/build-demo-data.mjs "<folder with the PDFs and resumes_500_manifest.csv>"
//
// Why this exists: the demo used to read these rows from Supabase, so a paused or
// unreachable project emptied the demo. Now the data ships with the app and the
// demo never touches the database.
//
// Everything here is derived, nothing is invented at random:
//   - person fields come from parsing each PDF (name, contact, summary, skills,
//     work history, projects, education)
//   - duplicates are removed with the app's own lib/dedupe.js rules
//   - scores use the app's heuristic formula from lib/server/shortlist.js
//     (skill overlap with the job's stack, plus years of experience)
//   - "randomness" (applied dates, source, review order) is a hash of the filename,
//     so rebuilding gives the same file every time
// Dates are stored as day offsets; lib/demoDataset.js turns them into real dates
// when the demo is seeded, so the demo never looks stale.

import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { PDFParse } from "pdf-parse";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = resolve(process.argv[2] || process.env.DEMO_SOURCE_DIR || "");
if (!process.argv[2] && !process.env.DEMO_SOURCE_DIR) {
  console.error('Usage: node scripts/build-demo-data.mjs "<folder with PDFs + resumes_500_manifest.csv>"');
  process.exit(1);
}

/* -------- reuse the app's own dedupe rules (ESM copy so plain node can import it) */
const tmp = mkdtempSync(join(tmpdir(), "nx-demo-"));
writeFileSync(join(tmp, "dedupe.mjs"), readFileSync(join(root, "lib/dedupe.js"), "utf8").replace(/^﻿/, ""));
const { dedupeCandidates } = await import(pathToFileURL(join(tmp, "dedupe.mjs")).href);

/* ----------------------------------------------------------------- helpers */
const sha = (s) => createHash("sha256").update(s).digest("hex");
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const num = (hex, i) => parseInt(hex.slice(i * 8, i * 8 + 8), 16);

function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell.replace(/\r$/, "")); rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell.replace(/\r$/, "")); rows.push(row); }
  const [head, ...body] = rows.filter((r) => r.length > 1);
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] || "").trim()])));
}

/* ------------------------------------------------------------- PDF parsing */
const SECTIONS = ["SUMMARY", "SKILLS", "WORK EXPERIENCE", "PROJECTS", "EDUCATION"];
const PERIOD = /^\d{4}\s*[–—-]\s*(\d{4}|Present)$/;

async function pdfText(file) {
  const parser = new PDFParse({ data: new Uint8Array(readFileSync(file)) });
  try {
    return (await parser.getText()).text;
  } finally {
    await parser.destroy?.().catch?.(() => {});
  }
}

function parseResume(text) {
  // Some source PDFs print "L&T; Infotech" (a stray ";" from the generator that made
  // them). Drop a ";" after "&X" unless it's a real HTML entity (&amp; &lt; …).
  text = text.replace(/&(?!(?:amp|lt|gt|quot|apos|nbsp);)([A-Za-z]{1,6});/g, "&$1");
  const lines = text.replace(/\r/g, "").split("\n").map((l) => l.trim()).filter((l) => l && !/^--\s*\d+\s*of\s*\d+\s*--$/.test(l));
  const name = lines[0];

  const firstSection = lines.findIndex((l) => SECTIONS.includes(l));
  const header = lines.slice(1, firstSection).join(" ");
  const parts = header.split("|").map((p) => p.trim()).filter(Boolean);
  const email = (header.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/) || [""])[0].toLowerCase();
  const phone = (header.match(/(?:\+\d{1,3}[\s-]?)?\d{10}/) || [""])[0];
  const location = parts.find((p) => /,\s*India$/i.test(p)) || "";
  const github = parts.find((p) => /github\.com\//i.test(p)) || "";
  const linkedin = parts.find((p) => /linkedin\.com\//i.test(p)) || "";

  const sec = {};
  let cur = null;
  for (const l of lines.slice(firstSection)) {
    if (SECTIONS.includes(l)) { cur = l; sec[cur] = []; continue; }
    if (cur) sec[cur].push(l);
  }

  const summary = (sec["SUMMARY"] || []).join(" ");
  const skills = (sec["SKILLS"] || []).join(" ").split(",").map((s) => s.trim()).filter(Boolean);

  // Work experience: "Title — Company" / "2024 – 2026" / "• bullet" (bullets can wrap).
  const experience = [];
  const ex = sec["WORK EXPERIENCE"] || [];
  for (let i = 0; i < ex.length; i++) {
    if (ex[i].includes(" — ") && PERIOD.test(ex[i + 1] || "")) {
      const [role, ...co] = ex[i].split(" — ");
      experience.push({ role: role.trim(), company: co.join(" — ").trim(), location: "", period: ex[i + 1].replace(/\s*[–—-]\s*/, " – "), bullets: [] });
      i++;
    } else if (experience.length) {
      const cur = experience[experience.length - 1];
      if (ex[i].startsWith("•")) cur.bullets.push(ex[i].replace(/^•\s*/, ""));
      else if (cur.bullets.length) cur.bullets[cur.bullets.length - 1] += " " + ex[i];
    }
  }

  // Projects: "name (github.com/handle/name)" followed by a description (can wrap).
  const projects = [];
  const pr = [];
  for (const l of sec["PROJECTS"] || []) {
    if (/^\(github\.com\/[^)]+\)$/.test(l) && pr.length) pr[pr.length - 1] += " " + l; // heading split from its URL
    else pr.push(l);
  }
  for (const l of pr) {
    const m = l.match(/^(.+?)\s*\((github\.com\/[^)\s]+)\)$/);
    if (m) projects.push({ name: m[1].trim(), url: m[2], desc: "", tech: [] });
    else if (projects.length) {
      const p = projects[projects.length - 1];
      p.desc = (p.desc ? p.desc + " " : "") + l;
    }
  }

  // Education: "B.Tech, Computer Science" then "NIT Warangal, 2020".
  const education = [];
  const ed = sec["EDUCATION"] || [];
  for (let i = 0; i < ed.length; i += 2) {
    const m = (ed[i + 1] || "").match(/^(.*),\s*(\d{4})$/);
    education.push({ degree: ed[i], school: m ? m[1].trim() : ed[i + 1] || "", detail: "", year: m ? m[2] : "" });
  }

  return { name, email, phone, location, github, linkedin, summary, skills, experience, projects, education };
}

/* ---------------------------------------------------------------- the jobs */
// One open job per role in the manifest (50 résumés each). Titles are the ones the
// original demo used. `stack` is filled in below from what candidates actually list.
const JOBS = [
  { role: "Software Engineer", title: "Software Engineer (Backend)", department: "Engineering", location: "Bengaluru, India", level: "Mid (3–5 yrs)", salary: "₹22L–₹38L", posted: 52, slotsHours: [30, 54, 78],
    summary: "Build and run the services behind the core product — APIs, data pipelines and the reliability work that keeps them up.",
    description: "You'll design, ship and operate backend services end to end. We care about correctness under load, clear ownership, and leaving systems simpler than you found them.",
    responsibilities: ["Design and ship backend services and APIs", "Own the reliability of what you build, including on-call", "Review code and mentor engineers earlier in their careers"],
    requirements: ["3+ years building backend services in production", "Strong in Java, Python or Node.js, plus SQL", "Comfortable reasoning about failure modes and scale"] },
  { role: "Frontend Developer", title: "Frontend Developer", department: "Engineering", location: "Bengaluru, India", level: "Mid (3–5 yrs)", salary: "₹18L–₹30L", posted: 49,
    summary: "Own the employer dashboard's UI — fast, accessible, and pleasant to use all day.",
    description: "You'll build the interfaces recruiters live in. Performance, accessibility and craft matter here, and you'll work directly with design.",
    responsibilities: ["Build and ship dashboard features in React", "Keep the UI fast and accessible", "Work with design on interaction details"],
    requirements: ["3+ years shipping production frontend code", "Strong JavaScript/TypeScript and React fundamentals", "An eye for detail and a bias to ship"] },
  { role: "Data Scientist", title: "Data Scientist", department: "Data", location: "Remote (India)", level: "Mid (3–5 yrs)", salary: "₹24L–₹40L", posted: 47,
    summary: "Turn messy hiring data into models and analyses the product team can act on.",
    description: "You'll own analyses and models end to end, from framing the question to putting results in front of the people who decide.",
    responsibilities: ["Frame ambiguous questions and design the analysis", "Build, evaluate and explain models", "Present findings to non-technical stakeholders"],
    requirements: ["3+ years applied data science", "Strong Python, statistics and SQL", "Can explain a result to someone who doesn't care about the method"] },
  { role: "DevOps Engineer", title: "DevOps Engineer", department: "Engineering", location: "Hyderabad, India", level: "Senior (5+ yrs)", salary: "₹28L–₹45L", posted: 55,
    summary: "Keep the platform fast, cheap and boringly reliable.",
    description: "You'll own infrastructure, CI/CD and observability so product engineers can ship safely many times a day.",
    responsibilities: ["Own cloud infrastructure and CI/CD pipelines", "Improve observability and incident response", "Keep cloud spend in check"],
    requirements: ["5+ years in DevOps or SRE", "Hands-on with Kubernetes, Terraform and a major cloud", "Has run on-call and written the postmortem"] },
  { role: "QA Engineer", title: "QA Engineer", department: "Engineering", location: "Pune, India", level: "Mid (3–5 yrs)", salary: "₹12L–₹22L", posted: 44,
    summary: "Own quality across releases — automation first, with real exploratory testing where it counts.",
    description: "You'll build the test strategy and automation that lets the team release with confidence.",
    responsibilities: ["Design and maintain automated test suites", "Run exploratory testing on new features", "Partner with engineers to catch issues earlier"],
    requirements: ["3+ years in QA or test automation", "Strong with Selenium, Cypress or similar", "Writes clear, reproducible bug reports"] },
  { role: "UI/UX Designer", title: "UI/UX Designer", department: "Design", location: "Bengaluru, India", level: "Mid (3–5 yrs)", salary: "₹16L–₹28L", posted: 46,
    summary: "Design the workflows recruiters use every day, and the design system underneath them.",
    description: "You'll take problems from research to polished, shippable design and help grow the design system.",
    responsibilities: ["Run research and turn it into design", "Own flows end to end in Figma", "Contribute to the design system"],
    requirements: ["3+ years in product design", "A portfolio showing process, not just screens", "Comfortable working closely with engineers"] },
  { role: "Data Analyst", title: "Data Analyst", department: "Data", location: "Mumbai, India", level: "Junior (1–3 yrs)", salary: "₹8L–₹16L", posted: 42,
    summary: "Answer the questions the business asks every week — with clean data and clear dashboards.",
    description: "You'll own reporting and ad-hoc analysis, and make sure the numbers people rely on are right.",
    responsibilities: ["Build and maintain dashboards", "Answer ad-hoc questions with SQL", "Check data quality and flag problems"],
    requirements: ["1+ years in an analyst role", "Strong SQL and Excel; BI tool experience", "Careful with data and clear in writing"] },
  { role: "Product Manager", title: "Product Manager", department: "Product", location: "Bengaluru, India", level: "Senior (5+ yrs)", salary: "₹32L–₹52L", posted: 58,
    summary: "Decide what we build next, and why — grounded in what recruiters actually need.",
    description: "You'll own the roadmap for part of the product, working across design, engineering and customers.",
    responsibilities: ["Own the roadmap and write clear specs", "Talk to customers every week", "Make trade-offs visible and decide"],
    requirements: ["5+ years in product management", "Has shipped and measured a B2B product", "Writes crisply and prioritises ruthlessly"] },
  { role: "ML Engineer", title: "Machine Learning Engineer", department: "Engineering", location: "Remote (India)", level: "Mid (3–5 yrs)", salary: "₹28L–₹46L", posted: 50, slotsHours: [36, 60],
    summary: "Ship ML models to production and keep them healthy — not just notebooks.",
    description: "You'll take models from experiment to a served, monitored system, and own them once they're live.",
    responsibilities: ["Productionise and monitor models", "Build evaluation and retraining pipelines", "Work with product on what to optimise"],
    requirements: ["3+ years shipping ML in production", "Strong Python and a major ML framework", "Comfortable owning a service, not just a model"] },
  { role: "Full Stack Developer", title: "Full Stack Developer", department: "Engineering", location: "Pune, India", level: "Mid (3–5 yrs)", salary: "₹18L–₹32L", posted: 41, slotsHours: [48, 72],
    summary: "Ship features across the UI and the API underneath it.",
    description: "You'll own features end to end — the React UI, the API and the database behind them.",
    responsibilities: ["Own features from design review to production", "Keep the API layer clean as the product grows", "Pair with design on interaction details"],
    requirements: ["3+ years shipping full-stack features", "Strong React and Node.js or similar", "Comfortable owning a feature without heavy oversight"] },
];

/* ----------------------------------------------------------------- run it */
const manifest = parseCsv(readFileSync(join(SRC, "resumes_500_manifest.csv"), "utf8"));
console.log(`manifest rows: ${manifest.length}`);

const problems = [];
const parsed = [];
for (const row of manifest.sort((a, b) => a.filename.localeCompare(b.filename))) {
  const file = join(SRC, row.filename);
  const p = parseResume(await pdfText(file));
  if (p.name !== row.name) problems.push(`${row.filename}: name "${p.name}" ≠ manifest "${row.name}"`);
  for (const k of ["email", "phone", "location", "summary"]) if (!p[k]) problems.push(`${row.filename}: missing ${k}`);
  if (!p.skills.length) problems.push(`${row.filename}: no skills`);
  if (!p.education.length) problems.push(`${row.filename}: no education`);
  if (!p.projects.length) problems.push(`${row.filename}: no projects`);
  if (p.projects.some((x) => !x.desc)) problems.push(`${row.filename}: project without description`);
  // A 1-year "junior" résumé legitimately lists only projects; 2+ years with no jobs means a parse miss.
  if (Number(row.years_experience) >= 2 && !p.experience.length) problems.push(`${row.filename}: ${row.years_experience} yrs but no work history`);
  parsed.push({ ...p, filename: row.filename, role: row.role, level: row.level, years: Number(row.years_experience) || 0, hash: sha(readFileSync(file)) });
}
console.log(`parsed ${parsed.length} PDFs, ${problems.length} problems`);
const kinds = {}; for (const x of problems) { const k = x.split(": ").slice(1).join(": ").replace(/d+ yrs/, "N yrs"); kinds[k] = (kinds[k] || 0) + 1; } console.log("  problem kinds:", kinds);

// Same rules the app applies on import.
const { unique, duplicates } = dedupeCandidates(parsed.map((r) => ({ ...r })));
console.log(`after dedupe: ${unique.length} candidates (${duplicates.length} merged)`);
duplicates.forEach((d) => console.log(`  merged ${d.filename} into ${d.mergedInto} — ${d.reason}`));

// Job stacks = the skills candidates for that role most often list.
const techVocab = new Set(parsed.flatMap((p) => p.skills));
const jobs = JOBS.map((j, i) => {
  const counts = new Map();
  for (const c of unique.filter((c) => c.role === j.role)) for (const s of c.skills) counts.set(s, (counts.get(s) || 0) + 1);
  const stack = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 6).map(([s]) => s);
  return { id: `demo-job-${slug(j.title)}`, ...j, stack, status: "Open", type: "Full-time", benefits: ["Hybrid — 3 days in office", "Health cover for family", "Annual learning budget"], hiringManagerEmail: "priya@northwindlabs.com" };
});
const jobByRole = new Map(jobs.map((j) => [j.role, j]));

// Heuristic score — identical formula to scoreHeuristically() in lib/server/shortlist.js.
function score(job, c) {
  const stack = new Set(job.stack.map((s) => s.toLowerCase().trim()));
  const have = new Set(c.skills.map((s) => s.toLowerCase().trim()));
  const matched = job.stack.filter((s) => have.has(s.toLowerCase().trim()));
  const skillScore = stack.size ? (matched.length / stack.size) * 80 : 40;
  const expScore = Math.min(20, c.years * 2.5);
  return {
    score: Math.round(Math.min(100, skillScore + expScore)),
    reason: matched.length
      ? `Keyword overlap on ${matched.length} of ${stack.size} listed skills (${matched.join(", ")}) — heuristic only, no model connected.`
      : `No overlap with the listed stack — heuristic only, no model connected.`,
  };
}

const cands = unique.map((c) => {
  const job = jobByRole.get(c.role);
  const h = sha(c.filename);
  const s = score(job, c);
  const gh = (c.github.match(/github\.com\/([A-Za-z0-9-]+)/) || [])[1] || null;
  const latest = c.experience[0];
  const edu = c.education[0];
  return {
    id: `demo-cand-${slug(c.name)}-${h.slice(0, 6)}`,
    name: c.name,
    email: c.email,
    phone: c.phone,
    location: c.location,
    headline: latest ? `${latest.role}, ${latest.company}` : edu ? `${edu.degree}, ${edu.school}` : c.role,
    summary: c.summary,
    role: c.role,
    jobId: job.id,
    source: num(h, 1) % 100 < 70 ? "upload" : "email",
    matchScore: s.score,
    reason: s.reason,
    experienceYears: c.years,
    resumeFile: c.filename,
    resumeHash: c.hash,
    githubUsername: gh,
    githubUrl: gh ? `https://github.com/${gh}` : null,
    links: { ...(c.github && { github: c.github }), ...(c.linkedin && { linkedin: c.linkedin }) },
    skills: c.skills, // plain names; lib/demoDataset.js expands to { name, level, years } like a real import
    experience: c.experience,
    education: c.education,
    projects: c.projects.map((p) => ({
      name: p.name,
      desc: p.desc,
      tech: [...techVocab].filter((t) => new RegExp(`(^|[^A-Za-z])${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^A-Za-z]|$)`, "i").test(p.desc)).slice(0, 5),
    })),
    appliedDaysAgo: 1 + (num(h, 0) % 38),
    tod: 9 * 60 + (num(h, 2) % (9 * 60)), // minutes after midnight, 09:00–17:59
    status: "applied",
  };
});

// Review state: the newest ~41% are unreviewed; of the older rest, the best-scoring
// third are shortlisted, the next ~40% reviewed, and the lowest-scoring rejected.
for (const job of jobs) {
  const group = cands.filter((c) => c.jobId === job.id).sort((a, b) => a.appliedDaysAgo - b.appliedDaysAgo || a.id.localeCompare(b.id));
  const older = group.slice(Math.round(group.length * 0.41)).sort((a, b) => b.matchScore - a.matchScore || a.id.localeCompare(b.id));
  const nShort = Math.round(older.length * 0.35);
  const nRev = Math.round(older.length * 0.4);
  older.forEach((c, i) => { c.status = i < nShort ? "shortlisted" : i < nShort + nRev ? "reviewed" : "rejected"; });

  // Jobs with interview times: top shortlisted get scheduled / invited, so the
  // Interviewer and Outreach pages have real-looking rows.
  if (job.slotsHours) {
    const top = older.filter((c) => c.status === "shortlisted");
    const scheduled = Math.min(job.slotsHours.length, 2);
    top.forEach((c, i) => {
      if (i < scheduled) { c.status = "interview"; c.invited = true; c.interviewInHours = job.slotsHours[i]; c.slotIndex = i; }
      else if (i === scheduled) c.invited = true;
    });
  }
}

// Timeline events as day offsets from "now" — see lib/demoDataset.js.
for (const c of cands) {
  const A = c.appliedDaysAgo;
  const job = jobs.find((j) => j.id === c.jobId);
  c.events = [{ daysAgo: A, kind: "applied", event: `Résumé parsed — classified as ${c.role}, auto-matched to ${job.title}'s Applied pipeline` }];
  if (c.status !== "applied") {
    const d = Math.max(0, A - 2);
    const shortlisted = c.status === "shortlisted" || c.status === "interview";
    c.events.push({ daysAgo: d, kind: shortlisted ? "shortlisted" : "reviewed", event: shortlisted ? `Auto-shortlisted — score ${c.matchScore}` : `Reviewed — score ${c.matchScore}` });
    c.aiFlags = [{ tone: shortlisted ? "success" : "neutral", text: c.reason }];
    if (shortlisted) c.shortlistedDaysAgo = d;
    if (c.invited) {
      c.invitedDaysAgo = Math.max(0, d - 1);
      c.events.push({ daysAgo: c.invitedDaysAgo, kind: "shortlisted", event: "Shortlist email sent — interview scheduling link" });
    }
    if (c.status === "interview") c.events.push({ daysAgo: Math.max(0, d - 1), kind: "interview", event: "Interview scheduled", withTime: true });
  } else c.aiFlags = [];
  delete c.reason;
}

const out = {
  note: "Generated by scripts/build-demo-data.mjs — do not edit by hand.",
  counts: { jobs: jobs.length, candidates: cands.length, sourceResumes: manifest.length },
  jobs: jobs.map(({ slotsHours, posted, ...j }) => ({ ...j, postedDaysAgo: posted, interviewSlotHours: slotsHours || [] })),
  candidates: cands.sort((a, b) => a.appliedDaysAgo - b.appliedDaysAgo || a.id.localeCompare(b.id)),
};
writeFileSync(join(root, "lib/demoData.json"), JSON.stringify(out));

const by = (k) => cands.reduce((m, c) => ((m[c[k]] = (m[c[k]] || 0) + 1), m), {});
console.log("\nstatus:", by("status"), "\nsource:", by("source"));
console.log("per job:", Object.fromEntries(jobs.map((j) => [j.title, cands.filter((c) => c.jobId === j.id).length])));
console.log(`wrote lib/demoData.json (${(JSON.stringify(out).length / 1024).toFixed(0)} KB)`);
