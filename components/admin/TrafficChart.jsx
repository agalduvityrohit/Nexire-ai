"use client";

// Visitors vs. logins per day. Hand-drawn SVG (no chart dependency).
//  - hover / touch / arrow keys: guide line + tooltip with both values for that day
//  - the two series differ by line style as well as colour (solid vs dashed), so
//    colour is never the only cue
//  - a Chart / Table toggle gives the same numbers as a real, readable table

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const H = 260, M = { l: 38, r: 14, t: 14, b: 30 };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmtDay = (d) => `${MONTHS[Number(d.slice(5, 7)) - 1]} ${Number(d.slice(8, 10))}`;

// Top of the axis = 4 equal steps of a "nice" whole-number size, so the labels are
// always integers (0, 12, 24, 36, 48 — never 13, 38).
function niceMax(v) {
  const bases = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8];
  for (let p = 1; p <= 1e9; p *= 10) {
    for (const b of bases) {
      const step = b * p;
      if (Number.isInteger(step) && step * 4 >= v) return step * 4;
    }
  }
  return 4;
}

export function TrafficChart({ series }) {
  const [view, setView] = useState("chart");
  const [hover, setHover] = useState(null);
  const ref = useRef(null);
  const wrap = useRef(null);
  // Draw at the real pixel width. Scaling a fixed 720-unit drawing down to a phone makes
  // the labels ~5px; measuring keeps text at its true 11px at any width.
  const [W, setW] = useState(720);
  useEffect(() => {
    const el = wrap.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => setW(Math.max(280, Math.round(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, [view]);

  const n = series.length;
  const max = niceMax(Math.max(...series.map((d) => Math.max(d.visitors, d.logins)), 0));
  const x = (i) => M.l + (n === 1 ? (W - M.l - M.r) / 2 : (i * (W - M.l - M.r)) / (n - 1));
  const y = (v) => M.t + (1 - v / max) * (H - M.t - M.b);
  const line = (key) => series.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`).join(" ");
  const ticks = [0, 1, 2, 3, 4].map((t) => (max * t) / 4);
  const every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor((W - M.l - M.r) / 64)))); // keep x labels >= ~64px apart
  const empty = series.every((d) => d.visitors === 0 && d.logins === 0);

  function nearest(clientX) {
    const box = ref.current?.getBoundingClientRect();
    if (!box) return;
    const px = ((clientX - box.left) / box.width) * W;
    const i = Math.round(((px - M.l) / (W - M.l - M.r)) * (n - 1));
    setHover(Math.min(n - 1, Math.max(0, i)));
  }

  const h = hover != null ? series[hover] : null;
  const summary = `Daily visitors and logins, ${fmtDay(series[0].day)} to ${fmtDay(series[n - 1].day)}.`;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4 text-[12.5px] text-ink-soft" aria-hidden="true">
          <span className="flex items-center gap-2">
            <svg width="26" height="8"><line x1="1" y1="4" x2="25" y2="4" className="stroke-primary" strokeWidth="2.5" strokeLinecap="round" /></svg>
            Visitors
          </span>
          <span className="flex items-center gap-2">
            <svg width="26" height="8"><line x1="1" y1="4" x2="25" y2="4" className="stroke-accent" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="5 4" /></svg>
            Logins
          </span>
        </div>
        <div role="group" aria-label="Chart or table" className="inline-flex rounded-[9px] border border-line bg-canvas-deep/60 p-0.5 text-[12.5px]">
          {["chart", "table"].map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => setView(v)}
              className={cn("rounded-[7px] px-3 py-1 font-medium capitalize transition-colors", view === v ? "bg-surface text-ink shadow-xs ring-1 ring-line" : "text-muted hover:text-ink")}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {view === "table" ? (
        <div className="relative max-h-[320px] overflow-auto rounded-[10px] border border-line">
          <table className="w-full text-left text-[13px]">
            <caption className="sr-only">{summary}</caption>
            <thead className="sticky top-0 bg-canvas-deep text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">
              <tr>
                <th scope="col" className="px-3 py-2">Date</th>
                <th scope="col" className="px-3 py-2 text-right">Visitors</th>
                <th scope="col" className="px-3 py-2 text-right">Logins</th>
              </tr>
            </thead>
            <tbody>
              {[...series].reverse().map((d) => (
                <tr key={d.day} className="border-t border-line-soft">
                  <th scope="row" className="px-3 py-1.5 font-normal text-ink-soft">{fmtDay(d.day)}</th>
                  <td className="px-3 py-1.5 text-right tabular-nums">{d.visitors}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{d.logins}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative" ref={wrap}>
          <svg
            ref={ref}
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label={`${summary} Use the left and right arrow keys to move between days, or switch to the table.`}
            tabIndex={0}
            className="h-auto w-full touch-pan-y select-none outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            onPointerMove={(e) => nearest(e.clientX)}
            onPointerLeave={() => setHover(null)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") setHover((i) => Math.min(n - 1, (i ?? -1) + 1));
              else if (e.key === "ArrowLeft") setHover((i) => Math.max(0, (i ?? n) - 1));
              else if (e.key === "Escape") setHover(null);
            }}
            onBlur={() => setHover(null)}
          >
            {ticks.map((t) => (
              <g key={t}>
                <line x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} className="stroke-line-soft" strokeWidth="1" />
                <text x={M.l - 8} y={y(t) + 4} textAnchor="end" className="fill-muted text-[11px]">{Math.round(t)}</text>
              </g>
            ))}
            {series.map((d, i) =>
              (i % every === 0 && n - 1 - i >= Math.ceil(every / 2)) || i === n - 1 ? ( // last label always shown; skip a neighbour that would touch it
                <text key={d.day} x={x(i)} y={H - 8} textAnchor="middle" className="fill-muted text-[11px]">{fmtDay(d.day)}</text>
              ) : null
            )}

            {h && <line x1={x(hover)} x2={x(hover)} y1={M.t} y2={H - M.b} className="stroke-line-strong" strokeWidth="1" strokeDasharray="3 3" />}

            <path d={line("visitors")} fill="none" className="stroke-primary" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
            <path d={line("logins")} fill="none" className="stroke-accent" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" strokeDasharray="6 5" />
            {series.map((d, i) => (
              <g key={d.day}>
                <circle cx={x(i)} cy={y(d.visitors)} r={hover === i ? 5 : 3} className="fill-surface stroke-primary" strokeWidth="2" />
                <rect x={x(i) - 3.5} y={y(d.logins) - 3.5} width="7" height="7" rx="1.5" className={cn("stroke-accent", hover === i ? "fill-accent" : "fill-surface")} strokeWidth="2" />
              </g>
            ))}
          </svg>

          {h && (
            <div
              role="status"
              className="pointer-events-none absolute top-2 z-10 min-w-[130px] rounded-[10px] border border-line bg-surface px-3 py-2 text-[12.5px] shadow-lift"
              style={{ left: `clamp(8px, calc(${(x(hover) / W) * 100}% - 65px), calc(100% - 140px))` }}
            >
              <div className="font-semibold text-ink">{fmtDay(h.day)}</div>
              <div className="mt-1 flex items-center justify-between gap-4 text-ink-soft"><span>Visitors</span><span className="font-semibold tabular-nums text-ink">{h.visitors}</span></div>
              <div className="flex items-center justify-between gap-4 text-ink-soft"><span>Logins</span><span className="font-semibold tabular-nums text-ink">{h.logins}</span></div>
            </div>
          )}

          {empty && (
            <p className="absolute inset-x-0 top-1/2 -translate-y-1/2 px-6 text-center text-[13px] text-muted">
              Nothing recorded in this range yet. Visitors and logins appear here as people use the site.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
