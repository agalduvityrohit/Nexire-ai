"use client";

// Interviewer dashboard.
//
// The AI interview itself isn't live yet (see the "Coming soon" badge below
// and lib/mock-data.js's tour copy) — but the interview SCHEDULING around it
// is real: this table shows who was actually emailed an interview invitation
// and who has actually booked a time (lib/server/invites.js,
// app/api/schedule/[token]/route.js). No fake names, no invented scores —
// every row here is a real candidate for whoever is signed in.

import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/dashboard/Shell";
import { Avatar, Badge, Button, Card, Select } from "@/components/ui/Primitives";
import { Icon } from "@/components/ui/Icons";
import { marketing } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const STATUSES = {
  invited: { label: "Invited — waiting on a time", tone: "neutral" },
  scheduled: { label: "Scheduled", tone: "info" },
};

export default function InterviewerDashboard() {
  const { candidates, jobs } = useStore();
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const { interviewer } = marketing;

  const invited = useMemo(() => {
    const jobsById = new Map(jobs.map((j) => [j.id, j]));
    return candidates
      .filter((c) => c.invitedAt)
      .map((c) => {
        const job = jobsById.get(c.jobId);
        return {
          id: c.id,
          name: c.name,
          role: job?.title || c.role || "—",
          status: c.interviewAt ? "scheduled" : "invited",
          when: c.interviewAt || c.invitedAt,
          reportId: null, // no AI interview report exists — see Debrief for the illustrative sample
        };
      })
      .sort((a, b) => (a.when < b.when ? 1 : -1));
  }, [candidates, jobs]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return invited.filter((r) => {
      const matchesStatus = status === "all" || r.status === status;
      const matchesQuery = !q || r.name.toLowerCase().includes(q) || r.role.toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [invited, status, query]);

  const scheduled = invited.filter((r) => r.status === "scheduled").length;

  return (
    <>
      <PageHeader
        eyebrow="Interviewer"
        title={
          <span className="inline-flex items-center gap-2">
            {interviewer.name} — AI interviewer
            <Badge tone="warn">Coming soon</Badge>
          </span>
        }
        subtitle="The AI interview itself isn't live yet. This shows who's actually been invited to an interview and who has booked a time — the offline round it leads to today."
        actions={
          <Button variant="secondary" size="sm" disabled>
            <Icon.Mic size={14} />
            Configure interview plan
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-2">
        {Object.entries(STATUSES).map(([key, meta]) => {
          const count = invited.filter((r) => r.status === key).length;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setStatus(status === key ? "all" : key)}
              className={cn(
                "rounded-card border bg-surface p-3.5 text-left shadow-card transition-all",
                status === key ? "border-primary ring-2 ring-primary/12" : "border-line hover:scale-[1.02] hover:border-line-strong hover:shadow-lift"
              )}
            >
              <div className="text-[20px] font-semibold leading-none tabular-nums text-ink">{count}</div>
              <div className="mt-1.5 text-[11px] leading-snug text-muted">{meta.label}</div>
            </button>
          );
        })}
      </div>

      <Card className="mb-4 p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative flex flex-1 items-center">
            <Icon.Search size={15} className="pointer-events-none absolute left-3 text-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or role…"
              className="h-9 w-full rounded-[10px] border border-line bg-surface pl-9 pr-3 text-[13px] text-ink placeholder:text-faint shadow-xs outline-none transition-colors hover:border-line-strong focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
          </label>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 w-auto min-w-[190px] text-[13px]">
            <option value="all">All statuses</option>
            {Object.entries(STATUSES).map(([key, meta]) => (
              <option key={key} value={key}>
                {meta.label}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto thin-scrollbar">
          <table className="w-full min-w-[560px] border-collapse text-left">
            <thead>
              <tr className="border-b border-line bg-canvas-deep/40">
                {["Candidate", "Role", "Status", "When"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const meta = STATUSES[r.status];
                return (
                  <tr key={r.id} className="border-b border-line-soft last:border-0 hover:bg-raised">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={r.name} size="sm" />
                        <span className="truncate text-[13.5px] font-medium text-ink">{r.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[12.5px] text-ink-soft">{r.role}</td>
                    <td className="px-4 py-3">
                      <Badge tone={meta.tone} dot>
                        {meta.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-[12px] tabular-nums text-muted">
                      {new Date(r.when).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!rows.length && (
          <div className="px-6 py-14 text-center text-[13px] text-muted">
            {invited.length ? "No one matches those filters." : "No one invited yet — shortlisting a candidate on a job with interview times set emails them automatically."}
          </div>
        )}
      </Card>

      <p className="mt-4 text-[12px] text-faint">{scheduled} of {invited.length} invited candidates have booked a time.</p>
    </>
  );
}
