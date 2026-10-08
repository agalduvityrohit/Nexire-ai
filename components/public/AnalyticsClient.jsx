"use client";

// Vercel Web Analytics, with /admin filtered out so the founder's own visits to the
// console never count as traffic. (beforeSend is a function, so this has to be a
// client component — the root layout is a server component and can't pass one.)
// Does nothing until Web Analytics is switched on in the Vercel dashboard.

import { Analytics } from "@vercel/analytics/next";

export function AnalyticsClient() {
  return (
    <Analytics
      beforeSend={(event) => {
        try {
          return new URL(event.url).pathname.startsWith("/admin") ? null : event;
        } catch {
          return event;
        }
      }}
    />
  );
}
