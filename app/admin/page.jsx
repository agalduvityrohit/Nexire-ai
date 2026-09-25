"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/dashboard/Shell";
import { Badge, Card } from "@/components/ui/Primitives";
import { hoursLabel, timeAgo } from "@/lib/adminFormat";
import { formatDate } from "@/lib/utils";

function Tile({ label, value, hint }) {
  return (
    <Card className="p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{label}</div>
      <div className="mt-2 text-[26px] font-semibold leading-none tracking-[-0.03em] tabular-nums text-ink">{value}</div>
      {hint && <div className="mt-1.5 text-[12px] text-muted">{hint}</div>}
    </Card>
  );
}

export default function AdminOverviewPage() {
  const [companies, setCompanies] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/companies")
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Couldn't load companies.");
        setCompanies(json.companies);
      })
      .catch((e) => setError(e.message));
  }, []);

  const real = (companies || []).filter((c) => c.role !== "admin");
  const totals = {
    companies: real.length,
    active: real.filter((c) => c.active).length,
    candidates: real.reduce((n, c) => n + c.candidates, 0),
    scheduled: real.reduce((n, c) => n + c.scheduled, 0),
  };

  return (
    <>
      <PageHeader
        eyebrow="Founder view"
        title="Companies"
        subtitle="Every signed-up company, how often they come back, and how much they use Nexire. Active = signed in within the last 14 days."
      />

      {error && <div className="mb-4 rounded-[10px] border border-danger/25 bg-danger-soft px-3 py-2.5 text-[12.5px] text-danger">{error}</div>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Companies" value={companies ? totals.companies : "…"} />
        <Tile label="Active (14 days)" value={companies ? totals.active : "…"} hint={companies && totals.companies ? `${Math.round((totals.active / totals.companies) * 100)}% of companies` : undefined} />
        <Tile label="Candidates processed" value={companies ? totals.candidates.toLocaleString() : "…"} />
        <Tile label="Interviews scheduled" value={companies ? totals.scheduled : "…"} />
      </div>

      <Card className="mt-5 overflow-x-auto p-0">
        <table className="w-full min-w-[860px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-line text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">
              <th className="px-4 py-3">Company</th>
              <th className="px-3 py-3">Signed up</th>
              <th className="px-3 py-3">Last login</th>
              <th className="px-3 py-3 text-right">Jobs</th>
              <th className="px-3 py-3 text-right">Candidates</th>
              <th className="px-3 py-3 text-right">Shortlisted</th>
              <th className="px-3 py-3 text-right">Scheduled</th>
              <th className="px-3 py-3 text-right">Time to shortlist</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {companies?.map((c) => (
              <tr key={c.id} className="border-b border-line-soft transition-colors last:border-0 hover:bg-canvas-deep/50">
                <td className="px-4 py-3">
                  <Link href={`/admin/companies/${c.id}`} className="font-medium text-ink hover:text-primary">
                    {c.name}
                  </Link>
                  {c.role === "admin" && <Badge tone="violet" className="ml-2">You</Badge>}
                  <div className="text-[12px] text-muted">{c.email}</div>
                </td>
                <td className="px-3 py-3 text-ink-soft">{formatDate(c.signedUpAt)}</td>
                <td className="px-3 py-3 text-ink-soft" title={c.lastLoginAt || ""}>
                  {timeAgo(c.lastLoginAt)}
                  <div className="text-[11.5px] text-faint">{c.loginCount} login{c.loginCount === 1 ? "" : "s"}</div>
                </td>
                <td className="px-3 py-3 text-right tabular-nums">{c.jobs}</td>
                <td className="px-3 py-3 text-right tabular-nums">{c.candidates}</td>
                <td className="px-3 py-3 text-right tabular-nums">{c.shortlisted}</td>
                <td className="px-3 py-3 text-right tabular-nums">{c.scheduled}</td>
                <td className="px-3 py-3 text-right tabular-nums text-ink-soft">{hoursLabel(c.medianHoursToShortlist)}</td>
                <td className="px-4 py-3">
                  <Badge tone={c.active ? "success" : "neutral"} dot>
                    {c.active ? "Active" : "Inactive"}
                  </Badge>
                </td>
              </tr>
            ))}
            {companies && !companies.length && (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-muted">
                  No companies have signed up yet.
                </td>
              </tr>
            )}
            {!companies && !error && (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-muted">
                  Loading…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </>
  );
}
