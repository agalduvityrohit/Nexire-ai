"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Breadcrumb, PageHeader } from "@/components/dashboard/Shell";
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Divider,
  Field,
  Input,
  MockNote,
  Pill,
  Select,
  SectionTitle,
  Textarea,
} from "@/components/ui/Primitives";
import { Icon } from "@/components/ui/Icons";
import { providerLabel } from "@/lib/providers";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const LEVELS = ["Intern", "Junior (0–2 yrs)", "Mid (3–5 yrs)", "Senior (5–8 yrs)", "Staff / Principal (8+ yrs)"];
const TYPES = ["Full-time", "Contract", "Part-time", "Internship"];
const DEPARTMENTS = ["Engineering", "Design", "Product", "Go-to-market", "Operations", "Data"];
const SUGGESTED = ["TypeScript", "React", "Go", "Python", "PostgreSQL", "Kubernetes", "AWS", "Figma", "Rust", "Kafka"];
const ACCEPT = ".pdf,.docx,.txt,.md";

// Loose match so re-pasting the same JD (or one for a role that's already
// live) gets caught even with different casing/spacing — not a full fuzzy
// match, just enough to catch the common "I already posted this" case.
function normalizeTitle(title) {
  return String(title || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const MODES = [
  { id: "manual", label: "Write it manually" },
  { id: "import", label: "Import from file or text" },
];

export default function NewJobPage() {
  const [mode, setMode] = useState("manual");
  const [posted, setPosted] = useState(null);

  if (posted) return <PostedConfirmation job={posted} />;

  return (
    <>
      <PageHeader
        breadcrumb={<Breadcrumb items={[{ label: "Jobs", href: "/dashboard/jobs" }, { label: "New job post" }]} />}
        eyebrow="Create"
        title="Post a new role"
        subtitle="Write the role yourself, or hand over a job description and let the connected LLM read and structure it."
        actions={
          <Button href="/dashboard/jobs" variant="ghost" size="sm">
            Cancel
          </Button>
        }
      />

      <div className="mb-5 inline-flex rounded-[10px] border border-line bg-canvas-deep/60 p-1">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMode(m.id)}
            className={cn(
              "relative rounded-[7px] px-3.5 py-1.5 text-[13px] font-medium transition-colors",
              mode === m.id ? "text-ink" : "text-muted hover:text-ink-soft"
            )}
          >
            {mode === m.id && (
              <motion.span
                layoutId="new-job-mode"
                className="absolute inset-0 rounded-[7px] bg-surface shadow-xs ring-1 ring-line"
                transition={{ type: "spring", stiffness: 480, damping: 38 }}
              />
            )}
            <span className="relative">{m.label}</span>
          </button>
        ))}
      </div>

      {mode === "manual" ? <ManualForm onPosted={setPosted} /> : <ImportFlow onPosted={setPosted} />}
    </>
  );
}

/* ------------------------------------------------------------- manual form */

