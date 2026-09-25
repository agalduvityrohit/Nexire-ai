// Real candidate search against GitHub's public Search Users API. Uses the
// company's stored GitHub token when connected (Settings → API Connections)
// for the higher authenticated search rate limit; falls back to
// unauthenticated requests otherwise.

import { NextResponse } from "next/server";
import { authorize } from "@/lib/server/auth";
import { resolveCredential } from "@/lib/server/keystore";
import { searchGithubUsers, GithubRateLimitError } from "@/lib/server/github";

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

  const { keyword = "", language = "", location = "" } = body || {};
  if (!keyword.trim() && !language.trim() && !location.trim()) {
    return NextResponse.json({ error: "Enter a keyword, language, or location to search for." }, { status: 400 });
  }

  let credential = null;
  try {
    credential = await resolveCredential(companyId, "github");
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  try {
    const results = await searchGithubUsers(
      { keyword, language, location },
      { token: credential?.key || null }
    );
    return NextResponse.json({ results, connected: Boolean(credential?.key) });
  } catch (error) {
    if (error instanceof GithubRateLimitError) {
      return NextResponse.json(
        {
          error: credential?.key
            ? "GitHub rate limit hit. Wait a minute and try again."
            : "GitHub's unauthenticated search limit is 10 requests/min. Connect a token in Settings → API Connections for a higher limit.",
        },
        { status: 429 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
