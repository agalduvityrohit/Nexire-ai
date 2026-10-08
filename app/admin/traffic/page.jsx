// Founder-only Visitor Console. The /admin layout has already 404'd anyone who isn't an
// allow-listed admin; every number below is computed on the server (lib/server/traffic.js).

import { TrafficView } from "@/components/admin/TrafficView";
import { getLiveEvents, getTrafficData } from "@/lib/server/traffic";
import { serverError } from "@/lib/server/logger";

export const metadata = { title: "Visitor console — Nexire AI" };
export const dynamic = "force-dynamic";

const RANGES = [7, 14, 30];

export default async function TrafficPage({ searchParams }) {
  const sp = await searchParams;
  const days = RANGES.includes(Number(sp?.days)) ? Number(sp.days) : 14;
  const includeSample = sp?.sample === "1";

  let data = null;
  let live = [];
  let failure = null;
  try {
    [data, live] = await Promise.all([getTrafficData(days, { includeSample }), getLiveEvents({ includeSample })]);
  } catch (e) {
    failure = serverError("admin/traffic", e); // full detail goes to the server log, not the page
  }

  return (
    <>
      <div className="mb-6">
        <div className="text-[11px] font-semibold uppercase tracking-[0.09em] text-muted">Founder view</div>
        <h1 className="mt-1 text-[22px] font-semibold tracking-[-0.025em] text-ink sm:text-[25px]">Visitor console</h1>
        <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-muted">
          Who&apos;s visiting, who&apos;s signing up, and whether companies are actually using Nexire — without asking them.
        </p>
      </div>

      {failure ? (
        <div role="alert" className="rounded-[10px] border border-danger/25 bg-danger-soft px-4 py-3 text-[13px] text-ink">
          <strong className="font-semibold">Couldn&apos;t load the console.</strong> {failure} If you haven&apos;t yet, apply{" "}
          <code className="font-mono">supabase/migrations/0008_events.sql</code> — the events table doesn&apos;t exist until you do.
        </div>
      ) : (
        <TrafficView data={data} live={live} />
      )}
    </>
  );
}
