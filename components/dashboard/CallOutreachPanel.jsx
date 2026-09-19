"use client";

// STRUCTURAL ONLY — no call is placed. Mock statuses from lib/outreach-data.js.
//
// COMPLIANCE: automated/bulk calling in India is regulated by TRAI (TCCCPR),
// which covers consent registration, DLT scrubbing, and calling-time windows.
// That needs proper legal review before any real dialling is built — see the
// banner at the bottom of this screen and README-INTEGRATIONS.md.

import { useMemo, useState } from "react";
import { Avatar, Badge, Button, Card, MockNote, Select } from "@/components/ui/Primitives";
import { Icon } from "@/components/ui/Icons";
import { CALL_STATUSES, callOutreach } from "@/lib/outreach-data";
import { cn } from "@/lib/utils";

export function CallOutreachPanel() {
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return callOutreach.filter((r) => {
      const matchesStatus = status === "all" || r.status === status;
      const matchesQuery =
        !q || r.name.toLowerCase().includes(q) || r.role.toLowerCase().includes(q) || r.phone.includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [status, query]);

  const counts = useMemo(() => {
    const out = {};
    for (const key of Object.keys(CALL_STATUSES)) {
      out[key] = callOutreach.filter((r) => r.status === key).length;
    }
    return out;
  }, []);

  return (
    <>
      <div className="mb-4 flex items-center justify-end">
        <Button variant="secondary" size="sm" disabled title="Not wired up yet">
          <Icon.Phone size={14} />
          Start call queue
        </Button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Object.entries(CALL_STATUSES).map(([key, meta]) => (
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
              placeholder="Search by name, role, or number…"
              className="h-9 w-full rounded-[10px] border border-line bg-surface pl-9 pr-3 text-[13px] text-ink placeholder:text-faint shadow-xs outline-none transition-colors hover:border-line-strong focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
          </label>
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-9 w-auto min-w-[200px] text-[13px]"
          >
            <option value="all">All statuses</option>
            {Object.entries(CALL_STATUSES).map(([key, meta]) => (
              <option key={key} value={key}>
                {meta.label}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto thin-scrollbar">
          <table className="w-full min-w-[820px] border-collapse text-left">
            <thead>
              <tr className="border-b border-line bg-canvas-deep/40">
                {["Candidate", "Role", "Status", "Call time", "Notes"].map((h) => (
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
                const meta = CALL_STATUSES[r.status];
                return (
                  <tr key={r.id} className="border-b border-line-soft last:border-0 align-top hover:bg-raised">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={r.name} size="sm" />
                        <div className="min-w-0">
                          <div className="truncate text-[13.5px] font-medium text-ink">{r.name}</div>
                          <div className="truncate text-[11.5px] tabular-nums text-muted">{r.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[12.5px] text-ink-soft">{r.role}</td>
                    <td className="px-4 py-3">
                      <Badge tone={meta.tone} dot>
                        {meta.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-[12px] tabular-nums text-muted">{r.calledAt || "—"}</td>
                    <td className="max-w-[280px] px-4 py-3">
                      <span className="block text-[12.5px] leading-relaxed text-muted">
                        {r.notes || <span className="text-faint">No notes</span>}
                      </span>
                    </td>
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

      <div className="mt-4 flex items-start gap-2.5 rounded-card border border-warn/25 bg-warn-soft px-4 py-3">
        <Icon.Warning size={15} className="mt-0.5 shrink-0 text-warn" />
        <div className="text-[12.5px] leading-relaxed text-ink-soft">
          <span className="font-semibold text-warn">Before any real calling is built:</span> automated and
          bulk voice calls in India fall under TRAI&apos;s TCCCPR rules — consent capture, DLT registration,
          scrubbing against the Do Not Disturb registry, and permitted calling hours. This needs a proper
          legal review, not just a Twilio integration. Nothing on this screen places a call.
        </div>
      </div>

      <MockNote className="mt-3">
        Structure only — statuses and notes are mock data so the layout can be reviewed before any dialling
        integration is considered.
      </MockNote>
    </>
  );
}
