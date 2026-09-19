"use client";

// Auto-shortlist: scores every candidate who's already Applied to THIS job
// (not the whole candidate table — résumés land here automatically at
// upload time via lib/roleJobMatch.js, so this panel only ever sees people
// who actually applied to this role). Flow is Applied → Reviewed →
// Shortlisted: everyone scored moves to Reviewed (they've now actually been
// evaluated), and the top X of those are promoted a step further to
// Shortlisted — this panel only surfaces that top pick list, not the whole
// scored batch (the rest are visible on the Reviewed pipeline column).
// Real — sends the pool to whichever LLM provider is connected in Settings
// (résumé fit) and, for whoever's résumé linked a GitHub profile, pulls
// their public repos too (real projects, not just claimed skills). Falls
// back to a skill/stack overlap heuristic when no model is connected, same
// pattern as Bulk upload.
//
// The run itself lives in the store (lib/store.jsx#runShortlist), keyed by
// job id, not here — so switching screens mid-run doesn't lose progress or
// drop the results. This panel just renders `shortlistJobs[job.id]`.

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Avatar, Badge, Button, Card, Field, Input, Meter, Pill, SectionTitle } from "@/components/ui/Primitives";
import { Icon } from "@/components/ui/Icons";
import { providerLabel } from "@/lib/providers";
import { DURATION, transition } from "@/lib/motion";
import { useStore } from "@/lib/store";

const EMPTY_JOB = {
  phase: "idle",
  ranked: [],
  selectedIds: [],
  mode: null,
  model: null,
  error: "",
  githubConsidered: 0,
  githubConnected: false,
};

