"use client";

// Small reusable confirmation modal for destructive actions (deleting a job,
// deleting a batch of candidates). Nothing fancy — backdrop, message, two
// buttons — but it's the one place that pattern lives instead of being
// re-built ad hoc wherever a delete button shows up.

import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/Primitives";

export function ConfirmDialog({ open, title, description, confirmLabel = "Delete", busy = false, onConfirm, onCancel }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="fixed inset-0 z-[90] bg-ink/35 backdrop-blur-[2px]"
          />
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            role="alertdialog"
            aria-modal="true"
            className="fixed left-1/2 top-1/2 z-[91] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-card border border-line bg-surface p-5 shadow-pop"
          >
            <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
            {description && <p className="mt-2 text-[13px] leading-relaxed text-muted">{description}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={onCancel} disabled={busy}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" onClick={onConfirm} disabled={busy}>
                {busy ? "Deleting…" : confirmLabel}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
