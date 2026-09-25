"use client";

// Candidate-facing, no login. The token in the URL is the credential.

import { use, useEffect, useMemo, useState } from "react";
import { Wordmark } from "@/components/public/TopNav";
import { Button, Card } from "@/components/ui/Primitives";
import { Icon } from "@/components/ui/Icons";
import { cn } from "@/lib/utils";

const dayFmt = new Intl.DateTimeFormat(undefined, { weekday: "long", day: "numeric", month: "long" });
const timeFmt = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const fullFmt = new Intl.DateTimeFormat(undefined, { weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit", timeZoneName: "short" });

export default function SchedulePage({ params }) {
  const { token } = use(params);
  const [state, setState] = useState({ phase: "loading" }); // loading | ready | error
  const [picked, setPicked] = useState(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    try {
      const res = await fetch(`/api/schedule/${encodeURIComponent(token)}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) return setState({ phase: "error", message: json.error || "This link isn't valid." });
      setState({ phase: "ready", data: json });
    } catch {
      setState({ phase: "error", message: "Couldn't load this page. Check your connection and try again." });
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function confirm() {
    if (!picked) return;
    setPending(true);
    setError("");
    try {
      const res = await fetch(`/api/schedule/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId: picked }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Couldn't book that time.");
        setPicked(null);
        await load(); // refresh which slots are still free
        setPending(false);
        return;
      }
      await load();
    } catch {
      setError("Network error — try again.");
    }
    setPending(false);
  }

  const data = state.data;
  const byDay = useMemo(() => {
    const groups = new Map();
    for (const s of data?.slots || []) {
      const key = dayFmt.format(new Date(s.start));
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(s);
    }
    return [...groups.entries()];
  }, [data]);

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="px-5 py-6 sm:px-10">
        <Wordmark />
      </header>

      <main className="mx-auto max-w-[520px] px-5 pb-16">
        {state.phase === "loading" && <p className="pt-16 text-center text-[13px] text-muted">Loading…</p>}

        {state.phase === "error" && (
          <Card className="mt-6 p-6 text-center">
            <h1 className="text-[17px] font-semibold text-ink">We couldn&apos;t open this page</h1>
            <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{state.message}</p>
          </Card>
        )}

        {state.phase === "ready" && data.status === "booked" && (
          <Card className="mt-6 p-6 text-center">
            <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-success-soft text-success">
              <Icon.Check size={20} />
            </span>
            <h1 className="mt-4 text-[19px] font-semibold tracking-[-0.02em] text-ink">You&apos;re booked in</h1>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">
              {data.roleTitle} at {data.companyName}
            </p>
            {data.selected && (
              <div className="mt-4 rounded-[10px] bg-canvas-deep px-4 py-3 text-[14.5px] font-medium text-ink">{fullFmt.format(new Date(data.selected.start))}</div>
            )}
            <p className="mt-4 text-[13px] leading-relaxed text-muted">
              This is an in-person / offline conversation with the hiring team. A confirmation is on its way to your inbox.
              Need to change it? Reply to that email.
            </p>
          </Card>
        )}

        {state.phase === "ready" && (data.status === "expired" || data.status === "cancelled") && (
          <Card className="mt-6 p-6 text-center">
            <h1 className="text-[17px] font-semibold text-ink">This link has expired</h1>
            <p className="mt-2 text-[13.5px] leading-relaxed text-muted">Reply to the email you received and the team will send you a fresh one.</p>
          </Card>
        )}

        {state.phase === "ready" && data.status === "pending" && (
          <>
            <div className="pt-4">
              <h1 className="text-[22px] font-semibold tracking-[-0.025em] text-ink">
                {data.firstName ? `Hi ${data.firstName} — pick a time` : "Pick a time"}
              </h1>
              <p className="mt-2 text-[14px] leading-relaxed text-muted">
                Your interview for <span className="font-medium text-ink-soft">{data.roleTitle}</span> at{" "}
                <span className="font-medium text-ink-soft">{data.companyName}</span> is an in-person / offline conversation with the team. Times are
                shown in your local time.
              </p>
            </div>

            {error && <div className="mt-4 rounded-[10px] border border-danger/25 bg-danger-soft px-3 py-2.5 text-[12.5px] text-danger">{error}</div>}

            <div className="mt-5 space-y-5">
              {byDay.map(([day, slots]) => (
                <div key={day}>
                  <div className="mb-2 text-[12px] font-semibold uppercase tracking-[0.07em] text-muted">{day}</div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {slots.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        disabled={!s.available || pending}
                        onClick={() => setPicked(s.id)}
                        className={cn(
                          "rounded-[10px] border px-3 py-2.5 text-[14px] font-medium transition-[border-color,background-color,transform] duration-200",
                          !s.available && "cursor-not-allowed border-line-soft bg-canvas-deep/50 text-faint line-through",
                          s.available && picked !== s.id && "border-line bg-surface text-ink hover:scale-[1.02] hover:border-primary/50",
                          picked === s.id && "border-primary bg-primary-soft text-primary ring-2 ring-primary/20"
                        )}
                      >
                        {timeFmt.format(new Date(s.start))}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {!byDay.length && (
                <Card className="p-5 text-center text-[13.5px] text-muted">
                  There are no open times right now. Reply to the email and the team will add some.
                </Card>
              )}
            </div>

            {picked && (
              <div className="sticky bottom-4 mt-6">
                <Card className="flex items-center justify-between gap-3 p-4 shadow-lift">
                  <div className="min-w-0 text-[13.5px]">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">Selected</div>
                    <div className="truncate font-medium text-ink">{fullFmt.format(new Date(data.slots.find((s) => s.id === picked).start))}</div>
                  </div>
                  <Button variant="primary" size="md" onClick={confirm} disabled={pending}>
                    {pending ? "Booking…" : "Confirm"}
                  </Button>
                </Card>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
