// Bulk résumé parsing + role classification, using whichever LLM provider the
// company has selected.
//
// The client uploads in small chunks so 100+ files stay responsive and show
// real progress. De-duplication runs on the client across the accumulated set
// (lib/dedupe.js), because it has to see the whole batch, not one chunk.

import { NextResponse } from "next/server";
import { getActiveProvider, resolveCredential } from "@/lib/server/keystore";
import { processResumes } from "@/lib/server/pipeline";
import { resolveModel } from "@/lib/server/llm";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request) {
  let form;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data." }, { status: 400 });
  }

  const files = form.getAll("files").filter((f) => typeof f === "object" && "arrayBuffer" in f);
  const companyId = form.get("companyId") || null;
  const requestedProvider = form.get("provider") || null;

  if (!files.length) return NextResponse.json({ error: "No files received." }, { status: 400 });

  let providerId = requestedProvider;
  let credential = null;
  try {
    if (!providerId) providerId = await getActiveProvider(companyId);
    credential = await resolveCredential(companyId, providerId);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // No key configured: fall back to a local heuristic so the screen is still
  // usable, but say so loudly rather than passing it off as a real result.
  const mode = credential?.key ? providerId : "heuristic";

  const docs = await Promise.all(
    files.map(async (file) => ({
      buffer: Buffer.from(await file.arrayBuffer()),
      filename: file.name,
    }))
  );

  const { parsed, failed, cachedCount } = await processResumes(
    docs,
    {
      providerId: credential?.key ? providerId : null,
      apiKey: credential?.key || null,
      model: credential?.model || null,
    },
    { companyId }
  );

  return NextResponse.json({
    mode,
    provider: credential?.key ? providerId : null,
    model: credential?.key ? resolveModel(providerId, credential.model) : null,
    parsed,
    failed,
    counts: { received: files.length, parsed: parsed.length, failed: failed.length, cached: cachedCount },
  });
}
