"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Icon } from "@/components/ui/Icons";
import { cn } from "@/lib/utils";

const TONES = {
  primary: "bg-primary-soft text-primary",
  accent: "bg-accent-soft text-accent",
  success: "bg-success-soft text-success",
  violet: "bg-violet-soft text-violet",
  info: "bg-info-soft text-info",
};

export function StatCard({
  label,
  value,
  delta,
  deltaTone = "success",
  hint,
  icon: Glyph = Icon.Users,
  tone = "primary",
  href,
  spark,
  index = 0,
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className={cn("flex size-8 items-center justify-center rounded-[9px]", TONES[tone])}>
          <Glyph size={16} />
        </span>
        {delta && (
          <span
            className={cn(
              "rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
              deltaTone === "success" && "bg-success-soft text-success",
              deltaTone === "danger" && "bg-danger-soft text-danger",
              deltaTone === "neutral" && "bg-canvas-deep text-muted"
            )}
          >
            {delta}
          </span>
        )}
      </div>

      <div className="mt-4 text-[28px] font-semibold leading-none tracking-[-0.032em] tabular-nums text-ink">
        {value}
      </div>
      <div className="mt-1.5 text-[13px] font-medium text-ink-soft">{label}</div>
      {hint && <div className="mt-0.5 text-[12px] text-muted">{hint}</div>}

      {spark && (
        <div className="mt-4 flex h-8 items-end gap-1">
          {spark.map((v, i) => (
            <motion.span
              key={i}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: index * 0.05 + i * 0.03, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className={cn("flex-1 origin-bottom rounded-sm", i === spark.length - 1 ? "bg-primary" : "bg-primary/18")}
              style={{ height: `${Math.max(12, v)}%` }}
            />
          ))}
        </div>
      )}
    </>
  );

  const classes =
    "group block rounded-card border border-line bg-surface p-4 shadow-card transition-[border-color,box-shadow,transform] duration-200 ease-brand hover:scale-[1.02] hover:border-line-strong hover:shadow-lift";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      {href ? (
        <Link href={href} className={classes}>
          {body}
        </Link>
      ) : (
        <div className={classes}>{body}</div>
      )}
    </motion.div>
  );
}
