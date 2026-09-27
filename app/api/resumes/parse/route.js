// Bulk résumé parsing + role classification, using whichever LLM provider the
// company has selected.
//
// The client uploads in small chunks so 100+ files stay responsive and show
// real progress. De-duplication runs on the client across the accumulated set
// (lib/dedupe.js), because it has to see the whole batch, not one chunk.

import { NextResponse } from "next/server";
import { authorize } from "@/lib/server/auth";
import { getActiveProvider, resolveCredential } from "@/lib/server/keystore";
import { processResumes } from "@/lib/server/pipeline";
import { resolveModel } from "@/lib/server/llm";
import { validateUploadBatch } from "@/lib/server/extract";
import { serverError } from "@/lib/server/logger";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request) {
  const { ctx, error: authError } = await authorize(request);
  if (authError) return authError;
  const companyId = ctx.companyId; // from the session — any companyId in the request is ignored

  let form;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data." }, { status: 400 });
  }

  const files = form.getAll("files").filter((f) => typeof f === "object" && "arrayBuffer" in f);
  const requestedProvider = form.get("provider") || null;

  if (!files.length) return NextResponse.json({ error: "No files received." }, { status: 400 });

  const batch = validateUploadBatch(files);
  if (!batch.ok) return NextResponse.json({ error: batch.error }, { status: 400 });
  if (!batch.accepted.length) {
    return NextResponse.json({ mode: null, provider: null, model: null, parsed: [], failed: batch.rejected, counts: { received: files.length, parsed: 0, failed: batch.rejected.length, cached: 0 } });
  }

  let providerId = requestedProvider;
  let credential = null;
  try {
    if (!providerId) providerId = await getActiveProvider(companyId);
    credential = await resolveCredential(companyId, providerId);
  } catch (error) {
    return NextResponse.json({ error: serverError("resumes/parse", error) }, { status: 500 });
  }

  // No key configured: fall back to a local heuristic so the screen is still
  // usable, but say so loudly rather than passing it off as a real result.
  const mode = credential?.key ? providerId : "heuristic";

  const docs = await Promise.all(
    batch.accepted.map(async (file) => ({
      buffer: Buffer.from(await file.arrayBuffer()),
      filename: file.name,
    }))
  );

  const { parsed, failed: parseFailed, cachedCount } = await processResumes(
    docs,
    {
      providerId: credential?.key ? providerId : null,
      apiKey: credential?.key || null,
      model: credential?.model || null,
    },
    { companyId }
  );

  const failed = [...batch.rejected, ...parseFailed];
  return NextResponse.json({
    mode,
    provider: credential?.key ? providerId : null,
    model: credential?.key ? resolveModel(providerId, credential.model) : null,
    parsed,
    failed,
    counts: { received: files.length, parsed: parsed.length, failed: failed.length, cached: cachedCount },
  });
}
