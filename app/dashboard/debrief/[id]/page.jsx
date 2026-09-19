"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Breadcrumb, PageHeader } from "@/components/dashboard/Shell";
import { NotMovingForwardModal } from "@/components/dashboard/NotMovingForwardModal";
import { DebriefReportSections } from "@/components/dashboard/DebriefReportSections";
import { Avatar, Badge, Button, Card, MockNote } from "@/components/ui/Primitives";
import { Icon } from "@/components/ui/Icons";
import { DEBRIEF_STATUS_META, isPositiveAIRecommendation } from "@/lib/debriefData";
import { matchJobForRole } from "@/lib/roleJobMatch";
import { timestamp } from "@/lib/candidates";
import { useStore } from "@/lib/store";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

const PIPELINE = [
  { id: "interview_complete", label: "Interview Complete" },
  { id: "report_ready", label: "Report Ready" },
  { id: "hr_reviewing", label: "HR Reviewing" },
  { id: "final_scheduled", label: "Final Round Scheduled" },
  { id: "decided", label: "Hired / Passed" },
];

function stageIndex(status) {
  if (status === "hired" || status === "not_moving_forward") return 4;
  if (status === "final_scheduled") return 3;
  if (status === "hr_reviewing") return 2;
  return 1; // report_ready
}

