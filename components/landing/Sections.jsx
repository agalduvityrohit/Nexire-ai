"use client";

// Supporting landing sections: the interview explainer, project matching,
// where candidates come from, and the before/after contrast.

import { useState } from "react";
import { motion } from "framer-motion";
import { Reveal, Stagger, StaggerItem } from "@/components/public/Reveal";
import { Avatar, Badge, Pill } from "@/components/ui/Primitives";
import { Icon } from "@/components/ui/Icons";
import { marketing } from "@/lib/mock-data";
import { DURATION, EASE, HOVER_CARD_BORDER, HOVER_LIFT, RISE, STAGGER, transition, VIEWPORT } from "@/lib/motion";
import { cn } from "@/lib/utils";

/* ------------------------------------------------- how the interview works */

const POINT_ICONS = {
  waves: Icon.Waves,
  sparkle: Icon.Sparkle,
  clock: Icon.Clock,
  shield: Icon.Shield,
  users: Icon.Users,
};

export function InterviewSection() {
  const { interviewer } = marketing;
  return (
    <section id="interview" className="scroll-mt-24 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal className="max-w-2xl">
          <Badge tone="violet">Meet {interviewer.name}</Badge>
          <h2 className="mt-4 text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] text-ink sm:text-[38px]">
            Your first round is a conversation — with someone you can actually see.
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-ink-soft">
            {interviewer.name} appears on screen as a real presence, not a recording prompt — he responds
            to what candidates say, waits while they think, and keeps the conversation feeling natural.
            Always clearly AI, never passed off as human.
          </p>
        </Reveal>

        <Stagger className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {marketing.interviewPoints.map((c) => {
            const Glyph = POINT_ICONS[c.icon] || Icon.Sparkle;
            return (
              <StaggerItem key={c.title}>
                <div className={cn("h-full rounded-card border border-line bg-surface p-5 shadow-card", HOVER_CARD_BORDER)}>
                  <span className="flex size-10 items-center justify-center rounded-[11px] bg-primary-soft text-primary">
                    <Glyph size={19} />
                  </span>
                  <h3 className="mt-4 text-[14.5px] font-semibold tracking-[-0.015em] text-ink">{c.title}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{c.body}</p>
                </div>
              </StaggerItem>
            );
          })}
        </Stagger>

        <Reveal delay={0.1} className="mt-6">
          <div className="overflow-hidden rounded-panel border border-line bg-surface shadow-card">
            <div className="grid grid-cols-2 divide-x divide-line">
              <div className="bg-canvas-deep/50 px-4 py-3 sm:px-6">
                <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-faint">
                  A one-way video screener
                </span>
              </div>
              <div className="bg-primary-soft/50 px-4 py-3 sm:px-6">
                <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-primary">
                  Nexire
                </span>
              </div>
            </div>
            <div className="divide-y divide-line-soft">
              {marketing.interviewComparison.map((row) => (
                <div key={row.typical} className="grid grid-cols-2 divide-x divide-line-soft">
                  <div className="flex items-start gap-2.5 px-4 py-3.5 sm:px-6">
                    <Icon.X size={13} className="mt-0.5 shrink-0 text-faint" />
                    <span className="text-[12.5px] leading-relaxed text-muted">{row.typical}</span>
                  </div>
                  <div className="flex items-start gap-2.5 px-4 py-3.5 sm:px-6">
                    <Icon.Check size={13} className="mt-0.5 shrink-0 text-primary" />
                    <span className="text-[12.5px] leading-relaxed text-ink-soft">{row.nexire}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ outreach flow */

const OUTREACH_ICONS = {
  star: Icon.Star,
  mail: Icon.Mail,
  users: Icon.Users,
  sparkle: Icon.Sparkle,
  check: Icon.Check,
  clock: Icon.Clock,
};

export function OutreachSection() {
  return (
    <section id="outreach" className="scroll-mt-24 border-t border-line pb-24 pt-24 sm:pb-32 sm:pt-32">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal className="max-w-2xl">
          <Badge tone="accent">Outreach</Badge>
          <h2 className="mt-4 text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] text-ink sm:text-[38px]">
            Nexire shortlists. We do the chasing.
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-ink-soft">
            The gap between &ldquo;good CV&rdquo; and &ldquo;booked interview&rdquo; is where most pipelines
            leak. Nexire closes it without you writing a single follow-up.
          </p>
        </Reveal>

        <div className="relative mt-12">
          <div
            aria-hidden
            className="absolute left-[19px] top-2 hidden h-[calc(100%-2rem)] w-px bg-line md:block lg:left-0 lg:top-[19px] lg:h-px lg:w-full"
          />
          <ol className="grid gap-6 md:gap-5 lg:grid-cols-6">
            {marketing.outreachSteps.map((step, i) => {
              const Glyph = OUTREACH_ICONS[step.icon] || Icon.Sparkle;
              return (
                <motion.li
                  key={step.title}
                  initial={{ opacity: 0, y: RISE }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={VIEWPORT}
                  transition={transition(DURATION.base, i * STAGGER)}
                  className="relative flex gap-4 md:gap-5 lg:block"
                >
                  <div className="relative shrink-0">
                    <span className="relative z-10 flex size-10 items-center justify-center rounded-full border border-line bg-surface text-primary shadow-xs">
                      <Glyph size={17} />
                    </span>
                    <span className="absolute -right-1 -top-1 z-20 flex size-5 items-center justify-center rounded-full bg-accent font-mono text-[9.5px] font-semibold text-white">
                      {i + 1}
                    </span>
                  </div>

                  <div className="min-w-0 pb-2 lg:mt-4 lg:pb-0 lg:pr-4">
                    <h3 className="text-[14.5px] font-semibold tracking-[-0.015em] text-ink">{step.title}</h3>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{step.body}</p>
                    {step.badge && (
                      <div className="mt-2">
                        <Badge tone="warn">{step.badge}</Badge>
                      </div>
                    )}
                  </div>

                  {i < marketing.outreachSteps.length - 1 && (
                    <span aria-hidden className="absolute -right-2 top-[13px] hidden text-line-strong lg:block">
                      <Icon.ChevronRight size={14} />
                    </span>
                  )}
                </motion.li>
              );
            })}
          </ol>
        </div>

        <Reveal delay={0.14} className="mt-8">
          <div className="flex items-start gap-2.5 rounded-card border border-line bg-surface px-5 py-4 shadow-card">
            <Icon.Shield size={15} className="mt-0.5 shrink-0 text-primary/70" />
            <p className="text-[12.5px] leading-relaxed text-muted">
              Candidates always hear back with a clear outcome, and final rounds get scheduled without
              anyone chasing calendars. They can opt out of contact anytime.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ----------------------------------------------------- project matching */

export function MatchExplainer() {
  const [active, setActive] = useState(0);
  const ex = marketing.matchExamples[active];

  return (
    <section id="matching" className="scroll-mt-24 border-y border-line bg-canvas-deep/40 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal className="max-w-2xl">
          <Badge tone="primary">Project matching</Badge>
          <h2 className="mt-4 text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] text-ink sm:text-[38px]">
            We check what people have actually built.
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-ink-soft">
            A skills row on a résumé costs nothing to write. Three years of commits on the same problem is a
            different kind of evidence.
          </p>
        </Reveal>

        <Reveal delay={0.06} className="mt-8">
          <div className="flex flex-wrap gap-2">
            {marketing.matchExamples.map((m, i) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setActive(i)}
                className={cn(
                  "flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors",
                  active === i
                    ? "border-primary/25 bg-primary-soft text-primary"
                    : "border-line bg-surface text-muted hover:border-line-strong hover:text-ink"
                )}
              >
                <span className="size-1.5 rounded-full bg-current opacity-60" />
                {m.candidate}
              </button>
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.1} className="mt-5">
          {/* Keyed remount, not AnimatePresence: switching examples must never
              wait on an exit animation to finish. */}
          <motion.div
            key={ex.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="grid items-stretch gap-4 lg:grid-cols-[1fr_auto_1fr]"
          >
              <SideCard side="built" data={ex.built} avatar={{ name: ex.candidate, initials: ex.initials }} />

              <div className="flex flex-row items-center justify-center gap-3 lg:flex-col">
                <span aria-hidden className="h-px w-10 bg-line-strong lg:h-10 lg:w-px" />
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={transition(DURATION.quick, 0.12)}
                  className="flex size-11 shrink-0 items-center justify-center rounded-full border border-primary/25 bg-primary text-white shadow-lift"
                >
                  <Icon.Link size={18} />
                </motion.span>
                <span aria-hidden className="h-px w-10 bg-line-strong lg:h-10 lg:w-px" />
              </div>

            <SideCard side="need" data={ex.need} />
          </motion.div>
        </Reveal>

        <Reveal delay={0.14} className="mt-4">
          <div className="flex flex-col gap-2 rounded-card border border-primary/20 bg-primary-soft/50 p-5 sm:flex-row sm:items-center">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-white">
              <Icon.Check size={14} />
            </span>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-primary">
                Why they matched
              </div>
              <p className="mt-0.5 text-[14.5px] font-medium leading-relaxed text-ink">{ex.reason}</p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function SideCard({ side, data, avatar }) {
  const isBuilt = side === "built";
  return (
    <div
      className={cn(
        "flex flex-col rounded-card border bg-surface p-5 shadow-card",
        isBuilt ? "border-violet/25" : "border-line"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span
          className={cn(
            "text-[10.5px] font-semibold uppercase tracking-[0.09em]",
            isBuilt ? "text-violet" : "text-muted"
          )}
        >
          {data.label}
        </span>
        {avatar ? (
          <Avatar name={avatar.name} initials={avatar.initials} size="xs" />
        ) : (
          <span className="flex size-6 items-center justify-center rounded-md bg-canvas-deep text-faint">
            <Icon.Briefcase size={12} />
          </span>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span
          className={cn(
            "flex size-7 items-center justify-center rounded-md",
            isBuilt ? "bg-violet-soft text-violet" : "bg-canvas-deep text-muted"
          )}
        >
          {isBuilt ? <Icon.Doc size={14} /> : <Icon.Star size={14} />}
        </span>
        <span className="font-mono text-[14px] font-medium tracking-[-0.01em] text-ink">{data.title}</span>
      </div>

      <div className="mt-1.5 text-[11.5px] text-faint">{data.meta}</div>
      <p className="mt-3 flex-1 text-[13.5px] leading-relaxed text-ink-soft">{data.detail}</p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {data.tech.map((t) => (
          <Pill key={t}>{t}</Pill>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------- where they come from */

export function SourcesSection() {
  return (
    <section id="sourcing" className="scroll-mt-24 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <Reveal>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="info">Open-market search</Badge>
              <Badge tone="warn">Coming soon</Badge>
            </div>
            <p className="mt-3 rounded-[10px] border border-dashed border-line-strong bg-canvas-deep/50 px-3 py-2 text-[12.5px] leading-relaxed text-muted">
              This section describes planned functionality. Open-market and GitHub sourcing are not live yet —
              today, candidates come in through résumé intake (email, upload and job boards).
            </p>
            <h2 className="mt-4 text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] text-ink sm:text-[38px]">
              Not just the people who apply to you.
            </h2>
            <p className="mt-4 text-[16px] leading-relaxed text-ink-soft">
              Most hiring tools rank your inbox. Nexire also reads public developer profiles and its own
              opted-in network, then puts everyone in one ranked pipeline.
            </p>

            <ul className="mt-6 space-y-3">
              {[
                "Only public information — nothing behind a login, nothing from a data broker.",
                "Anyone surfaced this way is told how they were found and what was looked at.",
                "One click removes someone from consideration and from future searches.",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2.5 text-[13.5px] leading-relaxed text-ink-soft">
                  <Icon.Shield size={15} className="mt-0.5 shrink-0 text-primary" />
                  {t}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="rounded-panel border border-line bg-surface p-5 shadow-card sm:p-6">
              <div className="grid items-center gap-4 sm:grid-cols-[1fr_auto_auto]">
                <div className="space-y-2.5">
                  {marketing.sources.map((s, i) => (
                    <motion.div
                      key={s.key}
                      initial={{ opacity: 0, x: -12 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={VIEWPORT}
                      transition={{ delay: i * 0.1, duration: 0.45, ease: EASE }}
                      className="rounded-[10px] border border-line bg-canvas p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2 text-[12.5px] font-medium text-ink">
                          <span
                            className={cn(
                              "size-1.5 rounded-full",
                              s.tone === "violet" ? "bg-violet" : s.tone === "info" ? "bg-info" : "bg-line-strong"
                            )}
                          />
                          {s.title}
                        </span>
                        <span className="shrink-0 font-mono text-[10.5px] tabular-nums text-faint">
                          {s.count}
                        </span>
                      </div>
                      <p className="mt-1 text-[11.5px] leading-relaxed text-muted">{s.detail}</p>
                    </motion.div>
                  ))}
                </div>

                <div className="hidden h-full items-center sm:flex">
                  <svg width="44" height="150" viewBox="0 0 44 150" aria-hidden className="text-line-strong">
                    {[26, 75, 124].map((y) => (
                      <path
                        key={y}
                        d={`M0 ${y} C 22 ${y}, 22 75, 44 75`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                    ))}
                    <circle cx="44" cy="75" r="3" fill="var(--color-primary)" />
                  </svg>
                </div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.94 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={VIEWPORT}
                  transition={{ delay: 0.35, duration: 0.5, ease: EASE }}
                  className="rounded-card border border-primary/25 bg-primary-deep p-4 text-white sm:w-[176px]"
                >
                  <div className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-white/50">
                    Result
                  </div>
                  <div className="mt-1.5 text-[15px] font-semibold tracking-[-0.02em]">One ranked pipeline</div>
                  <p className="mt-2 text-[11.5px] leading-relaxed text-white/60">
                    Deduplicated, scored against your rubric, ordered by fit — regardless of where the person
                    came from.
                  </p>
                  <div className="mt-3 border-t border-white/12 pt-3">
                    <div className="text-[22px] font-semibold leading-none tabular-nums">18,162</div>
                    <div className="mt-1 text-[11px] text-white/50">profiles considered</div>
                  </div>
                </motion.div>
              </div>

              <p className="mt-5 border-t border-line pt-4 text-[11.5px] leading-relaxed text-faint">
                Numbers are illustrative. Coverage is strongest for engineering and thinner where people
                don&apos;t publish work publicly.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

