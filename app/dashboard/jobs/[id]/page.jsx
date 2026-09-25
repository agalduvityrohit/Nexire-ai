"use client";

import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Breadcrumb, PageHeader } from "@/components/dashboard/Shell";
import { PipelineBoard } from "@/components/dashboard/PipelineBoard";
import { CandidateCards, CandidateTable } from "@/components/dashboard/CandidateTable";
import { ShortlistPanel } from "@/components/dashboard/ShortlistPanel";
import { InterviewSlotsEditor } from "@/components/dashboard/InterviewSlotsEditor";
import { Badge, Button, Card, Divider, KeyValue, Pill, SectionTitle } from "@/components/ui/Primitives";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Icon } from "@/components/ui/Icons";
import { PIPELINE_STAGES, hasReachedStage } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import { cn, formatDate } from "@/lib/utils";

const TABS = [
  { id: "pipeline", label: "Pipeline", icon: Icon.Board },
  { id: "candidates", label: "Candidates", icon: Icon.Users },
  { id: "details", label: "Job details", icon: Icon.Doc },
];

export default function JobDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { getJob, candidatesForJob, jobs, removeJob, updateJob, notify } = useStore();
  const [tab, setTab] = useState("pipeline");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const job = getJob(id);
  const pool = useMemo(() => (job ? candidatesForJob(job.id) : []), [job, candidatesForJob]);
  const jobsById = useMemo(() => Object.fromEntries(jobs.map((j) => [j.id, j])), [jobs]);

  async function confirmedDelete() {
    setDeleting(true);
    const result = await removeJob(job.id);
    setDeleting(false);
    setConfirmDelete(false);
    if (result.ok) {
      notify(`${job.title} deleted`);
      router.push("/dashboard/jobs");
    } else {
      notify(result.error || "Couldn't delete this job.", "warn");
    }
  }

  if (!job) {
    return (
      <Card className="flex flex-col items-center gap-3 py-20 text-center">
        <span className="flex size-10 items-center justify-center rounded-full bg-canvas-deep text-faint">
          <Icon.Briefcase size={18} />
        </span>
        <p className="text-[14px] font-medium text-ink">That job doesn&apos;t exist</p>
        <p className="max-w-sm text-[13px] text-muted">
          It may have been deleted, or the dashboard is still loading — give it a moment and try again.
        </p>
        <Button href="/dashboard/jobs" variant="secondary" size="sm">
          Back to jobs
        </Button>
      </Card>
    );
  }

  return (
    <>
      <PageHeader
        breadcrumb={<Breadcrumb items={[{ label: "Jobs", href: "/dashboard/jobs" }, { label: job.title }]} />}
        eyebrow={job.department}
        title={job.title}
        subtitle={job.summary}
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)}>
              <Icon.Trash size={14} />
              Delete
            </Button>
            <Button variant="secondary" size="sm">
              Edit role
            </Button>
            <Button href="/dashboard/jobs/new" variant="primary" size="sm">
              <Icon.Plus size={15} />
              New job
            </Button>
          </>
        }
      />

      <ConfirmDialog
        open={confirmDelete}
        title={`Delete ${job.title}?`}
        description={`This removes the job posting. ${pool.length ? `${pool.length} candidate${pool.length === 1 ? "" : "s"} tied to it will go back to the general pool, not be deleted.` : ""}`}
        busy={deleting}
        onConfirm={confirmedDelete}
        onCancel={() => setConfirmDelete(false)}
      />

      {/* meta strip */}
      <Card className="mb-5 p-4">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
          <div className="flex items-center gap-2">
            <Badge tone={job.status === "Open" ? "success" : "neutral"} dot>
              {job.status}
            </Badge>
            {job.isNew && <Badge tone="accent">Just posted</Badge>}
          </div>
          <span className="hidden h-8 w-px bg-line sm:block" />
          <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
            <KeyValue label="Location" value={job.location} />
            <KeyValue label="Level" value={job.level} />
            <KeyValue label="Compensation" value={job.salary} />
            <KeyValue label="Posted" value={formatDate(job.postedAt)} />
          </dl>
        </div>

        <Divider className="my-4" />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {PIPELINE_STAGES.map((stage) => {
            const n = pool.filter((c) => hasReachedStage(c.status, stage.id)).length;
            return (
              <div key={stage.id} className="rounded-[10px] border border-line bg-canvas px-3 py-2.5">
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      stage.id === "applied" && "bg-line-strong",
                      stage.id === "reviewed" && "bg-info",
                      stage.id === "shortlisted" && "bg-success",
                      stage.id === "interview" && "bg-violet"
                    )}
                  />
                  <span className="truncate text-[11.5px] text-muted">{stage.label}</span>
                </div>
                <div className="mt-1 text-[20px] font-semibold leading-none tabular-nums text-ink">{n}</div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* auto-shortlist — always visible, not tucked under a tab, so it's the
          first thing you see right after posting a role */}
      <div className="mb-5">
        <ShortlistPanel job={job} />
      </div>

      <div className="mb-5">
        <InterviewScheduling job={job} updateJob={updateJob} notify={notify} />
      </div>

      {/* tabs */}
      <div className="mb-4 flex items-center gap-1 border-b border-line">
        {TABS.map((t) => {
          const Glyph = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "relative flex items-center gap-1.5 px-3 py-2.5 text-[13px] font-medium transition-colors",
                active ? "text-ink" : "text-muted hover:text-ink-soft"
              )}
            >
              <Glyph size={15} className={active ? "text-primary" : "text-faint"} />
              {t.label}
              {active && (
                <motion.span
                  layoutId="job-tab-underline"
                  className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 480, damping: 38 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {tab === "pipeline" && <PipelineBoard jobId={job.id} />}

      {tab === "candidates" && (
        <Card className="overflow-hidden">
          <div className="hidden md:block">
            <CandidateTable
              candidates={pool}
              jobsById={jobsById}
              showRole={false}
              emptyLabel="No one has applied to this role yet."
            />
          </div>
          <div className="md:hidden">
            <CandidateCards candidates={pool} jobsById={jobsById} />
          </div>
        </Card>
      )}

      {tab === "details" && <JobDetails job={job} />}
    </>
  );
}

// Interview times offered to shortlisted candidates. Saved explicitly so a half-edited
// list never goes live by accident.
function InterviewScheduling({ job, updateJob, notify }) {
  const savedSlots = job.interviewSlots || [];
  const [slots, setSlots] = useState(savedSlots);
  const [managerEmail, setManagerEmail] = useState(job.hiringManagerEmail || "");
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  const dirty =
    JSON.stringify(slots.map((s) => s.id)) !== JSON.stringify(savedSlots.map((s) => s.id)) ||
    managerEmail.trim() !== (job.hiringManagerEmail || "");

  async function save() {
    setSaving(true);
    const result = await updateJob(job.id, { interviewSlots: slots, hiringManagerEmail: managerEmail.trim() });
    setSaving(false);
    notify(result.ok ? "Interview times saved" : result.error || "Couldn't save.", result.ok ? "success" : "warn");
  }

  const upcoming = savedSlots.filter((s) => new Date(s.start) > new Date()).length;

  return (
    <Card className="p-4">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-3 text-left">
        <span className="flex items-center gap-2">
          <Icon.Clock size={15} className="text-primary" />
          <span className="text-[14px] font-semibold text-ink">Interview scheduling</span>
          <Badge tone={upcoming ? "success" : "warn"}>{upcoming ? `${upcoming} time${upcoming === 1 ? "" : "s"} offered` : "No times set"}</Badge>
        </span>
        <Icon.ChevronRight size={15} className={cn("text-faint transition-transform", open && "rotate-90")} />
      </button>

      {open && (
        <div className="mt-4 border-t border-line pt-4">
          <InterviewSlotsEditor slots={slots} onChange={setSlots} managerEmail={managerEmail} onManagerEmailChange={setManagerEmail} />
          <div className="mt-4 flex justify-end">
            <Button variant="primary" size="sm" onClick={save} disabled={!dirty || saving}>
              {saving ? "Saving…" : "Save interview times"}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function JobDetails({ job }) {
  return (
    <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
      <Card className="p-6">
        <SectionTitle eyebrow="Description" title="What candidates read" />
        <p className="mt-4 whitespace-pre-line text-[14px] leading-relaxed text-ink-soft">{job.description}</p>

        {!!job.responsibilities?.length && (
          <>
            <h3 className="mt-7 text-[13.5px] font-semibold text-ink">What you&apos;ll own</h3>
            <ul className="mt-3 space-y-2">
              {job.responsibilities.map((r) => (
                <li key={r} className="flex items-start gap-2.5 text-[13.5px] leading-relaxed text-ink-soft">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/40" />
                  {r}
                </li>
              ))}
            </ul>
          </>
        )}

        {!!job.requirements?.length && (
          <>
            <h3 className="mt-7 text-[13.5px] font-semibold text-ink">What we&apos;re looking for</h3>
            <ul className="mt-3 space-y-2">
              {job.requirements.map((r) => (
                <li key={r} className="flex items-start gap-2.5 text-[13.5px] leading-relaxed text-ink-soft">
                  <Icon.Check size={15} className="mt-0.5 shrink-0 text-primary" />
                  {r}
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      <div className="space-y-5">
        <Card className="p-5">
          <SectionTitle eyebrow="Rubric" title="How applicants are scored" />
          <ul className="mt-4 space-y-2.5">
            {job.stack.map((s, i) => {
              const weight = Math.max(8, Math.round(100 / job.stack.length) + (i === 0 ? 6 : -2));
              return (
                <li key={s} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 truncate text-[12.5px] text-ink-soft">{s}</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-canvas-deep">
                    <span className="block h-full rounded-full bg-primary/70" style={{ width: `${weight * 2.2}%` }} />
                  </span>
                  <span className="w-9 text-right text-[11.5px] tabular-nums text-muted">{weight}%</span>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 text-[12px] leading-relaxed text-muted">
            Weightings were generated from the description and can be edited per role.
          </p>
        </Card>

        <Card className="p-5">
          <SectionTitle eyebrow="Interview plan" title="What the AI asks" />
          <ol className="mt-4 space-y-2.5">
            {[
              "Tell me about a system you owned end to end.",
              "How do you decide where a service boundary belongs?",
              "Walk me through a migration on a large table.",
              "Describe an incident you were on point for.",
              "+ 4 adaptive follow-ups generated in the moment",
            ].map((q, i) => (
              <li key={q} className="flex gap-2.5 text-[12.5px] leading-relaxed text-ink-soft">
                <span className="mt-px font-mono text-[11px] text-faint">{i < 4 ? `0${i + 1}` : "··"}</span>
                <span className={i === 4 ? "text-muted italic" : ""}>{q}</span>
              </li>
            ))}
          </ol>
        </Card>

        {!!job.benefits?.length && (
          <Card className="p-5">
            <SectionTitle eyebrow="Perks" title="What we offer" />
            <div className="mt-4 flex flex-wrap gap-1.5">
              {job.benefits.map((b) => (
                <Pill key={b}>{b}</Pill>
              ))}
            </div>
          </Card>
        )}

      </div>
    </div>
  );
}
