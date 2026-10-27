"use client";

/**
 * Resolve design tokens (and expressions built from them, like color-mix) to concrete
 * sRGB hex strings at runtime. Monaco and xterm need literal colours, but components
 * must not hard-code hex: they describe colours as CSS and this turns them into values.
 */
let probe: HTMLSpanElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;

function ensureProbe(): HTMLSpanElement | null {
  if (typeof document === "undefined") return null;
  if (probe && probe.isConnected) return probe;
  probe = document.createElement("span");
  probe.setAttribute("aria-hidden", "true");
  // No transition: the reduced-motion backstop gives every element a 0.01ms transition, and a
  // transitioning colour would read back as its previous value.
  probe.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;visibility:hidden;pointer-events:none;transition:none !important;animation:none !important";
  document.body.appendChild(probe);
  return probe;
}

function ensureCtx(): CanvasRenderingContext2D | null {
  if (ctx) return ctx;
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  ctx = canvas.getContext("2d", { willReadFrequently: true });
  return ctx;
}

const hex2 = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");

/** Parse rgb()/rgba()/color(srgb …)/#hex into [r, g, b, a(0..1)] without touching the DOM. */
function parseComputed(value: string): [number, number, number, number] | null {
  const v = value.trim();
  let m = v.match(/^#([0-9a-f]{3,8})$/i);
  if (m) {
    const h = m[1];
    const full = h.length <= 4 ? h.split("").map((c) => c + c).join("") : h;
    const n = (i: number) => parseInt(full.slice(i, i + 2), 16);
    return [n(0), n(2), n(4), full.length === 8 ? n(6) / 255 : 1];
  }
  m = v.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/i);
  if (m) {
    const a = m[4] === undefined ? 1 : m[4].endsWith("%") ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    return [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]), a];
  }
  m = v.match(/^color\(srgb\s+([\d.e-]+)\s+([\d.e-]+)\s+([\d.e-]+)(?:\s*\/\s*([\d.]+%?))?\s*\)$/i);
  if (m) {
    const a = m[4] === undefined ? 1 : m[4].endsWith("%") ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    return [parseFloat(m[1]) * 255, parseFloat(m[2]) * 255, parseFloat(m[3]) * 255, a];
  }
  return null;
}

/**
 * Resolve any CSS colour expression (e.g. "var(--syn-keyword)",
 * "color-mix(in oklch, var(--syn-string) 60%, var(--foreground))") to "#rrggbb" or "#rrggbbaa".
 * Variables resolve against <html> (where :root and .dark define them). Returns `fallback` on the server.
 */
export function cssColor(expr: string, fallback = "#000000"): string {
  const el = ensureProbe();
  if (!el) return fallback;
  el.style.color = "";
  el.style.color = expr;
  const computed = getComputedStyle(el).color;
  let rgba = parseComputed(computed);
  if (!rgba) {
    // oklch()/lab()/color(display-p3 …): let the canvas convert to sRGB.
    const c = ensureCtx();
    if (c) {
      c.clearRect(0, 0, 1, 1);
      c.fillStyle = "#000";
      c.fillStyle = computed;
      c.fillRect(0, 0, 1, 1);
      const d = c.getImageData(0, 0, 1, 1).data;
      rgba = [d[0], d[1], d[2], d[3] / 255];
    }
  }
  if (!rgba) return fallback;
  const [r, g, b, a] = rgba;
  return `#${hex2(r)}${hex2(g)}${hex2(b)}${a < 1 ? hex2(a * 255) : ""}`;
}

/** Same as cssColor but forces an alpha channel (0..1) on the result. */
export function cssColorAlpha(expr: string, alpha: number, fallback = "#00000000"): string {
  const base = cssColor(expr, "");
  if (!base) return fallback;
  return `${base.slice(0, 7)}${hex2(alpha * 255)}`;
}
