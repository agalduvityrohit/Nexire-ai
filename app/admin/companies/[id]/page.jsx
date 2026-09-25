"use client";

import { use, useEffect, useState } from "react";
import { Breadcrumb, PageHeader } from "@/components/dashboard/Shell";
import { Badge, Card } from "@/components/ui/Primitives";
import { hoursLabel, timeAgo } from "@/lib/adminFormat";
import { formatDate } from "@/lib/utils";

const STAGE_ORDER = ["applied", "reviewed", "shortlisted", "interview", "rejected"];
const STAGE_LABEL = { applied: "Applied", reviewed: "Reviewed", shortlisted: "Shortlisted", interview: "Interview scheduled", rejected: "Rejected" };

function Tile({ label, value, hint }) {
  return (
    <Card className="p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{label}</div>
      <div className="mt-2 text-[24px] font-semibold leading-none tracking-[-0.03em] tabular-nums text-ink">{value}</div>
      {hint && <div className="mt-1.5 text-[12px] text-muted">{hint}</div>}
    </Card>
  );
}

export default function AdminCompanyPage({ params }) {
  const { id } = use(params);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/admin/companies/${encodeURIComponent(id)}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Couldn't load this company.");
        setData(json);
      })
      .catch((e) => setError(e.message));
  }, [id]);

  if (error) return <div className="rounded-[10px] border border-danger/25 bg-danger-soft px-3 py-2.5 text-[12.5px] text-danger">{error}</div>;
  if (!data) return <p className="text-[13px] text-muted">Loading…</p>;

  const { company, metrics, statusCounts, sourceCounts, perJob, activity, recentBookings } = data;
  const maxDay = Math.max(1, ...activity.map((d) => d.count));
  const total = Math.max(1, metrics.candidates);

  return (
    <>
      <PageHeader
        breadcrumb={<Breadcrumb items={[{ label: "Companies", href: "/admin" }, { label: company.name }]} />}
        eyebrow={company.email || "Company"}
        title={company.name}
        subtitle={`Signed up ${formatDate(company.signedUpAt)} · last login ${timeAgo(company.lastLoginAt)} · ${company.loginCount} login${company.loginCount === 1 ? "" : "s"}`}
        actions={
          <Badge tone={company.active ? "success" : "neutral"} dot>
            {company.active ? "Active" : "Inactive"}
          </Badge>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Tile label="Jobs posted" value={metrics.jobs} />
        <Tile label="Candidates" value={metrics.candidates.toLocaleString()} />
        <Tile label="Shortlisted" value={metrics.shortlisted} hint={metrics.invited ? `${metrics.invited} emailed` : "none emailed yet"} />
        <Tile label="Interviews booked" value={metrics.scheduled} />
        <Tile label="Median time to shortlist" value={hoursLabel(metrics.medianHoursToShortlist)} hint="upload → shortlisted" />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-[14px] font-semibold text-ink">Pipeline right now</h2>
          <div className="mt-4 space-y-2.5">
            {STAGE_ORDER.filter((s) => statusCounts[s]).map((s) => (
              <div key={s}>
                <div className="flex justify-between text-[12.5px]">
                  <span className="text-ink-soft">{STAGE_LABEL[s]}</span>
                  <span className="tabular-nums text-muted">{statusCounts[s]}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-canvas-deep">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${(statusCounts[s] / total) * 100}%` }} />
                </div>
              </div>
            ))}
            {!metrics.candidates && <p className="text-[13px] text-muted">No candidates yet.</p>}
          </div>

          {Object.keys(sourceCounts).length > 0 && (
            <>
              <h3 className="mt-6 text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">Where candidates come from</h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {Object.entries(sourceCounts).map(([src, n]) => (
                  <Badge key={src}>
                    {src} · {n}
                  </Badge>
                ))}
              </div>
            </>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="text-[14px] font-semibold text-ink">Candidates added, last 14 days</h2>
          <p className="mt-0.5 text-[12px] text-muted">A quick read on how often they actually use it.</p>
          <div className="mt-5 flex h-28 items-end gap-1.5">
            {activity.map((d) => (
              <div key={d.day} className="flex flex-1 flex-col items-center gap-1" title={`${d.day}: ${d.count}`}>
                <div className="w-full rounded-sm bg-primary/80" style={{ height: `${Math.max(d.count ? 6 : 2, (d.count / maxDay) * 100)}%`, opacity: d.count ? 1 : 0.25 }} />
              </div>
            ))}
          </div>
          <div className="mt-1.5 flex justify-between text-[10.5px] text-faint">
            <span>{activity[0]?.day.slice(5)}</span>
            <span>{activity[activity.length - 1]?.day.slice(5)}</span>
          </div>
        </Card>
      </div>

      <Card className="mt-4 overflow-x-auto p-0">
        <div className="px-5 pt-4 text-[14px] font-semibold text-ink">Jobs</div>
        <table className="mt-2 w-full min-w-[560px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-line text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">
              <th className="px-5 py-2.5">Role</th>
              <th className="px-3 py-2.5">Status</th>
              <th className="px-3 py-2.5 text-right">Candidates</th>
              <th className="px-3 py-2.5 text-right">Shortlisted</th>
              <th className="px-3 py-2.5 text-right">Booked</th>
              <th className="px-5 py-2.5 text-right">Slots offered</th>
            </tr>
          </thead>
          <tbody>
            {perJob.map((j) => (
              <tr key={j.id} className="border-b border-line-soft last:border-0">
                <td className="px-5 py-2.5 font-medium text-ink">{j.title}</td>
                <td className="px-3 py-2.5 text-ink-soft">{j.status}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{j.candidates}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{j.shortlisted}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{j.scheduled}</td>
                <td className="px-5 py-2.5 text-right tabular-nums">{j.slots}</td>
              </tr>
            ))}
            {!perJob.length && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-muted">
                  No jobs posted yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <Card className="mt-4 p-5">
        <h2 className="text-[14px] font-semibold text-ink">Recent interview invitations</h2>
        <ul className="mt-3 divide-y divide-line-soft">
          {recentBookings.map((b, i) => (
            <li key={i} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-[13px]">
              <span>
                <span className="font-medium text-ink">{b.candidate || "Candidate"}</span>
                <span className="text-muted"> · {b.role}</span>
              </span>
              <span className="flex items-center gap-2 text-[12.5px] text-muted">
                {b.slot ? new Date(b.slot).toLocaleString() : `invited ${timeAgo(b.invitedAt)}`}
                <Badge tone={b.status === "booked" ? "success" : "neutral"}>{b.status}</Badge>
              </span>
            </li>
          ))}
          {!recentBookings.length && <li className="py-3 text-[13px] text-muted">No invitations sent yet.</li>}
        </ul>
      </Card>
    </>
  );
}
