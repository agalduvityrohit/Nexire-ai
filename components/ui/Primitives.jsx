"use client";

import Link from "next/link";
import { cn, tintFor } from "@/lib/utils";

/* ------------------------------------------------------------------ Button */

const BUTTON_VARIANTS = {
  primary:
    "bg-primary text-white shadow-xs hover:bg-primary-hover active:bg-primary-deep border border-primary-deep/20",
  accent:
    "bg-accent text-white shadow-xs hover:bg-accent-hover active:bg-accent-hover border border-accent-hover/30",
  secondary:
    "bg-surface text-ink border border-line hover:bg-canvas hover:border-line-strong shadow-xs",
  ghost: "text-ink-soft hover:text-ink hover:bg-canvas-deep border border-transparent",
  outline: "border border-line-strong text-ink hover:bg-surface",
  danger: "bg-danger-soft text-danger border border-danger/25 hover:bg-danger hover:text-white",
  quiet: "text-muted hover:text-ink hover:bg-canvas-deep border border-transparent",
};

const BUTTON_SIZES = {
  xs: "h-7 px-2.5 text-xs gap-1.5 rounded-lg",
  sm: "h-9 px-3.5 text-[13px] gap-1.5 rounded-[10px]",
  md: "h-10 px-4 text-sm gap-2 rounded-[10px]",
  lg: "h-12 px-6 text-[15px] gap-2 rounded-xl",
};

export function Button({
  as,
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}) {
  const classes = cn(
    "inline-flex items-center justify-center font-medium whitespace-nowrap select-none",
    "transition-[background-color,color,border-color,box-shadow,transform] duration-200 ease-brand",
    "hover:scale-[1.02] active:scale-100 disabled:opacity-50 disabled:pointer-events-none disabled:hover:scale-100",
    BUTTON_VARIANTS[variant],
    BUTTON_SIZES[size],
    className
  );

  if (href) {
    return (
      <Link href={href} className={classes} {...rest}>
        {children}
      </Link>
    );
  }
  const Comp = as || "button";
  return (
    <Comp className={classes} {...rest}>
      {children}
    </Comp>
  );
}

/* ------------------------------------------------------------------- Badge */

const BADGE_TONES = {
  neutral: "bg-canvas-deep text-ink-soft border-line-strong/70",
  info: "bg-info-soft text-info border-info/20",
  success: "bg-success-soft text-success border-success/20",
  warn: "bg-warn-soft text-warn border-warn/20",
  danger: "bg-danger-soft text-danger border-danger/20",
  violet: "bg-violet-soft text-violet border-violet/20",
  primary: "bg-primary-soft text-primary border-primary/20",
  accent: "bg-accent-soft text-accent border-accent/25",
};

export function Badge({ tone = "neutral", dot = false, className, children }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5",
        "text-[11.5px] font-medium leading-5 tracking-[-0.005em] whitespace-nowrap",
        BADGE_TONES[tone] || BADGE_TONES.neutral,
        className
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current opacity-70" />}
      {children}
    </span>
  );
}

export function Pill({ className, children }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-line bg-canvas px-2 py-0.5",
        "text-[11.5px] font-medium text-ink-soft",
        className
      )}
    >
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------- Card */

export function Card({ className, children, ...rest }) {
  return (
    <div
      className={cn(
        "rounded-card border border-line bg-surface shadow-card",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function SectionTitle({ eyebrow, title, action, className }) {
  return (
    <div className={cn("flex items-end justify-between gap-4", className)}>
      <div>
        {eyebrow && (
          <div className="text-[11px] font-semibold uppercase tracking-[0.09em] text-muted">
            {eyebrow}
          </div>
        )}
        <h2 className="mt-1 text-[15px] font-semibold text-ink">{title}</h2>
      </div>
      {action}
    </div>
  );
}

/* ------------------------------------------------------------------ Avatar */

const AVATAR_SIZES = {
  xs: "size-6 text-[10px]",
  sm: "size-8 text-[11px]",
  md: "size-10 text-[13px]",
  lg: "size-14 text-lg",
  xl: "size-20 text-2xl",
};

export function Avatar({ name = "", initials, size = "md", className }) {
  const text = initials || name.slice(0, 2).toUpperCase();
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold tracking-tight",
        "ring-1 ring-inset ring-black/[0.04]",
        AVATAR_SIZES[size],
        tintFor(name || text),
        className
      )}
      aria-hidden="true"
    >
      {text}
    </span>
  );
}

/* ------------------------------------------------------------------- Forms */

export function Field({ label, hint, required, error, htmlFor, children, className }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="flex items-baseline gap-1.5 text-[13px] font-medium text-ink"
        >
          {label}
          {required && <span className="text-accent">*</span>}
          {hint && <span className="text-[12px] font-normal text-muted">{hint}</span>}
        </label>
      )}
      {children}
      {error && <p className="text-[12px] text-danger">{error}</p>}
    </div>
  );
}

