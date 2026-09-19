"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Wordmark } from "@/components/public/TopNav";
import { Icon } from "@/components/ui/Icons";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const STEPS = [
  { n: 1, label: "Company", href: "/onboarding/company" },
  { n: 2, label: "Your role", href: "/onboarding/role" },
];

export function OnboardingShell({ step, eyebrow, title, subtitle, children }) {
  const { session, signOut } = useStore();

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] dot-grid opacity-40 [mask-image:radial-gradient(70%_60%_at_50%_0%,black,transparent)]" />

      <header className="flex flex-wrap items-center justify-between gap-3 px-5 py-5 sm:px-10">
        <Wordmark />
        <div className="flex items-center gap-3">
          {session?.email && (
            <span className="hidden text-[12.5px] text-muted sm:block">
              Signed in as <span className="font-medium text-ink-soft">{session.email}</span>
            </span>
          )}
          <button
            type="button"
            onClick={signOut}
            className="text-[12.5px] font-medium text-muted transition-colors hover:text-ink"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="flex flex-1 justify-center px-5 pb-20 pt-4 sm:px-8">
        <div className="w-full max-w-2xl">
          {/* ------------------------------------------------------ stepper */}
          <div className="flex items-center gap-3">
            {STEPS.map((s, i) => {
              const state = step === s.n ? "active" : step > s.n ? "done" : "todo";
              return (
                <div key={s.n} className="flex flex-1 items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "flex size-6 items-center justify-center rounded-full text-[11px] font-semibold transition-colors",
                        state === "active" && "bg-primary text-white",
                        state === "done" && "bg-primary-soft text-primary",
                        state === "todo" && "bg-canvas-deep text-faint ring-1 ring-line"
                      )}
                    >
                      {state === "done" ? <Icon.Check size={12} /> : s.n}
                    </span>
                    <span
                      className={cn(
                        "text-[12.5px] font-medium",
                        state === "todo" ? "text-faint" : "text-ink"
                      )}
                    >
                      {s.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <span className="h-px flex-1 bg-line">
                      <motion.span
                        className="block h-px bg-primary"
                        initial={{ width: 0 }}
                        animate={{ width: step > s.n ? "100%" : "0%" }}
                        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </span>
                  )}
                </div>
              );
            })}
            <span className="shrink-0 text-[11.5px] tabular-nums text-muted">
              Step {step} of {STEPS.length}
            </span>
          </div>

          {/* -------------------------------------------------------- header */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="mt-8"
          >
            <div className="text-[11px] font-semibold uppercase tracking-[0.09em] text-muted">{eyebrow}</div>
            <h1 className="mt-1.5 text-[26px] font-semibold tracking-[-0.03em] text-ink sm:text-[30px]">
              {title}
            </h1>
            <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-muted">{subtitle}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="mt-7"
          >
            {children}
          </motion.div>

          <p className="mt-8 text-center text-[12px] text-faint">
            Prototype — company and role selections are not saved anywhere.{" "}
            <Link href="/dashboard" className="underline underline-offset-2 hover:text-muted">
              Skip to the dashboard
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
