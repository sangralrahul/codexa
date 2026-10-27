import { ImageResponse } from "next/og";
import { CODEXA_MARK_PATH } from "@/components/brand/codexa-mark";

// Rendered per request: these are cheap, and serving them from the prerender
// cache makes the Cloudflare Worker try to rewrite a read-only cache.
export const dynamic = "force-dynamic";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

/** Favicon: the Codexa mark (same path as LogoMark) in white on an ink tile, legible on light and dark tabs. */
export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0b0c0f", borderRadius: 16 }}>
        <svg width="46" height="46" viewBox="0 0 100 100">
          <path d={CODEXA_MARK_PATH} fill="#ffffff" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
