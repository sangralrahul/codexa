import { cn } from "@/lib/utils";
import { BRAND_IDS, BRAND_MARKS, type BrandId } from "./marks.generated";

export { BRAND_IDS, type BrandId };

/** True when `id` is a known integration brand with a real (non-fallback) mark. */
export function hasBrandMark(id: string): id is BrandId {
  return (BRAND_IDS as readonly string[]).includes(id) && BRAND_MARKS[id as BrandId].path !== null;
}

/** True when `id` is one of the brands BrandMark knows (mark or monogram). */
export function isBrandId(id: string): id is BrandId {
  return (BRAND_IDS as readonly string[]).includes(id);
}

/** The brand's official colour (from simple-icons), or null for an unknown id. */
export function brandHex(id: string): string | null {
  return isBrandId(id) ? BRAND_MARKS[id].hex : null;
}

function brandTitle(id: string): string | null {
  return isBrandId(id) ? BRAND_MARKS[id].title : null;
}

/** Near-black brand colours (Vercel, GitHub, Anthropic…) would vanish on a dark surface. */
function isNearBlack(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 40;
}

/**
 * Brand mark on a tile filled with the brand's official colour, like an app icon: the mark is
 * white. Near-black brands get a hairline ring so the tile still reads on a dark page.
 * Decorative unless `title` is given.
 */
export function BrandTile({ id, className, markClassName, title }: { id: BrandId | string; className?: string; markClassName?: string; title?: string }) {
  const hex = brandHex(id) ?? "#000000";
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-2xl text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_8px_20px_-8px_rgba(0,0,0,0.45)]",
        isNearBlack(hex) && "ring-1 ring-white/15",
        className,
      )}
      style={{ backgroundColor: hex }}
    >
      {hasBrandMark(id) ? (
        <BrandMark id={id} title={title} className={markClassName} />
      ) : (
        // No mark in the icon set (e.g. OpenAI): the brand's initial, never a hand-drawn logo.
        <span className="font-display text-lg font-bold leading-none" {...(title ? { role: "img", "aria-label": title } : { "aria-hidden": true })}>
          {(brandTitle(id) ?? id).replace(/[^A-Za-z0-9]/g, "").slice(0, 1).toUpperCase()}
        </span>
      )}
    </span>
  );
}

/**
 * Brand mark (currentColor by default; `tone="color"` fills it with the brand's official colour,
 * except near-black brands, which keep currentColor so they stay visible in dark mode) for a user-connectable integration, from the
 * CC0 simple-icons set (generated, zero runtime dependency). Brands without a mark
 * — or unknown ids — render a monogram tile; logos are never hand-drawn.
 * Nominative use only: pair with "Trademarks belong to their owners; no partnership implied."
 * Decorative unless `title` is given (then role=img with that name).
 */
export function BrandMark({ id, className, title, tone = "mono" }: { id: BrandId | string; className?: string; title?: string; tone?: "mono" | "color" }) {
  const mark = isBrandId(id) ? BRAND_MARKS[id] : null;
  const fill = tone === "color" && mark && !isNearBlack(mark.hex) ? mark.hex : "currentColor";
  const a11y = title ? { role: "img" as const, "aria-label": title } : { "aria-hidden": true as const };
  if (mark?.path) {
    return (
      <svg viewBox="0 0 24 24" fill={fill} className={cn("size-5 shrink-0", className)} {...a11y}>
        <path d={mark.path} />
      </svg>
    );
  }
  const name = mark?.title ?? id;
  return (
    <span
      {...a11y}
      className={cn(
        "inline-flex size-5 shrink-0 select-none items-center justify-center rounded-[28%] border border-current/35 [container-type:size]",
        className,
      )}
    >
      <span className="font-display text-[58cqh] font-bold leading-none tracking-tight">{name.replace(/[^A-Za-z0-9]/g, "").slice(0, 1).toUpperCase() || "?"}</span>
    </span>
  );
}
