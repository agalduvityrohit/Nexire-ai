"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@/components/ui/Icons";
import { Avatar, Badge, Button } from "@/components/ui/Primitives";
import { Wordmark } from "@/components/public/TopNav";
import { employer } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: Icon.Grid, exact: true },
  { href: "/dashboard/jobs", label: "Jobs", icon: Icon.Briefcase },
  { href: "/dashboard/candidates", label: "Candidates", icon: Icon.Users },
  // Finding candidates: bulk résumé upload, open-market search (still mock),
  // real GitHub search, and mail intake — as tabs inside /dashboard/sourcing.
  // Only the "Search" tab is still under development; Upload, GitHub, and
  // Mail are all real.
  { href: "/dashboard/sourcing", label: "Candidate sourcing", icon: Icon.Search },
  { href: "/dashboard/interviews", label: "Interviewer", icon: Icon.Mic },
  // Post-interview: completed reports, HR decisions, and hire/reject
  // overrides — see lib/debriefData.js. Same mock status as Interviewer.
  { href: "/dashboard/debrief", label: "Debrief", icon: Icon.Doc },
  // Reaching candidates already in the pipeline: email + calls, as tabs
  // inside /dashboard/outreach.
  { href: "/dashboard/outreach", label: "Outreach", icon: Icon.Trend },
  { href: "/dashboard/settings", label: "Settings", icon: Icon.Settings },
];

function isActive(pathname, item) {
  return item.exact ? pathname === item.href : pathname.startsWith(item.href);
}