const CONTROL =
  "w-full rounded-[10px] border border-line bg-surface px-3 text-sm text-ink placeholder:text-faint " +
  "shadow-xs transition-[border-color,box-shadow] outline-none " +
  "hover:border-line-strong focus:border-primary focus:ring-4 focus:ring-primary/10 focus-visible:outline-none";

export function Input({ className, ...rest }) {
  return <input className={cn(CONTROL, "h-10", className)} {...rest} />;
}

export function Textarea({ className, rows = 5, ...rest }) {
  return <textarea rows={rows} className={cn(CONTROL, "py-2.5 leading-relaxed resize-y", className)} {...rest} />;
}

export function Select({ className, children, ...rest }) {
  return (
    <div className="relative">
      <select
        className={cn(CONTROL, "h-10 appearance-none pr-9 cursor-pointer", className)}
        {...rest}
      >
        {children}
      </select>
      <svg
        viewBox="0 0 24 24"
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 9.5l6 6 6-6" />
      </svg>
    </div>
  );
}

export function Checkbox({ label, description, className, ...rest }) {
  return (
    <label
      className={cn(
        "group flex cursor-pointer items-start gap-3 rounded-[10px] border border-line bg-surface p-3",
        "transition-colors hover:border-line-strong hover:bg-raised",
        className
      )}
    >
      <input
        type="checkbox"
        className="mt-0.5 size-4 shrink-0 cursor-pointer rounded-[5px] border-line-strong accent-[var(--color-primary)]"
        {...rest}
      />
      <span className="min-w-0">
        <span className="block text-[13px] font-medium leading-5 text-ink">{label}</span>
        {description && (
          <span className="mt-0.5 block text-[12.5px] leading-relaxed text-muted">{description}</span>
        )}
      </span>
    </label>
  );
}

/* ------------------------------------------------------------------- Misc  */

export function Divider({ className }) {
  return <div className={cn("h-px w-full bg-line", className)} />;
}

export function KeyValue({ label, value, className }) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-[11px] font-medium uppercase tracking-[0.07em] text-muted">{label}</dt>
      <dd className="mt-1 truncate text-[13.5px] font-medium text-ink">{value}</dd>
    </div>
  );
}

export function MockNote({ children, className }) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-[10px] border border-dashed border-line-strong bg-canvas-deep/60 px-3 py-2",
        "text-[12px] leading-relaxed text-muted",
        className
      )}
    >
      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-faint" />
      <span>{children}</span>
    </div>
  );
}

export function ScoreRing({ value, size = 56, stroke = 5, label }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const tone = value >= 80 ? "var(--color-success)" : value >= 65 ? "var(--color-warn)" : "var(--color-danger)";
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-line)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tone}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * value) / 100}
        />
      </svg>
      <span className="absolute flex flex-col items-center leading-none">
        <span className="text-[13px] font-semibold tabular-nums text-ink">{value}</span>
        {label && <span className="mt-0.5 text-[9px] uppercase tracking-wide text-muted">{label}</span>}
      </span>
    </div>
  );
}

export function Meter({ value, tone }) {
  const color =
    tone || (value >= 80 ? "bg-success" : value >= 65 ? "bg-primary" : value >= 50 ? "bg-warn" : "bg-danger");
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-canvas-deep">
      <div className={cn("h-full rounded-full transition-[width] duration-500", color)} style={{ width: `${value}%` }} />
    </div>
  );
}
