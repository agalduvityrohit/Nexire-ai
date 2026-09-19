"use client";

// UNDER DEVELOPMENT — no connector is live. Selecting a job ranks fictional
// profiles against that job's stack so the layout, ranking and filtering can be
// designed before any real integration exists.

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Field,
  Meter,
  Pill,
  SectionTitle,
  Select,
} from "@/components/ui/Primitives";
import { Icon } from "@/components/ui/Icons";
import { rankProfiles, SOURCE_SITES, SOURCE_TONES, SOURCED_PROFILES } from "@/lib/sourcing-data";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1];

export function SourcingSearchPanel() {
  const { jobs, notify } = useStore();

  const [jobId, setJobId] = useState("");
  const [enabled, setEnabled] = useState(() => Object.fromEntries(SOURCE_SITES.map((s) => [s.id, true])));
  const [phase, setPhase] = useState("idle"); // idle | scanning | done
  const [scanIndex, setScanIndex] = useState(0);
  const [minScore, setMinScore] = useState(0);
  const [query, setQuery] = useState("");
  const [saved, setSaved] = useState([]);

  const job = useMemo(() => jobs.find((j) => j.id === jobId) || null, [jobs, jobId]);

  // Default to the first open role once jobs load.
  useEffect(() => {
    if (!jobId && jobs.length) setJobId(jobs.find((j) => j.status === "Open")?.id || jobs[0].id);
  }, [jobs, jobId]);

  const ranked = useMemo(() => rankProfiles(SOURCED_PROFILES, job), [job]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ranked.filter((p) => {
      if (!enabled[p.source]) return false;
      if (p.score < minScore) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.headline.toLowerCase().includes(q) ||
        p.skills.some((s) => s.toLowerCase().includes(q))
      );
    });
  }, [ranked, enabled, minScore, query]);

  const perSource = useMemo(() => {
    const counts = {};
    for (const site of SOURCE_SITES) counts[site.id] = ranked.filter((p) => p.source === site.id).length;
    return counts;
  }, [ranked]);

  // Staged fake scan so the flow reads correctly. Purely cosmetic.
  useEffect(() => {
    if (phase !== "scanning") return undefined;
    const active = SOURCE_SITES.filter((s) => enabled[s.id]);
    if (scanIndex >= active.length) {
      const t = setTimeout(() => setPhase("done"), 350);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setScanIndex((i) => i + 1), 420);
    return () => clearTimeout(t);
  }, [phase, scanIndex, enabled]);

  function search() {
    if (!job) return;
    setScanIndex(0);
    setPhase("scanning");
  }

  function toggleSaved(id, name) {
    setSaved((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      notify(prev.includes(id) ? `${name} removed from shortlist` : `${name} saved to shortlist`);
      return next;
    });
  }

  const activeSites = SOURCE_SITES.filter((s) => enabled[s.id]);

  return (
    <>
      {/* -------------------------------------------------- under development */}
      <div className="mb-5 flex items-start gap-3 rounded-card border border-warn/30 bg-warn-soft px-5 py-4">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-warn/15 text-warn">
          <Icon.Warning size={16} />
        </span>
        <div className="min-w-0">
          <div className="text-[13.5px] font-semibold text-warn">
            Under development — no source is connected yet
          </div>
          <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">
            Nothing on this screen queries a real site. Every profile below is fictional, generated to match
            the selected job&apos;s stack so the ranking and filtering can be designed first. Each site has
            its own access rules — most need a paid recruiter product or partner agreement, and scraping
            them is against their terms — so they&apos;ll be enabled one at a time as access is arranged.
          </p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[320px_1fr]">
        {/* --------------------------------------------------------- controls */}
        <div className="space-y-4">
          <Card className="p-5">
            <SectionTitle eyebrow="Step 1" title="Pick the role" />
            <Field label="Open role" htmlFor="job-select" className="mt-4">
              <Select
                id="job-select"
                value={jobId}
                onChange={(e) => {
                  setJobId(e.target.value);
                  setPhase("idle");
                }}
                className="h-11 text-[14px]"
              >
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title} {j.status === "Draft" ? "· draft" : ""}
                  </option>
                ))}
              </Select>
            </Field>

            {job && (
              <div className="mt-4 rounded-[10px] border border-line bg-canvas p-3.5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-muted">
                  <span className="flex items-center gap-1">
                    <Icon.Pin size={12} />
                    {job.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Icon.Trend size={12} />
                    {job.level}
                  </span>
                </div>
                <div className="mt-2.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">
                  Searching for
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {(job.stack || []).map((s) => (
                    <Pill key={s}>{s}</Pill>
                  ))}
                  {!job.stack?.length && <span className="text-[12px] text-faint">No stack on this job</span>}
                </div>
              </div>
            )}
          </Card>

          <Card className="p-5">
            <SectionTitle
              eyebrow="Step 2"
              title="Choose sources"
              action={<Badge tone="neutral">{activeSites.length} on</Badge>}
            />
            <ul className="mt-4 space-y-2">
              {SOURCE_SITES.map((site) => {
                const on = enabled[site.id];
                return (
                  <li key={site.id}>
                    <button
                      type="button"
                      onClick={() => setEnabled((e) => ({ ...e, [site.id]: !e[site.id] }))}
                      aria-pressed={on}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-[10px] border p-3 text-left transition-all",
                        on
                          ? "border-primary/30 bg-primary-soft/30"
                          : "border-line bg-surface hover:border-line-strong"
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-[6px] border transition-colors",
                          on ? "border-primary bg-primary text-white" : "border-line-strong"
                        )}
                      >
                        {on && <Icon.Check size={12} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[13px] font-medium text-ink">{site.label}</span>
                          {site.status === "closest" && <Badge tone="primary">API ready</Badge>}
                        </span>
                        <span className="mt-0.5 block text-[11.5px] text-muted">
                          {site.kind} · {site.reach}
                        </span>
                      </span>
                      <span className="shrink-0 text-[11.5px] tabular-nums text-faint">
                        {perSource[site.id] || 0}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <Button
              variant="accent"
              size="md"
              className="mt-4 w-full"
              onClick={search}
              disabled={!job || !activeSites.length || phase === "scanning"}
            >
              {phase === "scanning" ? "Searching…" : "Search sources"}
              {phase !== "scanning" && <Icon.Search size={15} />}
            </Button>
          </Card>

          {phase === "done" && (
            <Card className="p-5">
              <SectionTitle eyebrow="Step 3" title="Narrow it down" />
              <Field label="Minimum match" htmlFor="min-score" className="mt-4">
                <Select
                  id="min-score"
                  value={minScore}
                  onChange={(e) => setMinScore(Number(e.target.value))}
                  className="h-10 text-[13px]"
                >
                  {[0, 50, 60, 70, 80].map((v) => (
                    <option key={v} value={v}>
                      {v === 0 ? "Any score" : `${v}% and above`}
                    </option>
                  ))}
                </Select>
              </Field>
              <label className="relative mt-3 flex items-center">
                <Icon.Search size={15} className="pointer-events-none absolute left-3 text-faint" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Name, title, or skill…"
                  className="h-10 w-full rounded-[10px] border border-line bg-surface pl-9 pr-3 text-[13px] text-ink placeholder:text-faint shadow-xs outline-none transition-colors hover:border-line-strong focus:border-primary focus:ring-4 focus:ring-primary/10"
                />
              </label>
            </Card>
          )}
        </div>

        {/* ---------------------------------------------------------- results */}
        <div className="space-y-4">
          {phase === "idle" && (
            <Card className="flex flex-col items-center gap-2 py-20 text-center">
              <span className="flex size-11 items-center justify-center rounded-full bg-canvas-deep text-faint">
                <Icon.Search size={20} />
              </span>
              <p className="text-[14px] font-medium text-ink">Pick a role and search</p>
              <p className="max-w-sm text-[12.5px] leading-relaxed text-muted">
                Results are ranked against the role&apos;s stack. Change the job and the shortlist changes
                with it.
              </p>
            </Card>
          )}

          {phase === "scanning" && (
            <Card className="p-6">
              <div className="text-[13px] font-medium text-ink">
                Searching {activeSites.length} source{activeSites.length === 1 ? "" : "s"} for{" "}
                {job?.title}
              </div>
              <ul className="mt-5 space-y-3">
                {activeSites.map((site, i) => {
                  const state = i < scanIndex ? "done" : i === scanIndex ? "active" : "queued";
                  return (
                    <li key={site.id} className="flex items-center gap-3">
                      <span
                        className={cn(
                          "flex size-5 shrink-0 items-center justify-center rounded-full",
                          state === "done"
                            ? "bg-success-soft text-success"
                            : state === "active"
                              ? "bg-primary text-white"
                              : "bg-canvas-deep text-faint"
                        )}
                      >
                        {state === "done" ? <Icon.Check size={11} /> : <span className="size-1.5 rounded-full bg-current" />}
                      </span>
                      <span
                        className={cn(
                          "text-[13px]",
                          state === "queued" ? "text-faint" : "font-medium text-ink"
                        )}
                      >
                        {site.label}
                      </span>
                      <span className="ml-auto text-[11.5px] tabular-nums text-muted">
                        {state === "done" ? `${perSource[site.id] || 0} found` : state === "active" ? "scanning…" : "queued"}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-5 border-t border-line-soft pt-4 text-[11.5px] text-faint">
                Simulated — this is a timed animation, not a live query.
              </p>
            </Card>
          )}

          {phase === "done" && (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-[13px] text-muted">
                  <span className="font-semibold text-ink">{visible.length}</span> profiles matched{" "}
                  <span className="font-medium text-ink-soft">{job?.title}</span>
                </span>
                {saved.length > 0 && <Badge tone="success">{saved.length} shortlisted</Badge>}
                <Button variant="ghost" size="xs" className="ml-auto" onClick={() => setPhase("idle")}>
                  New search
                </Button>
              </div>

              <AnimatePresence initial={false}>
                {visible.map((p, i) => (
                  <motion.div
                    key={p.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ delay: Math.min(i, 8) * 0.04, duration: 0.35, ease: EASE }}
                  >
                    <Card className="p-4 transition-[border-color,box-shadow] hover:border-line-strong hover:shadow-lift">
                      <div className="flex flex-wrap items-start gap-3">
                        <Avatar name={p.name} initials={p.initials} size="md" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[14px] font-semibold tracking-[-0.015em] text-ink">
                              {p.name}
                            </span>
                            <Badge tone={SOURCE_TONES[p.source] || "neutral"}>
                              {SOURCE_SITES.find((s) => s.id === p.source)?.label}
                            </Badge>
                            {p.openToWork && <Badge tone="success">Open to work</Badge>}
                          </div>
                          <div className="mt-0.5 text-[12.5px] text-muted">
                            {p.headline} · {p.location} · {p.experience} yrs
                          </div>
                          <div className="mt-1 truncate font-mono text-[11px] text-faint">{p.handle}</div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="w-14">
                            <Meter value={p.score} />
                          </span>
                          <span className="w-9 text-right text-[14px] font-semibold tabular-nums text-ink">
                            {p.score}%
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 rounded-[10px] border border-primary/18 bg-primary-soft/40 p-3">
                        <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-primary">
                          <Icon.Link size={11} />
                          Why they matched
                        </div>
                        <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-soft">
                          Overlaps on {p.matched.join(", ")} — {p.signal}
                        </p>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        {p.skills.map((s) => (
                          <Pill
                            key={s}
                            className={cn(
                              p.matched.includes(s) && "border-primary/25 bg-primary-soft text-primary"
                            )}
                          >
                            {s}
                          </Pill>
                        ))}
                        <span className="ml-auto flex gap-2">
                          <Button variant="ghost" size="xs" disabled title="Needs a live connector">
                            View profile
                          </Button>
                          <Button
                            variant={saved.includes(p.id) ? "secondary" : "primary"}
                            size="xs"
                            onClick={() => toggleSaved(p.id, p.name)}
                          >
                            {saved.includes(p.id) ? "Shortlisted" : "Shortlist"}
                          </Button>
                        </span>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>

              {!visible.length && (
                <Card className="flex flex-col items-center gap-2 py-16 text-center">
                  <span className="flex size-10 items-center justify-center rounded-full bg-canvas-deep text-faint">
                    <Icon.Filter size={18} />
                  </span>
                  <p className="text-[13.5px] font-medium text-ink">Nothing matches those filters</p>
                  <p className="max-w-xs text-[12.5px] text-muted">
                    Try lowering the minimum match, or turning more sources back on.
                  </p>
                </Card>
              )}

              <Card className="flex items-start gap-2.5 border-dashed p-4">
                <Icon.Shield size={15} className="mt-0.5 shrink-0 text-primary/70" />
                <p className="text-[12px] leading-relaxed text-muted">
                  When these connectors go live, anyone surfaced this way gets told how they were found and
                  what was looked at, and can be removed from consideration and future searches in one
                  click. Shortlisting here is local to this browser session.
                </p>
              </Card>
            </>
          )}
        </div>
      </div>
    </>
  );
}
