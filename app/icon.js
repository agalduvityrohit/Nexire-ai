// Favicon — generated, not a static file, since none existed before this.
// Teal tile + white mark (not just the bare currentColor mark) because a thin
// line/bar mark on a transparent background disappears at 16px; a solid,
// high-contrast tile survives down to tab size. Next.js auto-serves this at
// /icon and wires up the <link rel="icon"> tag — no manual metadata needed.

import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0e5c54",
          borderRadius: 7,
        }}
      >
        <svg width="21" height="21" viewBox="0 0 100 100" fill="#ffffff">
          <rect x="14" y="22" width="12" height="56" rx="3" />
          <rect x="74" y="22" width="12" height="56" rx="3" />
          <rect x="30" y="20" width="6" height="16" rx="2" />
          <rect x="38" y="23" width="6" height="32" rx="2" />
          <rect x="46" y="28" width="6" height="44" rx="2" />
          <rect x="54" y="45" width="6" height="32" rx="2" />
          <rect x="62" y="64" width="6" height="16" rx="2" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
