"use client";

// Interactive product tour. Auto-advances until the visitor takes over, then
// stays where they put it. Every panel is a hand-built static mock.

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Avatar, Badge, Meter, Pill } from "@/components/ui/Primitives";
import { Icon } from "@/components/ui/Icons";
import { marketing } from "@/lib/mock-data";
import { DURATION, EASE, RISE, RISE_REPORT, STAGGER, STAGGER_PIPELINE, STAGGER_REPORT, transition } from "@/lib/motion";
import { cn } from "@/lib/utils";

// Click-driven on purpose. This used to auto-advance on a 7s timer, but that
// was a second continuous loop competing with the hero waveform for attention.
// The signature moment stays in the hero; this waits for the visitor.
export function ProductTour() {
  const [active, setActive] = useState(0);
  const reduced = useReducedMotion();

  const steps = marketing.tour;
  const step = steps[active];

  function pick(i) {
    setActive(i);
  }

  return (
    <div className="overflow-hidden rounded-panel border border-line bg-surface shadow-lift">
      {/* ------------------------------------------------------------- tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-line bg-canvas-deep/50 p-2 no-scrollbar">
        {steps.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => pick(i)}
            className={cn(
              "relative shrink-0 rounded-[9px] px-3.5 py-2 text-[13px] font-medium transition-colors",
              active === i ? "text-ink" : "text-muted hover:text-ink-soft"
            )}
          >
            {active === i && (
              <motion.span
                layoutId="tour-tab"
                className="absolute inset-0 rounded-[9px] bg-surface shadow-xs ring-1 ring-line"
                transition={transition(DURATION.quick)}
              />
            )}
            <span className="relative flex items-center gap-2">
              <span
                className={cn(
                  "flex size-4 items-center justify-center rounded-full text-[9px] font-semibold",
                  active === i ? "bg-primary text-white" : "bg-canvas-deep text-faint"
                )}
              >
                {i + 1}
              </span>
              {s.tab}
            </span>
          </button>
        ))}
      </div>

      {/* ------------------------------------------------------------- body */}
      <div className="grid gap-0 lg:grid-cols-[0.85fr_1.15fr]">
        <motion.div
          key={`copy-${step.id}`}
          initial={{ opacity: 0, y: reduced ? 0 : 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={transition(DURATION.quick)}
          className="border-b border-line p-6 lg:border-b-0 lg:border-r sm:p-7"
        >
          <div className="text-[11px] font-semibold uppercase tracking-[0.09em] text-primary">
            {step.eyebrow}
          </div>
          <h3 className="mt-2 text-[19px] font-semibold leading-[1.25] tracking-[-0.02em] text-ink sm:text-[21px]">
            {step.title}
          </h3>
          <p className="mt-3 text-[13.5px] leading-relaxed text-ink-soft">{step.body}</p>

          <ul className="mt-5 space-y-2.5 border-t border-line-soft pt-5">
            {step.points.map((p) => (
              <li key={p} className="flex items-start gap-2.5 text-[12.5px] leading-relaxed text-muted">
                <Icon.Check size={14} className="mt-0.5 shrink-0 text-primary" />
                {p}
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          key={`vis-${step.id}`}
          initial={{ opacity: 0, y: reduced ? 0 : 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={transition(DURATION.quick, 0.04)}
          className="min-h-[340px] bg-canvas-deep/30 p-5 sm:p-6"
        >
          <TourVisual id={step.id} />
        </motion.div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ panels */

function TourVisual({ id }) {
  if (id === "post") return <PostPanel />;
  if (id === "source") return <SourcePanel />;
  if (id === "verify") return <VerifyPanel />;
  if (id === "interview") return <InterviewPanel />;
  if (id === "report") return <ReportPanel />;
  return <DecidePanel />;
}

function Frame({ title, chip, children }) {
  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
      <div className="flex items-center gap-2 border-b border-line bg-canvas-deep/50 px-3.5 py-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">{title}</span>
        {chip && <span className="ml-auto">{chip}</span>}
      </div>
      <div className="p-3.5">{children}</div>
    </div>
  );
}

function PostPanel() {
  const rubric = [
    { skill: "Distributed systems", weight: 30 },
    { skill: "Go", weight: 25 },
    { skill: "PostgreSQL", weight: 25 },
    { skill: "Kubernetes", weight: 12 },
    { skill: "Mentoring", weight: 8 },
  ];
  return (
    <div className="space-y-3">
      <Frame title="Your description">
        <div className="rounded-[8px] border border-line bg-canvas px-3 py-2 text-[12.5px] font-medium text-ink">
          Senior Backend Engineer
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-muted">
          &ldquo;Own the payments ledger. Design the services, not just the tickets. Five years plus in Go,
          deep Postgres, comfortable on Kubernetes.&rdquo;
        </p>
      </Frame>

      <div className="flex items-center justify-center gap-2 text-[11px] font-medium text-primary">
        <span className="h-px w-8 bg-line-strong" />
        <Icon.Sparkle size={13} />
        generated
        <span className="h-px w-8 bg-line-strong" />
      </div>

      <Frame title="Scorecard" chip={<Badge tone="primary">Editable</Badge>}>
        <ul className="space-y-2.5">
          {rubric.map((r, i) => (
            <motion.li
              key={r.skill}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.07, duration: 0.35 }}
              className="flex items-center gap-3"
            >
              <span className="w-32 shrink-0 truncate text-[12px] text-ink-soft">{r.skill}</span>
              <span className="flex-1">
                <Meter value={r.weight * 3} />
              </span>
              <span className="w-8 text-right text-[11.5px] font-semibold tabular-nums text-muted">
                {r.weight}%
              </span>
            </motion.li>
          ))}
        </ul>
      </Frame>
    </div>
  );
}

// Three source points (inbox / open-market / GitHub) — each drawn as a
// curved guide line into one pipeline node, with a dot tweened straight
// from source to node (a simple two-point animation, the most reliable
// case for Framer Motion to drive raw SVG attributes) timed to land right
// as the curve would arrive. Plays once when the panel appears, never loops.
const NODE = { x: 120, y: 58 };
const PIPELINE_PATHS = [
  { d: "M30,8 C30,40 80,50 120,58", from: { x: 30, y: 8 } },
  { d: "M120,8 C120,30 120,45 120,58", from: { x: 120, y: 8 } },
  { d: "M210,8 C210,40 160,50 120,58", from: { x: 210, y: 8 } },
];

function PipelineDot({ from, delay }) {
  return (
    <motion.circle
      r="3"
      fill="var(--color-accent)"
      initial={{ cx: from.x, cy: from.y, opacity: 0 }}
      animate={{ cx: NODE.x, cy: NODE.y, opacity: [0, 1, 1, 0] }}
      transition={{
        cx: { duration: 1.1, delay, ease: EASE },
        cy: { duration: 1.1, delay, ease: EASE },
        opacity: { duration: 1.1, delay, times: [0, 0.12, 0.85, 1] },
      }}
    />
  );
}

function PipelineFlow() {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={transition(DURATION.quick)}
      className="relative mx-auto mb-2 h-[62px] w-full max-w-[260px]"
    >
      <svg viewBox="0 0 240 66" className="absolute inset-0 h-full w-full" aria-hidden>
        {PIPELINE_PATHS.map((p, i) => (
          <path key={i} d={p.d} fill="none" stroke="var(--color-line)" strokeWidth="1.5" />
        ))}
        <circle cx={NODE.x} cy={NODE.y} r="4.5" fill="var(--color-primary)" />
        {!reduced &&
          PIPELINE_PATHS.map((p, i) => (
            <PipelineDot key={i} from={p.from} delay={i * STAGGER_PIPELINE} />
          ))}
      </svg>
    </motion.div>
  );
}

function SourcePanel() {
  const methods = [
    {
      key: "inventory",
      icon: Icon.Inbox,
      label: "Your Inventory",
      stats: [
        ["Inbox", "62"],
        ["Careers page", "41"],
        ["Job boards", "25"],
      ],
    },
    {
      key: "market",
      icon: Icon.Search,
      label: "Open-Market Search",
      comingSoon: true,
      body: "Actively searches LinkedIn, Indeed, and similar platforms for candidates who haven't applied.",
    },
    {
      key: "github",
      icon: Icon.Github,
      label: "GitHub Sourcing",
      comingSoon: true,
      body: "Finds technical candidates by what they've actually built — real commits, real projects.",
    },
  ];

  return (
    <div>
      <PipelineFlow />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {methods.map((m, i) => {
          const Glyph = m.icon;
          return (
            <motion.div
              key={m.key}
              initial={{ opacity: 0, y: RISE }}
              animate={{ opacity: 1, y: 0 }}
              transition={transition(DURATION.base, i * STAGGER)}
              className="rounded-[10px] border border-line bg-surface p-3 shadow-xs"
            >
            <div className="flex items-center gap-1.5">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-[7px] bg-primary-soft text-primary">
                <Glyph size={13} />
              </span>
              <span className="min-w-0 flex-1 truncate text-[11.5px] font-semibold text-ink">{m.label}</span>
            </div>
            {m.comingSoon && (
              <div className="mt-2">
                <Badge tone="warn">Coming soon</Badge>
              </div>
            )}
            {m.stats ? (
              <div className="mt-2.5 space-y-1.5 border-t border-line-soft pt-2.5">
                {m.stats.map(([k, v]) => (
                  <div key={k} className="flex items-baseline justify-between">
                    <span className="text-[10.5px] text-muted">{k}</span>
                    <span className="text-[12px] font-semibold tabular-nums text-ink">{v}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2.5 text-[11px] leading-relaxed text-ink-soft">{m.body}</p>
            )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function VerifyPanel() {
  return (
    <div className="space-y-3">
      <Frame
        title="Parsed profile"
        chip={
          <span className="flex items-center gap-1.5 text-[11px] text-muted">
            <Icon.Doc size={12} />
            ananya-menon.pdf
          </span>
        }
      >
        <div className="flex items-center gap-2.5">
          <Avatar name="Ananya Menon" initials="AM" size="sm" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12.5px] font-medium text-ink">Ananya Menon</div>
            <div className="truncate text-[11px] text-muted">Staff Engineer, Payments · Razorpay</div>
          </div>
          <span className="rounded-md bg-success-soft px-1.5 py-0.5 text-[11px] font-semibold text-success">
            94
          </span>
        </div>

        <div className="mt-3 space-y-2 border-t border-line-soft pt-3">
          {[
            ["Skills", "Go · PostgreSQL · gRPC · Kafka +3"],
            ["Experience", "7 years · 3 roles"],
            ["Education", "B.Tech CS, NIT Trichy"],
            ["Public work", "ledgerkit · 2.4k stars"],
          ].map(([k, v], i) => (
            <motion.div
              key={k}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 + i * 0.08 }}
              className="flex items-baseline gap-3"
            >
              <span className="w-20 shrink-0 text-[10.5px] font-medium uppercase tracking-[0.06em] text-faint">
                {k}
              </span>
              <span className="min-w-0 flex-1 truncate text-[12px] text-ink-soft">{v}</span>
            </motion.div>
          ))}
        </div>
      </Frame>

      <div className="flex items-start gap-2 rounded-[10px] border border-primary/18 bg-primary-soft/50 px-3 py-2.5">
        <Icon.Sparkle size={13} className="mt-0.5 shrink-0 text-primary" />
        <p className="text-[11.5px] leading-relaxed text-ink-soft">
          Her résumé said &ldquo;Kafka&rdquo;. Her commit history showed eighteen months of consumer tuning —
          so the score went up.
        </p>
      </div>
    </div>
  );
}

// Stylised stand-in for the rendered avatar — no stock photography.
function ArjunFace({ size = 44 }) {
  return (
    // Static on purpose — the only looping animation on the page is the hero
    // waveform. A second pulse here would compete with it.
    <span
      className="relative flex shrink-0 items-center justify-center rounded-full ring-2 ring-white/20"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 48 48" width={size} height={size} className="relative rounded-full" aria-hidden>
        <defs>
          <clipPath id="arjun-clip">
            <circle cx="24" cy="24" r="24" />
          </clipPath>
          <linearGradient id="arjun-bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#c3ddd8" />
            <stop offset="100%" stopColor="#8fbdb5" />
          </linearGradient>
        </defs>
        <g clipPath="url(#arjun-clip)">
          <rect width="48" height="48" fill="url(#arjun-bg)" />
          {/* shoulders */}
          <path d="M6 48c0-9.8 8.3-14.6 18-14.6s18 4.8 18 14.6z" fill="#22303a" opacity="0.9" />
          {/* face */}
          <ellipse cx="24" cy="25" rx="9" ry="10.6" fill="#c48f6a" />
          {/* short hair, cropped */}
          <path d="M14.6 20.5c0-6.6 4.2-11 9.4-11s9.4 4.4 9.4 11c0-1.6-.5-2.8-1.6-3.4.2-1.4-.3-2.4-1.6-2.6-1-1.6-3-2.4-6.2-2.4s-5.2.8-6.2 2.4c-1.3.2-1.8 1.2-1.6 2.6-1.1.6-1.6 1.8-1.6 3.4z" fill="#1f1a17" />
          {/* hairline */}
          <path d="M16 21.2c1.6-1.2 4.4-1.8 8-1.8s6.4.6 8 1.8c-.3-3.3-3.4-5.6-8-5.6s-7.7 2.3-8 5.6z" fill="#1f1a17" />
          {/* eyes */}
          <ellipse cx="20.4" cy="24.4" rx="1.4" ry="1.6" fill="#241f1c" />
          <ellipse cx="27.6" cy="24.4" rx="1.4" ry="1.6" fill="#241f1c" />
          {/* brows */}
          <path d="M18.4 21.6c1.1-.6 2.4-.6 3.4 0" stroke="#1f1a17" strokeWidth="0.9" strokeLinecap="round" fill="none" />
          <path d="M26.2 21.6c1-.6 2.3-.6 3.4 0" stroke="#1f1a17" strokeWidth="0.9" strokeLinecap="round" fill="none" />
          {/* light stubble shading */}
          <path
            d="M17.5 29.5c1.6 1.4 3.9 2.1 6.5 2.1s4.9-.7 6.5-2.1"
            stroke="#8a5a3d"
            strokeWidth="0.9"
            strokeLinecap="round"
            fill="none"
            opacity="0.55"
          />
          {/* mouth — mid-sentence */}
          <ellipse cx="24" cy="30.6" rx="2.1" ry="1.2" fill="#9c6a4c" />
        </g>
      </svg>
    </span>
  );
}

function InterviewPanel() {
  const turns = [
    { who: "ai", text: "How would you stop a payout being sent twice if the client retries?" },
    {
      who: "them",
      text: "Idempotency key at the edge — but the real guarantee is a unique constraint on the ledger insert.",
    },
    {
      who: "ai",
      text: "You said the edge isn't the real guarantee. What breaks if you rely on it alone?",
      note: "Arjun's follow-up, written from her answer",
    },
  ];

  return (
    <div className="space-y-3">
      <Frame
        title="Live interview"
        chip={
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-danger">
            <span className="size-1.5 rounded-full bg-danger" />
            12:38
          </span>
        }
      >
        {/* the on-screen interviewer */}
        <div className="relative mb-3 overflow-hidden rounded-[10px] border border-line bg-primary-deep">
          <div aria-hidden className="absolute inset-0 grid-lines opacity-25 mix-blend-overlay" />
          <div className="relative flex items-center gap-3 p-3">
            <ArjunFace />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[12.5px] font-semibold text-white">Arjun</span>
                <span className="rounded-full bg-white/12 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/70">
                  AI interviewer
                </span>
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[10.5px] text-white/50">
                <span className="size-1.5 rounded-full bg-success" />
                Speaking · lifelike avatar
              </div>
            </div>
            <span className="shrink-0 rounded-md bg-white/10 px-2 py-1 text-[9.5px] text-white/60">
              Your camera off
            </span>
          </div>
        </div>

        <div className="space-y-2.5">
          {turns.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.25, duration: 0.4, ease: EASE }}
            >
              {t.note && (
                <div className="mb-1.5 flex items-center gap-1.5 text-[10.5px] font-medium text-accent">
                  <Icon.Sparkle size={11} />
                  {t.note}
                </div>
              )}
              <div
                className={cn(
                  "flex gap-2.5 rounded-[10px] p-2.5",
                  t.who === "ai" ? "bg-canvas-deep" : "bg-primary-soft/60"
                )}
              >
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold",
                    t.who === "ai" ? "bg-surface text-muted ring-1 ring-line" : "bg-primary text-white"
                  )}
                >
                  {t.who === "ai" ? "A" : "AM"}
                </span>
                <p className="text-[11.5px] leading-relaxed text-ink-soft">{t.text}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-3 flex h-8 items-end justify-center gap-[3px] border-t border-line-soft pt-3">
          {Array.from({ length: 22 }).map((_, i) => (
            <span
              key={i}
              // Frozen waveform. The animated one lives in the hero and is the
              // page's only continuous loop.
              className="w-[3px] origin-bottom rounded-full bg-primary/35"
              style={{ height: `${20 + Math.abs(Math.sin(i * 0.8)) * 70}%` }}
            />
          ))}
        </div>
      </Frame>

      <div className="grid grid-cols-3 gap-2">
        {[
          ["Pace", "142 wpm"],
          ["Clarity", "Clear"],
          ["Questions", "5 of 9"],
        ].map(([k, v]) => (
          <div key={k} className="rounded-[10px] border border-line bg-surface px-3 py-2 text-center shadow-xs">
            <div className="text-[11.5px] font-semibold text-ink">{v}</div>
            <div className="mt-0.5 text-[10px] text-muted">{k}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportPanel() {
  const dims = [
    { label: "System design", score: 93 },
    { label: "Data modelling", score: 96 },
    { label: "Infrastructure", score: 61 },
    { label: "Communication", score: 89 },
  ];
  return (
    <div className="space-y-3">
      <Frame title="Interview report" chip={<Badge tone="success">Advance to on-site</Badge>}>
        <div className="flex items-center gap-4">
          <div className="relative flex size-16 shrink-0 items-center justify-center">
            <svg width="64" height="64" className="-rotate-90">
              <circle cx="32" cy="32" r="28" fill="none" stroke="var(--color-line)" strokeWidth="6" />
              <motion.circle
                cx="32"
                cy="32"
                r="28"
                fill="none"
                stroke="var(--color-success)"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={175.9}
                initial={{ strokeDashoffset: 175.9 }}
                animate={{ strokeDashoffset: 175.9 - 175.9 * 0.91 }}
                transition={{ duration: 1, ease: EASE, delay: 0.2 }}
              />
            </svg>
            <span className="absolute text-[16px] font-semibold tabular-nums text-ink">91</span>
          </div>
          <div className="min-w-0">
            <div className="text-[12.5px] font-medium text-ink">Ananya Menon</div>
            <p className="mt-1 text-[11.5px] leading-relaxed text-muted">
              Reached the second-order failure mode unprompted in two of three areas.
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-line-soft pt-3">
          {dims.map((d, i) => (
            <motion.div
              key={d.label}
              initial={{ opacity: 0, y: RISE_REPORT }}
              animate={{ opacity: 1, y: 0 }}
              transition={transition(DURATION.base, 0.25 + i * STAGGER_REPORT)}
            >
              <div className="flex items-baseline justify-between">
                <span className="truncate text-[10.5px] text-muted">{d.label}</span>
                <span className="text-[10.5px] font-semibold tabular-nums text-ink-soft">{d.score}</span>
              </div>
              <div className="mt-1">
                <Meter value={d.score} />
              </div>
            </motion.div>
          ))}
        </div>
      </Frame>

      <div className="rounded-[10px] border border-line bg-surface p-3 shadow-xs">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.07em] text-primary">
          <Icon.Link size={11} />
          Evidence behind that finding
        </div>
        <p className="mt-2 text-[11.5px] leading-relaxed text-ink-soft">
          &ldquo;You cannot make the network exactly-once, so you make the write exactly-once.&rdquo;
        </p>
        <div className="mt-2 text-[10.5px] text-faint">Transcript · 14:02</div>
      </div>

      <div className="flex items-start gap-2 rounded-[10px] border border-warn/18 bg-warn-soft/40 px-3 py-2.5">
        <Icon.Warning size={13} className="mt-0.5 shrink-0 text-warn" />
        <p className="text-[11.5px] leading-relaxed text-ink-soft">
          Gap: infrastructure below the service layer is unproven.
        </p>
      </div>
    </div>
  );
}

function DecidePanel() {
  const cols = [
    { label: "Applied", tone: "bg-line-strong", people: [["VN", "Vikram N."], ["SK", "Sneha K."]] },
    { label: "Reviewed", tone: "bg-info", people: [["FS", "Fatima S."]] },
    { label: "Shortlisted", tone: "bg-success", people: [["RD", "Rohan D."]] },
    { label: "Interview", tone: "bg-violet", people: [["AM", "Ananya M."]] },
  ];
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2">
        {cols.map((c, ci) => (
          <div key={c.label} className="rounded-[10px] border border-line bg-canvas-deep/40 p-1.5">
            <div className="flex items-center gap-1 px-1 pb-1.5">
              <span className={cn("h-3 w-[2px] rounded-full", c.tone)} />
              <span className="truncate text-[9.5px] font-semibold text-ink">{c.label}</span>
            </div>
            <div className="space-y-1.5">
              {c.people.map(([initials, name], i) => (
                <motion.div
                  key={name}
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: ci * 0.08 + i * 0.06, duration: 0.35 }}
                  className="rounded-[8px] border border-line bg-surface p-1.5 shadow-xs"
                >
                  <Avatar name={name} initials={initials} size="xs" />
                  <div className="mt-1 truncate text-[9.5px] font-medium text-ink">{name}</div>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Frame title="Activity" chip={<Badge tone="neutral">Logged</Badge>}>
        <ol className="space-y-2.5">
          {[
            ["Priya R. shortlisted Rohan Desai", "Today · 3:20 PM"],
            ["Priya R. scheduled Ananya's on-site", "Today · 11:00 AM"],
            ["Kiran S. marked Fatima reviewed", "Yesterday · 9:30 AM"],
          ].map(([what, when], i) => (
            <motion.li
              key={what}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.08, duration: 0.35 }}
              className="flex items-start gap-2.5"
            >
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/50" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11.5px] text-ink-soft">{what}</span>
                <span className="block text-[10px] text-faint">{when}</span>
              </span>
            </motion.li>
          ))}
        </ol>
      </Frame>

      <div className="flex flex-wrap items-center gap-1.5">
        <Pill>Nexire never moves anyone</Pill>
        <Pill>Every action has a name on it</Pill>
      </div>
    </div>
  );
}
