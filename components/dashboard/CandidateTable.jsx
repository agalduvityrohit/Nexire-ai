"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Avatar, Meter } from "@/components/ui/Primitives";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Icon } from "@/components/ui/Icons";
import { SOURCE_META } from "@/lib/mock-data";
import { cn, formatDate, relativeDays } from "@/lib/utils";

export function CandidateTable({ candidates, jobsById = {}, showRole = true, emptyLabel = "No candidates match these filters." }) {
  if (!candidates.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
        <span className="flex size-10 items-center justify-center rounded-full bg-canvas-deep text-faint">
          <Icon.Users size={18} />
        </span>
        <p className="text-[13.5px] font-medium text-ink">Nothing here yet</p>
        <p className="text-[12.5px] text-muted">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto thin-scrollbar">
      <table className="w-full min-w-[720px] border-collapse text-left">
        <thead>
          <tr className="border-b border-line bg-canvas-deep/40">
            {["Candidate", showRole && "Role", "Source", "Match", "Status", "Applied", ""]
              .filter(Boolean)
              .map((h, i) => (
                <th
                  key={i}
                  className={cn(
                    "px-4 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted",
                    h === "Match" && "w-[132px]",
                    h === "" && "w-10"
                  )}
                >
                  {h}
                </th>
              ))}
          </tr>
        </thead>
        <tbody>
          {candidates.map((c, i) => (
            <motion.tr
              key={c.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: Math.min(i, 12) * 0.025, duration: 0.3 }}
              className="group border-b border-line-soft last:border-0 transition-colors hover:bg-raised"
            >
              <td className="px-4 py-3">
                <Link href={`/dashboard/candidates/${c.id}`} className="flex items-center gap-3">
                  <Avatar name={c.name} initials={c.initials} size="sm" />
                  <span className="min-w-0">
                    <span className="block truncate text-[13.5px] font-medium text-ink group-hover:text-primary">
                      {c.name}
                    </span>
                    <span className="block truncate text-[12px] text-muted">{c.headline}</span>
                  </span>
                </Link>
              </td>

              {showRole && (
                <td className="px-4 py-3">
                  <span className="text-[12.5px] text-ink-soft">{jobsById[c.jobId]?.title || "—"}</span>
                </td>
              )}

              <td className="px-4 py-3">
                <span className="text-[12.5px] text-muted">{SOURCE_META[c.source] || c.source}</span>
              </td>

              <td className="px-4 py-3">
                <span className="flex items-center gap-2">
                  <span className="w-14">
                    <Meter value={c.matchScore} />
                  </span>
                  <span className="text-[12.5px] font-semibold tabular-nums text-ink-soft">{c.matchScore}%</span>
                </span>
              </td>

              <td className="px-4 py-3">
                <StatusBadge status={c.status} />
              </td>

              <td className="px-4 py-3">
                <span className="block text-[12.5px] text-ink-soft">{relativeDays(c.appliedAt)}</span>
                <span className="block text-[11.5px] text-faint">{formatDate(c.appliedAt)}</span>
              </td>

              <td className="px-4 py-3 text-right">
                <Link
                  href={`/dashboard/candidates/${c.id}`}
                  aria-label={`Open ${c.name}`}
                  className="inline-flex size-7 items-center justify-center rounded-md text-faint transition-colors hover:bg-canvas-deep hover:text-ink"
                >
                  <Icon.ChevronRight size={15} />
                </Link>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* Compact card list used on narrow screens */
export function CandidateCards({ candidates, jobsById = {} }) {
  return (
    <ul className="divide-y divide-line-soft">
      {candidates.map((c) => (
        <li key={c.id}>
          <Link href={`/dashboard/candidates/${c.id}`} className="flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-raised">
            <Avatar name={c.name} initials={c.initials} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <span className="truncate text-[13.5px] font-medium text-ink">{c.name}</span>
                <span className="shrink-0 text-[12px] font-semibold tabular-nums text-ink-soft">{c.matchScore}%</span>
              </div>
              <div className="mt-0.5 truncate text-[12px] text-muted">
                {jobsById[c.jobId]?.title || c.headline}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <StatusBadge status={c.status} />
                <span className="text-[11.5px] text-faint">{relativeDays(c.appliedAt)}</span>
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
