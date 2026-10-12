// One-time helper: copies the AI-provider keys from your local .env.local to Vercel
// (Production + Preview), so the deployed site uses the same keys you had locally.
//
//   node scripts/push-keys-to-vercel.mjs                 (all AI keys)
//   node scripts/push-keys-to-vercel.mjs --only mistral  (just Mistral + the default provider)
//
// Run it yourself, in this project's folder.
//
// Values are piped straight from the file into `vercel env add` — they are never printed,
// logged, or put in a command line. Only the NAMES are shown. Names already set on Vercel
// are skipped (never overwritten). GITHUB_TOKEN is deliberately NOT copied: GitHub is each
// company's own key now. After running, redeploy once so the new variables take effect.

import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const envFile = join(root, ".env.local");
if (!existsSync(envFile)) { console.error("No .env.local found in this folder."); process.exit(1); }

const LLMS = ["GEMINI", "OPENAI", "ANTHROPIC", "GROQ", "CEREBRAS", "MISTRAL", "OPENROUTER", "NVIDIA"];
const oi = process.argv.indexOf("--only");
const only = oi > -1 ? String(process.argv[oi + 1] || "").toUpperCase().split(",").filter(Boolean) : null;
const picked = only ? LLMS.filter((p) => only.includes(p)) : LLMS;
if (only && !picked.length) { console.error(`Unknown provider. Choose from: ${LLMS.join(", ").toLowerCase()}`); process.exit(1); }
const WANT = [...picked.map((p) => `${p}_API_KEY`), ...picked.map((p) => `${p}_MODEL`), "DEFAULT_LLM_PROVIDER"];

const local = {};
for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (!m) continue;
  let v = m[2].trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  if (v) local[m[1]] = v;
}

const vercel = (args, input) => spawnSync("vercel", args, { input, encoding: "utf8", shell: true, cwd: root });
const listed = vercel(["env", "ls"]);
if (listed.status !== 0) { console.error("Couldn't list Vercel env vars. Are you logged in (vercel whoami)?"); process.exit(1); }
const existing = new Set((listed.stdout || "").split(/\r?\n/).map((l) => l.trim().split(/\s+/)[0]));

let added = 0;
for (const name of WANT) {
  if (!local[name]) continue;
  if (existing.has(name)) { console.log(`  skip  ${name} (already on Vercel)`); continue; }
  const ok = ["production", "preview"].every((env) => {
    const args = env === "preview" ? ["env", "add", name, "preview", '""'] : ["env", "add", name, env];
    return vercel(args, local[name]).status === 0; // value goes in via stdin only
  });
  console.log(`  ${ok ? "added" : "FAILED"} ${name}`);
  if (ok) added++;
}
console.log(`\nDone — ${added} added. Now redeploy once (ask Claude, or run: vercel deploy --prod).`);
