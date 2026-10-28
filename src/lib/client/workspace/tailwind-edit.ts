/**
 * Visual edits as Tailwind classes: swap one group of base utilities (text colour, background,
 * size, weight, alignment, padding, corners) for a new value, leaving every other class and every
 * variant (sm:, hover:, dark:) untouched. Pure functions, shared by the panel and its tests.
 */
export type StyleChange = {
  color?: string;
  background?: string;
  fontSize?: FontSize;
  fontWeight?: FontWeight;
  align?: Align;
  padding?: Spacing;
  radius?: Radius;
};

export const FONT_SIZES = ["xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl", "5xl", "6xl"] as const;
export const FONT_WEIGHTS = ["normal", "medium", "semibold", "bold"] as const;
export const ALIGNS = ["left", "center", "right"] as const;
export const SPACINGS = ["0", "2", "4", "6", "8", "12"] as const;
export const RADII = ["none", "sm", "md", "lg", "xl", "2xl", "full"] as const;
export type FontSize = (typeof FONT_SIZES)[number];
export type FontWeight = (typeof FONT_WEIGHTS)[number];
export type Align = (typeof ALIGNS)[number];
export type Spacing = (typeof SPACINGS)[number];
export type Radius = (typeof RADII)[number];

const SIZE_PX: Record<FontSize, number> = { xs: 12, sm: 14, base: 16, lg: 18, xl: 20, "2xl": 24, "3xl": 30, "4xl": 36, "5xl": 48, "6xl": 60 };
const WEIGHT: Record<FontWeight, number> = { normal: 400, medium: 500, semibold: 600, bold: 700 };
const RADIUS_PX: Record<Radius, string> = { none: "0px", sm: "2px", md: "6px", lg: "8px", xl: "12px", "2xl": "16px", full: "9999px" };

const SIZE_RE = /^text-(xs|sm|base|lg|xl|[2-9]xl|\[\d[^\]]*\])$/;
const ALIGN_RE = /^text-(left|center|right|justify|start|end)$/;
const TEXT_OTHER_RE = /^text-(wrap|nowrap|balance|pretty|ellipsis|clip)$/;
const BG_NON_COLOR_RE = /^bg-(cover|contain|auto|center|top|bottom|left|right|left-top|left-bottom|right-top|right-bottom|fixed|local|scroll|repeat|no-repeat|repeat-x|repeat-y|repeat-round|repeat-space|none|clip-.+|origin-.+|blend-.+|gradient-.+|linear-.+|radial-.+|conic-.+|size-.+|position-.+)$/;

const isColor = (c: string) => c.startsWith("text-") && !SIZE_RE.test(c) && !ALIGN_RE.test(c) && !TEXT_OTHER_RE.test(c) && !/^text-shadow/.test(c);
const isBg = (c: string) => c.startsWith("bg-") && !BG_NON_COLOR_RE.test(c);
const isWeight = (c: string) => /^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/.test(c);
const isPadding = (c: string) => /^-?p[xy]?-/.test(c);
const isRadius = (c: string) => /^rounded(-(none|xs|sm|md|lg|xl|2xl|3xl|4xl|full|\[[^\]]+\]))?$/.test(c);

/** A colour as a Tailwind arbitrary value: #RRGGBB (lower-case). */
function hex(color: string) {
  const c = color.trim().toLowerCase();
  return /^#[0-9a-f]{6}$/.test(c) ? c : null;
}

export function applyClassChanges(classes: string, change: StyleChange): string {
  let list = classes.split(/\s+/).filter(Boolean);
  const swap = (test: (c: string) => boolean, next: string | null) => {
    if (next === null) return;
    // Only base utilities are swapped; `md:text-xl` and friends are variants and stay.
    list = list.filter((c) => c.includes(":") || !test(c));
    list.push(next);
  };
  if (change.color) swap(isColor, hex(change.color) ? `text-[${hex(change.color)}]` : null);
  if (change.background) swap(isBg, hex(change.background) ? `bg-[${hex(change.background)}]` : null);
  if (change.fontSize) swap((c) => SIZE_RE.test(c), `text-${change.fontSize}`);
  if (change.fontWeight) swap(isWeight, `font-${change.fontWeight}`);
  if (change.align) swap((c) => ALIGN_RE.test(c), `text-${change.align}`);
  if (change.padding) swap(isPadding, `p-${change.padding}`);
  if (change.radius) swap(isRadius, change.radius === "md" ? "rounded-md" : `rounded-${change.radius}`);
  return list.join(" ");
}

/** Inline CSS that shows the change in the preview before it is saved. */
export function previewStyle(change: StyleChange): Record<string, string> {
  const s: Record<string, string> = {};
  if (change.color && hex(change.color)) s.color = change.color;
  if (change.background && hex(change.background)) s["background-color"] = change.background;
  if (change.fontSize) s["font-size"] = `${SIZE_PX[change.fontSize]}px`;
  if (change.fontWeight) s["font-weight"] = String(WEIGHT[change.fontWeight]);
  if (change.align) s["text-align"] = change.align;
  if (change.padding) s.padding = `${Number(change.padding) * 4}px`;
  if (change.radius) s["border-radius"] = RADIUS_PX[change.radius];
  return s;
}

/** Plain-language description of the change, for the AI when it cannot be written directly. */
export function describeChange(change: StyleChange): string[] {
  const out: string[] = [];
  if (change.color) out.push(`text colour → ${change.color}`);
  if (change.background) out.push(`background colour → ${change.background}`);
  if (change.fontSize) out.push(`font size → ${change.fontSize} (${SIZE_PX[change.fontSize]}px)`);
  if (change.fontWeight) out.push(`font weight → ${change.fontWeight}`);
  if (change.align) out.push(`text alignment → ${change.align}`);
  if (change.padding) out.push(`padding → ${Number(change.padding) * 4}px`);
  if (change.radius) out.push(`corner radius → ${RADIUS_PX[change.radius]}`);
  return out;
}

export function hasStyleChange(change: StyleChange) {
  return Object.values(change).some(Boolean);
}

/** rgb(…)/rgba(…) from getComputedStyle → #rrggbb for the colour inputs (transparent → null). */
export function cssColorToHex(css: string): string | null {
  const m = css.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!m) return null;
  if (m[4] !== undefined && Number(m[4]) === 0) return null;
  return `#${[m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, "0")).join("")}`;
}
