import { ImageResponse } from "next/og";
import { CODEXA_MARK_PATH } from "@/components/brand/codexa-mark";
import { site } from "@/config/site";

// Rendered per request: these are cheap, and serving them from the prerender
// cache makes the Cloudflare Worker try to rewrite a read-only cache.
export const dynamic = "force-dynamic";

export const alt = `${site.name}: ${site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The image renderer cannot read CSS variables, so the dark-theme tokens from globals.css are
// repeated here as rgb(): ink background, foreground, muted, signal (ember), signal-2 (amber), silk-1 (cobalt).
const INK = "rgb(8 9 11)";
const FG = "rgb(243 243 240)";
const MUTED = "rgb(149 155 166)";
const SIGNAL = "rgb(255 95 58)";
const AMBER = "rgb(255 178 62)";
const COBALT = "rgb(43 69 214)";

/** Social preview: the wordmark, the tagline and the horizon light rising behind it. */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: INK, color: FG, fontFamily: "sans-serif", overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            left: -200,
            right: -200,
            bottom: -420,
            height: 760,
            display: "flex",
            background: `radial-gradient(45% 60% at 50% 100%, ${SIGNAL}, transparent 70%), radial-gradient(40% 55% at 22% 100%, ${COBALT}, transparent 70%), radial-gradient(35% 50% at 80% 100%, ${AMBER}, transparent 70%)`,
            opacity: 0.55,
          }}
        />
        <div style={{ position: "absolute", left: 0, right: 0, top: 452, height: 1, display: "flex", background: `linear-gradient(90deg, transparent, ${SIGNAL}, ${COBALT}, transparent)` }} />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, width: "100%", position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <svg width="64" height="64" viewBox="0 0 100 100">
              <path d={CODEXA_MARK_PATH} fill={FG} />
            </svg>
            <div style={{ fontSize: 46, fontWeight: 700, letterSpacing: "-0.035em" }}>codexa</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ fontSize: 84, fontWeight: 700, lineHeight: 1, letterSpacing: "-0.04em", maxWidth: 980 }}>Turn ideas into working software.</div>
            <div style={{ fontSize: 28, color: MUTED, maxWidth: 940 }}>Describe it, read the code, run it in a sandbox and ship it, in one workspace.</div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, color: MUTED }}>
            <span>{site.url.replace(/^https?:\/\//, "")}</span>
            <span>Prompt · code · preview · deploy</span>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
