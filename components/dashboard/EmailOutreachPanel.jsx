"use client";

// STRUCTURAL ONLY — no email is sent. Mock statuses from lib/outreach-data.js.

import { useMemo, useState } from "react";
import { Avatar, Badge, Card, MockNote, Select } from "@/components/ui/Primitives";
import { Icon } from "@/components/ui/Icons";
import { EMAIL_STATUSES, emailOutreach } from "@/lib/outreach-data";
import { cn } from "@/lib/utils";

export function EmailOutreachPanel() {
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return emailOutreach.filter((r) => {
      const matchesStatus = status === "all" || r.status === status;
      const matchesQuery =
        !q || r.name.toLowerCase().includes(q) || r.role.toLowerCase().includes(q) || r.email.includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [status, query]);

  const counts = useMemo(() => {
    const out = {};
    for (const key of Object.keys(EMAIL_STATUSES)) {
      out[key] = emailOutreach.filter((r) => r.status === key).length;
    }
    return out;
  }, []);

  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
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
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-9 w-auto min-w-[180px] text-[13px]"
          >
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
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead>
              <tr className="border-b border-line bg-canvas-deep/40">
                {["Candidate", "Role", "Subject", "Status", "Opens", "Last updated"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted"
                  >
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
                    <td className="px-4 py-3 text-[12.5px] tabular-nums text-ink-soft">{r.opens}</td>
                    <td className="px-4 py-3 text-[12px] tabular-nums text-muted">{r.updatedAt}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!rows.length && (
          <div className="px-6 py-14 text-center text-[13px] text-muted">No candidates match those filters.</div>
        )}
      </Card>

      <MockNote className="mt-4">
        Structure only — no email is sent from this screen. Statuses are mock data so the layout and the
        status model can be reviewed before Resend or SendGrid is wired in.
      </MockNote>
    </>
  );
}
