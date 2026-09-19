"use client";

// Every feature, grouped and click-to-expand. Copy lives in lib/mock-data.js.

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Badge, Pill } from "@/components/ui/Primitives";
import { Icon } from "@/components/ui/Icons";
import { marketing } from "@/lib/mock-data";
import { EASE } from "@/lib/motion";
import { cn } from "@/lib/utils";

const GROUP_ICONS = {
  inbox: Icon.Inbox,
  doc: Icon.Doc,
  mic: Icon.Mic,
  board: Icon.Board,
};

export function FeatureExplorer() {
  const groups = marketing.featureGroups;
  const [group, setGroup] = useState(0);
  const [open, setOpen] = useState(0);

  const current = groups[group];

  function pickGroup(i) {
    setGroup(i);
    setOpen(0);
  }

  return (
    <div>
      {/* --------------------------------------------------------- group tabs */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {groups.map((g, i) => {
          const Glyph = GROUP_ICONS[g.icon] || Icon.Sparkle;
          const active = group === i;
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => pickGroup(i)}
              aria-pressed={active}
              className={cn(
                "group rounded-card border p-4 text-left transition-all duration-200",
                active
                  ? "border-primary bg-surface shadow-lift ring-2 ring-primary/12"
                  : "border-line bg-surface/70 hover:scale-[1.02] hover:border-line-strong hover:bg-surface hover:shadow-card"
              )}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-[10px] transition-colors",
                    active ? "bg-primary text-white" : "bg-primary-soft text-primary"
                  )}
                >
                  <Glyph size={17} />
                </span>
                <span className="text-[14px] font-semibold tracking-[-0.015em] text-ink">{g.label}</span>
                <span className="ml-auto text-[11px] tabular-nums text-faint">{g.features.length}</span>
              </div>
              <p className="mt-2.5 text-[12px] leading-relaxed text-muted">{g.blurb}</p>
            </button>
          );
        })}
      </div>

      {/* ----------------------------------------------------------- features */}
      <motion.div
        key={current.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: EASE }}
        className="mt-4 overflow-hidden rounded-panel border border-line bg-surface shadow-card"
      >
        <div className="divide-y divide-line">
          {current.features.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={f.title}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-start gap-4 px-5 py-4 text-left transition-colors hover:bg-raised sm:px-6"
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full transition-colors",
                      isOpen ? "bg-primary text-white" : "bg-canvas-deep text-faint"
                    )}
                  >
                    <Icon.Check size={11} />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-[14.5px] font-semibold tracking-[-0.015em] text-ink">
                        {f.title}
                      </span>
                      {f.endNote && <Badge tone="neutral">Team</Badge>}
                    </span>
                    <span className="mt-1 block text-[12.5px] leading-relaxed text-muted">{f.summary}</span>
                  </span>

                  <Icon.ChevronDown
                    size={16}
                    className={cn(
                      "mt-1 shrink-0 text-faint transition-transform duration-300",
                      isOpen && "rotate-180"
                    )}
                  />
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.28, ease: EASE }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-line-soft bg-canvas-deep/30 px-5 py-4 pl-14 sm:px-6 sm:pl-15">
                        <p className="max-w-2xl text-[13px] leading-relaxed text-ink-soft">{f.detail}</p>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {f.bullets.map((b) => (
                            <Pill key={b}>{b}</Pill>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
