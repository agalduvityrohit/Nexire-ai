// Real candidate persistence. Mirrors the shape lib/store.jsx already uses
// client-side — this just gives it somewhere to survive a refresh instead of
// re-parsing every résumé from scratch each session.
//
// The company always comes from the session (or the demo sandbox), never from
// the request.

import { NextResponse } from "next/server";
import { authorize } from "@/lib/server/auth";
import {
  listCandidates,
  insertCandidates,
  updateCandidate,
  deleteCandidates,
  getCandidate,
} from "@/lib/server/dataStore";
import { sendShortlistInvite } from "@/lib/server/invites";

export const runtime = "nodejs";

export async function GET(request) {
  const { ctx, error } = await authorize(request);
  if (error) return error;

  try {
    const candidates = await listCandidates(ctx.companyId);
    return NextResponse.json({ candidates });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/** Bulk insert — a batch of normalized candidates that just cleared client-side dedupe. */
export async function POST(request) {
  const { ctx, error } = await authorize(request);
  if (error) return error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const { candidates } = body || {};
  if (!Array.isArray(candidates) || !candidates.length) {
    return NextResponse.json({ error: "candidates must be a non-empty array." }, { status: 400 });
  }
  if (candidates.length > 500) {
    return NextResponse.json({ error: "Too many candidates in one request (max 500)." }, { status: 400 });
  }

  try {
    const saved = await insertCandidates(ctx.companyId, candidates);
    return NextResponse.json({ candidates: saved });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/**
 * Partial update — status change, drag between pipeline stages, shortlist result.
 * Moving someone to "shortlisted" stamps shortlisted_at and, when the job has
 * interview slots, emails them a scheduling link.
 */
export async function PATCH(request) {
  const { ctx, error } = await authorize(request);
  if (error) return error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const { id, patch } = body || {};
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });

  try {
    const before = await getCandidate(ctx.companyId, id);
    if (!before) return NextResponse.json({ error: "Candidate not found." }, { status: 404 });

    const becomingShortlisted = patch?.status === "shortlisted" && before.status !== "shortlisted";
    const server = becomingShortlisted && !before.shortlistedAt ? { shortlisted_at: new Date().toISOString() } : {};

    const saved = await updateCandidate(ctx.companyId, id, patch || {}, server);

    // jobId may be set in this same patch, so read the job from the saved row.
    let invite = null;
    if (becomingShortlisted) {
      invite = await sendShortlistInvite({ ctx, request, candidateId: id });
    }

    const fresh = invite?.status === "sent" ? await getCandidate(ctx.companyId, id) : saved;
    return NextResponse.json({ candidate: fresh, invite });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/** Bulk delete — e.g. clearing every candidate in a role that isn't needed. */
export async function DELETE(request) {
  const { ctx, error } = await authorize(request);
  if (error) return error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const { ids } = body || {};
  if (!Array.isArray(ids) || !ids.length) {
    return NextResponse.json({ error: "ids must be a non-empty array." }, { status: 400 });
  }

  try {
    await deleteCandidates(ctx.companyId, ids);
    return NextResponse.json({ ok: true, deleted: ids.length });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