export function ShortlistPanel({ job }) {
  const { candidates, session, shortlistJobs, runShortlist, resetShortlistJob } = useStore();
  const companyId = session?.company?.id || "demo-company";

  const pool = useMemo(
    () => candidates.filter((c) => c.jobId === job.id && c.status === "applied"),
    [candidates, job.id]
  );
  const poolWithGithub = useMemo(() => pool.filter((c) => c.githubUsername).length, [pool]);
  const { phase, ranked, selectedIds, mode, model, error, githubConsidered, githubConnected } =
    shortlistJobs[job.id] || EMPTY_JOB;
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const [count, setCount] = useState(5);
  const boundedCount = Math.max(1, Math.min(count || 1, pool.length || 1));

  function run() {
    if (!pool.length || phase === "running") return;
    runShortlist({ job, pool, count: boundedCount, companyId });
  }

  // Looked up from every candidate, not just this job's Applied pool — a
  // successful run flips the selected candidates' status to "shortlisted"
  // and drops them out of `pool`, but the just-finished results still need
  // to resolve their names.
  const byId = useMemo(() => Object.fromEntries(candidates.map((c) => [c.id, c])), [candidates]);

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <SectionTitle eyebrow="Auto-shortlist" title="Rank the applicant pool for this role" />
          <p className="mt-2 max-w-xl text-[12.5px] leading-relaxed text-muted">
            {phase === "done" ? (
              `${ranked.length} candidate${ranked.length === 1 ? "" : "s"} reviewed, ${selectedIds.length} shortlisted for this role.`
            ) : pool.length > 0 ? (
              <>
                Reviews every one of the {pool.length} candidate{pool.length === 1 ? "" : "s"} who applied to this
                role on résumé fit
                {poolWithGithub > 0 && (
                  <>
                    {" "}
                    and, for {poolWithGithub} of them with a GitHub link on file, real public projects
                  </>
                )}
                , then shortlists the top pick{boundedCount === 1 ? "" : "s"}. Everyone else moves to Reviewed.
              </>
            ) : (
              "No applicants yet — résumés classified into a matching role land here automatically after upload."
            )}
          </p>
        </div>

        {pool.length > 0 && phase !== "done" && (
          <div className="flex shrink-0 items-end gap-2.5">
            <Field label="Shortlist" htmlFor="shortlist-count" hint={`of ${pool.length}`}>
              <Input
                id="shortlist-count"
                type="number"
                min={1}
                max={pool.length}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="w-20 text-center"
              />
            </Field>
            <Button variant="accent" size="sm" onClick={run} disabled={phase === "running"}>
              {phase === "running" ? "Scoring…" : "Run shortlist"}
              {phase !== "running" && <Icon.Sparkle size={14} />}
            </Button>
          </div>
        )}

        {phase === "done" && (
          <Button variant="secondary" size="sm" onClick={() => resetShortlistJob(job.id)}>
            Run again
          </Button>
        )}
      </div>

      {phase === "running" && (
        <p className="mx-5 mb-4 text-[11.5px] text-faint">
          Keeps running even if you switch screens — come back any time.
        </p>
      )}

      {error && (
        <div className="mx-5 mb-4 flex items-start gap-2.5 rounded-[10px] border border-danger/25 bg-danger-soft px-3 py-2.5">
          <Icon.Warning size={14} className="mt-0.5 shrink-0 text-danger" />
          <p className="text-[12.5px] leading-relaxed text-danger">{error}</p>
        </div>
      )}

      <AnimatePresence initial={false}>
        {phase === "done" && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={transition(DURATION.quick)}
            className="overflow-hidden border-t border-line"
          >
            {mode === "heuristic" && (
              <div className="mx-5 mt-4 flex items-start gap-2.5 rounded-card border border-warn/25 bg-warn-soft px-4 py-3">
                <Icon.Warning size={15} className="mt-0.5 shrink-0 text-warn" />
                <div className="text-[12.5px] leading-relaxed text-ink-soft">
                  <span className="font-semibold text-warn">Heuristic mode — not a real evaluation.</span> No
                  model provider is connected, so résumé scores come from skill/stack overlap. Add a key in{" "}
                  <a href="/dashboard/settings" className="font-medium text-primary underline underline-offset-2">
                    Settings → API Connections
                  </a>{" "}
                  and re-run.
                </div>
              </div>
            )}
            {mode && mode !== "heuristic" && (
              <div className="mx-5 mt-4 flex items-center gap-2 text-[12px] text-muted">
                <Icon.Sparkle size={13} className="text-primary" />
                Résumé fit scored by <span className="font-medium text-ink-soft">{providerLabel(mode)}</span>
                <span className="font-mono text-ink-soft">{model}</span>
              </div>
            )}

            {githubConsidered > 0 ? (
              <div className="mx-5 mt-2 flex items-center gap-2 text-[12px] text-muted">
                <Icon.Github size={13} className="text-ink-soft" />
                GitHub projects factored in for {githubConsidered} candidate{githubConsidered === 1 ? "" : "s"}
                {!githubConnected && (
                  <span className="text-faint">
                    {" "}
                    ·{" "}
                    <a href="/dashboard/settings" className="underline underline-offset-2 hover:text-ink-soft">
                      connect a token
                    </a>{" "}
                    for a higher rate limit
                  </span>
                )}
              </div>
            ) : (
              <p className="mx-5 mt-2 text-[12px] text-faint">
                No GitHub links found on these résumés — scored on résumé fit alone.
              </p>
            )}

            <div className="mx-5 mt-4 flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">
                Shortlisted
              </span>
              <Badge tone="success">{selectedIds.length}</Badge>
            </div>
            {ranked.length > selectedIds.length && (
              <p className="mx-5 mt-1.5 text-[11.5px] text-faint">
                The other {ranked.length - selectedIds.length} scored candidate
                {ranked.length - selectedIds.length === 1 ? "" : "s"} moved to Reviewed — see the Reviewed column on
                the pipeline board.
              </p>
            )}

            <ul className="mt-3 divide-y divide-line-soft">
              {ranked
                .filter((r) => selectedSet.has(r.id))
                .map((r) => {
                const c = byId[r.id];
                if (!c) return null;
                return (
                  <li key={r.id} className="flex items-start gap-3 px-5 py-3">
                    <Avatar name={c.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-[13px] font-medium text-ink">{c.name}</span>
                        <Badge tone="success">Shortlisted</Badge>
                        {c.githubUsername && (
                          <a
                            href={c.githubUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 text-[11px] text-muted hover:text-ink-soft"
                          >
                            <Icon.Github size={11} />
                            {c.githubUsername}
                          </a>
                        )}
                      </div>
                      {c.headline && <div className="truncate text-[12px] text-muted">{c.headline}</div>}

                      {r.githubScore != null ? (
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-faint">
                          <span>
                            Résumé fit <span className="font-semibold text-ink-soft">{r.resumeScore}</span>
                          </span>
                          <span>
                            GitHub projects <span className="font-semibold text-ink-soft">{r.githubScore}</span>
                          </span>
                        </div>
                      ) : null}

                      {r.github?.topRepos?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {r.github.topRepos.map((repo) => (
                            <span key={repo.name} title={repo.description}>
                              <Pill className="text-[11px]">
                                {repo.name}
                                {repo.stars > 0 && ` · ★${repo.stars}`}
                              </Pill>
                            </span>
                          ))}
                        </div>
                      )}

                      <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">{r.reason}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1 pt-0.5">
                      <span className="text-[13px] font-semibold tabular-nums text-ink">{r.score}</span>
                      <span className="w-16">
                        <Meter value={r.score} />
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
