"use client";

// Mail intake — one section.
//
// The control that matters sits at the top: how far back to reach. The mailbox
// itself is connected once in Settings, so this screen only shows which account
// it's using rather than asking again.
//
// Loading is two beats on purpose — count first, then import. Counting is free;
// importing costs one model call per résumé, so you see the size of the job
// before it runs.
//
// The scan/import itself lives in the store (lib/store.jsx#scanMail /
// #importMail), not here, so switching screens mid-import doesn't lose
// progress or drop the results — this panel just renders `mailJob`.

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Field,
  Input,
  Meter,
  MockNote,
  Pill,
  SectionTitle,
  Select,
} from "@/components/ui/Primitives";
import { Icon } from "@/components/ui/Icons";
import { dedupeCandidates, groupByRole } from "@/lib/dedupe";
import { ROLE_LABELS, ROLE_TONES } from "@/lib/roles";
import { providerLabel } from "@/lib/providers";
import { DURATION, transition } from "@/lib/motion";
import { useStore } from "@/lib/store";
import { cn, formatDate } from "@/lib/utils";

const RANGES = [
  { months: 1, label: "Last 1 month" },
  { months: 3, label: "Last 3 months" },
  { months: 6, label: "Last 6 months" },
  { months: 12, label: "Last 12 months" },
  { months: 24, label: "Last 24 months" },
  { months: 0, label: "All time" },
];

