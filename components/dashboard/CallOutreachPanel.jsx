"use client";

// No calling provider is connected and no call has ever been placed — this is
// a real empty state, not a mock table. See README-INTEGRATIONS.md.
//
// COMPLIANCE: automated/bulk calling in India is regulated by TRAI (TCCCPR),
// which covers consent registration, DLT scrubbing, and calling-time windows.
// That needs proper legal review before any real dialling is built.

import { Card } from "@/components/ui/Primitives";
import { Icon } from "@/components/ui/Icons";

export function CallOutreachPanel() {
  return (
    <Card className="flex flex-col items-center gap-3 py-16 text-center">
      <span className="flex size-10 items-center justify-center rounded-full bg-canvas-deep text-faint">
        <Icon.Phone size={18} />
      </span>
      <p className="text-[14px] font-medium text-ink">Calling isn&apos;t set up yet</p>
      <p className="max-w-sm text-[13px] leading-relaxed text-muted">
        No calling provider is connected, so nothing here is real yet — not even sample data. Automated calling in
        India also needs TRAI/TCCCPR compliance review (consent registration, DLT scrubbing, calling-time windows)
        before it can go live.
      </p>
    </Card>
  );
}
