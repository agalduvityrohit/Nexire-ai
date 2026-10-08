// Anonymous page-view beacon. The browser POSTs { path } here on each navigation
// (components/public/PageViewTracker.jsx). The server — not the browser — works out
// the visitor's hashed IP, city and device, so nothing identifying is ever sent
// from the client and no cookie is set.
//
// Always answers 204, whatever happened, so it can't be used to probe anything.
// Skipped: bots, anyone sending Do-Not-Track / Global Privacy Control, cross-site
// posts, /admin, /api and static assets (see trackablePath).

import { NextResponse } from "next/server";
import { logEvent } from "@/lib/server/events";
import { clientInfo, trackablePath } from "@/lib/server/eventsCore";
import { rateLimited } from "@/lib/server/rateLimit";

export const runtime = "nodejs";

export async function POST(request) {
  const done = () => new NextResponse(null, { status: 204 });

  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).host !== request.headers.get("host")) return done();
    } catch {
      return done();
    }
  }

  const info = clientInfo(request.headers);
  if (info.bot || info.dnt) return done();
  if (rateLimited(`track:${info.ip || "unknown"}`, { max: 120, windowMs: 60_000 })) return done();

  let path = null;
  try {
    path = trackablePath(JSON.parse(await request.text())?.path);
  } catch {
    return done();
  }
  if (!path) return done();

  await logEvent({ type: "page_view", headers: request.headers, path, skipBots: true });
  return done();
}
