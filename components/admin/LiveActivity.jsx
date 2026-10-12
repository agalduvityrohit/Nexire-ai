"use client";

// The newest 50 events, refreshed every 30 seconds (paused while the tab is hidden).
// Times are formatted in the browser — formatting them on the server would show the
// server's timezone and trip a hydration mismatch.

import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/Primitives";

const TONE = {
  signup: "success", login_success: "info", login_failed: "danger", new_device_login: "warn",
  admin_blocked: "danger", jd_posted: "primary", resumes_ingested: "primary", shortlisted: "violet", invites_sent: "violet", page_view: "neutral",
};
const REFRESH_MS = 30_000;

function ago(iso, now) {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}

export function LiveActivity({ initial, includeSample, hidePageViews: hideInitially = false }) {
  const [rows, setRows] = useState(initial);
  const [hidePv, setHidePv] = useState(hideInitially);
  const [now, setNow] = useState(null);
  const [updated, setUpdated] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/traffic/live?pv=${hidePv ? 0 : 1}${includeSample ? "&sample=1" : ""}`, { cache: "no-store" });
      if (!res.ok) throw new Error(res.status === 404 ? "Signed out — reload the page." : "Couldn't refresh.");
      setRows((await res.json()).events);
      setError("");
      setUpdated(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }, [includeSample, hidePv]);

  // Re-fetch as soon as the toggle changes (the first render already has the matching rows).
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    refresh();
  }, [refresh]);

  useEffect(() => {
    setNow(Date.now());
    setUpdated(new Date());
    const tick = setInterval(() => setNow(Date.now()), 10_000);
    const poll = setInterval(() => document.visibilityState === "visible" && refresh(), REFRESH_MS);
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(tick); clearInterval(poll); document.removeEventListener("visibilitychange", onVisible); };
  }, [refresh]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-[12.5px] text-muted">
        <span aria-live="polite">
          {error ? <span className="text-danger">{error}</span> : <>Refreshes every 30 s{updated ? <> · updated {updated.toLocaleTimeString()}</> : null}</>}
        </span>
        <label className="flex items-center gap-2 text-ink-soft">
          <input type="checkbox" checked={hidePv} onChange={(e) => setHidePv(e.target.checked)} className="accent-[var(--color-primary)]" />
          Hide page views
        </label>
        <button type="button" onClick={refresh} disabled={busy} className="rounded-[8px] border border-line bg-surface px-2.5 py-1 font-medium text-ink-soft transition-colors hover:border-line-strong hover:text-ink disabled:opacity-60">
          {busy ? "Refreshing…" : "Refresh now"}
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-[10px] border border-dashed border-line px-4 py-8 text-center text-[13px] text-muted">
          No activity yet. Page views, sign-ups, logins and usage show up here the moment they happen.
        </p>
      ) : (
        <div className="relative max-h-[420px] overflow-auto rounded-[10px] border border-line">
          <table className="w-full min-w-[640px] text-left text-[13px]">
            <caption className="sr-only">The 50 most recent events, newest first</caption>
            <thead className="sticky top-0 bg-canvas-deep text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">
              <tr>
                {["Time", "Company", "Email", "Event", "City", "Device"].map((h) => (
                  <th key={h} scope="col" className="px-3 py-2">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-line-soft hover:bg-canvas-deep/40">
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums text-muted" title={new Date(r.at).toLocaleString()} suppressHydrationWarning>
                    {now ? ago(r.at, now) : ""}
                  </td>
                  <td className="px-3 py-2 text-ink">{r.company || <span className="text-faint">Visitor</span>}</td>
                  <td className="px-3 py-2 font-mono text-[12px] text-ink-soft">{r.email || <span className="text-faint">—</span>}</td>
                  <td className="px-3 py-2">
                    <Badge tone={TONE[r.type] || "neutral"}>{r.label}</Badge>
                    {r.count != null && <span className="ml-2 text-[12px] font-medium tabular-nums text-ink-soft">×{r.count}</span>}
                    {r.path && r.type === "page_view" && <span className="ml-2 text-[12px] text-muted">{r.path}</span>}
                  </td>
                  <td className="px-3 py-2 text-ink-soft">{r.city || <span className="text-faint">—</span>}</td>
                  <td className="px-3 py-2 text-ink-soft">{r.device || <span className="text-faint">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
