// Send (or re-send) the interview-scheduling invitation for one candidate.
// The automatic send on shortlisting only fires once and only when the job has
// slots — this covers "I added slots afterwards" and "they lost the email".

import { NextResponse } from "next/server";
import { authorize } from "@/lib/server/auth";
import { sendShortlistInvite } from "@/lib/server/invites";

export const runtime = "nodejs";

export async function POST(request) {
  const { ctx, error } = await authorize(request, { login: true });
  if (error) return error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }
  if (!body?.id) return NextResponse.json({ error: "id is required." }, { status: 400 });

  const invite = await sendShortlistInvite({ ctx, request, candidateId: body.id, force: Boolean(body.force) });
  return NextResponse.json({ invite });
}
