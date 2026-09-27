// Admin-only: one company in detail.

import { NextResponse } from "next/server";
import { authorize } from "@/lib/server/auth";
import { getCompanyDetail } from "@/lib/server/companies";
import { serverError } from "@/lib/server/logger";

export const runtime = "nodejs";

export async function GET(request, { params }) {
  const { error } = await authorize(request, { admin: true });
  if (error) return error;

  try {
    const { id } = await params;
    const detail = await getCompanyDetail(id);
    if (!detail) return NextResponse.json({ error: "Company not found." }, { status: 404 });
    return NextResponse.json(detail);
  } catch (e) {
    return NextResponse.json({ error: serverError("admin/companies/id", e) }, { status: 500 });
  }
}
