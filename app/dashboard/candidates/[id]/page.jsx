"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Breadcrumb, PageHeader } from "@/components/dashboard/Shell";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Divider,
  KeyValue,
  Meter,
  MockNote,
  Pill,
  ScoreRing,
  SectionTitle,
} from "@/components/ui/Primitives";
import { Icon } from "@/components/ui/Icons";
import { SOURCE_META } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import { cn, formatDate, relativeDays } from "@/lib/utils";

const LEVEL_VALUE = { Expert: 96, Advanced: 78, Working: 58, Beginner: 34 };

const ACTIONS = [
  { id: "reviewed", label: "Mark reviewed", icon: Icon.Check, tone: "info" },
  { id: "shortlisted", label: "Shortlist", icon: Icon.Star, tone: "success" },
  { id: "rejected", label: "Reject", icon: Icon.X, tone: "danger" },
];

export default function CandidateDetailPage() {
  const { id } = useParams();
  const { getCandidate, getJob, setCandidateStatus, notify } = useStore();

  const candidate = getCandidate(id);

  if (!candidate) {
    return (
      <Card className="flex flex-col items-center gap-3 py-20 text-center">
        <span className="flex size-10 items-center justify-center rounded-full bg-canvas-deep text-faint">
          <Icon.Users size={18} />
        </span>
        <p className="text-[14px] font-medium text-ink">Candidate not found</p>
        <Button href="/dashboard/candidates" variant="secondary" size="sm">
          Back to candidates
        </Button>
      </Card>
    );
  }

  const job = getJob(candidate.jobId);

  function apply(status, label) {
    setCandidateStatus(candidate.id, status);
    notify(`${candidate.name} — ${label}`);
  }

  return (
    <>
      <PageHeader
        breadcrumb={
          <Breadcrumb
            items={[
              { label: "Candidates", href: "/dashboard/candidates" },
              { label: job?.title || "Role", href: job ? `/dashboard/jobs/${job.id}` : undefined },
              { label: candidate.name },
            ]}
          />
        }
        title={candidate.name}
        subtitle={candidate.headline}
        actions={
          <>
            <Button variant="ghost" size="sm">
              <Icon.Mail size={14} />
              Email
            </Button>
            {candidate.report ? (
              <Button href={`/dashboard/candidates/${candidate.id}/report`} variant="secondary" size="sm">
                <Icon.Sparkle size={14} />
                AI report
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => notify(`Interview invite sent to ${candidate.name}`)}
              >
                <Icon.Mic size={14} />
                Invite to interview
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={() => apply("interview", "interview scheduled")}
            >
              Schedule interview
            </Button>
          </>
        }
      />

      {/* ------------------------------------------------------ summary card */}
      <Card className="mb-5 overflow-hidden">
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-start">
          <Avatar name={candidate.name} initials={candidate.initials} size="xl" className="mx-auto sm:mx-0" />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-ink">{candidate.name}</h2>
              <StatusBadge status={candidate.status} />
              <Badge tone="neutral">{SOURCE_META[candidate.source] || candidate.source}</Badge>
            </div>
            <p className="mt-1 text-[13.5px] text-muted">{candidate.headline}</p>

            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[12.5px] text-ink-soft">
              <span className="flex items-center gap-1.5">
                <Icon.Mail size={14} className="text-faint" />
                {candidate.email}
              </span>
              <span className="flex items-center gap-1.5">
                <Icon.Phone size={14} className="text-faint" />
                {candidate.phone}
              </span>
              <span className="flex items-center gap-1.5">
                <Icon.Pin size={14} className="text-faint" />
                {candidate.location}
              </span>
              {candidate.links?.portfolio && (
                <span className="flex items-center gap-1.5">
                  <Icon.Link size={14} className="text-faint" />
                  {candidate.links.portfolio}
                </span>
              )}
            </div>

            <p className="mt-4 max-w-2xl text-[13.5px] leading-relaxed text-ink-soft">{candidate.summary}</p>
          </div>

          <div className="flex shrink-0 flex-row items-center gap-5 sm:flex-col sm:items-end">
            <div className="flex flex-col items-center gap-1">
              <ScoreRing value={candidate.matchScore} size={64} stroke={6} />
              <span className="text-[11px] uppercase tracking-wide text-muted">Résumé match</span>
            </div>
          </div>
        </div>

        {/* status actions */}
        <div className="flex flex-wrap items-center gap-2 border-t border-line bg-canvas-deep/40 px-5 py-3">
          <span className="mr-1 text-[12px] font-medium text-muted">Set status</span>
          {ACTIONS.map((a) => {
            const Glyph = a.icon;
            const active = candidate.status === a.id;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => apply(a.id, `marked ${a.id}`)}
                aria-pressed={active}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-all",
                  active
                    ? a.tone === "success"
                      ? "border-success/30 bg-success text-white shadow-xs"
                      : a.tone === "danger"
                        ? "border-danger/30 bg-danger text-white shadow-xs"
                        : "border-info/30 bg-info text-white shadow-xs"
                    : "border-line bg-surface text-ink-soft hover:border-line-strong hover:bg-canvas"
                )}
              >
                <Glyph size={13} />
                {active ? `${a.label.replace("Mark ", "").replace("Shortlist", "Shortlisted")}` : a.label}
              </button>
            );
          })}
          <span className="ml-auto text-[11.5px] text-faint">
            Applied {relativeDays(candidate.appliedAt)} · {formatDate(candidate.appliedAt)}
          </span>
        </div>
      </Card>

      {/* --------------------------------------------------------------- body */}
      <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
        <div className="space-y-5">
          <ParsedBanner candidate={candidate} />
          <Skills candidate={candidate} />
          <Experience candidate={candidate} />
          <Education candidate={candidate} />
          {!!candidate.projects?.length && <Projects candidate={candidate} />}
        </div>

        <div className="space-y-5">
          <ReportTeaser candidate={candidate} />
          <Details candidate={candidate} job={job} />
          <Flags candidate={candidate} />
          <Timeline candidate={candidate} />
        </div>
      </div>
    </>
  );
}

