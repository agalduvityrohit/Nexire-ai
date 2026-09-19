"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Avatar, Badge, Pill } from "@/components/ui/Primitives";
import { Icon } from "@/components/ui/Icons";
import { PIPELINE_STAGES, SOURCE_META, hasReachedStage } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import { cn, relativeDays } from "@/lib/utils";

const STAGE_ACCENT = {
  applied: { bar: "bg-line-strong", chip: "neutral" },
  reviewed: { bar: "bg-info", chip: "info" },
  shortlisted: { bar: "bg-success", chip: "success" },
  interview: { bar: "bg-violet", chip: "violet" },
};

function pointFromEvent(event, info) {
  if (event && typeof event.clientX === "number") return { x: event.clientX, y: event.clientY };
  const touch = event?.changedTouches?.[0];
  if (touch) return { x: touch.clientX, y: touch.clientY };
  return { x: info.point.x - window.scrollX, y: info.point.y - window.scrollY };
}

export function PipelineBoard({ jobId }) {
  const { candidates, setCandidateStatus, notify } = useStore();
  const columnRefs = useRef({});
  const [dragging, setDragging] = useState(null);
  const [hovered, setHovered] = useState(null);

  const pool = candidates.filter((c) => c.jobId === jobId);
  const rejected = pool.filter((c) => c.status === "rejected");

  function findColumnAt(point) {
    return (
      PIPELINE_STAGES.find((stage) => {
        const el = columnRefs.current[stage.id];
        if (!el) return false;
        const r = el.getBoundingClientRect();
        return point.x >= r.left && point.x <= r.right && point.y >= r.top && point.y <= r.bottom;
      })?.id || null
    );
  }

  function handleDrag(event, info) {
    setHovered(findColumnAt(pointFromEvent(event, info)));
  }

  function handleDragEnd(candidate, event, info) {
    const target = findColumnAt(pointFromEvent(event, info));
    setDragging(null);
    setHovered(null);
    if (target && target !== candidate.status) {
      setCandidateStatus(candidate.id, target);
      const label = PIPELINE_STAGES.find((s) => s.id === target)?.label;
      notify(`${candidate.name} moved to ${label}`);
    }
  }

  function move(candidate, direction) {
    const i = PIPELINE_STAGES.findIndex((s) => s.id === candidate.status);
    const next = PIPELINE_STAGES[i + direction];
    if (!next) return;
    setCandidateStatus(candidate.id, next.id);
    notify(`${candidate.name} moved to ${next.label}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-muted">
        <Icon.Board size={15} className="text-faint" />
        Drag a card between columns, or use the arrows on each card. Status changes are saved.
      </div>

      <div className="-mx-4 overflow-x-auto px-4 pb-2 thin-scrollbar sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="grid min-w-[900px] grid-cols-4 gap-3">
          {PIPELINE_STAGES.map((stage) => {
            // Cumulative, not exact-match — a Shortlisted candidate's card
            // also shows here in Applied and Reviewed, since they passed
            // through both on the way. See lib/mock-data.js#hasReachedStage.
            const cards = pool.filter((c) => hasReachedStage(c.status, stage.id));
            const isTarget = hovered === stage.id && dragging && dragging.status !== stage.id;
            const accent = STAGE_ACCENT[stage.id];

            return (
              <div
                key={stage.id}
                ref={(el) => {
                  columnRefs.current[stage.id] = el;
                }}
                className={cn(
                  "flex min-h-[420px] flex-col rounded-card border bg-canvas-deep/40 transition-colors duration-150",
                  isTarget ? "border-primary/45 bg-primary-soft/50" : "border-line"
                )}
              >
                <div className="flex items-center gap-2 border-b border-line px-3 py-2.5">
                  <span className={cn("h-4 w-[3px] rounded-full", accent.bar)} />
                  <span className="text-[12.5px] font-semibold text-ink">{stage.label}</span>
                  <span className="ml-auto rounded-full bg-surface px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-muted ring-1 ring-line">
                    {cards.length}
                  </span>
                </div>

                <div className="flex-1 space-y-2 p-2">
                  <AnimatePresence initial={false}>
                    {cards.map((c) => {
                      const candidateStageIndex = PIPELINE_STAGES.findIndex((s) => s.id === c.status);
                      const isCurrentStage = c.status === stage.id;
                      return (
                      <motion.div
                        key={c.id}
                        layout
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: isCurrentStage ? 1 : 0.55, scale: 1 }}
                        // Exit fast so a card never looks like it is in two columns at once.
                        exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.12 } }}
                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                        drag
                        dragSnapToOrigin
                        dragElastic={0.14}
                        dragMomentum={false}
                        onDragStart={() => setDragging(c)}
                        onDrag={handleDrag}
                        onDragEnd={(e, info) => handleDragEnd(c, e, info)}
                        whileDrag={{
                          scale: 1.03,
                          rotate: -1.2,
                          zIndex: 60,
                          boxShadow: "var(--shadow-drag)",
                          cursor: "grabbing",
                        }}
                        className="group relative cursor-grab touch-none rounded-[11px] border border-line bg-surface p-3 shadow-xs transition-shadow hover:shadow-card active:cursor-grabbing"
                      >
                        {!isCurrentStage && (
                          <span className="absolute right-2 top-2 rounded-full bg-canvas-deep px-1.5 py-0.5 text-[9.5px] font-medium uppercase tracking-[0.04em] text-faint">
                            Passed
                          </span>
                        )}
                        <div className="flex items-start gap-2.5">
                          <Avatar name={c.name} initials={c.initials} size="sm" />
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/dashboard/candidates/${c.id}`}
                              draggable={false}
                              className="block truncate text-[13px] font-medium text-ink hover:text-primary"
                            >
                              {c.name}
                            </Link>
                            <div className="truncate text-[11.5px] text-muted">{c.headline}</div>
                          </div>
                          <span
                            className={cn(
                              "shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
                              c.matchScore >= 85
                                ? "bg-success-soft text-success"
                                : c.matchScore >= 70
                                  ? "bg-primary-soft text-primary"
                                  : "bg-warn-soft text-warn"
                            )}
                          >
                            {c.matchScore}
                          </span>
                        </div>

                        <div className="mt-2.5 flex flex-wrap gap-1">
                          {c.skills.slice(0, 3).map((s) => (
                            <Pill key={s.name} className="text-[11px]">
                              {s.name}
                            </Pill>
                          ))}
                        </div>

                        <div className="mt-3 flex items-center justify-between border-t border-line-soft pt-2.5">
                          <span className="truncate text-[11px] text-faint">
                            {SOURCE_META[c.source]} · {relativeDays(c.appliedAt)}
                          </span>
                          <span className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                            <button
                              type="button"
                              aria-label={`Move ${c.name} back a stage`}
                              disabled={candidateStageIndex === 0}
                              onClick={() => move(c, -1)}
                              className="flex size-6 items-center justify-center rounded-md text-faint transition-colors hover:bg-canvas-deep hover:text-ink disabled:opacity-25 disabled:hover:bg-transparent"
                            >
                              <Icon.ArrowLeft size={13} />
                            </button>
                            <button
                              type="button"
                              aria-label={`Move ${c.name} forward a stage`}
                              disabled={candidateStageIndex === PIPELINE_STAGES.length - 1}
                              onClick={() => move(c, 1)}
                              className="flex size-6 items-center justify-center rounded-md text-faint transition-colors hover:bg-canvas-deep hover:text-ink disabled:opacity-25 disabled:hover:bg-transparent"
                            >
                              <Icon.ArrowRight size={13} />
                            </button>
                          </span>
                        </div>
                      </motion.div>
                      );
                    })}
                  </AnimatePresence>

                  {!cards.length && (
                    <div
                      className={cn(
                        "flex h-24 items-center justify-center rounded-[11px] border border-dashed text-[12px] transition-colors",
                        isTarget ? "border-primary/50 text-primary" : "border-line-strong text-faint"
                      )}
                    >
                      {isTarget ? "Drop here" : "Empty"}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {!!rejected.length && (
        <RejectedRow candidates={rejected} onRestore={(c) => { setCandidateStatus(c.id, "applied"); notify(`${c.name} moved back to Applied`); }} />
      )}
    </div>
  );
}

function RejectedRow({ candidates, onRestore }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-card border border-line bg-surface">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-4 py-3 text-left"
      >
        <Icon.ChevronRight size={14} className={cn("text-faint transition-transform", open && "rotate-90")} />
        <span className="text-[13px] font-medium text-ink">Rejected</span>
        <Badge tone="danger">{candidates.length}</Badge>
        <span className="ml-auto text-[12px] text-faint">Kept out of the board</span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <ul className="divide-y divide-line-soft border-t border-line">
              {candidates.map((c) => (
                <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                  <Avatar name={c.name} initials={c.initials} size="sm" className="opacity-60" />
                  <div className="min-w-0 flex-1">
                    <Link href={`/dashboard/candidates/${c.id}`} className="block truncate text-[13px] font-medium text-ink-soft hover:text-primary">
                      {c.name}
                    </Link>
                    <div className="truncate text-[11.5px] text-faint">{c.headline}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRestore(c)}
                    className="rounded-md border border-line px-2 py-1 text-[11.5px] font-medium text-ink-soft transition-colors hover:border-line-strong hover:bg-canvas"
                  >
                    Restore
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
