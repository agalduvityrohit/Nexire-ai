"use client";

import { Badge } from "@/components/ui/Primitives";
import { STATUS_META } from "@/lib/mock-data";

export function StatusBadge({ status, className }) {
  const meta = STATUS_META[status] || STATUS_META.applied;
  return (
    <Badge tone={meta.tone} dot className={className}>
      {meta.label}
    </Badge>
  );
}
