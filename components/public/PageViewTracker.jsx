"use client";

// Sends one anonymous page-view beacon per navigation. Sends only the path — no
// cookie, no storage, no identifiers; the server derives everything else (and
// hashes the IP) in app/api/track/route.js. Skips /admin entirely.

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export function PageViewTracker() {
  const pathname = usePathname();
  const last = useRef(null);

  useEffect(() => {
    if (!pathname || pathname === last.current || pathname.startsWith("/admin")) return;
    last.current = pathname; // also stops React Strict Mode's double effect from double-counting
    const body = JSON.stringify({ path: pathname });
    try {
      // text/plain keeps it a "simple" request — no CORS preflight.
      const queued = navigator.sendBeacon?.("/api/track", new Blob([body], { type: "text/plain" }));
      if (!queued) fetch("/api/track", { method: "POST", body, keepalive: true }).catch(() => {});
    } catch {
      // tracking must never affect the page
    }
  }, [pathname]);

  return null;
}
