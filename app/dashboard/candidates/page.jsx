"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/dashboard/Shell";
import { CandidateCards, CandidateTable } from "@/components/dashboard/CandidateTable";
import { DeleteByRoleModal } from "@/components/dashboard/DeleteByRoleModal";
import { Badge, Button, Card, Select } from "@/components/ui/Primitives";
import { Icon } from "@/components/ui/Icons";
import { STATUS_META } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const SORTS = [
  { id: "recent", label: "Most recent" },
  { id: "match", label: "Highest match" },
  { id: "name", label: "Name (A–Z)" },
];

export default function CandidatesPage() {
  const { candidates, jobs, deleteCandidates, notify } = useStore();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [jobFilter, setJobFilter] = useState("all");
  const [sort, setSort] = useState("recent");
  const [roleModalOpen, setRoleModalOpen] = useState(false);

  const jobsById = useMemo(() => Object.fromEntries(jobs.map((j) => [j.id, j])), [jobs]);

  const visible = useMemo(() => {
    let list = candidates.filter((c) => {
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.headline.toLowerCase().includes(q) ||
        c.skills.some((s) => s.name.toLowerCase().includes(q));
      const matchesStatus = status === "all" || c.status === status;
      const matchesJob = jobFilter === "all" || c.jobId === jobFilter;
      return matchesQuery && matchesStatus && matchesJob;
    });

    list = [...list].sort((a, b) => {
      if (sort === "match") return b.matchScore - a.matchScore;
      if (sort === "name") return a.name.localeCompare(b.name);
      return a.appliedAt < b.appliedAt ? 1 : -1;
    });

    return list;
  }, [candidates, query, status, jobFilter, sort]);

  const statusChips = ["all", ...Object.keys(STATUS_META)];
  const emptyLabel = candidates.length
    ? "No candidates match these filters."
    : "No candidates yet — bulk-upload résumés or connect your mailbox to fill this in.";

  return (
    <>
      <PageHeader
        eyebrow="People"
        title="Candidates"
        subtitle="Everyone who has applied across every role, with their parsed résumé data and screening status."
        actions={
          <>
            {candidates.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setRoleModalOpen(true)}>
                <Icon.Trash size={14} />
                Delete by role
              </Button>
            )}
            <Button variant="secondary" size="sm" href="/dashboard/sourcing">
              <Icon.Upload size={14} />
              Import résumés
            </Button>
            <Button href="/dashboard/jobs/new" variant="primary" size="sm">
              <Icon.Plus size={15} />
              New job post
            </Button>
          </>
        }
      />

      <DeleteByRoleModal
        open={roleModalOpen}
        onClose={() => setRoleModalOpen(false)}
        candidates={candidates}
        deleteCandidates={deleteCandidates}
        notify={notify}
      />

      <Card className="mb-4 p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative flex flex-1 items-center">
            <Icon.Search size={15} className="pointer-events-none absolute left-3 text-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, title, or skill…"
              className="h-9 w-full rounded-[10px] border border-line bg-surface pl-9 pr-3 text-[13px] text-ink placeholder:text-faint shadow-xs outline-none transition-colors hover:border-line-strong focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={jobFilter} onChange={(e) => setJobFilter(e.target.value)} className="h-9 w-auto min-w-[180px] text-[13px]">
              <option value="all">All roles</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title}
                </option>
              ))}
            </Select>
            <Select value={sort} onChange={(e) => setSort(e.target.value)} className="h-9 w-auto min-w-[150px] text-[13px]">
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-line-soft pt-3">
          {statusChips.map((s) => {
            const label = s === "all" ? "All" : STATUS_META[s].label;
            const count = s === "all" ? candidates.length : candidates.filter((c) => c.status === s).length;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors",
                  status === s
                    ? "border-primary/25 bg-primary-soft text-primary"
                    : "border-line bg-surface text-muted hover:border-line-strong hover:text-ink"
                )}
              >
                {label}
                <span className="ml-1.5 tabular-nums opacity-60">{count}</span>
              </button>
            );
          })}
          {(query || status !== "all" || jobFilter !== "all") && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setStatus("all");
                setJobFilter("all");
              }}
              className="ml-auto flex items-center gap-1 text-[12px] text-muted transition-colors hover:text-ink"
            >
              <Icon.X size={13} />
              Clear filters
            </button>
          )}
        </div>
      </Card>

      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-[12.5px] text-muted">
          Showing <span className="font-medium text-ink">{visible.length}</span> of {candidates.length} candidates
        </span>
      </div>

      <Card className="overflow-hidden">
        <div className="hidden md:block">
          <CandidateTable candidates={visible} jobsById={jobsById} emptyLabel={emptyLabel} />
        </div>
        <div className="md:hidden">
          {visible.length ? (
            <CandidateCards candidates={visible} jobsById={jobsById} />
          ) : (
            <div className="px-6 py-14 text-center text-[13px] text-muted">{emptyLabel}</div>
          )}
        </div>
      </Card>
    </>
  );
}
