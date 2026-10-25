import { ImageResponse } from "next/og";
import { site } from "@/config/site";

// Rendered per request: these are cheap, and serving them from the prerender
// cache makes the Cloudflare Worker try to rewrite a read-only cache.
export const dynamic = "force-dynamic";

export const alt = `${site.name} — ${site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Social preview: wordmark and tagline on charcoal, matching the dark theme tokens. */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#0b0c0f",
          color: "#f2f3f5",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ display: "flex", width: 72, height: 72, borderRadius: 18, background: "#f2f3f5", alignItems: "center", justifyContent: "center" }}>
            <svg width="48" height="48" viewBox="0 0 32 32" fill="none">
              <path d="M21 10H13a4 4 0 0 0-4 4v4a4 4 0 0 0 4 4h8" stroke="#0b0c0f" strokeWidth="3" strokeLinecap="round" />
              <rect x="18" y="14.5" width="6" height="3" rx="1.5" fill="#4d80ff" />
            </svg>
          </div>
          <div style={{ fontSize: 40, fontWeight: 600, letterSpacing: "0.18em" }}>CODEXA</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 68, fontWeight: 600, lineHeight: 1.05, letterSpacing: "-0.02em", maxWidth: 1000 }}>Build software at the speed of thought.</div>
          <div style={{ fontSize: 30, color: "#9aa3b2", maxWidth: 1000 }}>Describe your idea. Codexa helps you create, refine, test, and deploy real applications.</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, color: "#9aa3b2" }}>
          <span>{site.url.replace(/^https?:\/\//, "")}</span>
          <span>Prompt → app → edit → run → deploy</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
