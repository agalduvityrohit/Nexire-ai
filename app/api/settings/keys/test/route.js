// "Test Connection" — makes a real, lightweight call with the stored key.
//   LLM providers: a tiny JSON round-trip through the provider's own API
//   GitHub:        GET /user
//   Gmail:         IMAP login, then reads the mailbox status
// Accepts an optional inline `value` so a key can be tested before saving.

import { NextResponse } from "next/server";
import { authorize, PLATFORM_ID } from "@/lib/server/auth";
import { resolveCredential } from "@/lib/server/keystore";
import { testProvider } from "@/lib/server/llm";
import { testGmail } from "@/lib/server/gmail";
import { ALL_PROVIDER_IDS, LLM_PROVIDERS, PLATFORM_PROVIDER_IDS } from "@/lib/providers";

export const runtime = "nodejs";
export const maxDuration = 60;

async function testGithubToken(token) {
  const started = Date.now();
  const res = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "nexire-ai",
    },
  });

  if (!res.ok) {
    throw new Error(
      res.status === 401 ? "Token rejected (401 Unauthorized)." : `GitHub returned HTTP ${res.status}.`
    );
  }

  const user = await res.json();
  return {
    ok: true,
    provider: "github",
    latencyMs: Date.now() - started,
    account: user.login,
    scopes: res.headers.get("x-oauth-scopes") || "(fine-grained token)",
  };
}

// Simple authenticated GETs — enough to prove a key is live without spending anything.
async function testSimple(provider, url, headers) {
  const started = Date.now();
  const res = await fetch(url, { headers });
  if (res.status === 401 || res.status === 403) {
    throw new Error(`Key rejected (HTTP ${res.status}). Restricted keys (e.g. send-only) can be valid but fail this check.`);
  }
  if (!res.ok) throw new Error(`${provider} returned HTTP ${res.status}.`);
  return { ok: true, provider, latencyMs: Date.now() - started };
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const { provider, value, model, account } = body || {};
  if (!ALL_PROVIDER_IDS.includes(provider)) {
    return NextResponse.json({ error: `Unknown provider "${provider}".` }, { status: 400 });
  }

  // Platform credentials: admin only. Gmail: the signed-in company's own inbox.
  const isPlatform = PLATFORM_PROVIDER_IDS.includes(provider);
  const { ctx, error: authError } = await authorize(request, isPlatform ? { admin: true } : { login: true });
  if (authError) return authError;
  const companyId = isPlatform ? PLATFORM_ID : ctx.companyId;

  let key = typeof value === "string" && value.trim() ? value.trim() : null;
  let resolvedModel = model;
  let resolvedAccount = account;

  if (!key) {
    try {
      const cred = await resolveCredential(companyId, provider);
      if (cred) {
        key = cred.key;
        resolvedModel = resolvedModel || cred.model;
        resolvedAccount = resolvedAccount || cred.account;
      }
    } catch (error) {
      return NextResponse.json({ ok: false, provider, error: error.message }, { status: 200 });
    }
  }

  if (!key) {
    return NextResponse.json(
      { ok: false, provider, error: "No credential stored for this provider yet." },
      { status: 200 }
    );
  }

  try {
    if (provider === "github") {
      return NextResponse.json(await testGithubToken(key));
    }
    if (provider === "gmail") {
      return NextResponse.json(await testGmail({ user: resolvedAccount, password: key }));
    }
    if (provider === "deepgram") {
      return NextResponse.json(await testSimple("deepgram", "https://api.deepgram.com/v1/projects", { Authorization: `Token ${key}` }));
    }
    if (provider === "vapi") {
      return NextResponse.json(await testSimple("vapi", "https://api.vapi.ai/assistant?limit=1", { Authorization: `Bearer ${key}` }));
    }
    if (provider === "resend") {
      return NextResponse.json(await testSimple("resend", "https://api.resend.com/domains", { Authorization: `Bearer ${key}` }));
    }
    if (LLM_PROVIDERS[provider]) {
      return NextResponse.json(await testProvider({ providerId: provider, apiKey: key, model: resolvedModel }));
    }
    return NextResponse.json({ ok: false, provider, error: "Nothing to test." }, { status: 200 });
  } catch (error) {
    // Pass the upstream message through verbatim — a wrong model id or a
    // revoked token should be readable, not flattened to "failed".
    return NextResponse.json({ ok: false, provider, error: error.message }, { status: 200 });
  }
}
