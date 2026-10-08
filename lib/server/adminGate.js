// Server-side gate for the /admin pages. Anyone who isn't an allow-listed admin gets
// a genuine 404 — no "checking access…" shell, no redirect that confirms the page
// exists. (The matching gate for /api/admin/* and the platform-key routes is
// authorize(request, { admin: true }) in lib/server/auth.js.)

import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import { SESSION_COOKIE, recordAdminBlocked, resolveAdmin, verifySessionToken } from "@/lib/server/auth";

/** Returns { userId, companyId, email } for an admin, otherwise renders the 404 page. */
export async function requireAdminPage() {
  const jar = await cookies();
  const h = await headers();
  const session = verifySessionToken(jar.get(SESSION_COOKIE)?.value);
  const result = session ? await resolveAdmin(session) : { ok: false, reason: "signed_out" };

  if (result.ok) return result;

  // We couldn't tell (database unreachable). Surface a server error — a 404 would
  // make an outage look like "you're not allowed", which is exactly wrong.
  if (result.reason === "error") throw new Error("Couldn't verify admin access.");

  await recordAdminBlocked({ headers: h, session, reason: result.reason, companyId: result.companyId });
  notFound();
}
