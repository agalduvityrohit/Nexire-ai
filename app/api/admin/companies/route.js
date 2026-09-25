// Admin-only: every company with usage numbers.

import { NextResponse } from "next/server";
import { authorize } from "@/lib/server/auth";
import { listCompaniesWithStats } from "@/lib/server/companies";

export const runtime = "nodejs";

export async function GET(request) {
  const { error } = await authorize(request, { admin: true });
  if (error) return error;

  try {
    return NextResponse.json({ companies: await listCompaniesWithStats() });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
