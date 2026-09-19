"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/dashboard/Shell";
import { StatCard } from "@/components/dashboard/StatCard";
import { CandidateCards, CandidateTable } from "@/components/dashboard/CandidateTable";
import { Avatar, Badge, Button, Card, Meter, Pill, SectionTitle } from "@/components/ui/Primitives";
import { Icon } from "@/components/ui/Icons";
import { employer, PIPELINE_STAGES, SOURCE_META } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import { cn, relativeDays } from "@/lib/utils";

const TABS = [
  { id: "all", label: "All" },
  { id: "applied", label: "Unreviewed" },
  { id: "shortlisted", label: "Shortlisted" },
  { id: "interview", label: "Interviewing" },
];

export default function DashboardOverview() {
  const { candidates, jobs } = useStore();
  const [tab, setTab] = useState("all");

  const jobsById = useMemo(() => Object.fromEntries(jobs.map((j) => [j.id, j])), [jobs]);

  const stats = useMemo(() => {
    const total = candidates.length;
    const unreviewed = candidates.filter((c) => c.status === "applied").length;
    const shortlisted = candidates.filter((c) => c.status === "shortlisted").length;
    const interviewing = candidates.filter((c) => c.status === "interview").length;
    return { total, unreviewed, shortlisted, interviewing };
  }, [candidates]);

  const visible = useMemo(() => {
    const list = tab === "all" ? candidates : candidates.filter((c) => c.status === tab);
    return [...list].sort((a, b) => (a.appliedAt < b.appliedAt ? 1 : -1));
  }, [candidates, tab]);

  const attention = useMemo(
    () =>
      [...candidates]
        .filter((c) => c.status === "applied" || c.matchScore >= 85)
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 4),
    [candidates]
  );

  const sourceBreakdown = useMemo(() => {
    const counts = {};
    candidates.forEach((c) => {
      counts[c.source] = (counts[c.source] || 0) + 1;
    });
    const max = Math.max(...Object.values(counts), 1);
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => ({ key: k, label: SOURCE_META[k] || k, count: v, pct: Math.round((v / max) * 100) }));
  }, [candidates]);

  const subtitle =
    stats.total === 0
      ? "Nothing in the pipeline yet — bulk-upload résumés or connect your mailbox to start filling this in."
      : `${stats.unreviewed} application${stats.unreviewed === 1 ? "" : "s"} waiting on review · ${stats.interviewing} interview${stats.interviewing === 1 ? "" : "s"} scheduled.`;

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title={`Good morning, ${employer.name.split(" ")[0]}`}
        subtitle={subtitle}
        actions={
          <>
            <Button href="/dashboard/candidates" variant="secondary" size="sm">
              <Icon.Filter size={14} />
              All candidates
            </Button>
            <Button href="/dashboard/jobs/new" variant="primary" size="sm">
              <Icon.Plus size={15} />
              New job post
            </Button>
          </>
        }
      />

      {/* ------------------------------------------------------------ stats */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          index={0}
          label="Total applications"
          value={stats.total}
          hint={`Across ${jobs.filter((j) => j.status === "Open").length} open role${jobs.filter((j) => j.status === "Open").length === 1 ? "" : "s"}`}
          icon={Icon.Inbox}
          tone="primary"
          href="/dashboard/candidates"
        />
        <StatCard
          index={1}
          label="New / unreviewed"
          value={stats.unreviewed}
          deltaTone="danger"
          icon={Icon.Bell}
          tone="accent"
        />
        <StatCard
          index={2}
          label="Shortlisted"
          value={stats.shortlisted}
          hint="Ready for human round"
          icon={Icon.Star}
          tone="success"
        />
        <StatCard
          index={3}
          label="Interview scheduled"
          value={stats.interviewing}
          icon={Icon.Mic}
          tone="violet"
        />
      </div>

      {/* ------------------------------------------------------------- body */}
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        {/* candidates */}
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-1">
              {TABS.map((t) => {
                const count =
                  t.id === "all" ? candidates.length : candidates.filter((c) => c.status === t.id).length;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    className={cn(
                      "relative rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors",
                      tab === t.id ? "text-ink" : "text-muted hover:bg-canvas-deep hover:text-ink-soft"
                    )}
                  >
                    {tab === t.id && (
                      <motion.span
                        layoutId="overview-tab"
                        className="absolute inset-0 rounded-lg bg-canvas-deep"
                        transition={{ type: "spring", stiffness: 480, damping: 38 }}
                      />
                    )}
                    <span className="relative">
                      {t.label}
                      <span className="ml-1.5 text-[11.5px] tabular-nums text-faint">{count}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <Link
              href="/dashboard/candidates"
              className="flex items-center gap-1 text-[12.5px] font-medium text-primary hover:underline"
            >
              View all
              <Icon.ArrowRight size={13} />
            </Link>
          </div>

          <div className="hidden md:block">
            <CandidateTable candidates={visible.slice(0, 8)} jobsById={jobsById} />
          </div>
          <div className="md:hidden">
            <CandidateCards candidates={visible.slice(0, 8)} jobsById={jobsById} />
          </div>
        </Card>

        {/* right rail */}
        <div className="space-y-6">
          {/* needs attention */}
          <Card className="p-4">
            <SectionTitle
              eyebrow="Triage"
              title="Needs your attention"
              action={<Badge tone="accent">{stats.unreviewed} new</Badge>}
            />
            <ul className="mt-4 space-y-1">
              {attention.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/dashboard/candidates/${c.id}`}
                    className="flex items-center gap-3 rounded-[10px] px-2 py-2 transition-colors hover:bg-canvas-deep"
                  >
                    <Avatar name={c.name} initials={c.initials} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-medium text-ink">{c.name}</div>
                      <div className="truncate text-[11.5px] text-muted">
                        {jobsById[c.jobId]?.title} · {relativeDays(c.appliedAt)}
                      </div>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-md px-1.5 py-0.5 text-[11.5px] font-semibold tabular-nums",
                        c.matchScore >= 85 ? "bg-success-soft text-success" : "bg-canvas-deep text-ink-soft"
                      )}
                    >
                      {c.matchScore}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>

          {/* pipeline snapshot */}
          <Card className="p-4">
            <SectionTitle
              eyebrow="Pipeline"
              title="Where everyone stands"
              action={
                jobs[0] && (
                  <Link
                    href={`/dashboard/jobs/${jobs[0].id}`}
                    className="text-[12.5px] font-medium text-primary hover:underline"
                  >
                    Open board
                  </Link>
                )
              }
            />
            <div className="mt-4 space-y-3">
              {PIPELINE_STAGES.map((stage) => {
                const count = candidates.filter((c) => c.status === stage.id).length;
                const pct = Math.round((count / Math.max(candidates.length, 1)) * 100);
                return (
                  <div key={stage.id}>
                    <div className="flex items-baseline justify-between">
                      <span className="text-[12.5px] font-medium text-ink-soft">{stage.label}</span>
                      <span className="text-[12px] tabular-nums text-muted">
                        {count} <span className="text-faint">· {pct}%</span>
                      </span>
                    </div>
                    <div className="mt-1.5">
                      <Meter
                        value={pct}
                        tone={
                          stage.id === "applied"
                            ? "bg-line-strong"
                            : stage.id === "reviewed"
                              ? "bg-info"
                              : stage.id === "shortlisted"
                                ? "bg-success"
                                : "bg-violet"
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* sources */}
          <Card className="p-4">
            <SectionTitle eyebrow="Inbound" title="Where they came from" />
            <ul className="mt-4 space-y-2.5">
              {sourceBreakdown.map((s) => (
                <li key={s.key} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 truncate text-[12.5px] text-ink-soft">{s.label}</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-canvas-deep">
                    <span className="block h-full rounded-full bg-primary/70" style={{ width: `${s.pct}%` }} />
                  </span>
                  <span className="w-5 text-right text-[12px] tabular-nums text-muted">{s.count}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* open roles */}
          <Card className="p-4">
            <SectionTitle
              eyebrow="Roles"
              title="Open positions"
              action={
                <Link href="/dashboard/jobs" className="text-[12.5px] font-medium text-primary hover:underline">
                  Manage
                </Link>
              }
            />
            <ul className="mt-4 space-y-2">
              {jobs
                .filter((j) => j.status === "Open")
                .slice(0, 4)
                .map((job) => {
                  const count = candidates.filter((c) => c.jobId === job.id).length;
                  return (
                    <li key={job.id}>
                      <Link
                        href={`/dashboard/jobs/${job.id}`}
                        className="flex items-center gap-3 rounded-[10px] border border-line px-3 py-2.5 transition-colors hover:border-line-strong hover:bg-raised"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] font-medium text-ink">{job.title}</div>
                          <div className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-muted">
                            <span>{job.location}</span>
                          </div>
                        </div>
                        <Pill>{count} in pipeline</Pill>
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
