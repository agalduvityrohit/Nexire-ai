"use client";

// Interviewer dashboard — every interview Arjun has run or has queued.
//
// STRUCTURAL: statuses, transcripts and scores are mock. The interview engine
// itself isn't built. Reports link through to the existing report screen.

import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/dashboard/Shell";
import { Avatar, Badge, Button, Card, Meter, MockNote, Select } from "@/components/ui/Primitives";
import { Icon } from "@/components/ui/Icons";
import { marketing } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const STATUSES = {
  completed: { label: "Completed", tone: "success" },
  in_progress: { label: "In progress", tone: "violet" },
  scheduled: { label: "Scheduled", tone: "info" },
  invited: { label: "Invited", tone: "neutral" },
  declined: { label: "Declined AI screen", tone: "warn" },
  expired: { label: "Link expired", tone: "danger" },
};

const INTERVIEWS = [
  { id: "i1", name: "Ananya Menon", initials: "AM", role: "Software Engineer", status: "completed", when: "2026-08-08 16:10", duration: "27 min", questions: 9, score: 91, reportId: "cand-ananya-menon" },
  { id: "i2", name: "Karthik Rao", initials: "KR", role: "ML Engineer", status: "completed", when: "2026-08-08 11:35", duration: "24 min", questions: 8, score: 89, reportId: null },
  { id: "i3", name: "Rohan Desai", initials: "RD", role: "Full Stack Developer", status: "completed", when: "2026-08-07 19:02", duration: "22 min", questions: 8, score: 73, reportId: null },
  { id: "i4", name: "Meera Iyer", initials: "MI", role: "UI/UX Designer", status: "in_progress", when: "2026-08-09 10:40", duration: "12 min so far", questions: 5, score: null, reportId: null },
  { id: "i5", name: "Sneha Kulkarni", initials: "SK", role: "Software Engineer", status: "scheduled", when: "2026-08-10 18:00", duration: "—", questions: 9, score: null, reportId: null },
  { id: "i6", name: "Devika Rao", initials: "DR", role: "DevOps Engineer", status: "invited", when: "2026-08-09 09:15", duration: "—", questions: 9, score: null, reportId: null },
  { id: "i7", name: "Priyanka Joshi", initials: "PJ", role: "Data Scientist", status: "completed", when: "2026-08-06 13:48", duration: "26 min", questions: 8, score: 81, reportId: null },
  { id: "i8", name: "Fatima Shaikh", initials: "FS", role: "Data Analyst", status: "declined", when: "2026-08-05 10:20", duration: "—", questions: 0, score: null, reportId: null },
  { id: "i9", name: "Imran Qureshi", initials: "IQ", role: "ML Engineer", status: "expired", when: "2026-08-01 08:00", duration: "—", questions: 0, score: null, reportId: null },
  { id: "i10", name: "Vikram Nair", initials: "VN", role: "Software Engineer", status: "invited", when: "2026-08-09 07:30", duration: "—", questions: 9, score: null, reportId: null },
];

