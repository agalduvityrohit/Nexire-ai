// The founder console: one screen for "what's going on right now" — who's logging in,
// what companies are doing, anything suspicious, and the platform keys. The server
// layout has already 404'd anyone who isn't an allow-listed admin; every number is
// computed on the server (lib/server/traffic.js).

import Link from "next/link";
import { LiveActivity } from "@/components/admin/LiveActivity";
import { CompaniesPanel, Notices, SecurityPanel, Section, SummaryTiles } from "@/components/admin/TrafficView";
import { Card } from "@/components/ui/Primitives";
import { getLiveEvents, getTrafficData } from "@/lib/server/traffic";
import { serverError } from "@/lib/server/logger";

export const metadata = { title: "Console — Nexire AI" };
export const dynamic = "force-dynamic";

const DAYS = 7;

export default async function AdminHome() {
  let data = null;
  let live = [];
  let failure = null;
  try {
    [data, live] = await Promise.all([getTrafficData(DAYS), getLiveEvents({ hidePageViews: true })]);
  } catch (e) {
    failure = serverError("admin/overview", e); // full detail goes to the server log, not the page
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.09em] text-muted">Founder console</div>
        <h1 className="mt-1 text-[22px] font-semibold tracking-[-0.025em] text-ink sm:text-[25px]">What&apos;s happening on Nexire</h1>
        <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-muted">
          Who logged in, what they did, how companies are doing, and anything suspicious. Last {DAYS} days, production only.
        </p>
      </div>

      {failure ? (
        <div role="alert" className="rounded-[10px] border border-danger/25 bg-danger-soft px-4 py-3 text-[13px] text-ink">
          <strong className="font-semibold">Couldn&apos;t load the console.</strong> {failure}
        </div>
      ) : (
        <>
          <Notices data={data} rangeHref={() => "/admin"} />
          <SummaryTiles summary={data.summary} />

          <Section title="Live activity" hint="Who logged in and what they did, newest first. Emails are masked. Untick “Hide page views” to see visitors too.">
            <LiveActivity initial={live} hidePageViews />
          </Section>

          <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
            <SecurityPanel security={data.security} />
            <Card className="h-fit p-5">
              <h2 className="text-[14.5px] font-semibold tracking-[-0.01em] text-ink">Platform</h2>
              <p className="mt-0.5 text-[12.5px] text-muted">The settings every company runs on.</p>
              <ul className="mt-4 space-y-2 text-[13.5px]">
                <li><Link href="/admin/keys" className="font-medium text-primary hover:underline">API keys →</Link> <span className="text-muted">change them instantly, no redeploy</span></li>
              </ul>
            </Card>
          </div>

          <CompaniesPanel companies={data.companies} />
        </>
      )}
    </div>
  );
}