export function MailImportPanel() {
  const { session, mailJob, scanMail, importMail, resetMailJob } = useStore();
  const companyId = session?.company?.id || "demo-company";
  const { phase, scan, mailboxes, parsed, failed, mode, model, error } = mailJob;

  const [connection, setConnection] = useState(null);
  const [months, setMonths] = useState(3);
  const [mailbox, setMailbox] = useState("INBOX");
  const [from, setFrom] = useState("");
  const [maxFiles, setMaxFiles] = useState(100);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [openRole, setOpenRole] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/settings/keys?companyId=${encodeURIComponent(companyId)}`);
        const json = await res.json();
        if (cancelled) return;
        setConnection(res.ok ? json.status?.gmail || { connected: false } : { connected: false });
      } catch {
        if (!cancelled) setConnection({ connected: false });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const result = useMemo(() => {
    if (!parsed.length) return null;
    const { unique, duplicates, duplicateCount } = dedupeCandidates(parsed);
    return { unique, duplicates, duplicateCount, groups: groupByRole(unique, ROLE_LABELS) };
  }, [parsed]);

  function load() {
    setOpenRole(null);
    scanMail({ companyId, mailbox, months, from, withMailboxes: !mailboxes });
  }

  function runImport() {
    importMail({ companyId, mailbox, months, from, maxFiles });
  }

  /* ------------------------------------------------------ not connected */

  if (connection && !connection.connected) {
    return (
      <div className="space-y-4">
        <Card className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            {/* Pre-select the window now — it's remembered for the moment a
                mailbox gets connected, so there's nothing to re-decide later. */}
            <Field
              label="Load past data from"
              htmlFor="months-precheck"
              className="w-full sm:max-w-[240px]"
              hint="· applies once connected"
            >
              <Select
                id="months-precheck"
                value={months}
                onChange={(e) => setMonths(Number(e.target.value))}
                className="h-11 text-[14px]"
              >
                {RANGES.map((r) => (
                  <option key={r.months} value={r.months}>
                    {r.label}
                  </option>
                ))}
              </Select>
            </Field>

            <div className="flex flex-1 items-center gap-2.5 rounded-[10px] border border-dashed border-line-strong bg-canvas-deep/40 px-3.5 py-2.5">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-canvas-deep text-faint">
                <Icon.Mail size={13} />
              </span>
              <span className="min-w-0 text-[12.5px] text-muted">No mailbox connected yet</span>
              <Button href="/dashboard/settings" variant="primary" size="sm" className="ml-auto shrink-0">
                Connect a mailbox
                <Icon.ArrowRight size={14} />
              </Button>
            </div>
          </div>

          <p className="mt-3 text-[12px] leading-relaxed text-muted">
            Once connected, Nexire pulls every résumé attachment from{" "}
            <span className="font-medium text-ink-soft">
              {(RANGES.find((r) => r.months === months) || RANGES[1]).label.toLowerCase()}
            </span>{" "}
            of that inbox — no re-applying, no forwarding, no manual uploads.
          </p>
        </Card>

        {/* --------------------------------------------- coming up, once connected */}
        <div>
          <div className="mb-2.5 flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
              What appears here
            </span>
            <Badge tone="neutral">After you connect</Badge>
          </div>

          <Card className="overflow-hidden border-dashed opacity-70">
            <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4">
              {["Messages", "With résumés", "Résumé files", "Unique senders"].map((label) => (
                <div key={label} className="rounded-[10px] border border-line bg-canvas px-3 py-2.5">
                  <div className="h-[22px] w-10 rounded bg-canvas-deep" />
                  <div className="mt-2 text-[11.5px] leading-snug text-faint">{label}</div>
                </div>
              ))}
            </div>

            <div className="border-t border-line-soft px-5 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.07em] text-faint">
                Candidates by role
              </div>
              <div className="mt-3 space-y-2">
                {[
                  ["Software Engineer", "primary"],
                  ["Product Designer", "info"],
                  ["Data Scientist", "success"],
                ].map(([role, tone]) => (
                  <div key={role} className="flex items-center gap-3 rounded-[9px] border border-line-soft px-3 py-2">
                    <Badge tone={tone}>{role}</Badge>
                    <span className="ml-auto h-4 w-16 rounded bg-canvas-deep" />
                  </div>
                ))}
              </div>
            </div>
          </Card>
          <p className="mt-2.5 text-[11.5px] text-faint">
            A preview — counts and role breakdown populate here as soon as a mailbox is connected and
            loaded.
          </p>
        </div>
      </div>
    );
  }

  const busy = phase === "scanning" || phase === "importing";

  return (
    <div className="space-y-4">
      {/* ================================================ the control at top */}
      <Card className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <Field
            label="Load past data from"
            htmlFor="months"
            className="w-full lg:max-w-[260px]"
            hint={months > 0 ? `· since ${formatDate(monthsAgoISO(months))}` : "· whole mailbox"}
          >
            <Select
              id="months"
              value={months}
              onChange={(e) => {
                setMonths(Number(e.target.value));
                resetMailJob();
              }}
              className="h-11 text-[14px]"
            >
              {RANGES.map((r) => (
                <option key={r.months} value={r.months}>
                  {r.label}
                </option>
              ))}
            </Select>
          </Field>

          {/* connected account — read-only, set up in Settings */}
          <div className="flex min-w-0 flex-1 items-center gap-2.5 rounded-[10px] border border-line bg-canvas px-3.5 py-2.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-success-soft text-success">
              <Icon.Check size={13} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-medium text-ink">
                {connection?.account || "Mailbox connected"}
              </span>
              <span className="block truncate text-[11.5px] text-muted">
                {mailbox}
                {from ? ` · from ${from}` : ""}
              </span>
            </span>
            <Link
              href="/dashboard/settings"
              className="ml-auto shrink-0 text-[12px] font-medium text-primary hover:underline"
            >
              Change
            </Link>
          </div>

          <Button variant="accent" size="lg" onClick={load} disabled={busy} className="shrink-0">
            {phase === "scanning" ? "Reading mailbox…" : "Load"}
            {!busy && <Icon.ArrowRight size={16} />}
          </Button>
        </div>

        {/* advanced, folded away so the default view stays one control */}
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="mt-3 flex items-center gap-1.5 text-[12px] font-medium text-muted transition-colors hover:text-ink"
        >
          <Icon.ChevronRight
            size={13}
            className={cn("transition-transform", showAdvanced && "rotate-90")}
          />
          {showAdvanced ? "Hide" : "More"} options
        </button>

        <AnimatePresence initial={false}>
          {showAdvanced && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={transition(DURATION.quick)}
              className="overflow-hidden"
            >
              <div className="mt-3 grid gap-4 border-t border-line-soft pt-4 sm:grid-cols-3">
                <Field label="Mailbox or label" htmlFor="mailbox">
                  {mailboxes?.length ? (
                    <Select
                      id="mailbox"
                      value={mailbox}
                      onChange={(e) => setMailbox(e.target.value)}
                      className="h-10 text-[13px]"
                    >
                      {mailboxes.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <Input
                      id="mailbox"
                      value={mailbox}
                      onChange={(e) => setMailbox(e.target.value)}
                      placeholder="INBOX"
                    />
                  )}
                </Field>
                <Field label="Only mail from" htmlFor="from" hint="· optional">
                  <Input
                    id="from"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    placeholder="careers@yourcompany.com"
                  />
                </Field>
                <Field label="Max résumés" htmlFor="max" hint="· safety cap">
                  <Input
                    id="max"
                    type="number"
                    min="1"
                    max="300"
                    value={maxFiles}
                    onChange={(e) => setMaxFiles(Number(e.target.value))}
                  />
                </Field>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <div className="mt-4 flex items-start gap-2.5 rounded-[10px] border border-danger/25 bg-danger-soft px-3 py-2.5">
            <Icon.Warning size={14} className="mt-0.5 shrink-0 text-danger" />
            <p className="text-[12.5px] leading-relaxed text-danger">{error}</p>
          </div>
        )}
      </Card>

      {/* ===================================================== what's in range */}
      {phase === "idle" && !scan && (
        <Card className="flex flex-col items-center gap-2 py-16 text-center">
          <span className="flex size-11 items-center justify-center rounded-full bg-canvas-deep text-faint">
            <Icon.Inbox size={20} />
          </span>
          <p className="text-[14px] font-medium text-ink">Choose how far back to look, then Load</p>
          <p className="max-w-sm text-[12.5px] leading-relaxed text-muted">
            You&apos;ll see what&apos;s in range before anything is imported or parsed.
          </p>
        </Card>
      )}

      {phase === "scanning" && (
        <Card className="flex flex-col items-center gap-3 py-16 text-center">
          <span className="flex size-11 items-center justify-center rounded-full bg-primary-soft text-primary">
            <Icon.Search size={20} />
          </span>
          <p className="text-[14px] font-medium text-ink">Reading {mailbox}…</p>
          <p className="text-[12.5px] text-muted">Counting what&apos;s there. Nothing downloaded yet.</p>
        </Card>
      )}

      {scan && phase !== "scanning" && (
        <Card className="p-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Messages", scan.messages],
              ["With résumés", scan.withAttachments],
              ["Résumé files", scan.attachments],
              ["Unique senders", scan.uniqueSenders],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[10px] border border-line bg-canvas px-3 py-2.5">
                <div className="text-[22px] font-semibold leading-none tabular-nums text-ink">{value ?? 0}</div>
                <div className="mt-1.5 text-[11.5px] leading-snug text-muted">{label}</div>
              </div>
            ))}
          </div>

          {(scan.oldest || scan.newest) && (
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line-soft pt-3 text-[12px] text-muted">
              <span className="flex items-center gap-1.5">
                <Icon.Clock size={12} className="text-faint" />
                {scan.oldest ? formatDate(scan.oldest.slice(0, 10)) : "—"} →{" "}
                {scan.newest ? formatDate(scan.newest.slice(0, 10)) : "—"}
              </span>
            </div>
          )}

          {scan.capped && (
            <div className="mt-3 flex items-start gap-2 rounded-[10px] border border-warn/25 bg-warn-soft px-3 py-2.5">
              <Icon.Warning size={13} className="mt-0.5 shrink-0 text-warn" />
              <p className="text-[12px] leading-relaxed text-ink-soft">
                That window holds {scan.messages} messages — we read the newest {scan.scanCeiling}. Narrow
                the range or add a sender filter to reach the rest.
              </p>
            </div>
          )}

          {scan.attachments === 0 ? (
            <div className="mt-4 rounded-[10px] border border-dashed border-line-strong bg-canvas-deep/40 px-4 py-3 text-[12.5px] leading-relaxed text-muted">
              No résumé attachments in this window. Try a longer range, a different label, or clear the
              sender filter.
            </div>
          ) : (
            phase !== "done" && (
              <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line-soft pt-4">
                <span className="text-[12.5px] text-muted">
                  Ready to import{" "}
                  <span className="font-semibold text-ink">{Math.min(scan.attachments, maxFiles)}</span>{" "}
                  résumé{Math.min(scan.attachments, maxFiles) === 1 ? "" : "s"}
                  {scan.attachments > maxFiles && (
                    <span className="text-faint"> (capped from {scan.attachments})</span>
                  )}
                </span>
                <Button
                  variant="primary"
                  size="sm"
                  className="ml-auto"
                  onClick={runImport}
                  disabled={busy}
                >
                  {phase === "importing" ? "Importing & parsing…" : "Import & parse"}
                  {phase !== "importing" && <Icon.ArrowRight size={15} />}
                </Button>
              </div>
            )
          )}
        </Card>
      )}

      {phase === "importing" && (
        <Card className="flex flex-col items-center gap-3 py-14 text-center">
          <span className="flex size-11 items-center justify-center rounded-full bg-primary-soft text-primary">
            <Icon.Sparkle size={20} />
          </span>
          <p className="text-[14px] font-medium text-ink">Downloading and parsing</p>
          <p className="max-w-sm text-[12.5px] leading-relaxed text-muted">
            One model call per résumé, so a large batch takes a minute or two. Keeps running even if you
            switch screens — come back any time.
          </p>
        </Card>
      )}

      {/* ============================================================ results */}
      {phase === "done" && result && (
        <>
          <div className="grid grid-cols-3 gap-3">
            {[
              ["Imported", parsed.length, "primary"],
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
                No model provider is connected, so these roles come from keyword matching. Add one in{" "}
                <Link href="/dashboard/settings" className="font-medium text-primary underline underline-offset-2">
                  Settings
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
                          transition={transition(DURATION.quick)}
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
                                    {c.duplicateOf?.length > 0 && (
                                      <Badge tone="warn">+{c.duplicateOf.length} duplicate</Badge>
                                    )}
                                  </div>
                                  {c.headline && (
                                    <div className="truncate text-[12px] text-muted">{c.headline}</div>
                                  )}
                                  {c.sourceFrom && (
                                    <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[11.5px] text-faint">
                                      <Icon.Mail size={11} />
                                      <span className="truncate">{c.sourceFrom}</span>
                                      {c.sourceDate && (
                                        <span className="tabular-nums">
                                          · {formatDate(c.sourceDate.slice(0, 10))}
                                        </span>
                                      )}
                                    </div>
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

          {failed.length > 0 && (
            <Card className="p-4">
              <SectionTitle
                eyebrow="Skipped"
                title="Attachments that couldn't be read"
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

          <Button href="/dashboard/candidates" variant="primary" size="sm">
            <Icon.Users size={14} />
            View in Candidates
          </Button>
        </>
      )}

      <MockNote>
        Only attachments are read — message bodies aren&apos;t stored. Résumés go to whichever model
        provider you selected in Settings. Unique candidates are saved straight to your Candidates
        dashboard and survive a refresh — a résumé already parsed before reuses the cached result.
      </MockNote>
    </div>
  );
}

function monthsAgoISO(months) {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString().slice(0, 10);
}
