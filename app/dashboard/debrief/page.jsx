"use client";

// Debrief — candidates who've completed the AI interview, with evidence-based
// reports, ranked by AI relevance for the selected role. Where candidates get
// their job (jobId, set at upload time) is a hard link; here a mock debrief
// candidate's `role` is matched against open jobs the same way (see
// lib/roleJobMatch.js), since there's no real interview engine yet to have
// produced a jobId directly — see lib/debriefData.js for the full caveat.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/Shell";
import { NotMovingForwardModal } from "@/components/dashboard/NotMovingForwardModal";
import { DebriefReportSections } from "@/components/dashboard/DebriefReportSections";
import { Avatar, Badge, Button, Card, MockNote, Select } from "@/components/ui/Primitives";
import { Icon } from "@/components/ui/Icons";
import { DEBRIEF_STATUS_META, isPositiveAIRecommendation } from "@/lib/debriefData";
import { matchJobForRole } from "@/lib/roleJobMatch";
import { timestamp } from "@/lib/candidates";
import { useStore } from "@/lib/store";
import { formatDate } from "@/lib/utils";

export default function DebriefPage() {
  const { jobs, debriefCandidates, updateDebriefCandidate, notify } = useStore();
  const openJobs = useMemo(() => jobs.filter((j) => j.status === "Open"), [jobs]);

  // Every debrief candidate's role resolves to at most one open job, same
  // rule bulk upload uses — so grouping by that resolved job id is exactly
  // "which job's debrief is this."
  const byJob = useMemo(() => {
    const map = new Map();
    for (const c of debriefCandidates) {
      const job = matchJobForRole(c.role, jobs);
      if (!job) continue;
      if (!map.has(job.id)) map.set(job.id, []);
      map.get(job.id).push(c);
    }
    for (const list of map.values()) list.sort((a, b) => a.aiRank - b.aiRank);
    return map;
  }, [debriefCandidates, jobs]);

  const [selectedJobId, setSelectedJobId] = useState("");

  // Jobs hydrate async from Supabase, so pick a sensible default once they
  // arrive rather than trying (and failing) to compute it on first render.
  // Only steps in while nothing valid is selected yet — never overrides a
  // choice the user already made.
  useEffect(() => {
    if (!openJobs.length) return;
    if (openJobs.some((j) => j.id === selectedJobId)) return;
    const withCandidates = openJobs.find((j) => (byJob.get(j.id) || []).length > 0);
    setSelectedJobId((withCandidates || openJobs[0]).id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openJobs, byJob]);

  const job = openJobs.find((j) => j.id === selectedJobId);
  const pool = byJob.get(selectedJobId) || [];

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [mode, setMode] = useState("list"); // list | compare
  const [passTarget, setPassTarget] = useState(null); // candidate being passed on

  function toggleSelect(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 3) next.add(id);
      return next;
    });
  }

  function schedule(candidate) {
    updateDebriefCandidate(candidate.id, { debriefStatus: "final_scheduled" });
    notify(`${candidate.name} — final interview scheduled`);
  }

  function confirmNotMoving(reason) {
    const agreedWithAI = !isPositiveAIRecommendation(passTarget.report.recommendation);
    updateDebriefCandidate(passTarget.id, {
      debriefStatus: "not_moving_forward",
      override: { action: "not_moving_forward", reason, agreedWithAI, at: timestamp() },
    });
    notify(`${passTarget.name} — marked not moving forward`);
    setPassTarget(null);
  }

  function exportPdf() {
    notify("PDF export is coming soon — no PDF library wired up yet.", "warn");
  }

  const compareCandidates = pool.filter((c) => selectedIds.has(c.id));

  return (
    <>
      <PageHeader
        eyebrow="Debrief"
        title="Post-interview debrief"
        subtitle="Candidates who've completed the AI interview, with evidence-based reports — review, compare, and decide."
        actions={
          <>
            {mode === "compare" && (
              <Button variant="ghost" size="sm" onClick={() => setMode("list")}>
                <Icon.ArrowLeft size={14} />
                Back to list
              </Button>
            )}
            {mode === "list" && pool.length > 0 && (
              <Button variant="secondary" size="sm" onClick={exportPdf}>
                <Icon.Doc size={14} />
                Export debrief as PDF
              </Button>
            )}
          </>
        }
      />

      {/* --------------------------------------------------------- job picker */}
      <Card className="mb-5 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <span className="text-[12.5px] font-medium text-ink-soft">Role</span>
          <Select
            value={selectedJobId}
            onChange={(e) => {
              setSelectedJobId(e.target.value);
              setSelectedIds(new Set());
              setMode("list");
            }}
            className="h-10 w-full text-[13px] sm:max-w-md"
          >
            {openJobs.length === 0 && <option value="">No open roles yet</option>}
            {openJobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title} — {(byJob.get(j.id) || []).length} completed
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {!job && (
        <Card className="flex flex-col items-center gap-2 py-16 text-center">
          <span className="flex size-10 items-center justify-center rounded-full bg-canvas-deep text-faint">
            <Icon.Briefcase size={18} />
          </span>
          <p className="text-[13.5px] font-medium text-ink">No open roles yet</p>
          <p className="max-w-xs text-[12.5px] text-muted">
            Post a role to start seeing debriefs here once candidates complete the AI interview.
          </p>
        </Card>
      )}

      {job && pool.length === 0 && (
        <Card className="flex flex-col items-center gap-2 py-16 text-center">
          <span className="flex size-10 items-center justify-center rounded-full bg-canvas-deep text-faint">
            <Icon.Mic size={18} />
          </span>
          <p className="text-[13.5px] font-medium text-ink">No completed interviews yet for this role</p>
          <p className="max-w-sm text-[12.5px] text-muted">
            Check back once candidates finish their AI interview for {job.title}.
          </p>
        </Card>
      )}

      {/* ----------------------------------------------------------- list view */}
      {job && pool.length > 0 && mode === "list" && (
        <>
          {selectedIds.size >= 2 && (
            <div className="mb-3 flex items-center justify-between rounded-[10px] border border-primary/25 bg-primary-soft/40 px-4 py-2.5">
              <span className="text-[12.5px] text-ink-soft">
                <span className="font-semibold text-ink">{selectedIds.size}</span> candidate
                {selectedIds.size === 1 ? "" : "s"} selected
              </span>
              <Button variant="primary" size="sm" onClick={() => setMode("compare")}>
                Compare selected
                <Icon.ArrowRight size={14} />
              </Button>
            </div>
          )}

          <Card className="overflow-hidden">
            <ul className="divide-y divide-line-soft">
              {pool.map((c) => (
                <DebriefRow
                  key={c.id}
                  candidate={c}
                  isTopPick={c.aiRank === 1}
                  selected={selectedIds.has(c.id)}
                  selectDisabled={selectedIds.size >= 3 && !selectedIds.has(c.id)}
                  onToggleSelect={() => toggleSelect(c.id)}
                  onSchedule={() => schedule(c)}
                  onNotMoving={() => setPassTarget(c)}
                />
              ))}
            </ul>
          </Card>

          <MockNote className="mt-4">
            Structure only — the AI interview engine isn&apos;t built yet. Completed interviews, reports,
            and evidence are mock data so the debrief workflow can be reviewed first.
          </MockNote>
        </>
      )}

      {/* -------------------------------------------------------- compare view */}
      {job && mode === "compare" && (
        <div className="-mx-4 overflow-x-auto px-4 pb-2 thin-scrollbar sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: `repeat(${Math.max(compareCandidates.length, 1)}, minmax(300px, 1fr))` }}
          >
            {compareCandidates.map((c) => (
              <div key={c.id} className="min-w-0 space-y-4">
                <Card className="p-4">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={c.name} initials={c.initials} size="sm" />
                    <div className="min-w-0">
                      <div className="truncate text-[13.5px] font-semibold text-ink">{c.name}</div>
                      <div className="truncate text-[11.5px] text-muted">{c.role}</div>
                    </div>
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    <Badge tone={c.aiRank === 1 ? "accent" : "neutral"}>
                      {c.aiRank === 1 ? "AI Top Pick" : `AI rank #${c.aiRank}`}
                    </Badge>
                    <Badge tone="primary">{c.report.recommendation}</Badge>
                  </div>
                </Card>
                <DebriefReportSections report={c.report} size="sm" asCards={false} />
              </div>
            ))}
          </div>
        </div>
      )}

      <NotMovingForwardModal
        open={Boolean(passTarget)}
        candidateName={passTarget?.name}
        onConfirm={confirmNotMoving}
        onCancel={() => setPassTarget(null)}
      />
    </>
  );
}

