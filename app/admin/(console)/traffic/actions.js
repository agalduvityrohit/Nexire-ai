"use server";

// Server actions are public HTTP endpoints, so this re-proves the caller is an
// allow-listed admin itself rather than trusting that only the console calls it.

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { SESSION_COOKIE, resolveAdmin, verifySessionToken } from "@/lib/server/auth";
import { deleteEventsFor } from "@/lib/server/events";

export async function deleteEventsAction({ companyId = null, userId = null } = {}) {
  const jar = await cookies();
  const session = verifySessionToken(jar.get(SESSION_COOKIE)?.value);
  const admin = session ? await resolveAdmin(session) : { ok: false };
  if (!admin.ok) throw new Error("Not found.");

  const clean = (v) => (typeof v === "string" && v.length > 0 && v.length <= 80 ? v : null);
  const removed = await deleteEventsFor({ companyId: clean(companyId), userId: clean(userId) });
  revalidatePath("/admin/traffic");
  return { removed };
}
