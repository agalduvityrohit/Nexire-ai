export function cn(...parts) {
  return parts.filter(Boolean).join(" ");
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatDate(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function relativeDays(iso) {
  if (!iso) return "—";
  // Real "today" (UTC midnight, to match the date-only strings stored on records).
  // This used to be frozen at 2026-07-27 for the prototype, which made every
  // record dated after that read "Today" — wrong for real accounts and the demo.
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const then = new Date(`${iso}T00:00:00Z`);
  const days = Math.round((today - then) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "1 week ago";
  if (days < 31) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} mo ago`;
}

export function initialsOf(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

// Deterministic avatar tint so the same person always gets the same colour.
const AVATAR_TINTS = [
  "bg-primary-soft text-primary",
  "bg-info-soft text-info",
  "bg-violet-soft text-violet",
  "bg-accent-soft text-accent",
  "bg-success-soft text-success",
  "bg-warn-soft text-warn",
];

export function tintFor(seed = "") {
  let sum = 0;
  for (let i = 0; i < seed.length; i += 1) sum += seed.charCodeAt(i);
  return AVATAR_TINTS[sum % AVATAR_TINTS.length];
}
