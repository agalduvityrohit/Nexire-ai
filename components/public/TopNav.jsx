"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Primitives";
import { Icon } from "@/components/ui/Icons";
import { HOVER_LIFT } from "@/lib/motion";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/#problem", label: "Why" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#features", label: "Features" },
  { href: "/#interview", label: "Interview" },
];

const WORDMARK_SIZES = {
  md: { box: "size-8 rounded-[9px]", icon: 18, text: "text-[15px]" },
  lg: { box: "size-10 rounded-[11px]", icon: 21, text: "text-[17px]" },
};

export function Wordmark({ className, tone = "ink", size = "md" }) {
  const s = WORDMARK_SIZES[size];
  return (
    <Link href="/" className={cn("group inline-flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "flex items-center justify-center shadow-sm transition-transform duration-200 ease-brand group-hover:scale-[1.02]",
          s.box,
          tone === "invert" ? "bg-white/12 text-white" : "bg-primary text-white"
        )}
      >
        <Icon.Logo size={s.icon} />
      </span>
      <span className={cn(s.text, "font-semibold tracking-[-0.02em]", tone === "invert" ? "text-white" : "text-ink")}>
        Nexire<span className="text-primary/60">.ai</span>
      </span>
    </Link>
  );
}

export function TopNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-line bg-canvas/85 shadow-xs backdrop-blur-xl"
          : "border-b border-transparent bg-canvas/40 backdrop-blur-sm"
      )}
    >
      <div className="mx-auto flex h-20 max-w-6xl items-center px-5 sm:px-8">
        <Wordmark size="lg" />

        <nav className="ml-auto hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "inline-block rounded-full px-3.5 py-2.5 text-[14px] font-medium text-ink-soft transition-[color,background-color,transform] hover:bg-canvas-deep hover:text-ink",
                HOVER_LIFT
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3 md:ml-4">
          <span className="hidden h-6 w-px bg-line md:block" />
          <Button href="/login" variant="accent" size="md" className="shadow-lift">
            Get started
            <Icon.ArrowRight size={16} className="hidden sm:block" />
          </Button>
        </div>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-line bg-canvas">
      <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xs">
            <Wordmark />
            <p className="mt-3 text-[13px] leading-relaxed text-muted">
              AI-native hiring infrastructure. Screen every applicant properly, then decide with evidence
              in front of you.
            </p>
          </div>

          <nav className="flex flex-wrap gap-x-8 gap-y-2">
            {[
              ["What we do", "/#what-we-do"],
              ["Get started", "/login"],
              ["Dashboard", "/dashboard"],
              ["Privacy", "/privacy"],
            ].map(([label, href]) => (
              <Link
                key={label}
                href={href}
                className={cn(
                  "inline-block text-[13px] text-ink-soft transition-[color,transform] hover:text-primary",
                  HOVER_LIFT
                )}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-line pt-6 text-[12px] text-faint sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 Nexire AI. Interface prototype — all data on this site is fictional.</span>
          <span className="flex items-center gap-1.5">
            <Icon.Shield size={13} />
            You make every hiring decision
          </span>
        </div>
      </div>
    </footer>
  );
}
