// Finds candidates by searching GitHub repositories for ones matching a
// free-text project requirement, rather than searching user profiles by
// keyword/language/location. Distills the requirement into a search query via
// whichever LLM provider is connected (or a keyword heuristic otherwise),
// then ranks whoever owns a matching repo by how strong that match is.

import { NextResponse } from "next/server";
import { authorize } from "@/lib/server/auth";
import { getActiveProvider, resolveCredential } from "@/lib/server/keystore";
import { extractGithubSearchTerms } from "@/lib/server/llm";
import { findCandidatesByProject, heuristicKeywords } from "@/lib/server/github";

export const runtime = "nodejs";
export const maxDuration = 30;

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

  const { requirements = "", language: languageOverride = "" } = body || {};
  if (!requirements.trim()) {
    return NextResponse.json({ error: "Describe the project or work you need evidence of." }, { status: 400 });
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let keywords;
  let language = languageOverride;
  const mode = credential?.key ? providerId : "heuristic";

  if (credential?.key) {
    const extracted = await extractGithubSearchTerms({
      providerId,
      apiKey: credential.key,
      model: credential.model,
      requirements,
    });
    keywords = extracted.keywords;
    language = language || extracted.language;
  } else {
    keywords = heuristicKeywords(requirements);
  }

  if (!keywords.length) {
    return NextResponse.json(
      { error: "Couldn't pull any search terms out of that description — try naming specific technologies." },
      { status: 400 }
    );
  }

  const candidates = await findCandidatesByProject(
    { keywords, language },
    { token: githubCredential?.key || null }
  );

  return NextResponse.json({
    mode,
    keywords,
    language,
    candidates,
    connected: Boolean(githubCredential?.key),
  });
}
