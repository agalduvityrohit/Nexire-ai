import { NextResponse } from "next/server";
import { addToWaitlist } from "@/lib/server/waitlist";

export const runtime = "nodejs";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const email = String(body?.email || "").trim();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "A valid work email is required." }, { status: 400 });
  }

  try {
    const entry = await addToWaitlist({
      name: body?.name || null,
      email,
      companyName: body?.companyName || null,
      companySize: body?.companySize || null,
      roleTitle: body?.roleTitle || null,
    });
    return NextResponse.json({ ok: true, entry });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