export default function InterviewerDashboard() {
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const { interviewer } = marketing;

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return INTERVIEWS.filter((r) => {
      const matchesStatus = status === "all" || r.status === status;
      const matchesQuery = !q || r.name.toLowerCase().includes(q) || r.role.toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [status, query]);

  const completed = INTERVIEWS.filter((r) => r.status === "completed");
  const avgScore = Math.round(completed.reduce((n, r) => n + r.score, 0) / Math.max(completed.length, 1));

  return (
    <>
      <PageHeader
        eyebrow="Interviewer"
        title={`${interviewer.name} — AI interviewer`}
        subtitle={`${interviewer.tagline} Every interview he has run, is running, or is waiting on.`}
        actions={
          <Button variant="secondary" size="sm" disabled>
            <Icon.Mic size={14} />
            Configure interview plan
          </Button>
        }
      />

      {/* ------------------------------------------------------ his status */}
      <Card className="mb-5 overflow-hidden">
        <div className="relative bg-primary-deep p-5 text-white">
          <div aria-hidden className="absolute inset-0 grid-lines opacity-25 mix-blend-overlay" />
          <div className="relative flex flex-wrap items-center gap-4">
            <ArjunAvatar />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-semibold">{interviewer.name}</span>
                <span className="rounded-full bg-white/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/70">
                  {interviewer.role}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[12px] text-white/55">
                <span className="size-1.5 rounded-full bg-success" />
                Available · 1 interview in progress
              </div>
            </div>
            <div className="flex gap-6">
              {[
                [completed.length, "completed"],
                [avgScore, "avg score"],
                [INTERVIEWS.filter((r) => r.status === "invited" || r.status === "scheduled").length, "waiting"],
              ].map(([v, l]) => (
                <div key={l}>
                  <div className="text-[22px] font-semibold leading-none tabular-nums">{v}</div>
                  <div className="mt-1 text-[11px] text-white/50">{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Object.entries(STATUSES).map(([key, meta]) => {
          const count = INTERVIEWS.filter((r) => r.status === key).length;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setStatus(status === key ? "all" : key)}
              className={cn(
                "rounded-card border bg-surface p-3.5 text-left shadow-card transition-all",
                status === key
                  ? "border-primary ring-2 ring-primary/12"
                  : "border-line hover:scale-[1.02] hover:border-line-strong hover:shadow-lift"
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
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-9 w-auto min-w-[190px] text-[13px]"
          >
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
          <table className="w-full min-w-[820px] border-collapse text-left">
            <thead>
              <tr className="border-b border-line bg-canvas-deep/40">
                {["Candidate", "Role", "Status", "When", "Length", "Score", ""].map((h, i) => (
                  <th
                    key={i}
                    className="px-4 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted"
                  >
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
                        <Avatar name={r.name} initials={r.initials} size="sm" />
                        <span className="truncate text-[13.5px] font-medium text-ink">{r.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[12.5px] text-ink-soft">{r.role}</td>
                    <td className="px-4 py-3">
                      <Badge tone={meta.tone} dot>
                        {meta.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-[12px] tabular-nums text-muted">{r.when}</td>
                    <td className="px-4 py-3 text-[12px] text-muted">{r.duration}</td>
                    <td className="px-4 py-3">
                      {r.score != null ? (
                        <span className="flex items-center gap-2">
                          <span className="w-12">
                            <Meter value={r.score} />
                          </span>
                          <span className="text-[12.5px] font-semibold tabular-nums text-ink">{r.score}</span>
                        </span>
                      ) : (
                        <span className="text-[12px] text-faint">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.reportId ? (
                        <Link
                          href={`/dashboard/candidates/${r.reportId}/report`}
                          className="text-[12.5px] font-medium text-primary hover:underline"
                        >
                          Report
                        </Link>
                      ) : (
                        <span className="text-[12px] text-faint">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!rows.length && (
          <div className="px-6 py-14 text-center text-[13px] text-muted">No interviews match those filters.</div>
        )}
      </Card>

      <MockNote className="mt-4">
        Structure only — the interview engine isn&apos;t built. Statuses, durations and scores are mock data
        so the layout can be reviewed first. Ananya&apos;s row links to the real sample report.
      </MockNote>
    </>
  );
}

function ArjunAvatar() {
  return (
    <span className="relative flex size-12 shrink-0 items-center justify-center rounded-full ring-2 ring-white/20">
      <svg viewBox="0 0 48 48" width="48" height="48" className="rounded-full" aria-hidden>
        <defs>
          <clipPath id="arjun-dash-clip">
            <circle cx="24" cy="24" r="24" />
          </clipPath>
          <linearGradient id="arjun-dash-bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#c3ddd8" />
            <stop offset="100%" stopColor="#8fbdb5" />
          </linearGradient>
        </defs>
        <g clipPath="url(#arjun-dash-clip)">
          <rect width="48" height="48" fill="url(#arjun-dash-bg)" />
          <path d="M6 48c0-9.8 8.3-14.6 18-14.6s18 4.8 18 14.6z" fill="#22303a" opacity="0.9" />
          <ellipse cx="24" cy="25" rx="9" ry="10.6" fill="#c48f6a" />
          <path d="M14.6 20.5c0-6.6 4.2-11 9.4-11s9.4 4.4 9.4 11c0-1.6-.5-2.8-1.6-3.4.2-1.4-.3-2.4-1.6-2.6-1-1.6-3-2.4-6.2-2.4s-5.2.8-6.2 2.4c-1.3.2-1.8 1.2-1.6 2.6-1.1.6-1.6 1.8-1.6 3.4z" fill="#1f1a17" />
          <path d="M16 21.2c1.6-1.2 4.4-1.8 8-1.8s6.4.6 8 1.8c-.3-3.3-3.4-5.6-8-5.6s-7.7 2.3-8 5.6z" fill="#1f1a17" />
          <ellipse cx="20.4" cy="24.4" rx="1.4" ry="1.6" fill="#241f1c" />
          <ellipse cx="27.6" cy="24.4" rx="1.4" ry="1.6" fill="#241f1c" />
          <path d="M18.4 21.6c1.1-.6 2.4-.6 3.4 0" stroke="#1f1a17" strokeWidth="0.9" strokeLinecap="round" fill="none" />
          <path d="M26.2 21.6c1-.6 2.3-.6 3.4 0" stroke="#1f1a17" strokeWidth="0.9" strokeLinecap="round" fill="none" />
          <path
            d="M17.5 29.5c1.6 1.4 3.9 2.1 6.5 2.1s4.9-.7 6.5-2.1"
            stroke="#8a5a3d"
            strokeWidth="0.9"
            strokeLinecap="round"
            fill="none"
            opacity="0.55"
          />
          <ellipse cx="24" cy="30.6" rx="2.1" ry="1.2" fill="#9c6a4c" />
        </g>
      </svg>
    </span>
  );
}
