"use client";

// Landing-page explainer sections: the problem, the solution, the six-step
// flow, the feature grid, and the trust strip.
//
// Content only — every string lives in lib/mock-data.js. No functional logic
// here; these sections explain the product rather than demonstrate it.

import { Reveal, Stagger, StaggerItem } from "@/components/public/Reveal";
import { Badge, Card } from "@/components/ui/Primitives";
import { Icon } from "@/components/ui/Icons";
import { marketing } from "@/lib/mock-data";
import { HOVER_CARD_BORDER } from "@/lib/motion";
import { cn } from "@/lib/utils";

// One icon vocabulary for every explainer section.
const GLYPHS = {
  inbox: Icon.Inbox,
  doc: Icon.Doc,
  clock: Icon.Clock,
  users: Icon.Users,
  briefcase: Icon.Briefcase,
  search: Icon.Search,
  filter: Icon.Filter,
  mic: Icon.Mic,
  sparkle: Icon.Sparkle,
  link: Icon.Link,
  waves: Icon.Waves,
  shield: Icon.Shield,
  grid: Icon.Grid,
  trend: Icon.Trend,
};

function glyph(name) {
  return GLYPHS[name] || Icon.Sparkle;
}

/* ------------------------------------------------------------------ problem */

export function ProblemSection() {
  const { problem } = marketing;
  return (
    <section id="problem" className="scroll-mt-24 border-t border-line py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal className="max-w-2xl">
          <Badge tone="danger">The problem</Badge>
          <h2 className="mt-4 text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] text-ink sm:text-[38px]">
            {problem.headline}
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-ink-soft">{problem.intro}</p>
        </Reveal>

        <Stagger className="mt-10 grid gap-3 sm:grid-cols-2">
          {problem.points.map((p) => {
            const Glyph = glyph(p.icon);
            return (
              <StaggerItem key={p.title}>
                <div className="flex h-full gap-4 rounded-card border border-line bg-surface p-5 shadow-card">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-[11px] bg-danger-soft text-danger">
                    <Glyph size={19} />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-[14.5px] font-semibold tracking-[-0.015em] text-ink">{p.title}</h3>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{p.body}</p>
                  </div>
                </div>
              </StaggerItem>
            );
          })}
        </Stagger>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- solution */

export function SolutionSection() {
  const { solution } = marketing;
  return (
    <section id="solution" className="px-5 pb-24 sm:px-8 sm:pb-32">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <div className="relative overflow-hidden rounded-panel bg-primary-deep px-6 py-14 text-white sm:px-12 sm:py-16">
            <div aria-hidden className="absolute inset-0 grid-lines opacity-30 mix-blend-overlay" />
            <div
              aria-hidden
              className="absolute -right-24 -top-24 size-72 rounded-full bg-[radial-gradient(closest-side,rgba(221,99,56,0.35),transparent)]"
            />
            <div className="relative max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11.5px] font-medium text-white/70">
                <Icon.Sparkle size={13} />
                The solution
              </span>
              <h2 className="mt-5 text-[28px] font-semibold leading-[1.12] tracking-[-0.03em] sm:text-[38px]">
                {solution.headline}
              </h2>
              <p className="mt-5 text-[15.5px] leading-relaxed text-white/65 sm:text-[16.5px]">
                {solution.body}
              </p>

              <div className="mt-8 flex flex-wrap gap-2">
                {["Source", "Verify", "Screen", "You decide"].map((step, i) => (
                  <span key={step} className="flex items-center gap-2">
                    <span className="rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-[12.5px] font-medium">
                      {step}
                    </span>
                    {i < 3 && <Icon.ArrowRight size={13} className="text-white/30" />}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- how it works */

export function HowItWorksSection() {
  const steps = marketing.howItWorks;
  return (
    <section id="how-it-works" className="scroll-mt-24 border-t border-line bg-canvas-deep/40 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal className="max-w-2xl">
          <Badge tone="primary">How it works</Badge>
          <h2 className="mt-4 text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] text-ink sm:text-[38px]">
            Six steps from a job description to a decision.
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-ink-soft">
            You do the first and the last. Nexire handles the four in between.
          </p>
        </Reveal>

        <ol className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map((step, i) => {
            const Glyph = glyph(step.icon);
            const isFirst = i === 0;
            const isLast = i === steps.length - 1;
            return (
              <StepItem key={step.title} index={i}>
                <div
                  className={cn(
                    "relative flex h-full flex-col rounded-card border bg-surface p-5 shadow-card",
                    HOVER_CARD_BORDER,
                    isFirst || isLast ? "border-primary/30" : "border-line"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="relative flex size-10 items-center justify-center rounded-full border border-line bg-canvas text-primary">
                      <Glyph size={18} />
                      <span className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-primary font-mono text-[9.5px] font-semibold text-white">
                        {i + 1}
                      </span>
                    </span>
                    {(isFirst || isLast) && (
                      <Badge tone="primary">{isFirst ? "You" : "You decide"}</Badge>
                    )}
                    {step.comingSoon && <Badge tone="warn">Coming soon</Badge>}
                  </div>

                  <h3 className="mt-4 text-[15px] font-semibold tracking-[-0.015em] text-ink">{step.title}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{step.body}</p>
                  {step.note && (
                    <p className="mt-2 text-[12px] leading-relaxed text-faint">{step.note}</p>
                  )}
                </div>
              </StepItem>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

// Small wrapper so the <ol> stays semantic while each item still animates in.
function StepItem({ children, index }) {
  return (
    <li>
      <Reveal delay={index * 0.06} y={16}>
        {children}
      </Reveal>
    </li>
  );
}

/* ------------------------------------------------------------ core features */

export function CoreFeaturesSection() {
  return (
    <section id="features" className="scroll-mt-24 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal className="max-w-2xl">
          <Badge tone="accent">What&apos;s in it</Badge>
          <h2 className="mt-4 text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] text-ink sm:text-[38px]">
            Every core feature, in one place.
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-ink-soft">
            Eight things Nexire does. Anything marked coming soon is not live yet.
          </p>
        </Reveal>

        <Stagger className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {marketing.coreFeatures.map((f) => {
            const Glyph = glyph(f.icon);
            return (
              <StaggerItem key={f.title}>
                <div
                  className={cn(
                    "group flex h-full flex-col rounded-card border bg-surface p-5 shadow-card",
                    HOVER_CARD_BORDER,
                    f.comingSoon ? "border-dashed border-line-strong" : "border-line"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={cn(
                        "flex size-10 items-center justify-center rounded-[11px] transition-colors",
                        f.comingSoon
                          ? "bg-canvas-deep text-faint"
                          : "bg-primary-soft text-primary group-hover:bg-primary group-hover:text-white"
                      )}
                    >
                      <Glyph size={19} />
                    </span>
                    {f.comingSoon && <Badge tone="warn">Coming soon</Badge>}
                  </div>

                  <h3
                    className={cn(
                      "mt-4 text-[14.5px] font-semibold tracking-[-0.015em]",
                      f.comingSoon ? "text-ink-soft" : "text-ink"
                    )}
                  >
                    {f.title}
                  </h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{f.body}</p>
                </div>
              </StaggerItem>
            );
          })}
        </Stagger>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- trust strip */

export function TrustStrip() {
  return (
    <section className="border-y border-line bg-canvas-deep/40">
      <div className="mx-auto max-w-6xl px-5 py-7 sm:px-8">
        <Reveal>
          <ul className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
            {marketing.trustPoints.map((t) => {
              const Glyph = glyph(t.icon);
              return (
                <li key={t.label} className="flex items-center gap-2.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface text-primary ring-1 ring-line">
                    <Glyph size={15} />
                  </span>
                  <span className="text-[13.5px] font-medium text-ink-soft">{t.label}</span>
                </li>
              );
            })}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
