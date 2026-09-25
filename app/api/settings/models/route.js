// Lists the models a stored (or just-typed) key can actually see, straight
// from the provider's own catalog — so picking a model means scrolling a
// dropdown instead of alt-tabbing to the provider's website to look one up.
// Accepts an optional inline `value` the same way Test Connection does, so
// it works before a key is even saved.
//
// Admin only: LLM keys are platform credentials, and an open route that takes a
// key and calls out is a free proxy for anyone on the internet.

import { NextResponse } from "next/server";
import { authorize, PLATFORM_ID } from "@/lib/server/auth";
import { resolveCredential } from "@/lib/server/keystore";
import { listModels } from "@/lib/server/llm";
import { LLM_PROVIDERS } from "@/lib/providers";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request) {
  const { error: authError } = await authorize(request, { admin: true });
  if (authError) return authError;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const { provider, value } = body || {};
  if (!LLM_PROVIDERS[provider]) {
    return NextResponse.json({ error: `Unknown provider "${provider}".` }, { status: 400 });
  }

  let apiKey = typeof value === "string" && value.trim() ? value.trim() : null;
  if (!apiKey) {
    try {
      const cred = await resolveCredential(PLATFORM_ID, provider);
      apiKey = cred?.key || null;
    } catch (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
  if (!apiKey) {
    return NextResponse.json({ error: "No key to list models with — enter or save one first." }, { status: 400 });
  }

  try {
    const models = await listModels({ providerId: provider, apiKey });
    return NextResponse.json({ models });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }
}
