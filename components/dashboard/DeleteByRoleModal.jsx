"use client";

// Bulk-delete candidates by role — résumés are already segregated by role
// (bulk upload, Gmail import, GitHub sourcing all classify into one), so
// clearing out a role you don't need is picking checkboxes, not hunting
// through individual rows.

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Primitives";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Icon } from "@/components/ui/Icons";
import { cn } from "@/lib/utils";

export function DeleteByRoleModal({ open, onClose, candidates, deleteCandidates, notify }) {
  const [selectedRoles, setSelectedRoles] = useState(new Set());
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const roleCounts = useMemo(() => {
    const counts = new Map();
    for (const c of candidates) {
      const role = c.role || "Other";
      counts.set(role, (counts.get(role) || 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [candidates]);

  const matchingIds = useMemo(
    () => candidates.filter((c) => selectedRoles.has(c.role || "Other")).map((c) => c.id),
    [candidates, selectedRoles]
  );

  function toggleRole(role) {
    setSelectedRoles((prev) => {
      const next = new Set(prev);
      if (next.has(role)) next.delete(role);
      else next.add(role);
      return next;
    });
  }

  function close() {
    setSelectedRoles(new Set());
    setConfirming(false);
    onClose();
  }

  async function confirmedDelete() {
    setBusy(true);
    const result = await deleteCandidates(matchingIds);
    setBusy(false);
    setConfirming(false);
    if (result.ok) {
      notify(`${matchingIds.length} candidate${matchingIds.length === 1 ? "" : "s"} deleted`);
      close();
    } else {
      notify(result.error || "Couldn't delete candidates.", "warn");
    }
  }

  if (!open) return null;

  return (
    <>
      <div onClick={close} className="fixed inset-0 z-[80] bg-ink/35 backdrop-blur-[2px]" />
      <div
        role="dialog"
        aria-modal="true"
        className="fixed left-1/2 top-1/2 z-[81] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-card border border-line bg-surface p-5 shadow-pop"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-[15px] font-semibold text-ink">Delete candidates by role</h3>
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
              Résumés are already segregated by role — pick the ones you don&apos;t need to clear a whole
              set at once.
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="flex size-7 shrink-0 items-center justify-center rounded-md text-faint transition-colors hover:bg-canvas-deep hover:text-ink"
          >
            <Icon.X size={16} />
          </button>
        </div>

        <ul className="mt-4 max-h-72 space-y-1 overflow-y-auto thin-scrollbar">
          {roleCounts.map(([role, count]) => {
            const checked = selectedRoles.has(role);
            return (
              <li key={role}>
                <button
                  type="button"
                  onClick={() => toggleRole(role)}
                  aria-pressed={checked}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-[9px] border px-3 py-2 text-left transition-colors",
                    checked ? "border-danger/30 bg-danger-soft" : "border-line hover:border-line-strong"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center rounded-[5px] border transition-colors",
                      checked ? "border-danger bg-danger text-white" : "border-line-strong"
                    )}
                  >
                    {checked && <Icon.Check size={11} />}
                  </span>
                  <span className="flex-1 text-[13px] text-ink">{role}</span>
                  <span className="text-[12px] tabular-nums text-muted">{count}</span>
                </button>
              </li>
            );
          })}
          {!roleCounts.length && (
            <li className="py-8 text-center text-[12.5px] text-muted">No candidates yet.</li>
          )}
        </ul>

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-line-soft pt-4">
          <span className="text-[12.5px] text-muted">
            {matchingIds.length} candidate{matchingIds.length === 1 ? "" : "s"} selected
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={close}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" disabled={!matchingIds.length} onClick={() => setConfirming(true)}>
              <Icon.Trash size={14} />
              Delete
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirming}
        title={`Delete ${matchingIds.length} candidate${matchingIds.length === 1 ? "" : "s"}?`}
        description={`From: ${[...selectedRoles].join(", ")}. This can't be undone.`}
        busy={busy}
        onConfirm={confirmedDelete}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
