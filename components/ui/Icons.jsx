// Hand-rolled stroke icons — keeps the prototype dependency-free and consistent.

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

function Svg({ size = 18, children, ...rest }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" {...base} {...rest}>
      {children}
    </svg>
  );
}

export const Icon = {
  Grid: (p) => (
    <Svg {...p}>
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.8" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.8" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.8" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.8" />
    </Svg>
  ),
  Briefcase: (p) => (
    <Svg {...p}>
      <rect x="2.75" y="7" width="18.5" height="13" rx="2.4" />
      <path d="M8.5 7V5.6A1.6 1.6 0 0 1 10.1 4h3.8a1.6 1.6 0 0 1 1.6 1.6V7" />
      <path d="M2.75 12.5h18.5" />
    </Svg>
  ),
  Users: (p) => (
    <Svg {...p}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M2.8 20a6.2 6.2 0 0 1 12.4 0" />
      <path d="M16.2 5.2a3.2 3.2 0 0 1 0 6.1" />
      <path d="M17.6 14.2A6.2 6.2 0 0 1 21.4 20" />
    </Svg>
  ),
  Settings: (p) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="3.1" />
      <path d="M19.4 14.2a1.6 1.6 0 0 0 .32 1.77l.06.06a1.9 1.9 0 1 1-2.7 2.7l-.05-.06a1.6 1.6 0 0 0-1.78-.32 1.6 1.6 0 0 0-.97 1.47v.17a1.9 1.9 0 1 1-3.8 0v-.09a1.6 1.6 0 0 0-1.05-1.47 1.6 1.6 0 0 0-1.77.32l-.06.06a1.9 1.9 0 1 1-2.7-2.7l.06-.06a1.6 1.6 0 0 0 .32-1.77 1.6 1.6 0 0 0-1.47-.97h-.17a1.9 1.9 0 1 1 0-3.8h.09a1.6 1.6 0 0 0 1.47-1.05 1.6 1.6 0 0 0-.32-1.77l-.06-.06a1.9 1.9 0 1 1 2.7-2.7l.06.06a1.6 1.6 0 0 0 1.77.32h.08A1.6 1.6 0 0 0 10.3 3.9v-.17a1.9 1.9 0 1 1 3.8 0v.09a1.6 1.6 0 0 0 .97 1.47 1.6 1.6 0 0 0 1.78-.32l.05-.06a1.9 1.9 0 1 1 2.7 2.7l-.06.06a1.6 1.6 0 0 0-.32 1.77v.08a1.6 1.6 0 0 0 1.47.97h.17a1.9 1.9 0 1 1 0 3.8h-.09a1.6 1.6 0 0 0-1.47.97Z" />
    </Svg>
  ),
  Board: (p) => (
    <Svg {...p}>
      <rect x="3" y="3.5" width="5" height="17" rx="1.8" />
      <rect x="9.5" y="3.5" width="5" height="11" rx="1.8" />
      <rect x="16" y="3.5" width="5" height="14" rx="1.8" />
    </Svg>
  ),
  Plus: (p) => (
    <Svg {...p}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  ),
  ArrowRight: (p) => (
    <Svg {...p}>
      <path d="M4.5 12h15M13.5 6l6 6-6 6" />
    </Svg>
  ),
  ArrowLeft: (p) => (
    <Svg {...p}>
      <path d="M19.5 12h-15M10.5 6l-6 6 6 6" />
    </Svg>
  ),
  ChevronDown: (p) => (
    <Svg {...p}>
      <path d="M6 9.5l6 6 6-6" />
    </Svg>
  ),
  ChevronRight: (p) => (
    <Svg {...p}>
      <path d="M9.5 5.5l6.5 6.5-6.5 6.5" />
    </Svg>
  ),
  Check: (p) => (
    <Svg {...p}>
      <path d="M4.5 12.5l5 5 10-11" />
    </Svg>
  ),
  X: (p) => (
    <Svg {...p}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  ),
  Search: (p) => (
    <Svg {...p}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4.5 4.5" />
    </Svg>
  ),
  Sparkle: (p) => (
    <Svg {...p}>
      <path d="M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9z" />
      <path d="M18.5 16.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" />
    </Svg>
  ),
  Mic: (p) => (
    <Svg {...p}>
      <rect x="9" y="2.5" width="6" height="11.5" rx="3" />
      <path d="M5 11.5a7 7 0 0 0 14 0" />
      <path d="M12 18.5V21.5" />
    </Svg>
  ),
  Doc: (p) => (
    <Svg {...p}>
      <path d="M14 2.75H7.4A2.4 2.4 0 0 0 5 5.15v13.7a2.4 2.4 0 0 0 2.4 2.4h9.2a2.4 2.4 0 0 0 2.4-2.4V8z" />
      <path d="M14 2.75V8h5" />
      <path d="M8.5 13h7M8.5 16.5h4.5" />
    </Svg>
  ),
  Upload: (p) => (
    <Svg {...p}>
      <path d="M12 16V4.5" />
      <path d="M7.5 9L12 4.5 16.5 9" />
      <path d="M4 15.5v2.9A2.6 2.6 0 0 0 6.6 21h10.8a2.6 2.6 0 0 0 2.6-2.6v-2.9" />
    </Svg>
  ),
  Mail: (p) => (
    <Svg {...p}>
      <rect x="2.75" y="4.75" width="18.5" height="14.5" rx="2.4" />
      <path d="M3.5 7.5l7.3 5.1a2 2 0 0 0 2.4 0l7.3-5.1" />
    </Svg>
  ),
  Phone: (p) => (
    <Svg {...p}>
      <path d="M6.2 3.5h3l1.5 4-2 1.4a12 12 0 0 0 6.4 6.4l1.4-2 4 1.5v3a2 2 0 0 1-2.2 2A17.5 17.5 0 0 1 4.2 5.7a2 2 0 0 1 2-2.2Z" />
    </Svg>
  ),
  Pin: (p) => (
    <Svg {...p}>
      <path d="M12 21.5s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z" />
      <circle cx="12" cy="10.2" r="2.6" />
    </Svg>
  ),
  Clock: (p) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.75" />
      <path d="M12 7v5.3l3.3 2" />
    </Svg>
  ),
  Link: (p) => (
    <Svg {...p}>
      <path d="M10 13.8a4 4 0 0 0 5.7 0l2.8-2.8a4 4 0 1 0-5.7-5.7l-1.4 1.4" />
      <path d="M14 10.2a4 4 0 0 0-5.7 0l-2.8 2.8a4 4 0 1 0 5.7 5.7l1.4-1.4" />
    </Svg>
  ),
  Star: (p) => (
    <Svg {...p}>
      <path d="M12 3.6l2.6 5.4 5.9.8-4.3 4.1 1.05 5.9L12 17l-5.25 2.8L7.8 13.9 3.5 9.8l5.9-.8z" />
    </Svg>
  ),
  Trend: (p) => (
    <Svg {...p}>
      <path d="M3.5 16.5l5.2-5.4 3.4 3.2 5.2-6" />
      <path d="M14.4 8.3h3.9v3.9" />
    </Svg>
  ),
  Inbox: (p) => (
    <Svg {...p}>
      <path d="M3 13.5V6.9A2.4 2.4 0 0 1 5.4 4.5h13.2A2.4 2.4 0 0 1 21 6.9v6.6" />
      <path d="M3 13.5h5l1.4 2.5h5.2l1.4-2.5h5v3.6a2.4 2.4 0 0 1-2.4 2.4H5.4A2.4 2.4 0 0 1 3 17.1z" />
    </Svg>
  ),
  Shield: (p) => (
    <Svg {...p}>
      <path d="M12 21.2s7-3.1 7-8.6V5.9L12 3.3 5 5.9v6.7c0 5.5 7 8.6 7 8.6Z" />
      <path d="M9 12.2l2.1 2.1L15.3 10" />
    </Svg>
  ),
  Bell: (p) => (
    <Svg {...p}>
      <path d="M18 9a6 6 0 1 0-12 0c0 5.2-2 6.8-2 6.8h16S18 14.2 18 9" />
      <path d="M13.7 19.5a2 2 0 0 1-3.4 0" />
    </Svg>
  ),
  Dots: (p) => (
    <Svg {...p}>
      <circle cx="5.5" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="18.5" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </Svg>
  ),
  Menu: (p) => (
    <Svg {...p}>
      <path d="M3.5 7h17M3.5 12h17M3.5 17h17" />
    </Svg>
  ),
  Filter: (p) => (
    <Svg {...p}>
      <path d="M3.5 5.5h17l-6.6 7.6v5.3l-3.8 2v-7.3z" />
    </Svg>
  ),
  Play: (p) => (
    <Svg {...p}>
      <path d="M7.5 4.9v14.2L19 12z" />
    </Svg>
  ),
  Pause: (p) => (
    <Svg {...p}>
      <rect x="7" y="4.8" width="3.6" height="14.4" rx="1.2" />
      <rect x="13.4" y="4.8" width="3.6" height="14.4" rx="1.2" />
    </Svg>
  ),
  Waves: (p) => (
    <Svg {...p}>
      <path d="M4 10v4M8 6.5v11M12 3.5v17M16 6.5v11M20 10v4" />
    </Svg>
  ),
  Warning: (p) => (
    <Svg {...p}>
      <path d="M12 4.2 21 19.2H3z" />
      <path d="M12 10v4M12 16.6h.01" />
    </Svg>
  ),
  Trash: (p) => (
    <Svg {...p}>
      <path d="M4 7h16" />
      <path d="M9 7V4.8c0-.44.36-.8.8-.8h4.4c.44 0 .8.36.8.8V7" />
      <path d="M6 7l1 12.2c.05.98.86 1.8 1.85 1.8h6.3c.99 0 1.8-.82 1.85-1.8L18 7" />
      <path d="M10 11v6M14 11v6" />
    </Svg>
  ),
  Github: (p) => (
    <Svg {...p} fill="currentColor" stroke="none">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.833.091-.647.35-1.088.636-1.338-2.221-.253-4.556-1.113-4.556-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.269 2.75 1.026A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.295 2.747-1.026 2.747-1.026.546 1.378.203 2.397.1 2.65.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.749 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" />
    </Svg>
  ),
  // "Pulse" mark: the N's two uprights, with the diagonal built from waveform
  // bars instead of a straight line — a nod to the live voice interview.
  // Single-color, currentColor-driven — no hardcoded hex, so it inherits
  // whatever color/tone the wrapper sets (including dark surfaces).
  Logo: ({ size = 22, ...p }) => (
    <svg viewBox="0 0 100 100" width={size} height={size} fill="currentColor" aria-hidden="true" {...p}>
      <rect x="14" y="22" width="12" height="56" rx="3" />
      <rect x="74" y="22" width="12" height="56" rx="3" />
      <rect x="30" y="20" width="6" height="16" rx="2" />
      <rect x="38" y="23" width="6" height="32" rx="2" />
      <rect x="46" y="28" width="6" height="44" rx="2" />
      <rect x="54" y="45" width="6" height="32" rx="2" />
      <rect x="62" y="64" width="6" height="16" rx="2" />
    </svg>
  ),
};
