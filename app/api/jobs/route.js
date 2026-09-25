// Real job persistence. Mirrors the shape lib/store.jsx already uses client-side
// — this just gives it somewhere to survive a refresh.
//
// The company always comes from the session (or the demo sandbox), never from
// the request.

import { NextResponse } from "next/server";
import { authorize } from "@/lib/server/auth";
import { listJobs, upsertJob, deleteJob, releaseCandidatesFromJob } from "@/lib/server/dataStore";

export const runtime = "nodejs";

export async function GET(request) {
  const { ctx, error } = await authorize(request);
  if (error) return error;

  try {
    const jobs = await listJobs(ctx.companyId);
    return NextResponse.json({ jobs });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request) {
  const { ctx, error } = await authorize(request);
  if (error) return error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const { job } = body || {};
  if (!job?.id || !job?.title) return NextResponse.json({ error: "job.id and job.title are required." }, { status: 400 });

  try {
    const saved = await upsertJob(ctx.companyId, job);
    return NextResponse.json({ job: saved });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  const { ctx, error } = await authorize(request);
  if (error) return error;

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });

  try {
    // Candidates tied to this job go back to the general pool, not deleted.
    await releaseCandidatesFromJob(ctx.companyId, id);
    await deleteJob(ctx.companyId, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
