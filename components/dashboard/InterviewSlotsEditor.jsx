"use client";

// Interview times a company offers for a job. Shortlisted candidates get an
// email with a link to pick one — see lib/server/invites.js. Slots are stored as
// UTC ISO strings; the datetime-local input is read in this browser's timezone.

import { useState } from "react";
import { Button, Field, Input, Select } from "@/components/ui/Primitives";
import { Icon } from "@/components/ui/Icons";

const DURATIONS = [30, 45, 60, 90];

const fmt = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

export function InterviewSlotsEditor({ slots = [], onChange, managerEmail = "", onManagerEmailChange }) {
  const [when, setWhen] = useState("");
  const [minutes, setMinutes] = useState(45);
  const [error, setError] = useState("");

  function add() {
    setError("");
    const start = new Date(when);
    if (!when || Number.isNaN(start.getTime())) return setError("Pick a date and time.");
    if (start.getTime() < Date.now()) return setError("That time is in the past.");

    const end = new Date(start.getTime() + minutes * 60000);
    const id = `slot-${start.getTime()}`;
    if (slots.some((s) => s.id === id)) return setError("You already added that time.");

    onChange([...slots, { id, start: start.toISOString(), end: end.toISOString() }].sort((a, b) => (a.start < b.start ? -1 : 1)));
    setWhen("");
  }

  const upcoming = slots.filter((s) => new Date(s.start) > new Date()).length;

  return (
    <div>
      <p className="text-[12.5px] leading-relaxed text-muted">
        When you shortlist someone for this role, they get an email with a link to pick one of these times. Interviews are in-person /
        offline for now. Each time can be taken by one candidate.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_120px_auto] sm:items-end">
        <Field label="Date & time" htmlFor="slot-when">
          <Input id="slot-when" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
        </Field>
        <Field label="Length" htmlFor="slot-len">
          <Select id="slot-len" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>
            {DURATIONS.map((d) => (
              <option key={d} value={d}>
                {d} min
              </option>
            ))}
          </Select>
        </Field>
        <Button type="button" variant="secondary" size="md" onClick={add}>
          <Icon.Plus size={14} />
          Add time
        </Button>
      </div>
      {error && <p className="mt-2 text-[12.5px] text-danger">{error}</p>}

      {slots.length > 0 ? (
        <ul className="mt-4 flex flex-wrap gap-2">
          {slots.map((s) => {
            const past = new Date(s.start) <= new Date();
            return (
              <li
                key={s.id}
                className={`flex items-center gap-2 rounded-full border px-3 py-1 text-[12.5px] ${past ? "border-line-soft text-faint line-through" : "border-line bg-surface text-ink-soft"}`}
              >
                {fmt.format(new Date(s.start))}
                <button
                  type="button"
                  aria-label="Remove this time"
                  onClick={() => onChange(slots.filter((x) => x.id !== s.id))}
                  className="text-faint transition-colors hover:text-danger"
                >
                  <Icon.X size={12} />
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-4 text-[12.5px] text-warn">No times yet — shortlisted candidates won&apos;t be emailed until you add some.</p>
      )}
      {slots.length > 0 && upcoming === 0 && (
        <p className="mt-2 text-[12.5px] text-warn">All of these times have passed. Add new ones.</p>
      )}

      {onManagerEmailChange && (
        <div className="mt-4">
          <Field label="Hiring manager email" htmlFor="slot-manager" hint="· gets the booking confirmation · defaults to your login email">
            <Input
              id="slot-manager"
              type="email"
              value={managerEmail}
              onChange={(e) => onManagerEmailChange(e.target.value)}
              placeholder="manager@company.com"
            />
          </Field>
        </div>
      )}
    </div>
  );
}