function ManualForm({ onPosted }) {
  const { addJob, notify } = useStore();

  const [form, setForm] = useState({
    title: "",
    department: "Engineering",
    location: "",
    type: "Full-time",
    level: "Mid (3–5 yrs)",
    salary: "",
    summary: "",
    description: "",
  });
  const [stack, setStack] = useState([]);
  const [stackInput, setStackInput] = useState("");
  const [errors, setErrors] = useState({});
  const [screening, setScreening] = useState({ ai: true, consent: true, publish: true });

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  function addTag(raw) {
    const tag = raw.trim().replace(/,$/, "");
    if (!tag || stack.includes(tag)) return;
    setStack((s) => [...s, tag]);
  }

  function onStackKeyDown(e) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(stackInput);
      setStackInput("");
    } else if (e.key === "Backspace" && !stackInput && stack.length) {
      setStack((s) => s.slice(0, -1));
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    const next = {};
    if (!form.title.trim()) next.title = "Give the role a title.";
    if (!form.description.trim()) next.description = "Candidates need a description to respond to.";
    if (!stack.length) next.stack = "Add at least one skill so the rubric has something to score against.";
    setErrors(next);
    if (Object.keys(next).length) return;

    const job = addJob({
      ...form,
      stack,
      summary: form.summary || form.description.slice(0, 120),
      status: screening.publish ? "Open" : "Draft",
    });
    notify("Job posted — pipeline is live");
    onPosted(job);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
      <div className="space-y-4">
        {/* --------------------------------------------------- the basics */}
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-md bg-primary-soft font-mono text-[11px] font-semibold text-primary">
              1
            </span>
            <h2 className="text-[14.5px] font-semibold text-ink">Role basics</h2>
          </div>
          <Divider className="my-4" />

          <div className="space-y-4">
            <Field label="Job title" htmlFor="title" required error={errors.title}>
              <Input
                id="title"
                value={form.title}
                onChange={set("title")}
                placeholder="e.g. Senior Backend Engineer"
                autoComplete="off"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Department" htmlFor="department">
                <Select id="department" value={form.department} onChange={set("department")}>
                  {DEPARTMENTS.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Location" htmlFor="location">
                <Input
                  id="location"
                  value={form.location}
                  onChange={set("location")}
                  placeholder="e.g. Bengaluru · Hybrid"
                  autoComplete="off"
                />
              </Field>
              <Field label="Employment type" htmlFor="type">
                <Select id="type" value={form.type} onChange={set("type")}>
                  {TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Experience level" htmlFor="level" required>
                <Select id="level" value={form.level} onChange={set("level")}>
                  {LEVELS.map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </Select>
              </Field>
            </div>

            <Field label="Compensation range" htmlFor="salary" hint="· shown on the public page">
              <Input
                id="salary"
                value={form.salary}
                onChange={set("salary")}
                placeholder="e.g. ₹48–65 LPA"
                autoComplete="off"
              />
            </Field>
          </div>
        </Card>

        {/* ----------------------------------------------------- the role */}
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-md bg-primary-soft font-mono text-[11px] font-semibold text-primary">
              2
            </span>
            <h2 className="text-[14.5px] font-semibold text-ink">What the job is</h2>
          </div>
          <Divider className="my-4" />

          <div className="space-y-4">
            <Field label="One-line summary" htmlFor="summary" hint="· appears in search and listings">
              <Input
                id="summary"
                value={form.summary}
                onChange={set("summary")}
                placeholder="Own the ledger that moves ₹400 Cr a month."
                autoComplete="off"
              />
            </Field>

            <Field
              label="Job description"
              htmlFor="description"
              required
              error={errors.description}
              hint="· plain language is fine, the rubric is generated from this"
            >
              <Textarea
                id="description"
                value={form.description}
                onChange={set("description")}
                rows={8}
                placeholder="What the person will own, who they'll work with, and what a strong first six months looks like…"
              />
            </Field>

            <Field
              label="Tech stack & skills"
              required
              error={errors.stack}
              hint="· press Enter after each"
            >
              <div
                className={cn(
                  "flex min-h-10 flex-wrap items-center gap-1.5 rounded-[10px] border bg-surface px-2 py-1.5 shadow-xs transition-colors",
                  errors.stack ? "border-danger/50" : "border-line focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10"
                )}
              >
                <AnimatePresence initial={false}>
                  {stack.map((tag) => (
                    <motion.span
                      key={tag}
                      layout
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.85 }}
                      transition={{ duration: 0.16 }}
                      className="inline-flex items-center gap-1 rounded-md border border-primary/20 bg-primary-soft px-2 py-0.5 text-[12px] font-medium text-primary"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => setStack((s) => s.filter((t) => t !== tag))}
                        aria-label={`Remove ${tag}`}
                        className="opacity-60 transition-opacity hover:opacity-100"
                      >
                        <Icon.X size={12} />
                      </button>
                    </motion.span>
                  ))}
                </AnimatePresence>
                <input
                  value={stackInput}
                  onChange={(e) => setStackInput(e.target.value)}
                  onKeyDown={onStackKeyDown}
                  onBlur={() => {
                    addTag(stackInput);
                    setStackInput("");
                  }}
                  placeholder={stack.length ? "" : "Go, PostgreSQL, Kubernetes…"}
                  className="h-7 min-w-[140px] flex-1 bg-transparent px-1 text-sm text-ink placeholder:text-faint outline-none"
                />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-[11.5px] text-faint">Common:</span>
                {SUGGESTED.filter((s) => !stack.includes(s))
                  .slice(0, 7)
                  .map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => addTag(s)}
                      className="rounded-md border border-dashed border-line-strong px-2 py-0.5 text-[11.5px] text-muted transition-colors hover:border-primary/40 hover:bg-primary-soft hover:text-primary"
                    >
                      + {s}
                    </button>
                  ))}
              </div>
            </Field>
          </div>
        </Card>

        {/* ------------------------------------------------- how it screens */}
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-md bg-primary-soft font-mono text-[11px] font-semibold text-primary">
              3
            </span>
            <h2 className="text-[14.5px] font-semibold text-ink">Screening</h2>
          </div>
          <Divider className="my-4" />

          <div className="space-y-2.5">
            <Checkbox
              checked={screening.ai}
              onChange={(e) => setScreening((s) => ({ ...s, ai: e.target.checked }))}
              label="Run the AI avatar interview automatically"
              description="Every applicant above a 60% résumé match gets invited within an hour of applying."
            />
            <Checkbox
              checked={screening.consent}
              onChange={(e) => setScreening((s) => ({ ...s, consent: e.target.checked }))}
              label="Require explicit consent before recording"
              description="Recommended. Candidates see what's captured and can request a human screen instead."
            />
            <Checkbox
              checked={screening.publish}
              onChange={(e) => setScreening((s) => ({ ...s, publish: e.target.checked }))}
              label="Publish to the careers page immediately"
              description="Uncheck to save the role as a draft you can publish later."
            />
          </div>

          <MockNote className="mt-4">
            The screening rubric and interview plan below are illustrative — nothing runs them yet. The
            job itself is real and saved to your dashboard.
          </MockNote>
        </Card>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button href="/dashboard/jobs" variant="ghost" size="md">
            <Icon.ArrowLeft size={15} />
            Back to jobs
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" size="md" onClick={() => setScreening((s) => ({ ...s, publish: false }))}>
              Save as draft
            </Button>
            <Button type="submit" variant="accent" size="md">
              Publish role
              <Icon.ArrowRight size={15} />
            </Button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------ live preview */}
      <div className="xl:sticky xl:top-20 xl:self-start">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-line bg-canvas-deep/40 px-4 py-2.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
              Public page preview
            </span>
            <Badge tone={screening.publish ? "success" : "neutral"} dot>
              {screening.publish ? "Will publish" : "Draft"}
            </Badge>
          </div>

          <div className="p-5">
            <h3 className="text-[19px] font-semibold tracking-[-0.025em] text-ink">
              {form.title || <span className="text-faint">Your job title</span>}
            </h3>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-muted">
              <span className="flex items-center gap-1">
                <Icon.Pin size={13} />
                {form.location || "Location"}
              </span>
              <span className="flex items-center gap-1">
                <Icon.Briefcase size={13} />
                {form.type}
              </span>
              <span className="flex items-center gap-1">
                <Icon.Trend size={13} />
                {form.level}
              </span>
            </div>

            {form.salary && (
              <div className="mt-3">
                <Badge tone="primary">{form.salary}</Badge>
              </div>
            )}

            <p className="mt-4 whitespace-pre-line text-[13.5px] leading-relaxed text-ink-soft">
              {form.description || (
                <span className="text-faint">
                  Your description shows up here as candidates will read it. Write it the way you'd explain
                  the role to a friend.
                </span>
              )}
            </p>

            {!!stack.length && (
              <>
                <div className="mt-5 text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">
                  Skills we screen for
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {stack.map((s) => (
                    <Pill key={s}>{s}</Pill>
                  ))}
                </div>
              </>
            )}

            <Divider className="my-5" />

            <div className="rounded-[10px] border border-line bg-canvas p-3">
              <div className="flex items-center gap-2 text-[12.5px] font-medium text-ink">
                <Icon.Sparkle size={14} className="text-primary" />
                Generated screening rubric
              </div>
              <ul className="mt-2.5 space-y-1.5">
                {(stack.length ? stack : ["Add skills to preview"]).slice(0, 4).map((s) => (
                  <li key={s} className="flex items-center justify-between text-[12px]">
                    <span className="text-ink-soft">{s}</span>
                    <span className="tabular-nums text-faint">
                      weight {stack.length ? Math.max(10, Math.round(100 / Math.min(stack.length, 5))) : 0}%
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[11.5px] leading-relaxed text-muted">
                Weightings are editable after posting. Knockout criteria can be added per role.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </form>
  );
}

/* --------------------------------------------------------------- import */

function ImportFlow() {
  const { session, jobs: existingJobs, addJob, notify } = useStore();
  const companyId = session?.company?.id || "demo-company";

  const existingTitles = useMemo(
    () => new Set(existingJobs.map((j) => normalizeTitle(j.title))),
    [existingJobs]
  );
  const isDuplicateTitle = useCallback(
    (title) => existingTitles.has(normalizeTitle(title)),
    [existingTitles]
  );

  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [queue, setQueue] = useState([]);
  const [pastedText, setPastedText] = useState("");
  const [phase, setPhase] = useState("idle"); // idle | working | done
  const [error, setError] = useState("");
  const [jobs, setJobs] = useState([]);
  const [failed, setFailed] = useState([]);
  const [provider, setProvider] = useState(null);
  const [model, setModel] = useState(null);
  const [publishedIndexes, setPublishedIndexes] = useState(new Set());
  const [openIndex, setOpenIndex] = useState(null);

  const addFiles = useCallback((fileList) => {
    const incoming = Array.from(fileList || []);
    if (!incoming.length) return;
    setQueue((prev) => {
      const seen = new Set(prev.map((f) => `${f.name}:${f.size}`));
      return [...prev, ...incoming.filter((f) => !seen.has(`${f.name}:${f.size}`))];
    });
  }, []);

  async function run() {
    if (!queue.length && !pastedText.trim()) return;
    setPhase("working");
    setError("");
    setJobs([]);
    setFailed([]);
    setPublishedIndexes(new Set());
    setOpenIndex(null);

    const form = new FormData();
    form.append("companyId", companyId);
    if (pastedText.trim()) form.append("text", pastedText.trim());
    queue.forEach((file) => form.append("files", file));

    try {
      const res = await fetch("/api/jobs/parse", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || `Parsing failed (HTTP ${res.status}).`);
        setPhase("idle");
        return;
      }
      setJobs(json.jobs || []);
      setFailed(json.failed || []);
      setProvider(json.provider);
      setModel(json.model);
      setPhase("done");
    } catch (e) {
      setError(e.message || "Network error while parsing.");
      setPhase("idle");
    }
  }

  function publish(index) {
    const job = jobs[index];
    if (isDuplicateTitle(job.title)) return;
    addJob(job);
    setPublishedIndexes((prev) => new Set(prev).add(index));
    notify(`${job.title} posted`);
  }

  function publishAll() {
    const newlyPublished = [];
    jobs.forEach((job, i) => {
      if (publishedIndexes.has(i) || isDuplicateTitle(job.title)) return;
      addJob(job);
      newlyPublished.push(i);
    });
    if (newlyPublished.length) {
      setPublishedIndexes((prev) => new Set([...prev, ...newlyPublished]));
      notify(`${newlyPublished.length} job${newlyPublished.length === 1 ? "" : "s"} posted`);
    } else {
      notify("Nothing new to publish — the rest are already posted.", "warn");
    }
  }

  function reset() {
    setQueue([]);
    setPastedText("");
    setPhase("idle");
    setError("");
    setJobs([]);
    setFailed([]);
    setPublishedIndexes(new Set());
    setOpenIndex(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const duplicateCount = jobs.filter((j) => isDuplicateTitle(j.title)).length;
  const publishableCount = jobs.filter((j, i) => !publishedIndexes.has(i) && !isDuplicateTitle(j.title)).length;

  return (
    <div className="grid gap-5 xl:grid-cols-[1.1fr_1fr]">
      {/* --------------------------------------------------------- intake */}
      <div className="space-y-4">
        <Card className="p-5">
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              addFiles(e.dataTransfer.files);
            }}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-card border border-dashed px-6 py-10 text-center transition-colors",
              dragOver
                ? "border-primary bg-primary-soft/60"
                : "border-line-strong bg-canvas hover:border-primary/40 hover:bg-primary-soft/25"
            )}
          >
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={ACCEPT}
              className="sr-only"
              onChange={(e) => addFiles(e.target.files)}
            />
            <span className="flex size-12 items-center justify-center rounded-full bg-surface text-primary ring-1 ring-line">
              <Icon.Upload size={22} />
            </span>
            <span className="text-[15px] font-semibold text-ink">Drop job description files here</span>
            <span className="text-[12.5px] text-muted">PDF, DOCX, TXT · one file can hold several postings</span>
          </label>

          {queue.length > 0 && (
            <ul className="mt-4 max-h-40 divide-y divide-line-soft overflow-y-auto rounded-[10px] border border-line-soft thin-scrollbar">
              {queue.map((f) => (
                <li key={`${f.name}-${f.size}`} className="flex items-center gap-3 px-3 py-2">
                  <Icon.Doc size={14} className="shrink-0 text-faint" />
                  <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink-soft">{f.name}</span>
                  <span className="shrink-0 text-[11.5px] tabular-nums text-faint">{(f.size / 1024).toFixed(0)} KB</span>
                </li>
              ))}
            </ul>
          )}

          <div className="my-4 flex items-center gap-3">
            <span className="h-px flex-1 bg-line-soft" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-faint">or paste text</span>
            <span className="h-px flex-1 bg-line-soft" />
          </div>

          <Textarea
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            rows={6}
            placeholder="Paste one or more job descriptions here…"
          />

          <Button
            variant="accent"
            size="md"
            className="mt-4 w-full"
            onClick={run}
            disabled={phase === "working" || (!queue.length && !pastedText.trim())}
          >
            {phase === "working" ? "Reading & segmenting…" : "Parse job descriptions"}
            {phase !== "working" && <Icon.Sparkle size={15} />}
          </Button>

          {error && (
            <div className="mt-4 flex items-start gap-2.5 rounded-[10px] border border-danger/25 bg-danger-soft px-3 py-2.5">
              <Icon.Warning size={14} className="mt-0.5 shrink-0 text-danger" />
              <p className="text-[12.5px] leading-relaxed text-danger">{error}</p>
            </div>
          )}
        </Card>

        <MockNote>
          Uses whichever model you connected in Settings to read and segment the text. Nothing is
          published until you confirm each one — parsing doesn&apos;t post anything by itself.
        </MockNote>

        {(queue.length > 0 || pastedText) && (
          <Button variant="ghost" size="sm" onClick={reset}>
            Clear
          </Button>
        )}
      </div>

      {/* ---------------------------------------------------------- review */}
      <div className="space-y-4">
        {phase !== "done" && (
          <Card className="flex flex-col items-center gap-2 py-16 text-center">
            <span className="flex size-10 items-center justify-center rounded-full bg-canvas-deep text-faint">
              <Icon.Briefcase size={18} />
            </span>
            <p className="text-[13.5px] font-medium text-ink">Nothing parsed yet</p>
            <p className="max-w-xs text-[12.5px] text-muted">
              Add a file or paste text, then parse — every posting found shows up here for review.
            </p>
          </Card>
        )}

        {phase === "done" && (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[13px] text-muted">
                <span className="font-semibold text-ink">{jobs.length}</span> posting{jobs.length === 1 ? "" : "s"}{" "}
                found
                {duplicateCount > 0 && (
                  <span className="text-warn"> · {duplicateCount} already posted</span>
                )}
              </span>
              {provider && (
                <span className="flex items-center gap-1.5 text-[12px] text-muted">
                  <Icon.Sparkle size={12} className="text-primary" />
                  Read by <span className="font-medium text-ink-soft">{providerLabel(provider)}</span>
                  <span className="font-mono text-ink-soft">{model}</span>
                </span>
              )}
              {publishableCount > 0 && (
                <Button variant="primary" size="sm" className="ml-auto" onClick={publishAll}>
                  <Icon.Check size={14} />
                  Publish all {publishableCount}
                </Button>
              )}
            </div>

            <AnimatePresence initial={false}>
              {jobs.map((job, i) => {
                const published = publishedIndexes.has(i);
                const isDuplicate = !published && isDuplicateTitle(job.title);
                const isOpen = openIndex === i;
                return (
                  <motion.div
                    key={`${job.title}-${i}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i, 8) * 0.05, duration: 0.3 }}
                  >
                    <Card className={cn("overflow-hidden", (published || isDuplicate) && "opacity-60")}>
                      <button
                        type="button"
                        onClick={() => setOpenIndex(isOpen ? null : i)}
                        className="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-raised"
                      >
                        <Icon.ChevronRight
                          size={14}
                          className={cn("mt-1 shrink-0 text-faint transition-transform", isOpen && "rotate-90")}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[14px] font-semibold text-ink">{job.title}</span>
                            {published && <Badge tone="success">Published</Badge>}
                            {isDuplicate && <Badge tone="warn">Already posted</Badge>}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-muted">
                            <span>{job.department}</span>
                            <span>{job.location}</span>
                            <span>{job.type}</span>
                            <span>{job.level}</span>
                          </div>
                          {job.summary && (
                            <p className="mt-1.5 line-clamp-2 text-[12.5px] text-ink-soft">{job.summary}</p>
                          )}
                          <p className="mt-1 text-[11px] text-faint">from {job.sourceFile}</p>
                        </div>
                      </button>

                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.22 }}
                            className="overflow-hidden border-t border-line-soft"
                          >
                            <div className="space-y-3 p-4">
                              {job.description && (
                                <p className="whitespace-pre-line text-[12.5px] leading-relaxed text-ink-soft">
                                  {job.description}
                                </p>
                              )}
                              {job.stack?.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                  {job.stack.map((s) => (
                                    <Pill key={s}>{s}</Pill>
                                  ))}
                                </div>
                              )}
                              {job.requirements?.length > 0 && (
                                <div>
                                  <div className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">
                                    Requirements
                                  </div>
                                  <ul className="mt-1.5 space-y-1">
                                    {job.requirements.map((r) => (
                                      <li key={r} className="text-[12.5px] text-ink-soft">
                                        · {r}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="flex items-center justify-between gap-2 border-t border-line-soft px-4 py-3">
                        {isDuplicate && (
                          <p className="text-[11.5px] text-warn">
                            A job titled "{job.title}" is already posted — publishing again would duplicate it.
                          </p>
                        )}
                        <Button
                          variant={published ? "secondary" : "primary"}
                          size="sm"
                          disabled={published || isDuplicate}
                          className="ml-auto"
                          onClick={() => publish(i)}
                        >
                          {published ? "Published" : isDuplicate ? "Already posted" : "Publish this job"}
                          {!published && !isDuplicate && <Icon.ArrowRight size={14} />}
                        </Button>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {failed.length > 0 && (
              <Card className="p-4">
                <SectionTitle
                  eyebrow="Skipped"
                  title="Couldn't be read"
                  action={<Badge tone="danger">{failed.length}</Badge>}
                />
                <ul className="mt-3 space-y-1.5">
                  {failed.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-[12px] leading-relaxed text-muted">
                      <Icon.Warning size={12} className="mt-0.5 shrink-0 text-danger" />
                      <span>
                        <span className="text-ink-soft">{f.source}</span> — {f.error}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {!jobs.length && !failed.length && (
              <Card className="flex flex-col items-center gap-2 py-14 text-center">
                <span className="flex size-10 items-center justify-center rounded-full bg-canvas-deep text-faint">
                  <Icon.Warning size={18} />
                </span>
                <p className="text-[13.5px] font-medium text-ink">Nothing recognized</p>
                <p className="max-w-xs text-[12.5px] text-muted">
                  The text didn&apos;t look like a job description — try a different file, or paste the
                  text directly.
                </p>
              </Card>
            )}

            <Divider />
            <div className="flex flex-wrap gap-2">
              <Button href="/dashboard/jobs" variant="secondary" size="sm">
                Back to jobs
              </Button>
              <Button variant="ghost" size="sm" onClick={reset}>
                Parse another
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ confirmation */

function PostedConfirmation({ job }) {
  return (
    <div className="mx-auto max-w-xl py-10">
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <Card className="overflow-hidden text-center">
          <div className="relative bg-primary-deep px-6 py-10 text-white">
            <div aria-hidden className="absolute inset-0 grid-lines opacity-30 mix-blend-overlay" />
            <motion.span
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.12, type: "spring", stiffness: 320, damping: 18 }}
              className="relative mx-auto flex size-14 items-center justify-center rounded-full bg-white/12"
            >
              <Icon.Check size={26} />
            </motion.span>
            <h1 className="relative mt-5 text-[24px] font-semibold tracking-[-0.03em]">Job posted</h1>
            <p className="relative mt-2 text-[13.5px] text-white/60">
              {job.title} is {job.status === "Open" ? "live and accepting applications" : "saved as a draft"}.
            </p>
          </div>

          <div className="p-6">
            <ul className="space-y-3 text-left">
              {[
                [
                  "Screening rubric generated",
                  `${job.stack.length} skill${job.stack.length === 1 ? "" : "s"} weighted from your description`,
                ],
                ["Pipeline created", "Applied → Reviewed → Shortlisted → Interview Scheduled"],
                ["Interview plan drafted", "8 role-specific questions with adaptive follow-ups"],
                ["Inbox routing enabled", "Résumés sent to jobs@ will land in this pipeline"],
              ].map(([head, sub], i) => (
                <motion.li
                  key={head}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 + i * 0.08, duration: 0.4 }}
                  className="flex items-start gap-3"
                >
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-success-soft text-success">
                    <Icon.Check size={12} />
                  </span>
                  <span>
                    <span className="block text-[13px] font-medium text-ink">{head}</span>
                    <span className="block text-[12px] text-muted">{sub}</span>
                  </span>
                </motion.li>
              ))}
            </ul>

            <div className="mt-7 flex flex-col gap-2 sm:flex-row">
              <Button href={`/dashboard/jobs/${job.id}`} variant="primary" size="md" className="flex-1">
                <Icon.Board size={15} />
                Open pipeline
              </Button>
              <Button href="/dashboard/jobs" variant="secondary" size="md" className="flex-1">
                All jobs
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
