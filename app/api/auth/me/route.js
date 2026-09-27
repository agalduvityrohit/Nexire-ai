// Who is signed in? The client calls this on load; null means the public demo.

import { NextResponse } from "next/server";
import { authorize, clearSession, readSession } from "@/lib/server/auth";
import { getCompanyById } from "@/lib/server/companies";
import { serviceClient } from "@/lib/server/supabase";
import { serverError } from "@/lib/server/logger";

export const runtime = "nodejs";

export async function GET(request) {
  const { error } = await authorize(request);
  if (error) return error;

  const session = readSession(request);
  if (!session) return NextResponse.json({ user: null, company: null });

  try {
    const company = await getCompanyById(session.cid);
    if (!company) return clearSession(NextResponse.json({ user: null, company: null }));

    const { data } = await serviceClient().auth.admin.getUserById(session.uid);
    return NextResponse.json({
      user: { email: data?.user?.email || "", name: data?.user?.user_metadata?.name || "" },
      company: { id: company.id, name: company.name, role: company.role },
    });
  } catch (e) {
    return NextResponse.json({ error: serverError("auth/me", e) }, { status: 500 });
  }
}
