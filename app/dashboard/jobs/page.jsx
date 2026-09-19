"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/dashboard/Shell";
import { Badge, Button, Card, Pill } from "@/components/ui/Primitives";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Icon } from "@/components/ui/Icons";
import { PIPELINE_STAGES } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import { cn, formatDate, relativeDays } from "@/lib/utils";

const FILTERS = ["All", "Open", "Draft"];

export default function JobsPage() {
  const { jobs, candidates, removeJob, syncCandidatesToJobs, notify } = useStore();
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [menuFor, setMenuFor] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const menuRef = useRef(null);

  const unassignedCount = useMemo(() => candidates.filter((c) => !c.jobId).length, [candidates]);

  function handleSync() {
    setSyncing(true);
    const result = syncCandidatesToJobs();
    setSyncing(false);
    if (!result.matched) {
      notify("Nothing to sort — every unassigned candidate's role has no matching open job.", "warn");
      return;
    }
    const breakdown = result.byJob.map((b) => `${b.count} → ${b.title}`).join(", ");
    notify(`${result.matched} candidate${result.matched === 1 ? "" : "s"} sorted into their applied roles (${breakdown})`);
  }

  useEffect(() => {
    if (!menuFor) return;
    function onClickAway(e) {
      if (!menuRef.current?.contains(e.target)) setMenuFor(null);
    }
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, [menuFor]);

  async function confirmedDelete() {
    setDeleting(true);
    const result = await removeJob(deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
    notify(result.ok ? `${deleteTarget.title} deleted` : result.error || "Couldn't delete this job.", result.ok ? "success" : "warn");
  }

  const visible = useMemo(() => {
    return jobs.filter((j) => {
      const matchesFilter = filter === "All" || j.status === filter;
      const matchesQuery =
        !query ||
        j.title.toLowerCase().includes(query.toLowerCase()) ||
        j.stack.join(" ").toLowerCase().includes(query.toLowerCase());
      return matchesFilter && matchesQuery;
    });
  }, [jobs, filter, query]);

  return (
    <>
      <PageHeader
        eyebrow="Roles"
        title="Jobs"
        subtitle="Every role you're hiring for, with its live pipeline. Open a job to work the board."
        actions={
          <>
            {unassignedCount > 0 && (
              <Button variant="secondary" size="sm" onClick={handleSync} disabled={syncing}>
                <Icon.Sparkle size={14} />
                {syncing ? "Sorting…" : `Sort ${unassignedCount} unassigned`}
              </Button>
            )}
            <Button href="/dashboard/jobs/new" variant="primary" size="sm">
              <Icon.Plus size={15} />
              New job post
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-[10px] border border-line bg-canvas-deep/60 p-1">
          {FILTERS.map((f) => {
            const count = f === "All" ? jobs.length : jobs.filter((j) => j.status === f).length;
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  "relative rounded-[7px] px-3 py-1.5 text-[13px] font-medium transition-colors",
                  filter === f ? "text-ink" : "text-muted hover:text-ink-soft"
                )}
              >
                {filter === f && (
                  <motion.span
                    layoutId="jobs-filter"
                    className="absolute inset-0 rounded-[7px] bg-surface shadow-xs ring-1 ring-line"
                    transition={{ type: "spring", stiffness: 480, damping: 38 }}
                  />
                )}
                <span className="relative">
                  {f} <span className="text-[11.5px] tabular-nums text-faint">{count}</span>
                </span>
              </button>
            );
          })}
        </div>

        <label className="relative flex max-w-xs flex-1 items-center">
          <Icon.Search size={15} className="pointer-events-none absolute left-3 text-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by title or stack…"
            className="h-9 w-full rounded-[10px] border border-line bg-surface pl-9 pr-3 text-[13px] text-ink placeholder:text-faint shadow-xs outline-none transition-colors hover:border-line-strong focus:border-primary focus:ring-4 focus:ring-primary/10"
          />
        </label>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {visible.map((job, i) => {
          const pool = candidates.filter((c) => c.jobId === job.id);
          const newCount = pool.filter((c) => c.status === "applied").length;
          return (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i, 8) * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <Card className="group flex h-full flex-col p-5 transition-[border-color,box-shadow,transform] duration-200 ease-brand hover:scale-[1.02] hover:border-line-strong hover:shadow-lift">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/dashboard/jobs/${job.id}`}
                        className="text-[16px] font-semibold tracking-[-0.015em] text-ink transition-colors group-hover:text-primary"
                      >
                        {job.title}
                      </Link>
                      <Badge tone={job.status === "Open" ? "success" : "neutral"} dot>
                        {job.status}
                      </Badge>
                      {job.isNew && <Badge tone="accent">Just posted</Badge>}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-muted">
                      <span className="flex items-center gap-1">
                        <Icon.Pin size={13} />
                        {job.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Icon.Briefcase size={13} />
                        {job.type}
                      </span>
                      <span className="flex items-center gap-1">
                        <Icon.Clock size={13} />
                        {relativeDays(job.postedAt)}
                      </span>
                    </div>
                  </div>
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      aria-label="Job actions"
                      onClick={() => setMenuFor(menuFor === job.id ? null : job.id)}
                      className="flex size-7 items-center justify-center rounded-md text-faint transition-colors hover:bg-canvas-deep hover:text-ink"
                    >
                      <Icon.Dots size={16} />
                    </button>
                    {menuFor === job.id && (
                      <div
                        ref={menuRef}
                        className="absolute right-0 top-8 z-20 w-40 overflow-hidden rounded-[10px] border border-line bg-surface py-1 shadow-pop"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setMenuFor(null);
                            setDeleteTarget(job);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-danger transition-colors hover:bg-danger-soft"
                        >
                          <Icon.Trash size={14} />
                          Delete job
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {job.summary && (
                  <p className="mt-3 line-clamp-2 text-[13px] leading-relaxed text-ink-soft">{job.summary}</p>
                )}

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {job.stack.slice(0, 5).map((s) => (
                    <Pill key={s}>{s}</Pill>
                  ))}
                  {job.stack.length > 5 && <Pill>+{job.stack.length - 5}</Pill>}
                </div>

                {/* pipeline mini-bar */}
                <div className="mt-5 flex-1">
                  <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-[0.06em] text-muted">
                    <span>Pipeline</span>
                    <span className="tabular-nums normal-case tracking-normal">{pool.length} candidates</span>
                  </div>
                  <div className="mt-2 flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-canvas-deep">
                    {PIPELINE_STAGES.map((stage) => {
                      const n = pool.filter((c) => c.status === stage.id).length;
                      if (!n) return null;
                      return (
                        <span
                          key={stage.id}
                          title={`${stage.label}: ${n}`}
                          className={cn(
                            "block h-full",
                            stage.id === "applied" && "bg-line-strong",
                            stage.id === "reviewed" && "bg-info",
                            stage.id === "shortlisted" && "bg-success",
                            stage.id === "interview" && "bg-violet"
                          )}
                          style={{ width: `${(n / Math.max(pool.length, 1)) * 100}%` }}
                        />
                      );
                    })}
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-muted">
                    {PIPELINE_STAGES.map((stage) => (
                      <span key={stage.id} className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "size-1.5 rounded-full",
                            stage.id === "applied" && "bg-line-strong",
                            stage.id === "reviewed" && "bg-info",
                            stage.id === "shortlisted" && "bg-success",
                            stage.id === "interview" && "bg-violet"
                          )}
                        />
                        {stage.label}
                        <span className="tabular-nums text-ink-soft">
                          {pool.filter((c) => c.status === stage.id).length}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between gap-3 border-t border-line-soft pt-4">
                  <span className="text-[12px] text-faint">
                    Posted {formatDate(job.postedAt)}
                    {newCount > 0 && (
                      <>
                        {" · "}
                        <span className="font-medium text-accent">{newCount} unreviewed</span>
                      </>
                    )}
                  </span>
                  <Button href={`/dashboard/jobs/${job.id}`} variant="secondary" size="xs">
                    <Icon.Board size={13} />
                    Pipeline
                  </Button>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {!visible.length && (
        <Card className="flex flex-col items-center gap-2 py-16 text-center">
          <span className="flex size-10 items-center justify-center rounded-full bg-canvas-deep text-faint">
            <Icon.Briefcase size={18} />
          </span>
          {jobs.length ? (
            <>
              <p className="text-[13.5px] font-medium text-ink">No jobs match that filter</p>
              <p className="text-[12.5px] text-muted">Try a different status, or clear the search.</p>
            </>
          ) : (
            <>
              <p className="text-[13.5px] font-medium text-ink">No jobs posted yet</p>
              <p className="text-[12.5px] text-muted">Post your first role to start building a pipeline.</p>
            </>
          )}
        </Card>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={deleteTarget ? `Delete ${deleteTarget.title}?` : ""}
        description="This removes the job posting. Candidates tied to it go back to the general pool, not deleted."
        busy={deleting}
        onConfirm={confirmedDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