function DebriefRow({ candidate, isTopPick, selected, selectDisabled, onToggleSelect, onSchedule, onNotMoving }) {
  const meta = DEBRIEF_STATUS_META[candidate.debriefStatus] || DEBRIEF_STATUS_META.report_ready;
  const decided = candidate.debriefStatus === "hired" || candidate.debriefStatus === "not_moving_forward";

  return (
    <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
      <input
        type="checkbox"
        checked={selected}
        disabled={selectDisabled}
        onChange={onToggleSelect}
        className="mt-1 size-4 shrink-0 cursor-pointer rounded-[5px] border-line-strong accent-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-30"
        aria-label={`Select ${candidate.name} to compare`}
      />
      <Avatar name={candidate.name} initials={candidate.initials} size="sm" className="shrink-0" />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/dashboard/debrief/${candidate.id}`} className="text-[13.5px] font-semibold text-ink hover:text-primary">
            {candidate.name}
          </Link>
          <span className="text-[12px] text-muted">{candidate.role}</span>
          {isTopPick && (
            <Badge tone="accent">
              <Icon.Sparkle size={11} />
              AI Top Pick
            </Badge>
          )}
          <Badge tone={meta.tone} dot>
            {meta.label}
          </Badge>
        </div>

        <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-soft">“{candidate.evidenceSnippet}”</p>

        <div className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-faint">
          <Icon.Clock size={11} />
          Completed {formatDate(candidate.completedAt)}
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:flex-col sm:items-stretch">
        <Button href={`/dashboard/debrief/${candidate.id}`} variant="secondary" size="xs">
          View report
        </Button>
        {!decided && (
          <>
            <Button variant="ghost" size="xs" onClick={onSchedule}>
              Schedule final
            </Button>
            <Button variant="ghost" size="xs" onClick={onNotMoving} className="text-danger hover:bg-danger-soft">
              Not moving forward
            </Button>
          </>
        )}
      </div>
    </li>
  );
}
