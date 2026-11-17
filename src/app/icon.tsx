import { ImageResponse } from "next/og";
import { CODEXA_MARK_PATH } from "@/components/brand/codexa-mark";

// Rendered per request: these are cheap, and serving them from the prerender
// cache makes the Cloudflare Worker try to rewrite a read-only cache.
export const dynamic = "force-dynamic";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

/**
 * Favicon and logo: the Codexa mark in white on a near-black tile with a faint light edge, so it
 * reads on light and dark tabs. Matches src/app/favicon.ico (16/32/48) and apple-icon.png.
 */
export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#050506", borderRadius: 112, border: "8px solid rgba(255,255,255,0.22)" }}>
        <svg width="380" height="380" viewBox="0 0 100 100">
          <path d={CODEXA_MARK_PATH} fill="#ffffff" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
