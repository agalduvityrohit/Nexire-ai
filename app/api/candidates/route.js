// Real candidate persistence. Mirrors the shape lib/store.jsx already uses
// client-side — this just gives it somewhere to survive a refresh instead of
// re-parsing every résumé from scratch each session.

import { NextResponse } from "next/server";
import { listCandidates, insertCandidates, updateCandidate, deleteCandidates } from "@/lib/server/dataStore";

export const runtime = "nodejs";

export async function GET(request) {
  const companyId = request.nextUrl.searchParams.get("companyId");
  if (!companyId) return NextResponse.json({ error: "companyId is required." }, { status: 400 });

  try {
    const candidates = await listCandidates(companyId);
    return NextResponse.json({ candidates });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/** Bulk insert — a batch of normalized candidates that just cleared client-side dedupe. */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const { companyId, candidates } = body || {};
  if (!companyId) return NextResponse.json({ error: "companyId is required." }, { status: 400 });
  if (!Array.isArray(candidates) || !candidates.length) {
    return NextResponse.json({ error: "candidates must be a non-empty array." }, { status: 400 });
  }

  try {
    const saved = await insertCandidates(companyId, candidates);
    return NextResponse.json({ candidates: saved });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/** Partial update — status change, drag between pipeline stages, shortlist result. */
export async function PATCH(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const { companyId, id, patch } = body || {};
  if (!companyId || !id) return NextResponse.json({ error: "companyId and id are required." }, { status: 400 });

  try {
    const saved = await updateCandidate(companyId, id, patch || {});
    return NextResponse.json({ candidate: saved });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/** Bulk delete — e.g. clearing every candidate in a role that isn't needed. */
export async function DELETE(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const { companyId, ids } = body || {};
  if (!companyId) return NextResponse.json({ error: "companyId is required." }, { status: 400 });
  if (!Array.isArray(ids) || !ids.length) {
    return NextResponse.json({ error: "ids must be a non-empty array." }, { status: 400 });
  }

  try {
    await deleteCandidates(companyId, ids);
    return NextResponse.json({ ok: true, deleted: ids.length });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
