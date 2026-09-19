"use client";

// Bulk résumé upload — one of Candidate sourcing's tabs (the others being
// GitHub, Mail, and Search). Real: files are sent to /api/resumes/parse,
// parsed and classified by whichever LLM is connected, then de-duplicated
// across the whole batch client-side. Role-agnostic on purpose, same as
// Mail — résumés get parsed and auto-classified first, matched against an
// open job's title afterward (lib/roleJobMatch.js); there's no role picker
// here the way there is for GitHub/Search, since this tab ingests everything
// rather than searching for a specific role.
//
// The run itself lives in the store (lib/store.jsx#runUpload), not here — so
// switching tabs or screens mid-parse doesn't lose progress or drop the
// results. This panel just renders whatever `uploadJob` currently holds.

import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Divider,
  Meter,
  MockNote,
  Pill,
  SectionTitle,
} from "@/components/ui/Primitives";
import { Icon } from "@/components/ui/Icons";
import { dedupeCandidates, groupByRole } from "@/lib/dedupe";
import { ROLE_LABELS, ROLE_TONES } from "@/lib/roles";
import { providerLabel } from "@/lib/providers";
import { matchJobForRole } from "@/lib/roleJobMatch";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const ACCEPT = ".pdf,.docx,.txt,.md";

export function UploadPanel() {
  const { session, jobs, uploadJob, setUploadQueue, runUpload, resetUploadJob } = useStore();
  const companyId = session?.company?.id || "demo-company";
  const { queue, phase, progress, parsed, failed, mode, model, fatal } = uploadJob;

  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [openRole, setOpenRole] = useState(null);

  const addFiles = useCallback(
    (fileList) => {
      const incoming = Array.from(fileList || []);
      if (!incoming.length) return;
      setUploadQueue((prev) => {
        const seen = new Set(prev.map((f) => `${f.name}:${f.size}`));
        return [...prev, ...incoming.filter((f) => !seen.has(`${f.name}:${f.size}`))];
      });
    },
    [setUploadQueue]
  );

  const result = useMemo(() => {
    if (!parsed.length) return null;
    const { unique, duplicates, duplicateCount } = dedupeCandidates(parsed);
    return { unique, duplicates, duplicateCount, groups: groupByRole(unique, ROLE_LABELS) };
  }, [parsed]);

  const needsKeyCount = useMemo(
    () => (result?.unique || []).filter((r) => r.needsKey).length,
    [result]
  );

  function run() {
    if (!queue.length || phase === "working") return;
    runUpload(queue, companyId);
  }

  function reset() {
    resetUploadJob();
    setOpenRole(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="space-y-4">
      {queue.length > 0 && (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={reset}>
            Clear
          </Button>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[1.15fr_1fr]">
        {/* --------------------------------------------------------- dropzone */}
        <div className="space-y-4">
          {/* Mail import lives in this same page's Mail tab. */}
          <Card className="flex items-center gap-3 p-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-[11px] bg-primary-soft text-primary">
              <Icon.Inbox size={19} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13.5px] font-medium text-ink">
                Already have applications in your inbox?
              </span>
              <span className="mt-0.5 block text-[12.5px] leading-relaxed text-muted">
                Pull in months of past résumés from your mailbox instead of uploading them by hand — see
                the Mail tab.
              </span>
            </span>
          </Card>

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
                "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-card border border-dashed px-6 py-12 text-center transition-colors",
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
              <span className="text-[15px] font-semibold text-ink">
                Drop résumés here, or click to browse
              </span>
              <span className="text-[12.5px] text-muted">
                PDF, DOCX, TXT · select as many as you like
              </span>
            </label>

            {queue.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line-soft pt-4">
                <Badge tone="primary">{queue.length} file{queue.length === 1 ? "" : "s"} queued</Badge>
                <span className="text-[12.5px] text-muted">
                  {(queue.reduce((n, f) => n + f.size, 0) / 1048576).toFixed(1)} MB total
                </span>
                <Button
                  variant="accent"
                  size="sm"
                  className="ml-auto"
                  onClick={run}
                  disabled={phase === "working"}
                >
                  {phase === "working" ? "Processing…" : "Parse & classify"}
                  {phase !== "working" && <Icon.ArrowRight size={15} />}
                </Button>
              </div>
            )}

            {phase === "working" && (
              <div className="mt-4">
                <div className="flex items-baseline justify-between text-[12.5px]">
                  <span className="text-ink-soft">
                    Parsing {progress.done} of {progress.total}
                  </span>
                  <span className="tabular-nums text-muted">{pct}%</span>
                </div>
                <div className="mt-2">
                  <Meter value={pct} />
                </div>
                <p className="mt-2 text-[11.5px] text-faint">
                  Keeps running even if you switch screens — come back any time.
                </p>
              </div>
            )}

            {fatal && (
              <div className="mt-4 flex items-start gap-2.5 rounded-[10px] border border-danger/25 bg-danger-soft px-3 py-2.5">
                <Icon.Warning size={14} className="mt-0.5 shrink-0 text-danger" />
                <p className="text-[12.5px] leading-relaxed text-danger">{fatal}</p>
              </div>
            )}
          </Card>

          {/* file list */}
          {queue.length > 0 && phase !== "done" && (
            <Card className="overflow-hidden">
              <div className="border-b border-line px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">
                Queue
              </div>
              <ul className="max-h-64 divide-y divide-line-soft overflow-y-auto thin-scrollbar">
                {queue.slice(0, 200).map((f) => (
                  <li key={`${f.name}-${f.size}`} className="flex items-center gap-3 px-4 py-2.5">
                    <Icon.Doc size={14} className="shrink-0 text-faint" />
                    <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink-soft">{f.name}</span>
                    <span className="shrink-0 text-[11.5px] tabular-nums text-faint">
                      {(f.size / 1024).toFixed(0)} KB
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <MockNote>
            Résumés are sent to whichever model provider you selected in Settings. Unique candidates are
            saved straight to your Candidates dashboard and survive a refresh. Re-uploading a file you've
            already parsed reuses the cached result instead of paying for another model call.
          </MockNote>
        </div>

        {/* ---------------------------------------------------------- summary */}
        <div className="space-y-4">
          {!result && (
            <Card className="flex flex-col items-center gap-2 py-16 text-center">
              <span className="flex size-10 items-center justify-center rounded-full bg-canvas-deep text-faint">
                <Icon.Grid size={18} />
              </span>
              <p className="text-[13.5px] font-medium text-ink">No results yet</p>
              <p className="max-w-xs text-[12.5px] text-muted">
                Upload a batch and the role breakdown appears here.
              </p>
            </Card>
          )}

          {result && (
            <>
              <div className="grid grid-cols-3 gap-3">
                {[
                  ["Uploaded", progress.total, "primary"],
                  ["Duplicates removed", result.duplicateCount, "warn"],
                  ["Unique candidates", result.unique.length, "success"],
                ].map(([label, value, tone]) => (
                  <Card key={label} className="p-4">
                    <div
                      className={cn(
                        "text-[26px] font-semibold leading-none tabular-nums",
                        tone === "warn" ? "text-warn" : tone === "success" ? "text-success" : "text-ink"
                      )}
                    >
                      {value}
                    </div>
                    <div className="mt-2 text-[12px] leading-snug text-muted">{label}</div>
                  </Card>
                ))}
              </div>

              {mode === "heuristic" && (
                <div className="flex items-start gap-2.5 rounded-card border border-warn/25 bg-warn-soft px-4 py-3">
                  <Icon.Warning size={15} className="mt-0.5 shrink-0 text-warn" />
                  <div className="text-[12.5px] leading-relaxed text-ink-soft">
                    <span className="font-semibold text-warn">Heuristic mode — not a real classification.</span>{" "}
                    No model provider is connected, so these roles come from keyword matching.
                    {needsKeyCount > 0 && ` ${needsKeyCount} PDF${needsKeyCount === 1 ? "" : "s"} couldn't be read at all.`}{" "}
                    Add a key in{" "}
                    <Link href="/dashboard/settings" className="font-medium text-primary underline underline-offset-2">
                      Settings → API Connections
                    </Link>{" "}
                    and re-run.
                  </div>
                </div>
              )}

              {mode && mode !== "heuristic" && mode !== "none" && (
                <div className="flex items-center gap-2 text-[12px] text-muted">
                  <Icon.Sparkle size={13} className="text-primary" />
                  Classified by <span className="font-medium text-ink-soft">{providerLabel(mode)}</span>
                  <span className="font-mono text-ink-soft">{model}</span>
                </div>
              )}

              <Card className="overflow-hidden">
                <div className="border-b border-line px-4 py-3">
                  <SectionTitle
                    eyebrow="Segregation"
                    title="Candidates by role"
                    action={<Badge tone="neutral">{result.groups.length} roles</Badge>}
                  />
                </div>

                <ul className="divide-y divide-line-soft">
                  {result.groups.map((group) => {
                    const isOpen = openRole === group.role;
                    const share = Math.round((group.count / Math.max(result.unique.length, 1)) * 100);
                    const matchedJob = matchJobForRole(group.role, jobs);
                    return (
                      <li key={group.role}>
                        <button
                          type="button"
                          onClick={() => setOpenRole(isOpen ? null : group.role)}
                          aria-expanded={isOpen}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-raised"
                        >
                          <Icon.ChevronRight
                            size={14}
                            className={cn("shrink-0 text-faint transition-transform", isOpen && "rotate-90")}
                          />
                          <Badge tone={ROLE_TONES[group.role] || "neutral"}>{group.role}</Badge>
                          {matchedJob ? (
                            <span className="hidden items-center gap-1 text-[11.5px] text-success sm:flex">
                              <Icon.Check size={12} />
                              Applied to <span className="max-w-[160px] truncate font-medium">{matchedJob.title}</span>
                            </span>
                          ) : (
                            <span className="hidden text-[11.5px] text-faint sm:block">
                              No open role yet — general pool
                            </span>
                          )}
                          <span className="ml-auto flex items-center gap-3">
                            <span className="hidden w-24 sm:block">
                              <Meter value={share} />
                            </span>
                            <span className="w-8 text-right text-[14px] font-semibold tabular-nums text-ink">
                              {group.count}
                            </span>
                          </span>
                        </button>

                        <AnimatePresence initial={false}>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                              className="overflow-hidden"
                            >
                              <ul className="divide-y divide-line-soft border-t border-line bg-canvas-deep/30">
                                {group.candidates.map((c, i) => (
                                  <li key={`${c.filename}-${i}`} className="flex items-start gap-3 px-4 py-3">
                                    <Avatar name={c.name || c.filename} size="sm" />
                                    <div className="min-w-0 flex-1">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="truncate text-[13px] font-medium text-ink">
                                          {c.name || c.filename}
                                        </span>
                                        {c.roleConfidence > 0 && (
                                          <span className="text-[11px] tabular-nums text-faint">
                                            {Math.round(c.roleConfidence * 100)}% confident
                                          </span>
                                        )}
                                        {c.duplicateOf?.length > 0 && (
                                          <Badge tone="warn">+{c.duplicateOf.length} duplicate</Badge>
                                        )}
                                      </div>
                                      {c.headline && (
                                        <div className="truncate text-[12px] text-muted">{c.headline}</div>
                                      )}
                                      <div className="mt-0.5 truncate text-[11.5px] text-faint">
                                        {[c.email, c.phone].filter(Boolean).join(" · ") || c.filename}
                                      </div>
                                      {c.roleReason && (
                                        <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">
                                          {c.roleReason}
                                        </p>
                                      )}
                                      {c.skills?.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-1">
                                          {c.skills.slice(0, 6).map((s) => (
                                            <Pill key={s} className="text-[11px]">
                                              {s}
                                            </Pill>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </li>
                    );
                  })}
                </ul>
              </Card>

              {result.duplicateCount > 0 && (
                <Card className="p-4">
                  <SectionTitle eyebrow="Merged" title="Duplicates removed" />
                  <ul className="mt-3 space-y-1.5">
                    {result.duplicates.slice(0, 12).map((d, i) => (
                      <li key={i} className="flex items-start gap-2 text-[12px] leading-relaxed text-muted">
                        <Icon.X size={12} className="mt-0.5 shrink-0 text-warn" />
                        <span>
                          <span className="text-ink-soft">{d.filename}</span> — {d.reason} as{" "}
                          <span className="text-ink-soft">{d.mergedInto}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {failed.length > 0 && (
                <Card className="p-4">
                  <SectionTitle
                    eyebrow="Skipped"
                    title="Files that couldn't be read"
                    action={<Badge tone="danger">{failed.length}</Badge>}
                  />
                  <ul className="mt-3 space-y-1.5">
                    {failed.slice(0, 12).map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-[12px] leading-relaxed text-muted">
                        <Icon.Warning size={12} className="mt-0.5 shrink-0 text-danger" />
                        <span>
                          <span className="text-ink-soft">{f.filename}</span> — {f.error}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              <Divider />
              <div className="flex flex-wrap gap-2">
                <Button href="/dashboard/candidates" variant="primary" size="sm">
                  <Icon.Users size={14} />
                  View in Candidates
                </Button>
                <Button variant="secondary" size="sm" onClick={reset}>
                  Upload another batch
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
