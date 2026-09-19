"use client";

// Reason-required confirmation for passing on a debrief candidate. The
// reason itself isn't just a courtesy — the caller pairs it with whether
// this decision agreed or disagreed with the AI's recommendation, which
// feeds the "HR agrees with AI X% of the time" trust metric later.

import { AnimatePresence, motion } from "framer-motion";
import { Button, Field, Textarea } from "@/components/ui/Primitives";
import { useState } from "react";

export function NotMovingForwardModal({ open, candidateName, onConfirm, onCancel }) {
  const [reason, setReason] = useState("");

  function confirm() {
    if (!reason.trim()) return;
    onConfirm(reason.trim());
    setReason("");
  }

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
            className="fixed left-1/2 top-1/2 z-[91] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-card border border-line bg-surface p-5 shadow-pop"
          >
            <h3 className="text-[15px] font-semibold text-ink">
              Not moving forward with {candidateName}?
            </h3>
            <p className="mt-2 text-[13px] leading-relaxed text-muted">
              A reason is required — it's kept with the record and used to track how often HR decisions
              agree with the AI's recommendation.
            </p>
            <Field label="Reason" htmlFor="not-moving-reason" required className="mt-4">
              <Textarea
                id="not-moving-reason"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Team needs deeper distributed-systems experience than this role's bar…"
                autoFocus
              />
            </Field>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={onCancel}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" onClick={confirm} disabled={!reason.trim()}>
                Confirm
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
