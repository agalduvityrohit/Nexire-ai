// Apple touch icon — same tile, at the size iOS actually wants (180x180),
// so it isn't a blurry upscale of the 32px favicon when someone adds the
// site to their home screen.

import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
          borderRadius: 40,
        }}
      >
        <svg width="118" height="118" viewBox="0 0 100 100" fill="#ffffff">
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
