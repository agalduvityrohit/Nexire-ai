// Pull résumé attachments straight out of a Gmail inbox and run them through
// the same parse + classify pipeline as a manual upload.

import { NextResponse } from "next/server";
import { authorize } from "@/lib/server/auth";
import { getActiveProvider, resolveCredential } from "@/lib/server/keystore";
import { fetchResumeAttachments } from "@/lib/server/gmail";
import { processResumes } from "@/lib/server/pipeline";
import { resolveModel } from "@/lib/server/llm";
import { serverError } from "@/lib/server/logger";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request) {
  const { ctx, error: authError } = await authorize(request, { login: true });
  if (authError) return authError;
  const companyId = ctx.companyId; // from the session — any companyId in the request is ignored

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  // sinceMonths is the historical-import control; 0 means "all time".
  const { mailbox = "INBOX", sinceMonths = 3, from = "", maxFiles = 50 } = body || {};

  let gmail;
  try {
    gmail = await resolveCredential(companyId, "gmail");
  } catch (error) {
    return NextResponse.json({ error: serverError("resumes/gmail", error) }, { status: 500 });
  }

  if (!gmail?.key) {
    return NextResponse.json(
      { error: "No Gmail connection yet. Add an App Password in Settings → API Connections." },
      { status: 400 }
    );
  }
  if (!gmail.account) {
    return NextResponse.json(
      { error: "No Gmail address saved for this connection. Re-save it with the address filled in." },
      { status: 400 }
    );
  }

  let docs = [];
  let scanned = 0;
  try {
    const result = await fetchResumeAttachments({
      user: gmail.account,
      password: gmail.key,
      mailbox,
      sinceMonths: Number(sinceMonths) || 0,
      from,
      maxFiles: Math.min(Number(maxFiles) || 50, 300),
    });
    docs = result.docs;
    scanned = result.scanned;
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }

  if (!docs.length) {
    return NextResponse.json({
      mode: "none",
      account: gmail.account,
      parsed: [],
      failed: [],
      counts: { scanned, found: 0, parsed: 0, failed: 0 },
      message: `Scanned ${scanned} message${scanned === 1 ? "" : "s"} in ${mailbox} and found no PDF/DOCX attachments.`,
    });
  }

  let providerId = null;
  let credential = null;
  try {
    providerId = await getActiveProvider(companyId);
    credential = await resolveCredential(companyId, providerId);
  } catch (error) {
    return NextResponse.json({ error: serverError("resumes/gmail", error) }, { status: 500 });
  }

  const { parsed, failed } = await processResumes(
    docs,
    {
      providerId: credential?.key ? providerId : null,
      apiKey: credential?.key || null,
      model: credential?.model || null,
    },
    { companyId }
  );

  return NextResponse.json({
    mode: credential?.key ? providerId : "heuristic",
    provider: credential?.key ? providerId : null,
    model: credential?.key ? resolveModel(providerId, credential.model) : null,
    account: gmail.account,
    parsed,
    failed,
    counts: { scanned, found: docs.length, parsed: parsed.length, failed: failed.length },
  });
}
