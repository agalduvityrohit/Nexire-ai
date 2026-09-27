// Credential management.
//
// Two kinds of credential, two rules:
//   - Platform keys (LLMs, GitHub, Vapi, Deepgram, Resend): shared by every
//     company, stored under PLATFORM_ID, editable ONLY by an admin. Non-admins
//     can read a "connected or not" flag (their dashboard needs to know whether
//     parsing will use an AI model) but never a last-4, model or account.
//   - Gmail: a company's own inbox. That company may save/remove it; nobody else
//     can see it.
//
// The companyId in the request is ignored — identity comes from the session.

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
import { authorize, PLATFORM_ID } from "@/lib/server/auth";
import { encryptionConfigured } from "@/lib/server/crypto";
import { ALL_PROVIDER_IDS, PLATFORM_PROVIDER_IDS } from "@/lib/providers";
import { serverError } from "@/lib/server/logger";

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

/** Who may change this provider, and which company's row it lives under. */
async function writeTarget(request, provider) {
  if (PLATFORM_PROVIDER_IDS.includes(provider)) {
    const { ctx, error } = await authorize(request, { admin: true });
    return error ? { error } : { companyId: PLATFORM_ID, ctx };
  }
  const { ctx, error } = await authorize(request, { login: true });
  return error ? { error } : { companyId: ctx.companyId, ctx };
}

export async function GET(request) {
  const { ctx, error } = await authorize(request);
  if (error) return error;

  try {
    // Ask the database, not the cookie: a just-promoted admin shouldn't have to sign in again.
    const adminCheck = ctx.demo ? null : await authorize(request, { admin: true });
    const isAdmin = Boolean(adminCheck && !adminCheck.error);
    const [platform, own, activeProvider] = await Promise.all([
      getStatus(PLATFORM_ID),
      ctx.demo ? null : getStatus(ctx.companyId),
      getActiveProvider(),
    ]);

    const status = {};
    for (const id of ALL_PROVIDER_IDS) {
      if (id === "gmail") {
        status[id] = own?.gmail || { connected: false, last4: null, model: null, account: null, connectedAt: null };
      } else if (ctx.demo) {
        status[id] = { connected: false, last4: null, model: null, account: null, connectedAt: null };
      } else if (isAdmin) {
        status[id] = platform[id];
      } else {
        status[id] = { connected: platform[id].connected, last4: null, model: null, account: null, connectedAt: null };
      }
    }

    return NextResponse.json({
      status,
      activeProvider,
      storage: storageMode(),
      encryptionReady: encryptionConfigured(),
      role: isAdmin ? "admin" : ctx.role,
    });
  } catch (e) {
    return NextResponse.json({ error: serverError("settings/keys", e) }, { status: 500 });
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

  const { provider, value, model, account, action } = body || {};

  try {
    // Switching the active LLM is a platform-wide decision.
    if (action === "setActive") {
      const { error } = await authorize(request, { admin: true });
      if (error) return error;
      const active = await setActiveProvider(PLATFORM_ID, provider);
      return NextResponse.json({ activeProvider: active, status: await getStatus(PLATFORM_ID) });
    }

    if (!ALL_PROVIDER_IDS.includes(provider)) {
      return NextResponse.json({ error: `Unknown provider "${provider}".` }, { status: 400 });
    }

    const target = await writeTarget(request, provider);
    if (target.error) return target.error;

    if (action === "setModel") {
      const status = await saveModel(target.companyId, provider, model);
      return NextResponse.json({ status, storage: storageMode() });
    }

    if (!value || typeof value !== "string" || value.trim().length < 8) {
      return NextResponse.json({ error: "That doesn't look like a valid key." }, { status: 400 });
    }

    // Returns masked status only — the key never comes back out.
    const status = await saveKey(target.companyId, provider, value.trim(), { model, account });
    return NextResponse.json({ status, storage: storageMode() });
  } catch (e) {
    return NextResponse.json({ error: serverError("settings/keys", e) }, { status: 500 });
  }
}

export async function DELETE(request) {
  const blocked = guard();
  if (blocked) return blocked;

  const provider = request.nextUrl.searchParams.get("provider");
  if (!ALL_PROVIDER_IDS.includes(provider)) {
    return NextResponse.json({ error: `Unknown provider "${provider}".` }, { status: 400 });
  }

  try {
    const target = await writeTarget(request, provider);
    if (target.error) return target.error;

    const status = await deleteKey(target.companyId, provider);
    return NextResponse.json({ status, storage: storageMode() });
  } catch (e) {
    return NextResponse.json({ error: serverError("settings/keys", e) }, { status: 500 });
  }
}
