// Real job persistence. Mirrors the shape lib/store.jsx already uses client-side
// — this just gives it somewhere to survive a refresh.

import { NextResponse } from "next/server";
import { listJobs, upsertJob, deleteJob, releaseCandidatesFromJob } from "@/lib/server/dataStore";

export const runtime = "nodejs";

export async function GET(request) {
  const companyId = request.nextUrl.searchParams.get("companyId");
  if (!companyId) return NextResponse.json({ error: "companyId is required." }, { status: 400 });

  try {
    const jobs = await listJobs(companyId);
    return NextResponse.json({ jobs });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const { companyId, job } = body || {};
  if (!companyId) return NextResponse.json({ error: "companyId is required." }, { status: 400 });
  if (!job?.id || !job?.title) return NextResponse.json({ error: "job.id and job.title are required." }, { status: 400 });

  try {
    const saved = await upsertJob(companyId, job);
    return NextResponse.json({ job: saved });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  const companyId = request.nextUrl.searchParams.get("companyId");
  const id = request.nextUrl.searchParams.get("id");
  if (!companyId || !id) return NextResponse.json({ error: "companyId and id are required." }, { status: 400 });

  try {
    // Candidates tied to this job go back to the general pool, not deleted.
    await releaseCandidatesFromJob(companyId, id);
    await deleteJob(companyId, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
