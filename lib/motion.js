// Single source of truth for landing-page motion.
//
// One easing curve, one set of durations, one stagger rhythm. Every animated
// component imports from here so the page keeps a single motion personality as
// more sections get added.
//
// Rules this file encodes:
//   · ease-out-expo everywhere — no springs, no linear, no mixing
//   · reveals are opacity + a small upward nudge; never scale, rotate or slide far
//   · scroll reveals fire once and settle; they never re-trigger
//   · exactly one continuous loop on the page (the hero waveform)

/** cubic-bezier(0.16, 1, 0.3, 1) — smooth ease-out-expo. */
export const EASE = [0.16, 1, 0.3, 1];
export const EASE_CSS = "cubic-bezier(0.16, 1, 0.3, 1)";

export const DURATION = {
  hover: 0.2,
  quick: 0.32,
  base: 0.55,
  slow: 0.75,
};

/** 90ms between siblings — present enough to read as a sequence, not a queue. */
export const STAGGER = 0.09;

/** Reveal travel. Small on purpose; big slides read as cheap. */
export const RISE = 14;

/** Report/debrief evidence rows travel a touch less and land further apart —
 * each one is meant to be read before the next appears. */
export const RISE_REPORT = 10;
export const STAGGER_REPORT = 0.22;

/** Waveform bars — the one continuous loop on the page. */
export const STAGGER_WAVEFORM = 0.07;

/** Pipeline dots (Source-from-everywhere): distinct enough that three
 * simultaneous starts would read as noise, not a converging flow. */
export const STAGGER_PIPELINE = 0.3;

/** Fires once the element is ~30% visible, slightly before fully in frame,
 * and only ever once. */
export const VIEWPORT = { once: true, amount: 0.3, margin: "-10% 0px -8% 0px" };

export function transition(duration = DURATION.base, delay = 0) {
  return { duration, delay, ease: EASE };
}

/* --------------------------------------------------------------- variants */

export const fadeUp = {
  hidden: { opacity: 0, y: RISE },
  show: { opacity: 1, y: 0, transition: transition() },
};

/** Reduced-motion counterpart: fades only, no travel. */
export const fadeOnly = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: transition(DURATION.quick) },
};

export function staggerParent(delayChildren = 0, stagger = STAGGER) {
  return {
    hidden: {},
    show: { transition: { staggerChildren: stagger, delayChildren } },
  };
}

/** Picks the right variant set for the user's motion preference. */
export function revealVariants(reduced) {
  return reduced ? fadeOnly : fadeUp;
}

/* ----------------------------------------------------------------- hovers */

// One hover treatment, everywhere a clickable element exists: scale to
// 1.02x, a soft shadow lift, 200ms on the shared curve. No color-inverting
// flashes, no icon spins, no bounce — every button, card, and link on the
// site uses one of these two strings, never a bespoke hover of its own.
export const HOVER_CARD =
  "transition-[transform,box-shadow,border-color] duration-200 ease-brand hover:scale-[1.02] hover:shadow-lift";

export const HOVER_CARD_BORDER = `${HOVER_CARD} hover:border-line-strong`;

// For elements with no meaningful shadow surface of their own (plain text
// nav/footer links, icon-only controls) — same scale and timing, no shadow.
// Deliberately doesn't declare its own `transition-property`: compose it
// alongside whatever color/background transition the element already has
// (e.g. `transition-[color,transform]`) rather than letting two separate
// transition-property utilities fight over the same CSS property.
export const HOVER_LIFT = "duration-200 ease-brand hover:scale-[1.02]";
