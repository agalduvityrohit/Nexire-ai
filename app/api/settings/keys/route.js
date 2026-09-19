// Per-company credential management, one row per provider.
//
// SECURITY NOTE: this app has no real authentication yet — the "session" is
// React state that resets on refresh. These routes therefore trust the
// companyId in the request. Before this handles production credentials it MUST
// sit behind real auth and derive companyId from a verified session.

import { NextResponse } from "next/server";
import {
  deleteKey,
  getActiveProvider,
  getStatus,
  saveKey,
  saveModel,
  setActiveProvider,
  storageMode,
} from "@/lib/server/keystore";
import { encryptionConfigured } from "@/lib/server/crypto";
import { ALL_PROVIDER_IDS } from "@/lib/providers";

export const runtime = "nodejs";

function guard() {
  if (!encryptionConfigured()) {
    return NextResponse.json(
      {
        error:
          "APP_ENCRYPTION_KEY is not set on the server, so keys cannot be stored safely. Add it to .env.local and restart.",
      },
      { status: 503 }
    );
  }
  return null;
}

export async function GET(request) {
  const companyId = request.nextUrl.searchParams.get("companyId");
  if (!companyId) return NextResponse.json({ error: "companyId is required." }, { status: 400 });

  try {
    const [status, activeProvider] = await Promise.all([
      getStatus(companyId),
      getActiveProvider(companyId),
    ]);
    return NextResponse.json({
      status,
      activeProvider,
      storage: storageMode(),
      encryptionReady: encryptionConfigured(),
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const blocked = guard();
  if (blocked) return blocked;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const { companyId, provider, value, model, account, action } = body || {};
  if (!companyId) return NextResponse.json({ error: "companyId is required." }, { status: 400 });

  try {
    // Switch the active LLM provider.
    if (action === "setActive") {
      const active = await setActiveProvider(companyId, provider);
      return NextResponse.json({ activeProvider: active, status: await getStatus(companyId) });
    }

    if (!ALL_PROVIDER_IDS.includes(provider)) {
      return NextResponse.json({ error: `Unknown provider "${provider}".` }, { status: 400 });
    }

    // Change the model only, leaving the stored key alone.
    if (action === "setModel") {
      const status = await saveModel(companyId, provider, model);
      return NextResponse.json({ status, storage: storageMode() });
    }

    if (!value || typeof value !== "string" || value.trim().length < 8) {
      return NextResponse.json({ error: "That doesn't look like a valid key." }, { status: 400 });
    }

    // Returns masked status only — the key never comes back out.
    const status = await saveKey(companyId, provider, value.trim(), { model, account });
    return NextResponse.json({ status, storage: storageMode() });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  const blocked = guard();
  if (blocked) return blocked;

  const companyId = request.nextUrl.searchParams.get("companyId");
  const provider = request.nextUrl.searchParams.get("provider");
  if (!companyId) return NextResponse.json({ error: "companyId is required." }, { status: 400 });
  if (!ALL_PROVIDER_IDS.includes(provider)) {
    return NextResponse.json({ error: `Unknown provider "${provider}".` }, { status: 400 });
  }

  try {
    const status = await deleteKey(companyId, provider);
    return NextResponse.json({ status, storage: storageMode() });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