function SidebarContent({ onNavigate }) {
  const pathname = usePathname();
  const { jobs, candidates } = useStore();
  const openJobs = jobs.filter((j) => j.status === "Open");
  const unreviewed = candidates.filter((c) => c.status === "applied").length;

  const counts = {
    "/dashboard/jobs": openJobs.length,
    "/dashboard/candidates": candidates.length,
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center px-5">
        <Wordmark />
      </div>

      <div className="px-3">
        <Button href="/dashboard/jobs/new" variant="primary" size="sm" className="w-full" onClick={onNavigate}>
          <Icon.Plus size={15} />
          New job post
        </Button>
      </div>

      <nav className="mt-5 flex-1 overflow-y-auto px-3 pb-6 thin-scrollbar">
        <div className="px-2 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-faint">
          Workspace
        </div>
        <ul className="space-y-0.5">
          {NAV.map((item) => {
            const active = isActive(pathname, item);
            const Glyph = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "group relative flex items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-[13.5px] font-medium transition-colors",
                    active
                      ? "bg-surface text-ink shadow-xs ring-1 ring-line"
                      : "text-ink-soft hover:bg-surface/70 hover:text-ink"
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-marker"
                      className="absolute -left-3 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary"
                      transition={{ type: "spring", stiffness: 500, damping: 40 }}
                    />
                  )}
                  <Glyph size={17} className={active ? "text-primary" : "text-faint group-hover:text-muted"} />
                  <span className="flex-1">{item.label}</span>
                  {counts[item.href] != null && (
                    <span className="text-[11.5px] tabular-nums text-faint">{counts[item.href]}</span>
                  )}
                  {item.href === "/dashboard" && unreviewed > 0 && (
                    <span className="rounded-full bg-accent/12 px-1.5 text-[10.5px] font-semibold tabular-nums text-accent">
                      {unreviewed}
                    </span>
                  )}
                  {item.wip && (
                    <span
                      title="Under development"
                      className="rounded-full bg-warn/15 px-1.5 text-[9.5px] font-semibold uppercase tracking-wide text-warn"
                    >
                      WIP
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-6 px-2 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-faint">
          Active pipelines
        </div>
        <ul className="space-y-0.5">
          {openJobs.slice(0, 4).map((job) => {
            const href = `/dashboard/jobs/${job.id}`;
            const active = pathname === href;
            return (
              <li key={job.id}>
                <Link
                  href={href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-[13px] transition-colors",
                    active ? "bg-surface text-ink shadow-xs ring-1 ring-line" : "text-muted hover:bg-surface/70 hover:text-ink"
                  )}
                >
                  <Icon.Board size={15} className="shrink-0 text-faint" />
                  <span className="truncate">{job.title}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <SidebarUser />
    </div>
  );
}

// Reflects the mock session when the employer onboarding flow was walked;
// falls back to the seeded employer so the dashboard works when opened directly.
function SidebarUser() {
  const { session } = useStore();
  const name = session?.name || employer.name;
  const initials = session?.initials || employer.initials;
  const company = session?.company?.name || employer.company;
  const role = session?.companyRole?.label;

  return (
    <div className="shrink-0 border-t border-line p-3">
      <div className="rounded-[10px] border border-line bg-surface p-3">
        <div className="flex items-center gap-2.5">
          <Avatar name={name} initials={initials} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-medium text-ink">{name}</div>
            <div className="truncate text-[11.5px] text-muted">
              {company}
              {role && <span className="text-faint"> · {role}</span>}
            </div>
          </div>
          <Link href="/" className="text-faint transition-colors hover:text-ink" title="Back to marketing site">
            <Icon.ArrowLeft size={15} />
          </Link>
        </div>
      </div>
    </div>
  );
}

export function DashboardShell({ children }) {
  const [drawer, setDrawer] = useState(false);
  const pathname = usePathname();

  useEffect(() => setDrawer(false), [pathname]);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh border-r border-line bg-canvas-deep/50 lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {drawer && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawer(false)}
              className="fixed inset-0 z-[70] bg-ink/25 backdrop-blur-[2px] lg:hidden"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 400, damping: 38 }}
              className="fixed inset-y-0 left-0 z-[71] w-[264px] border-r border-line bg-canvas shadow-pop lg:hidden"
            >
              <SidebarContent onNavigate={() => setDrawer(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-col">
        <Topbar onMenu={() => setDrawer(true)} />
        <main className="flex-1 px-4 pb-16 pt-5 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

function Topbar({ onMenu }) {
  return (
    <div className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-line bg-canvas/85 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={onMenu}
        aria-label="Open navigation"
        className="flex size-9 items-center justify-center rounded-[10px] border border-line bg-surface text-ink-soft lg:hidden"
      >
        <Icon.Menu size={17} />
      </button>

      <label className="relative hidden max-w-sm flex-1 items-center sm:flex">
        <Icon.Search size={15} className="pointer-events-none absolute left-3 text-faint" />
        <input
          placeholder="Search candidates, jobs…"
          className="h-9 w-full rounded-[10px] border border-line bg-surface pl-9 pr-14 text-[13px] text-ink placeholder:text-faint shadow-xs outline-none transition-colors hover:border-line-strong focus:border-primary focus:ring-4 focus:ring-primary/10"
        />
        <kbd className="pointer-events-none absolute right-2.5 rounded border border-line bg-canvas px-1.5 py-0.5 font-mono text-[10px] text-faint">
          ⌘K
        </kbd>
      </label>

      <div className="ml-auto flex items-center gap-2">
        <Badge tone="warn" className="hidden md:inline-flex">
          Prototype · mock data
        </Badge>
        <button
          type="button"
          aria-label="Notifications"
          className="relative flex size-9 items-center justify-center rounded-[10px] border border-line bg-surface text-ink-soft transition-colors hover:border-line-strong"
        >
          <Icon.Bell size={16} />
          <span className="absolute right-2.5 top-2.5 size-1.5 rounded-full bg-accent ring-2 ring-surface" />
        </button>
        <Avatar name={employer.name} initials={employer.initials} size="sm" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------- Page header block */

export function PageHeader({ eyebrow, title, subtitle, actions, breadcrumb, className }) {
  return (
    <div className={cn("mb-6", className)}>
      {breadcrumb && <div className="mb-3">{breadcrumb}</div>}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          {eyebrow && (
            <div className="text-[11px] font-semibold uppercase tracking-[0.09em] text-muted">{eyebrow}</div>
          )}
          <h1 className="mt-1 text-[22px] font-semibold tracking-[-0.025em] text-ink sm:text-[25px]">{title}</h1>
          {subtitle && <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-muted">{subtitle}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function Breadcrumb({ items }) {
  return (
    <nav className="flex items-center gap-1.5 text-[12.5px] text-muted">
      {items.map((item, i) => (
        <span key={item.label} className="flex items-center gap-1.5">
          {i > 0 && <Icon.ChevronRight size={13} className="text-faint" />}
          {item.href ? (
            <Link href={item.href} className="transition-colors hover:text-ink">
              {item.label}
            </Link>
          ) : (
            <span className="text-ink-soft">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
