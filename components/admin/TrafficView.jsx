// The console's panels, rendered from already-computed data. Server components: no
// client JS beyond the interactive islands (chart, live table, erase button).
//
// Two pages compose them:
//   /admin          Overview  — summary, who's doing what right now, security, companies
//   /admin/traffic  Analytics — summary, visitors/logins chart, sign-up funnel

import Link from "next/link";
import { DeleteEventsButton } from "@/components/admin/DeleteEventsButton";
import { TrafficChart } from "@/components/admin/TrafficChart";
import { Badge, Card } from "@/components/ui/Primitives";
import { timeAgo } from "@/lib/adminFormat";
import { cn } from "@/lib/utils";

const RANGES = [7, 14, 30];
const pct = (v) => (v == null ? "—" : `${Math.round(v * 1000) / 10}%`);

export function Section({ title, hint, children, className, action }) {
  return (
    <Card className={cn("p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[14.5px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
          {hint && <p className="mt-0.5 text-[12.5px] text-muted">{hint}</p>}
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </Card>
  );
}

export function Empty({ children }) {
  return <p className="rounded-[10px] border border-dashed border-line px-4 py-6 text-center text-[13px] text-muted">{children}</p>;
}

function Tile({ label, value, hint, tone }) {
  return (
    <Card className="p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{label}</div>
      <div className={cn("mt-2 text-[26px] font-semibold leading-none tracking-[-0.03em] tabular-nums", tone === "danger" ? "text-danger" : "text-ink")}>{value}</div>
      <div className="mt-1.5 text-[12px] text-muted">{hint}</div>
    </Card>
  );
}

/** Banners for things that make the numbers incomplete. */
export function Notices({ data, rangeHref }) {
  return (
    <>
      {!data.saltConfigured && (
        <div role="alert" className="rounded-[10px] border border-warn/30 bg-warn-soft px-4 py-3 text-[13px] text-ink">
          <strong className="font-semibold">Page views aren&apos;t being counted.</strong> <code className="font-mono">IP_HASH_SALT</code> isn&apos;t set on the
          server, and we never store an IP hash without it. Add it in Vercel (Production and Preview) and redeploy.
        </div>
      )}
      {data.sampleOn && (
        <div className="rounded-[10px] border border-info/30 bg-info-soft px-4 py-3 text-[13px] text-ink">
          Showing clearly-labelled <strong className="font-semibold">sample data</strong> alongside real events.{" "}
          <Link className="underline underline-offset-2" href={rangeHref(data.days, false)}>Hide it</Link>
        </div>
      )}
      {data.truncated && (
        <div className="rounded-[10px] border border-line bg-canvas-deep px-4 py-3 text-[13px] text-muted">
          This range has more than 50,000 events, so only the newest are included. Pick a shorter range for exact numbers.
        </div>
      )}
    </>
  );
}

export function SummaryTiles({ summary }) {
  return (
    <section aria-label="Summary" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <Tile label="Visitors" value={summary.visitors.toLocaleString()} hint="Daily-unique, summed" />
      <Tile label="Company sign-ups" value={summary.signups} hint={summary.signupRate == null ? "No visitors yet" : `${pct(summary.signupRate)} of visitors`} />
      <Tile label="Logins" value={summary.logins} hint="Distinct people" />
      <Tile label="Active companies" value={summary.activeCompanies7d} hint="Logged in, last 7 days" />
      <Tile label="Failed logins" value={summary.failedLogins} hint={summary.failedLogins >= 5 ? "Check the security panel" : "Wrong password or code"} tone={summary.failedLogins >= 5 ? "danger" : undefined} />
    </section>
  );
}

export function RangePicker({ days, href }) {
  return (
    <nav aria-label="Date range" className="inline-flex rounded-[10px] border border-line bg-canvas-deep/60 p-1 text-[13px]">
      {RANGES.map((d) => (
        <Link
          key={d}
          href={href(d)}
          aria-current={d === days ? "true" : undefined}
          className={cn("rounded-[7px] px-3 py-1.5 font-medium transition-colors", d === days ? "bg-surface text-ink shadow-xs ring-1 ring-line" : "text-muted hover:text-ink")}
        >
          Last {d} days
        </Link>
      ))}
    </nav>
  );
}

export function SecurityPanel({ security }) {
  return (
    <Section title="Security" hint="Things worth a look. Nothing here means nothing happened.">
      <div className="space-y-4">
        <div>
          <h3 className="text-[12px] font-semibold uppercase tracking-[0.07em] text-muted">Repeated failed logins</h3>
          <p className="text-[11.5px] text-faint">5 or more on one account within 10 minutes</p>
          {security.bruteForce.length === 0 ? (
            <p className="mt-1.5 text-[13px] text-ink-soft">None in this range.</p>
          ) : (
            <ul className="mt-1.5 space-y-1.5">
              {security.bruteForce.map((b) => (
                <li key={b.account + b.windowEnd} className="flex flex-wrap items-center justify-between gap-2 rounded-[8px] bg-danger-soft px-3 py-2 text-[13px]">
                  <span className="font-mono text-[12px] text-ink">{b.account}</span>
                  <span className="text-danger">{b.attempts} attempts · {b.ips} network{b.ips === 1 ? "" : "s"} · {timeAgo(b.lastAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3 className="text-[12px] font-semibold uppercase tracking-[0.07em] text-muted">New-device logins</h3>
          {security.newDevices.length === 0 ? (
            <p className="mt-1.5 text-[13px] text-ink-soft">None in this range.</p>
          ) : (
            <ul className="mt-1.5 space-y-1.5">
              {security.newDevices.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
                  <span className="text-ink">{e.company || "Unknown"} <span className="font-mono text-[12px] text-muted">{e.email}</span></span>
                  <span className="text-muted">{e.device || "unknown device"}{e.city ? ` · ${e.city}` : ""} · {timeAgo(e.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3 className="text-[12px] font-semibold uppercase tracking-[0.07em] text-muted">Blocked admin attempts</h3>
          <p className="text-[11.5px] text-faint">Anyone who isn&apos;t an allow-listed admin, including wrong sign-ins at /admin/login</p>
          {security.adminBlocked.length === 0 ? (
            <p className="mt-1.5 text-[13px] text-ink-soft">None in this range.</p>
          ) : (
            <ul className="mt-1.5 space-y-1.5">
              {security.adminBlocked.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
                  <span className="text-ink">{e.company ? `${e.company} (signed in)` : "Signed out"} · <span className="text-muted">{String(e.reason || "").replaceAll("_", " ")}</span></span>
                  <span className="text-muted">{e.city || "unknown location"} · {e.device || "unknown device"} · {timeAgo(e.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Section>
  );
}

export function CompaniesPanel({ companies }) {
  return (
    <Section title="Companies" hint="One row per company account. Click a name for the full picture. Status is based on the last login.">
      {companies.length === 0 ? (
        <Empty>No companies have signed up yet.</Empty>
      ) : (
        <div className="relative overflow-x-auto rounded-[10px] border border-line">
          <table className="w-full min-w-[720px] text-left text-[13px]">
            <caption className="sr-only">Companies and their activity</caption>
            <thead className="bg-canvas-deep text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">
              <tr>
                <th scope="col" className="px-3 py-2">Company</th>
                <th scope="col" className="px-3 py-2">Last login</th>
                <th scope="col" className="px-3 py-2 text-right">Job descriptions</th>
                <th scope="col" className="px-3 py-2 text-right">Pool size</th>
                <th scope="col" className="px-3 py-2">Status</th>
                <th scope="col" className="px-3 py-2"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <tr key={c.id} className="border-t border-line-soft">
                  <th scope="row" className="px-3 py-2 text-left font-medium text-ink">
                    <Link href={`/admin/companies/${c.id}`} className="hover:text-primary">{c.name}</Link>
                  </th>
                  <td className="px-3 py-2 text-ink-soft">{c.lastLoginAt ? timeAgo(c.lastLoginAt) : "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{c.jobs}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{c.pool.toLocaleString()}</td>
                  <td className="px-3 py-2"><Badge tone={c.status.tone} dot>{c.status.label}</Badge></td>
                  <td className="px-3 py-2 text-right"><DeleteEventsButton companyId={c.id} userId={c.userId} name={c.name} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}

/** Analytics tab: how many people come, and how far new companies get. */
export function TrafficView({ data }) {
  const { days, series, summary, funnel, sampleOn } = data;
  const href = (d, sample = sampleOn) => `/admin/traffic?days=${d}${sample ? "&sample=1" : ""}`;

  return (
    <div className="space-y-5">
      <Notices data={data} rangeHref={href} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <RangePicker days={days} href={href} />
        <p className="text-[12px] text-muted">Production traffic only · times in your timezone · days are UTC</p>
      </div>

      <SummaryTiles summary={summary} />

      <Section title="Visitors and logins per day" hint="Visitors are unique per day — IP hashes rotate daily, so the same person on two days counts twice.">
        <TrafficChart series={series} />
      </Section>

      <Section title="Funnel" hint={`Companies that signed up in the last ${days} days, and how far they got.`}>
        {funnel[0].count === 0 ? (
          <Empty>No companies signed up in this range. The funnel fills in as they do.</Empty>
        ) : (
          <ol className="space-y-3">
            {funnel.map((s, i) => (
              <li key={s.label}>
                <div className="flex items-baseline justify-between gap-3 text-[13px]">
                  <span className="text-ink-soft">{s.label}</span>
                  <span className="tabular-nums">
                    <span className="font-semibold text-ink">{s.count}</span>
                    {i > 0 && <span className="ml-2 text-muted">{pct(s.pct)}{s.vsLabel ? ` ${s.vsLabel}` : " of previous"}</span>}
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-canvas-deep" aria-hidden="true">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${funnel[0].count ? Math.max(s.count ? 2 : 0, (s.count / funnel[0].count) * 100) : 0}%` }} />
                </div>
                {s.note && <p className="mt-1 text-[11.5px] text-muted">{s.note}</p>}
              </li>
            ))}
          </ol>
        )}
      </Section>

      {!data.hasEvents && (
        <Empty>No events recorded in this range yet. Page views, sign-ups, logins and usage will appear here as people use the site.</Empty>
      )}
    </div>
  );
}
