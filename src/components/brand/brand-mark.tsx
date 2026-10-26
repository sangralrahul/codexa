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

/**
 * Monochrome (currentColor) brand mark for a user-connectable integration, from the
 * CC0 simple-icons set (generated, zero runtime dependency). Brands without a mark
 * — or unknown ids — render a monogram tile; logos are never hand-drawn.
 * Nominative use only: pair with "Trademarks belong to their owners; no partnership implied."
 * Decorative unless `title` is given (then role=img with that name).
 */
export function BrandMark({ id, className, title }: { id: BrandId | string; className?: string; title?: string }) {
  const mark = isBrandId(id) ? BRAND_MARKS[id] : null;
  const a11y = title ? { role: "img" as const, "aria-label": title } : { "aria-hidden": true as const };
  if (mark?.path) {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={cn("size-5 shrink-0", className)} {...a11y}>
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
