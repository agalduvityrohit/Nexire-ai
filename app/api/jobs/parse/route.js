// Reads one or more files (PDF/DOCX/TXT) and/or pasted text, and asks the
// company's connected LLM to segment and extract every job posting found —
// a single upload can contain several JDs run together. Requires a real LLM
// connection; unlike résumé parsing there's no keyword heuristic that could
// reliably segment free text into structured postings.

import { NextResponse } from "next/server";
import { authorize } from "@/lib/server/auth";
import { getActiveProvider, resolveCredential } from "@/lib/server/keystore";
import { extractFromBuffer, UnsupportedFileError, validateUploadBatch } from "@/lib/server/extract";
import { extractJobPostings, resolveModel } from "@/lib/server/llm";
import { serverError } from "@/lib/server/logger";

export const runtime = "nodejs";
export const maxDuration = 180;

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

  const pastedText = String(form.get("text") || "").trim();
  const files = form.getAll("files").filter((f) => typeof f === "object" && "arrayBuffer" in f);

  if (!files.length && !pastedText) {
    return NextResponse.json({ error: "Upload a file or paste job description text." }, { status: 400 });
  }

  const batch = files.length ? validateUploadBatch(files) : { ok: true, accepted: [], rejected: [] };
  if (!batch.ok) return NextResponse.json({ error: batch.error }, { status: 400 });

  let providerId;
  let credential = null;
  try {
    providerId = await getActiveProvider(companyId);
    credential = await resolveCredential(companyId, providerId);
  } catch (error) {
    return NextResponse.json({ error: serverError("jobs/parse", error) }, { status: 500 });
  }

  if (!credential?.key) {
    return NextResponse.json(
      {
        error:
          "No LLM provider connected. Connect one in Settings → API Connections — reading job descriptions needs a real model, there's no keyword fallback for this one.",
      },
      { status: 400 }
    );
  }

  // Gather text from every source — pasted text plus each uploaded file —
  // before calling the model, so one bad file doesn't block the rest.
  const sources = [];
  if (pastedText) sources.push({ label: "Pasted text", text: pastedText });
  for (const r of batch.rejected) sources.push({ label: r.filename, text: "", error: r.error });

  for (const file of batch.accepted) {
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const { text } = await extractFromBuffer(buffer, file.name);
      if (text?.trim()) {
        sources.push({ label: file.name, text: text.trim() });
      } else {
        sources.push({ label: file.name, text: "", error: "No text could be extracted (likely a scanned PDF)." });
      }
    } catch (error) {
      const message = error instanceof UnsupportedFileError ? error.message : error.message || "Couldn't read this file.";
      sources.push({ label: file.name, text: "", error: message });
    }
  }

  const jobs = [];
  const failed = [];

  for (const source of sources) {
    if (!source.text) {
      failed.push({ source: source.label, error: source.error || "No text found." });
      continue;
    }
    try {
      const extracted = await extractJobPostings({
        providerId,
        apiKey: credential.key,
        model: credential.model,
        text: source.text,
      });
      if (!extracted.length) {
        failed.push({ source: source.label, error: "No job postings recognized in this text." });
      } else {
        jobs.push(...extracted.map((j) => ({ ...j, sourceFile: source.label })));
      }
    } catch (error) {
      failed.push({ source: source.label, error: error.message || "Parsing failed." });
    }
  }

  return NextResponse.json({
    provider: providerId,
    model: resolveModel(providerId, credential.model),
    jobs,
    failed,
  });
}
