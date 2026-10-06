// Turns lib/demoData.json into the jobs + candidates the public demo shows.
//
// The JSON (built by scripts/build-demo-data.mjs from the 500 sample résumé PDFs)
// stores everything time-related as an offset — "applied 12 days ago", "interview
// in 30 hours" — so this resolves them against the moment the demo is seeded.
// Without that, a demo deployed today would show "applied 12 days ago" forever.
//
// Server-only. Loaded lazily (dynamic import) so the ~1 MB JSON is only pulled
// in when the demo is actually requested, not by every API route.

const DAY = 86400000;
const HOUR = 3600000;

export async function loadDemoDataset(now = new Date()) {
  const { default: raw } = await import("@/lib/demoData.json");

  const dateOnly = (daysAgo) => new Date(now - daysAgo * DAY).toISOString().slice(0, 10);
  const when = (daysAgo, tod) => {
    const d = new Date(now - daysAgo * DAY);
    d.setHours(Math.floor(tod / 60), tod % 60, 0, 0);
    return d;
  };
  // Same shape as lib/candidates.js#timestamp, which is what real timelines use.
  const stamp = (d) =>
    `${d.toISOString().slice(0, 10)} · ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;

  const jobs = raw.jobs.map(({ postedDaysAgo, interviewSlotHours, ...job }) => ({
    ...job,
    postedAt: dateOnly(postedDaysAgo),
    interviewSlots: interviewSlotHours.map((h, i) => {
      const start = new Date(now.getTime() + h * HOUR);
      return { id: `${job.id}-slot-${i + 1}`, start: start.toISOString(), end: new Date(start.getTime() + 45 * 60000).toISOString() };
    }),
  }));
  const jobsById = new Map(jobs.map((j) => [j.id, j]));

  const candidates = raw.candidates.map((c) => {
    const slot = c.slotIndex != null ? jobsById.get(c.jobId)?.interviewSlots[c.slotIndex] : null;
    const {
      appliedDaysAgo, tod, events, shortlistedDaysAgo, invitedDaysAgo, interviewInHours, slotIndex, invited,
      ...rest
    } = c;

    return {
      ...rest,
      skills: c.skills.map((name) => ({ name, level: "Working", years: 0 })),
      aiFlags: c.aiFlags || [],
      appliedAt: dateOnly(appliedDaysAgo),
      shortlistedAt: shortlistedDaysAgo != null ? when(shortlistedDaysAgo, tod).toISOString() : null,
      invitedAt: invitedDaysAgo != null ? when(invitedDaysAgo, tod).toISOString() : null,
      interviewAt: slot ? slot.start : null,
      timeline: events.map((e) => ({
        at: stamp(when(e.daysAgo, tod)),
        event: e.withTime && slot ? `Interview scheduled — ${slot.start.slice(0, 16).replace("T", " ")} UTC` : e.event,
        kind: e.kind,
      })),
    };
  });

  return { jobs, candidates };
}
