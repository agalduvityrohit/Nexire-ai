"use client";

// Real data: every row is a candidate who was actually emailed a shortlist
// invitation (lib/server/invites.js, via Resend) — "Sent" once the email goes
// out, "Interview Scheduled" once they book a time. No fake sample rows and
// nothing invented: Resend delivery/opens aren't tracked back into the app, so
// there's no "Opened" or "Replied" column here — only what's actually known.

import { useMemo, useState } from "react";
import { Avatar, Badge, Card, Select } from "@/components/ui/Primitives";
import { Icon } from "@/components/ui/Icons";
import { EMAIL_STATUSES } from "@/lib/outreach-data";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function EmailOutreachPanel() {
  const { candidates, jobs } = useStore();
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");

  const invited = useMemo(() => {
    const jobsById = new Map(jobs.map((j) => [j.id, j]));
    return candidates
      .filter((c) => c.invitedAt)
      .map((c) => {
        const job = jobsById.get(c.jobId);
        return {
          id: c.id,
          name: c.name,
          email: c.email,
          role: job?.title || c.role || "—",
          status: c.interviewAt ? "scheduled" : "sent",
          subject: job ? `You've been shortlisted for ${job.title}` : "You've been shortlisted",
          when: c.interviewAt || c.invitedAt,
        };
      })
      .sort((a, b) => (a.when < b.when ? 1 : -1));
  }, [candidates, jobs]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return invited.filter((r) => {
      const matchesStatus = status === "all" || r.status === status;
      const matchesQuery = !q || r.name.toLowerCase().includes(q) || r.role.toLowerCase().includes(q) || (r.email || "").toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [invited, status, query]);

  const counts = useMemo(() => {
    const out = {};
    for (const key of Object.keys(EMAIL_STATUSES)) out[key] = invited.filter((r) => r.status === key).length;
    return out;
  }, [invited]);

  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-2">
        {Object.entries(EMAIL_STATUSES).map(([key, meta]) => (
          <button
            key={key}
            type="button"
            onClick={() => setStatus(status === key ? "all" : key)}
            className={cn(
              "rounded-card border bg-surface p-4 text-left shadow-card transition-all",
              status === key
                ? "border-primary ring-2 ring-primary/12"
                : "border-line hover:scale-[1.02] hover:border-line-strong hover:shadow-lift"
            )}
          >
            <div className="text-[24px] font-semibold leading-none tabular-nums text-ink">{counts[key]}</div>
            <div className="mt-2 text-[11.5px] leading-snug text-muted">{meta.label}</div>
          </button>
        ))}
      </div>

      <Card className="mb-4 p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative flex flex-1 items-center">
            <Icon.Search size={15} className="pointer-events-none absolute left-3 text-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, role, or email…"
              className="h-9 w-full rounded-[10px] border border-line bg-surface pl-9 pr-3 text-[13px] text-ink placeholder:text-faint shadow-xs outline-none transition-colors hover:border-line-strong focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
          </label>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 w-auto min-w-[180px] text-[13px]">
            <option value="all">All statuses</option>
            {Object.entries(EMAIL_STATUSES).map(([key, meta]) => (
              <option key={key} value={key}>
                {meta.label}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto thin-scrollbar">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="border-b border-line bg-canvas-deep/40">
                {["Candidate", "Role", "Subject", "Status", "When"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const meta = EMAIL_STATUSES[r.status];
                return (
                  <tr key={r.id} className="border-b border-line-soft last:border-0 hover:bg-raised">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={r.name} size="sm" />
                        <div className="min-w-0">
                          <div className="truncate text-[13.5px] font-medium text-ink">{r.name}</div>
                          <div className="truncate text-[11.5px] text-muted">{r.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[12.5px] text-ink-soft">{r.role}</td>
                    <td className="max-w-[220px] px-4 py-3">
                      <span className="block truncate text-[12.5px] text-muted">{r.subject}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={meta.tone} dot>
                        {meta.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-[12px] tabular-nums text-muted">{new Date(r.when).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!rows.length && (
          <div className="px-6 py-14 text-center text-[13px] text-muted">
            {invited.length ? "No candidates match those filters." : "Nothing sent yet — shortlisting a candidate on a job with interview times set emails them automatically."}
          </div>
        )}
      </Card>
    </>
  );
}