export default function DebriefReportPage() {
  const { id } = useParams();
  const router = useRouter();
  const { jobs, debriefCandidates, updateDebriefCandidate, notify } = useStore();
  const candidate = debriefCandidates.find((c) => c.id === id);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [passOpen, setPassOpen] = useState(false);

  // Opening the report is what "HR Reviewing" means — no separate button for it.
  useEffect(() => {
    if (candidate?.debriefStatus === "report_ready") {
      updateDebriefCandidate(candidate.id, { debriefStatus: "hr_reviewing" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidate?.id]);

  if (!candidate) {
    return (
      <Card className="flex flex-col items-center gap-3 py-20 text-center">
        <span className="flex size-10 items-center justify-center rounded-full bg-canvas-deep text-faint">
          <Icon.Doc size={18} />
        </span>
        <p className="text-[14px] font-medium text-ink">No debrief report for this candidate</p>
        <Button href="/dashboard/debrief" variant="secondary" size="sm">
          Back to debrief
        </Button>
      </Card>
    );
  }

  const job = matchJobForRole(candidate.role, jobs);
  const meta = DEBRIEF_STATUS_META[candidate.debriefStatus] || DEBRIEF_STATUS_META.report_ready;
  const decided = candidate.debriefStatus === "hired" || candidate.debriefStatus === "not_moving_forward";
  const currentIndex = stageIndex(candidate.debriefStatus);

  function schedule() {
    updateDebriefCandidate(candidate.id, { debriefStatus: "final_scheduled" });
    notify(`${candidate.name} — final interview scheduled`);
  }

  function markHired() {
    const agreedWithAI = isPositiveAIRecommendation(candidate.report.recommendation);
    updateDebriefCandidate(candidate.id, {
      debriefStatus: "hired",
      override: { action: "hired", reason: null, agreedWithAI, at: timestamp() },
    });
    notify(`${candidate.name} marked as hired`);
  }

  function confirmNotMoving(reason) {
    const agreedWithAI = !isPositiveAIRecommendation(candidate.report.recommendation);
    updateDebriefCandidate(candidate.id, {
      debriefStatus: "not_moving_forward",
      override: { action: "not_moving_forward", reason, agreedWithAI, at: timestamp() },
    });
    notify(`${candidate.name} — marked not moving forward`);
    setPassOpen(false);
    router.push("/dashboard/debrief");
  }

  return (
    <>
      <PageHeader
        breadcrumb={
          <Breadcrumb
            items={[
              { label: "Debrief", href: "/dashboard/debrief" },
              { label: candidate.name },
            ]}
          />
        }
        eyebrow="AI interview debrief"
        title={`${candidate.name} — ${job?.title || candidate.role}`}
        subtitle={`Completed ${formatDate(candidate.completedAt)} · ${candidate.report.recommendation}`}
        actions={
          <Button href="/dashboard/debrief" variant="ghost" size="sm">
            Back to list
          </Button>
        }
      />

      {/* ------------------------------------------------------ status pipeline */}
      <Card className="mb-5 p-5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-3">
          {PIPELINE.map((stage, i) => {
            const reached = i <= currentIndex;
            const isLast = i === PIPELINE.length - 1;
            const label = isLast && decided ? (candidate.debriefStatus === "hired" ? "Hired" : "Not moving forward") : stage.label;
            return (
              <div key={stage.id} className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "flex size-5 items-center justify-center rounded-full text-[10px] font-semibold",
                      reached
                        ? isLast && candidate.debriefStatus === "not_moving_forward"
                          ? "bg-danger text-white"
                          : "bg-primary text-white"
                        : "bg-canvas-deep text-faint"
                    )}
                  >
                    {reached ? <Icon.Check size={11} /> : i + 1}
                  </span>
                  <span className={cn("text-[12px] font-medium", reached ? "text-ink" : "text-faint")}>{label}</span>
                </div>
                {!isLast && <Icon.ChevronRight size={13} className="text-faint" />}
              </div>
            );
          })}
        </div>
      </Card>

      {/* ------------------------------------------------------------- verdict */}
      <Card className="mb-5 overflow-hidden">
        <div className="grid gap-5 p-6 lg:grid-cols-[auto_1fr]">
          <div className="flex items-center gap-4">
            <Avatar name={candidate.name} initials={candidate.initials} size="lg" />
            <div>
              <div className="text-[15px] font-semibold text-ink">{candidate.name}</div>
              <div className="text-[12.5px] text-muted">{candidate.role}</div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <Badge tone={isPositiveAIRecommendation(candidate.report.recommendation) ? "success" : "warn"}>
                  {candidate.report.recommendation}
                </Badge>
                <Badge tone={meta.tone} dot>
                  {meta.label}
                </Badge>
                {candidate.aiRank === 1 && (
                  <Badge tone="accent">
                    <Icon.Sparkle size={11} />
                    AI Top Pick
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <p className="text-[14px] leading-relaxed text-ink-soft lg:border-l lg:border-line lg:pl-6">
            {candidate.report.summary}
          </p>
        </div>

        {candidate.override && (
          <div
            className={cn(
              "flex items-start gap-2.5 border-t border-line px-6 py-3.5 text-[12.5px] leading-relaxed",
              candidate.override.agreedWithAI ? "bg-success-soft/40 text-ink-soft" : "bg-warn-soft/40 text-ink-soft"
            )}
          >
            <Icon.Shield size={14} className="mt-0.5 shrink-0 text-primary/60" />
            <span>
              HR decision {candidate.override.agreedWithAI ? "agreed" : "disagreed"} with the AI's recommendation.
              {candidate.override.reason && <> Reason: “{candidate.override.reason}”</>}
            </span>
          </div>
        )}
      </Card>

      {/* --------------------------------------------------------------- body */}
      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-4">
          <DebriefReportSections report={candidate.report} />

          {/* transcript */}
          <Card className="overflow-hidden">
            <button
              type="button"
              onClick={() => setTranscriptOpen((v) => !v)}
              aria-expanded={transcriptOpen}
              className="flex w-full items-center gap-3 p-5 text-left"
            >
              <Icon.ChevronRight size={14} className={cn("shrink-0 text-faint transition-transform", transcriptOpen && "rotate-90")} />
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-semibold text-ink">Full interview transcript</div>
                <div className="text-[12px] text-muted">
                  {candidate.report.transcript.length} exchange{candidate.report.transcript.length === 1 ? "" : "s"} —
                  every finding above traces back to one of these.
                </div>
              </div>
            </button>
            <AnimatePresence initial={false}>
              {transcriptOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  className="overflow-hidden border-t border-line"
                >
                  <ul className="space-y-3 p-5">
                    {candidate.report.transcript.map((h, i) => (
                      <li key={i} className="overflow-hidden rounded-[10px] border border-line">
                        <div className="flex items-start gap-2.5 border-b border-line bg-canvas-deep/40 px-4 py-2.5">
                          <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-surface text-[10px] font-semibold text-muted ring-1 ring-line">
                            Q
                          </span>
                          <span className="flex-1 text-[13px] font-medium text-ink">{h.q}</span>
                        </div>
                        <div className="flex items-start gap-2.5 px-4 py-3.5">
                          <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[10px] font-semibold text-primary">
                            A
                          </span>
                          <p className="flex-1 text-[13px] leading-relaxed text-ink-soft">“{h.a}”</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </div>

        {/* ---------------------------------------------------------- rail */}
        <div className="space-y-5">
          <Card className="p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Decide</div>
            {decided ? (
              <p className="mt-3 text-[13px] leading-relaxed text-ink-soft">
                This candidate has been marked <span className="font-medium text-ink">{meta.label}</span>. No
                further action needed here.
              </p>
            ) : (
              <>
                <p className="mt-3 text-[13px] leading-relaxed text-ink-soft">
                  The AI recommends: <span className="font-medium text-ink">{candidate.report.recommendation}</span>.
                  The decision is yours.
                </p>
                <div className="mt-4 space-y-2">
                  <Button variant="secondary" size="sm" className="w-full" onClick={schedule}>
                    <Icon.Mic size={14} />
                    Schedule final interview
                  </Button>
                  <Button variant="primary" size="sm" className="w-full" onClick={markHired}>
                    <Icon.Check size={14} />
                    Mark as hired
                  </Button>
                  <Button variant="danger" size="sm" className="w-full" onClick={() => setPassOpen(true)}>
                    <Icon.X size={14} />
                    Not moving forward
                  </Button>
                </div>
              </>
            )}
          </Card>

          <MockNote>
            Structure only — the AI interview engine isn&apos;t built yet. This report is mock content
            written for layout review, not a real assessment.
          </MockNote>
        </div>
      </div>

      <NotMovingForwardModal
        open={passOpen}
        candidateName={candidate.name}
        onConfirm={confirmNotMoving}
        onCancel={() => setPassOpen(false)}
      />
    </>
  );
}
