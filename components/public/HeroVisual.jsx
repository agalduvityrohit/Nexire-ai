"use client";

// The hero mock.
//
// THE SIGNATURE MOMENT lives here: the live-interview chip's pulse and
// waveform. It is the ONLY continuously-looping animation on the page —
// everything else animates in once and settles. Keep it that way; if another
// loop is added, this one stops reading as the focal point.

import { motion, useReducedMotion } from "framer-motion";
import { Avatar, Badge, Meter } from "@/components/ui/Primitives";
import { Icon } from "@/components/ui/Icons";
import { DURATION, transition } from "@/lib/motion";

const ROWS = [
  { name: "Ananya Menon", initials: "AM", role: "Staff Eng · Razorpay", score: 94, status: "Interviewed" },
  { name: "Sneha Kulkarni", initials: "SK", role: "SDE-3 · Atlassian", score: 85, status: "New" },
  { name: "Rohan Desai", initials: "RD", role: "Senior SWE · Swiggy", score: 81, status: "Shortlisted" },
  { name: "Vikram Nair", initials: "VN", role: "Backend · CRED", score: 77, status: "New" },
  { name: "Fatima Shaikh", initials: "FS", role: "Data Platform · Meesho", score: 68, status: "Reviewed" },
];

export function HeroVisual() {
  const reduced = useReducedMotion();

  return (
    <div className="relative">
      <div
        aria-hidden
        className="absolute -inset-x-10 -top-10 bottom-0 -z-10 rounded-[40px] bg-[radial-gradient(60%_60%_at_50%_0%,rgba(14,92,84,0.12),transparent_70%)]"
      />

      {/* One quiet entrance for the whole panel — no rotation, no scale. */}
      <motion.div
        initial={{ opacity: 0, y: reduced ? 0 : 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={transition(DURATION.slow, 0.1)}
        className="relative overflow-hidden rounded-panel border border-line bg-surface shadow-pop"
      >
        <div className="flex items-center gap-2 border-b border-line bg-canvas-deep/60 px-4 py-2.5">
          <span className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-line-strong" />
            <span className="size-2.5 rounded-full bg-line-strong" />
            <span className="size-2.5 rounded-full bg-line-strong" />
          </span>
          <span className="ml-2 truncate rounded-md border border-line bg-surface px-2.5 py-1 font-mono text-[10.5px] text-faint">
            nexire.ai/dashboard
          </span>
          <span className="ml-auto hidden sm:block">
            <Badge tone="success" dot>
              Live
            </Badge>
          </span>
        </div>

        <div className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.09em] text-muted">Pipeline</div>
              <div className="mt-0.5 text-[15px] font-semibold text-ink">Senior Backend Engineer</div>
            </div>
            <div className="hidden items-center gap-1.5 rounded-full border border-line bg-canvas px-2.5 py-1 text-[11.5px] text-muted sm:flex">
              <Icon.Sparkle size={13} className="text-primary" />
              41 screened this week
            </div>
          </div>

          {/* Stats and rows fade in as one calm sequence rather than
              individually competing for attention. */}
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.35 } } }}
            className="mt-4 grid grid-cols-3 gap-2.5"
          >
            {[
              { k: "Applications", v: "128", d: "+18" },
              { k: "Auto-screened", v: "116", d: "91%" },
              { k: "Shortlisted", v: "9", d: "+3" },
            ].map((s) => (
              <motion.div
                key={s.k}
                variants={{
                  hidden: { opacity: 0, y: reduced ? 0 : 6 },
                  show: { opacity: 1, y: 0, transition: transition(DURATION.base) },
                }}
                className="rounded-[10px] border border-line bg-raised p-2.5"
              >
                <div className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted">{s.k}</div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-[19px] font-semibold tabular-nums tracking-tight text-ink">{s.v}</span>
                  <span className="text-[11px] font-medium text-success">{s.d}</span>
                </div>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.5 } } }}
            className="mt-4 overflow-hidden rounded-[10px] border border-line"
          >
            <div className="hidden grid-cols-[1fr_auto_86px] gap-3 border-b border-line bg-canvas-deep/50 px-3 py-2 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-muted sm:grid">
              <span>Candidate</span>
              <span>Status</span>
              <span className="text-right">Match</span>
            </div>
            {ROWS.map((r) => (
              <motion.div
                key={r.name}
                variants={{
                  hidden: { opacity: 0 },
                  show: { opacity: 1, transition: transition(DURATION.base) },
                }}
                className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-line-soft px-3 py-2.5 last:border-0 sm:grid-cols-[1fr_auto_86px]"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <Avatar name={r.name} initials={r.initials} size="xs" />
                  <div className="min-w-0">
                    <div className="truncate text-[12.5px] font-medium text-ink">{r.name}</div>
                    <div className="truncate text-[11px] text-muted">{r.role}</div>
                  </div>
                </div>
                <div className="hidden sm:block">
                  <Badge tone={r.status === "New" ? "accent" : r.status === "Shortlisted" ? "success" : "neutral"}>
                    {r.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <div className="hidden w-11 sm:block">
                    <Meter value={r.score} />
                  </div>
                  <span className="w-7 text-right text-[12px] font-semibold tabular-nums text-ink-soft">
                    {r.score}
                  </span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.div>

      {/* Supporting chip — enters quietly, then holds still. */}
      <motion.div
        initial={{ opacity: 0, y: reduced ? 0 : 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={transition(DURATION.base, 0.85)}
        className="absolute -bottom-6 -left-3 hidden w-[236px] rounded-card border border-line bg-surface p-3 shadow-lift sm:block lg:-left-10"
      >
        <div className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-md bg-primary-soft text-primary">
            <Icon.Sparkle size={13} />
          </span>
          <span className="text-[12px] font-semibold text-ink">Interview report ready</span>
        </div>
        <p className="mt-2 text-[11.5px] leading-relaxed text-muted">
          “Reached the second-order question in two of three areas without prompting.”
        </p>
        <div className="mt-2.5 flex items-center justify-between">
          <span className="text-[10.5px] uppercase tracking-wide text-faint">Technical depth</span>
          <span className="text-[12px] font-semibold text-success">Strong</span>
        </div>
      </motion.div>

      {/* ---------------------------------------------- THE SIGNATURE MOMENT */}
      <motion.div
        initial={{ opacity: 0, y: reduced ? 0 : -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={transition(DURATION.base, 1)}
        className="absolute -right-3 top-16 hidden items-center gap-3 rounded-full border border-line bg-surface py-2 pl-2 pr-4 shadow-lift md:flex lg:-right-8"
      >
        <span className="relative flex size-8 shrink-0 items-center justify-center rounded-full ring-2 ring-primary/15">
          {!reduced && (
            <span
              aria-hidden
              className="absolute inset-0 rounded-full bg-primary/25"
              style={{ animation: "nx-pulse-ring 2.8s cubic-bezier(0.16, 1, 0.3, 1) infinite" }}
            />
          )}
          <ArjunFace />
        </span>

        <span className="flex h-6 items-end gap-[3px]" aria-hidden>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <span
              key={i}
              className="w-[3px] origin-bottom rounded-full bg-primary/50"
              style={
                reduced
                  ? { height: `${10 + Math.abs(Math.sin(i * 0.9)) * 12}px` }
                  : { height: 20, animation: `nx-bar 1.4s ${i * 0.11}s ease-in-out infinite` }
              }
            />
          ))}
        </span>

        <span className="text-[11.5px] font-medium text-ink">Arjun · interviewing</span>
      </motion.div>
    </div>
  );
}

function ArjunFace() {
  return (
    <svg viewBox="0 0 48 48" width="32" height="32" className="relative rounded-full" aria-hidden>
      <defs>
        <clipPath id="hero-arjun-clip">
          <circle cx="24" cy="24" r="24" />
        </clipPath>
        <linearGradient id="hero-arjun-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c3ddd8" />
          <stop offset="100%" stopColor="#8fbdb5" />
        </linearGradient>
      </defs>
      <g clipPath="url(#hero-arjun-clip)">
        <rect width="48" height="48" fill="url(#hero-arjun-bg)" />
        <path d="M6 48c0-9.8 8.3-14.6 18-14.6s18 4.8 18 14.6z" fill="#22303a" opacity="0.9" />
        <ellipse cx="24" cy="25" rx="9" ry="10.6" fill="#c48f6a" />
        <path d="M14.6 20.5c0-6.6 4.2-11 9.4-11s9.4 4.4 9.4 11c0-1.6-.5-2.8-1.6-3.4.2-1.4-.3-2.4-1.6-2.6-1-1.6-3-2.4-6.2-2.4s-5.2.8-6.2 2.4c-1.3.2-1.8 1.2-1.6 2.6-1.1.6-1.6 1.8-1.6 3.4z" fill="#1f1a17" />
        <path d="M16 21.2c1.6-1.2 4.4-1.8 8-1.8s6.4.6 8 1.8c-.3-3.3-3.4-5.6-8-5.6s-7.7 2.3-8 5.6z" fill="#1f1a17" />
        <ellipse cx="20.4" cy="24.4" rx="1.4" ry="1.6" fill="#241f1c" />
        <ellipse cx="27.6" cy="24.4" rx="1.4" ry="1.6" fill="#241f1c" />
        <path
          d="M17.5 29.5c1.6 1.4 3.9 2.1 6.5 2.1s4.9-.7 6.5-2.1"
          stroke="#8a5a3d"
          strokeWidth="0.9"
          strokeLinecap="round"
          fill="none"
          opacity="0.55"
        />
        <ellipse cx="24" cy="30.6" rx="2.1" ry="1.2" fill="#9c6a4c" />
      </g>
    </svg>
  );
}