/* ---------------------------------------------------------------- sections */

function ParsedBanner({ candidate }) {
  return (
    <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-primary-soft text-primary">
        <Icon.Doc size={17} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium text-ink">{candidate.resumeFile}</div>
        <div className="text-[12px] text-muted">
          Parsed automatically · {candidate.skills.length} skills, {candidate.experience.length} roles,{" "}
          {candidate.education.length} qualification{candidate.education.length === 1 ? "" : "s"} extracted
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button variant="secondary" size="xs">
          View original
        </Button>
        <Button variant="ghost" size="xs">
          Download
        </Button>
      </div>
    </Card>
  );
}

function Skills({ candidate }) {
  return (
    <Card className="p-5">
      <SectionTitle
        eyebrow="Parsed résumé"
        title="Skills"
        action={<Badge tone="primary">{candidate.experienceYears} yrs experience</Badge>}
      />
      <div className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {candidate.skills.map((s, i) => (
          <motion.div
            key={s.name}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04, duration: 0.35 }}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-[13px] font-medium text-ink">{s.name}</span>
              <span className="shrink-0 text-[11.5px] text-muted">
                {s.level} · {s.years}y
              </span>
            </div>
            <div className="mt-1.5">
              <Meter value={LEVEL_VALUE[s.level] ?? 50} />
            </div>
          </motion.div>
        ))}
      </div>
      {!!candidate.certifications?.length && (
        <>
          <Divider className="my-5" />
          <div className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">Certifications</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {candidate.certifications.map((c) => (
              <Pill key={c}>{c}</Pill>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}

function Experience({ candidate }) {
  return (
    <Card className="p-5">
      <SectionTitle eyebrow="Parsed résumé" title="Experience" />
      <ol className="mt-5 space-y-6">
        {candidate.experience.map((e, i) => (
          <li key={`${e.company}-${i}`} className="relative pl-6">
            <span className="absolute left-0 top-1.5 size-2.5 rounded-full border-2 border-primary bg-surface" />
            {i < candidate.experience.length - 1 && (
              <span className="absolute left-[4.5px] top-5 h-[calc(100%+0.75rem)] w-px bg-line" />
            )}
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <h4 className="text-[14px] font-semibold tracking-[-0.01em] text-ink">{e.role}</h4>
              <span className="text-[12px] tabular-nums text-muted">{e.period}</span>
            </div>
            <div className="mt-0.5 text-[12.5px] text-ink-soft">
              {e.company}
              {e.location && <span className="text-muted"> · {e.location}</span>}
            </div>
            {!!e.bullets?.length && (
              <ul className="mt-2.5 space-y-1.5">
                {e.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-[13px] leading-relaxed text-ink-soft">
                    <span className="mt-2 size-1 shrink-0 rounded-full bg-faint" />
                    {b}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>
    </Card>
  );
}

function Education({ candidate }) {
  return (
    <Card className="p-5">
      <SectionTitle eyebrow="Parsed résumé" title="Education" />
      <ul className="mt-4 space-y-3">
        {candidate.education.map((e) => (
          <li key={e.degree} className="flex items-start gap-3 rounded-[10px] border border-line bg-canvas px-3.5 py-3">
            <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-surface text-faint ring-1 ring-line">
              <Icon.Doc size={14} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-medium text-ink">{e.degree}</div>
              <div className="text-[12.5px] text-ink-soft">{e.school}</div>
              {e.detail && <div className="mt-0.5 text-[12px] text-muted">{e.detail}</div>}
            </div>
            <span className="shrink-0 text-[12px] tabular-nums text-muted">{e.year}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Projects({ candidate }) {
  return (
    <Card className="p-5">
      <SectionTitle eyebrow="Parsed résumé" title="Projects" />
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {candidate.projects.map((p) => (
          <div key={p.name} className="rounded-[10px] border border-line bg-canvas p-3.5">
            <div className="flex items-center gap-1.5">
              <Icon.Link size={13} className="text-faint" />
              <span className="text-[13px] font-medium text-ink">{p.name}</span>
            </div>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">{p.desc}</p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {p.tech.map((t) => (
                <Pill key={t} className="text-[11px]">
                  {t}
                </Pill>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ReportTeaser({ candidate }) {
  const { notify } = useStore();

  if (!candidate.report) {
    return (
      <Card className="p-5">
        <SectionTitle eyebrow="AI interview" title="Not run yet" />
        <p className="mt-3 text-[13px] leading-relaxed text-muted">
          This candidate hasn&apos;t sat down with Arjun yet. Send an invite and the report lands here
          within minutes of them finishing.
        </p>
        <Button
          variant="primary"
          size="sm"
          className="mt-4 w-full"
          onClick={() => notify(`Interview invite sent to ${candidate.name}`)}
        >
          <Icon.Mic size={14} />
          Send invite
        </Button>
      </Card>
    );
  }

  const r = candidate.report;
  return (
    <Card className="overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-line bg-canvas-deep/40 px-5 py-3.5">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.09em] text-muted">AI interview</div>
          <div className="mt-0.5 text-[14px] font-semibold text-ink">Report ready</div>
        </div>
        <ScoreRing value={r.overall} size={48} stroke={5} />
      </div>

      <div className="p-5">
        <Badge tone={r.overall >= 80 ? "success" : r.overall >= 65 ? "warn" : "danger"}>{r.recommendation}</Badge>
        <p className="mt-3 line-clamp-4 text-[13px] leading-relaxed text-ink-soft">{r.summary}</p>

        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2">
          {r.dimensions.slice(0, 4).map((d) => (
            <div key={d.label}>
              <div className="flex items-baseline justify-between">
                <span className="truncate text-[11.5px] text-muted">{d.label}</span>
                <span className="text-[11.5px] font-semibold tabular-nums text-ink-soft">{d.score}</span>
              </div>
              <div className="mt-1">
                <Meter value={d.score} />
              </div>
            </div>
          ))}
        </div>

        <Button
          href={`/dashboard/candidates/${candidate.id}/report`}
          variant="primary"
          size="sm"
          className="mt-5 w-full"
        >
          Read the full report
          <Icon.ArrowRight size={14} />
        </Button>
        <div className="mt-2 text-center text-[11.5px] text-faint">
          {r.meta.duration} · {r.meta.questions} questions · {r.meta.completed}
        </div>
      </div>
    </Card>
  );
}

function Details({ candidate, job }) {
  return (
    <Card className="p-5">
      <SectionTitle eyebrow="Application" title="Details" />
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4">
        <KeyValue label="Applied for" value={job?.title || "—"} />
        <KeyValue label="Source" value={SOURCE_META[candidate.source] || candidate.source} />
        <KeyValue label="Notice period" value={candidate.noticePeriod} />
        <KeyValue label="Expected" value={candidate.expected} />
        <KeyValue label="Experience" value={`${candidate.experienceYears} years`} />
        <KeyValue label="Location" value={candidate.location} />
      </dl>

      {candidate.links && (
        <>
          <Divider className="my-4" />
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(candidate.links).map(([k, v]) => (
              <span
                key={k}
                className="inline-flex items-center gap-1.5 rounded-md border border-line bg-canvas px-2 py-1 text-[11.5px] text-ink-soft"
              >
                <Icon.Link size={12} className="text-faint" />
                {v}
              </span>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}

function Flags({ candidate }) {
  if (!candidate.aiFlags?.length) return null;
  return (
    <Card className="p-5">
      <SectionTitle eyebrow="Screening" title="What the parser noticed" />
      <ul className="mt-4 space-y-2">
        {candidate.aiFlags.map((f) => (
          <li
            key={f.text}
            className={cn(
              "flex items-start gap-2.5 rounded-[10px] border px-3 py-2.5 text-[12.5px] leading-relaxed",
              f.tone === "success" && "border-success/20 bg-success-soft text-success",
              f.tone === "warn" && "border-warn/20 bg-warn-soft text-warn",
              f.tone === "danger" && "border-danger/20 bg-danger-soft text-danger",
              f.tone === "info" && "border-info/20 bg-info-soft text-info"
            )}
          >
            {f.tone === "success" ? (
              <Icon.Check size={14} className="mt-0.5 shrink-0" />
            ) : (
              <Icon.Warning size={14} className="mt-0.5 shrink-0" />
            )}
            {f.text}
          </li>
        ))}
      </ul>
      <MockNote className="mt-4">
        Signals are heuristics, not decisions. Nothing here changes a candidate&apos;s status on its own.
      </MockNote>
    </Card>
  );
}

function Timeline({ candidate }) {
  const KIND_TONE = {
    applied: "bg-line-strong",
    system: "bg-faint",
    reviewed: "bg-info",
    shortlisted: "bg-success",
    interview: "bg-violet",
    rejected: "bg-danger",
  };
  return (
    <Card className="p-5">
      <SectionTitle eyebrow="History" title="Activity" />
      <ol className="mt-4 space-y-4">
        {candidate.timeline.map((t, i) => (
          <li key={`${t.at}-${i}`} className="relative pl-5">
            <span className={cn("absolute left-0 top-1.5 size-2 rounded-full", KIND_TONE[t.kind] || "bg-faint")} />
            {i < candidate.timeline.length - 1 && (
              <span className="absolute left-[3.5px] top-4 h-[calc(100%+0.5rem)] w-px bg-line" />
            )}
            <div className="text-[12.5px] leading-snug text-ink">{t.event}</div>
            <div className="mt-0.5 text-[11.5px] text-faint">{t.at}</div>
          </li>
        ))}
      </ol>
      <Link
        href="/dashboard/candidates"
        className="mt-5 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-primary hover:underline"
      >
        <Icon.ArrowLeft size={13} />
        Back to all candidates
      </Link>
    </Card>
  );
}
