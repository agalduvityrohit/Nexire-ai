// Scores an applicant pool against one job and returns everyone ranked by
// fit, so the client can take the top X. Uses whichever LLM provider the
// company has connected; falls back to a heuristic scorer otherwise — same
// shape of fallback as /api/resumes/parse.

import { NextResponse } from "next/server";
import { authorize } from "@/lib/server/auth";
import { getActiveProvider, resolveCredential } from "@/lib/server/keystore";
import { shortlistCandidates } from "@/lib/server/shortlist";
import { resolveModel } from "@/lib/server/llm";
import { serverError } from "@/lib/server/logger";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request) {
  const { ctx, error: authError } = await authorize(request);
  if (authError) return authError;
  const companyId = ctx.companyId; // from the session — any companyId in the request is ignored

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const { job, candidates } = body || {};
  if (!job?.title) return NextResponse.json({ error: "Missing job details." }, { status: 400 });
  if (!Array.isArray(candidates) || !candidates.length) {
    return NextResponse.json({ error: "No candidates to score." }, { status: 400 });
  }

  let providerId;
  let credential = null;
  let githubCredential = null;
  try {
    providerId = await getActiveProvider(companyId);
    [credential, githubCredential] = await Promise.all([
      resolveCredential(companyId, providerId),
      resolveCredential(companyId, "github"),
    ]);
  } catch (error) {
    return NextResponse.json({ error: serverError("candidates/shortlist", error) }, { status: 500 });
  }

  const mode = credential?.key ? providerId : "heuristic";

  const ranked = await shortlistCandidates({
    job,
    candidates,
    llm: credential?.key ? { providerId, apiKey: credential.key, model: credential.model } : null,
    githubToken: githubCredential?.key || null,
  });

  ranked.sort((a, b) => b.score - a.score);

  const githubConsidered = candidates.filter((c) => c.githubUsername).length;

  return NextResponse.json({
    mode,
    model: credential?.key ? resolveModel(providerId, credential.model) : null,
    githubConsidered,
    githubConnected: Boolean(githubCredential?.key),
    ranked,
  });
}
