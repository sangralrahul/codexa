import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Decorative page light. Place inside a `relative` (and ideally `isolate`) parent;
 * it never receives pointer events.
 * - variant="wash" (default): the silk gradient across the top of the page, a veil that
 *   keeps text readable, and grain. `still` = CSS poster only (no WebGL); use `still`
 *   everywhere except the one page that owns the live canvas.
 * - variant="horizon": a <Horizon> band rising from the bottom edge (hero stage light).
 * The marketing layout uses `<Backdrop variant="wash" still className="site-backdrop" />`.
 */
export function Backdrop({
  className,
  veil = true,
  still = false,
  variant = "wash",
}: {
  className?: string;
  veil?: boolean;
  still?: boolean;
  variant?: "wash" | "horizon";
}) {
  return (
    <div aria-hidden="true" className={cn("backdrop", variant === "horizon" && "backdrop--horizon", className)}>
      {variant === "horizon" ? (
        <Horizon still={still} className="bottom-0" />
      ) : (
        // One crisp CSS design everywhere (grid + aurora); the old WebGL silk read as blurry blobs.
        <div className="backdrop__canvas" data-still={still || undefined} />
      )}
      {veil && variant === "wash" ? <div className="backdrop__veil" /> : null}
      <div className="bg-noise absolute inset-0" />
    </div>
  );
}

/**
 * Horizon: one warm light rising behind the top edge of the product (PLAN §2.4).
 * A 1600×520 band masked from its bottom centre; position it with `top-*` / `bottom-*`
 * (it is centred horizontally). The live canvas is the page's one WebGL canvas: use
 * `still` for every other instance. `reactive` reads --horizon-boost (0–0.4) from any
 * ancestor, e.g. set it on the hero while the prompt is focused / typed into.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- props kept for API compatibility
export function Horizon({ className, still = false, reactive = false }: { className?: string; still?: boolean; reactive?: boolean }) {
  return (
    <div aria-hidden="true" className={cn("horizon", className)}>
      <div className="horizon__poster" />
      <div className="horizon__rim" />
    </div>
  );
}

/** Announcement pill above a hero headline. With `href` it is a link with an arrow. */
export function Eyebrow({ children, className, href }: { children: React.ReactNode; className?: string; href?: string }) {
  const inner = (
    <>
      <span aria-hidden="true" className="relative flex size-1.5">
        <span className="size-1.5 rounded-full bg-signal" />
      </span>
      <span className="min-w-0 truncate">{children}</span>
      {href ? <ArrowRight aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-foreground" /> : null}
    </>
  );
  const base =
    "glass inline-flex max-w-full items-center gap-2 rounded-full border border-border px-3.5 py-1.5 text-xs font-medium text-foreground/85 shadow-[inset_0_1px_0_var(--hairline)]";
  if (href) {
    return (
      <Link href={href} className={cn(base, "group transition-[border-color,color,scale] duration-200 hover:border-border-strong hover:text-foreground", className)}>
        {inner}
      </Link>
    );
  }
  return <p className={cn(base, className)}>{inner}</p>;
}

/** Sets the part of a headline that matches `highlight` in the two-tone .text-dim (the qualifier). */
export function Highlight({ text, highlight }: { text: string; highlight?: string }) {
  if (!highlight || !text.includes(highlight)) return <>{text}</>;
  const i = text.indexOf(highlight);
  return (
    <>
      {text.slice(0, i)}
      <span className="text-dim">{highlight}</span>
      {text.slice(i + highlight.length)}
    </>
  );
}

/** Wraps `mark` in the selection mark (.mark-select). H1 only, once per page. */
function Marked({ text, mark, highlight }: { text: string; mark?: string; highlight?: string }) {
  if (!mark || !text.includes(mark)) return <Highlight text={text} highlight={highlight} />;
  const i = text.indexOf(mark);
  return (
    <>
      <Highlight text={text.slice(0, i)} highlight={highlight} />
      <span className="mark-select">{mark}</span>
      <Highlight text={text.slice(i + mark.length)} highlight={highlight} />
    </>
  );
}

/**
 * Page-level h1 in the display face. It paints immediately (it is usually the LCP
 * element; the route's page-enter already eases it in). No automatic accent: pass
 * `highlight` (two-tone .text-dim) and/or `mark` (selection mark) explicitly.
 */
export function PageTitle({
  children,
  className,
  highlight,
  mark,
}: {
  children: React.ReactNode;
  className?: string;
  highlight?: string | false;
  mark?: string;
}) {
  return (
    <h1 className={cn("font-display text-balance text-4xl font-bold leading-[1.02] tracking-[-0.022em] sm:text-5xl", className)}>
      {typeof children === "string" ? <Marked text={children} mark={mark} highlight={highlight || undefined} /> : children}
    </h1>
  );
}
