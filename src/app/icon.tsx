import { ImageResponse } from "next/og";

// Rendered per request: these are cheap, and serving them from the prerender
// cache makes the Cloudflare Worker try to rewrite a read-only cache.
export const dynamic = "force-dynamic";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

/** Favicon generated from the same geometry as LogoMark (src/components/logo.tsx). */
export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0b0c0f", borderRadius: 16 }}>
        <svg width="64" height="64" viewBox="0 0 32 32" fill="none">
          <path d="M21 10H13a4 4 0 0 0-4 4v4a4 4 0 0 0 4 4h8" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
          <rect x="18" y="14.5" width="6" height="3" rx="1.5" fill="#4d80ff" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
