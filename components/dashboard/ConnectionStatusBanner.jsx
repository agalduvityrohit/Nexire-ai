"use client";

// Small "is this actually connected" status line for a screen that depends
// on an external service — Mail (Gmail), GitHub, or a channel that has no
// backing provider yet (Calling). Checks real status via
// /api/settings/keys, the same endpoint Settings itself reads from, so it
// never drifts out of sync with what's actually saved.

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icons";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

/**
 * @param {string} [provider] a key in ALL_PROVIDER_IDS ("gmail" | "github" | an LLM id) —
 *   fetches real connection status. Omit when there's nothing to check (e.g. Calling).
 * @param {string} label display name, e.g. "Mail", "GitHub", "Calling"
 * @param {string} [note] shown only in the not-connected state, in place of the default "Connect" link
 */
export function ConnectionStatusBanner({ provider, label, note }) {
  const { session } = useStore();
  const companyId = session?.company?.id || "demo-company";
  const [status, setStatus] = useState(provider ? null : { connected: false });

  useEffect(() => {
    if (!provider) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/settings/keys?companyId=${encodeURIComponent(companyId)}`);
        const json = await res.json();
        if (cancelled) return;
        setStatus(res.ok ? json.status?.[provider] || { connected: false } : { connected: false });
      } catch {
        if (!cancelled) setStatus({ connected: false });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [provider, companyId]);

  // Still loading — say nothing rather than flash "not connected" first.
  if (!status) return null;

  return (
    <div
      className={cn(
        "mb-4 flex flex-wrap items-center gap-2 rounded-[10px] border px-3.5 py-2.5 text-[12.5px]",
        status.connected ? "border-success/25 bg-success-soft" : "border-warn/25 bg-warn-soft"
      )}
    >
      {status.connected ? (
        <Icon.Check size={14} className="shrink-0 text-success" />
      ) : (
        <Icon.Warning size={14} className="shrink-0 text-warn" />
      )}
      <span className={cn("font-medium", status.connected ? "text-success" : "text-warn")}>{label}</span>
      <span className="text-ink-soft">
        {status.connected ? `connected${status.account ? ` · ${status.account}` : ""}` : note || "not connected"}
      </span>
      {!status.connected && provider && (
        <a
          href="/dashboard/settings"
          className="ml-auto shrink-0 font-medium text-primary underline underline-offset-2 hover:opacity-80"
        >
          Connect
        </a>
      )}
    </div>
  );
}
