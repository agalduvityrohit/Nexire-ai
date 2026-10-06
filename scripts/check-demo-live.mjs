// Checks a DEPLOYED site actually serves the demo — run it after every deploy.
//
//   npm run check:live                       (checks https://nexireai.vercel.app)
//   node scripts/check-demo-live.mjs <url>
//
// Signed-out requests are the demo, so no login is involved. Exits non-zero on any
// failure, so it can gate a deploy script or CI step.

const base = (process.argv[2] || "https://nexireai.vercel.app").replace(/\/$/, "");
const EXPECT = { jobs: 10, candidates: 496 };

async function getJson(path) {
  let last;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(base + path, { signal: AbortSignal.timeout(30000), cache: "no-store" });
      const body = await res.json().catch(() => null);
      if (res.ok && body) return body;
      last = `HTTP ${res.status}${body?.error ? ` — ${body.error}` : ""}`;
    } catch (e) {
      last = e.message;
    }
    await new Promise((r) => setTimeout(r, 2000 * attempt)); // cold start / propagation
  }
  throw new Error(`${path}: ${last}`);
}

const problems = [];
try {
  const { jobs } = await getJson("/api/jobs");
  if (jobs?.length !== EXPECT.jobs) problems.push(`/api/jobs returned ${jobs?.length} jobs, expected ${EXPECT.jobs}`);
  const { candidates } = await getJson("/api/candidates");
  if (candidates?.length !== EXPECT.candidates) problems.push(`/api/candidates returned ${candidates?.length}, expected ${EXPECT.candidates}`);
  if (candidates?.length && !candidates.every((c) => c.name && c.email && c.jobId)) problems.push("some demo candidates are missing name/email/job");

  // Must not depend on the database — these used to 500 when Supabase was down.
  await getJson("/api/settings/keys");
  const me = await getJson("/api/auth/me");
  if (me.user !== null) problems.push("signed-out /api/auth/me returned a user");

  for (const page of ["/dashboard", "/dashboard/jobs", "/dashboard/candidates", "/login"]) {
    const res = await fetch(base + page, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) problems.push(`${page} returned HTTP ${res.status}`);
  }
} catch (e) {
  problems.push(e.message);
}

if (problems.length) {
  console.error(`\n✖ LIVE demo check FAILED for ${base}:`);
  problems.forEach((p) => console.error("  - " + p));
  process.exit(1);
}
console.log(`✔ ${base} serves the demo: ${EXPECT.jobs} jobs, ${EXPECT.candidates} candidates, no database needed.`);
