import { cn } from "@/lib/utils";
import { Silk } from "./silk";

/**
 * Decorative backdrop: the live silk gradient, a soft veil that keeps text
 * readable, and film grain. Place inside a `relative` parent; it never
 * receives pointer events.
 */
export function Backdrop({ className, veil = true, still = false }: { className?: string; veil?: boolean; still?: boolean }) {
  return (
    <div aria-hidden="true" className={cn("backdrop", className)}>
      {/* `still`: the CSS gradient only (no WebGL), for long-lived app screens. */}
      {still ? <div className="backdrop__canvas" /> : <Silk />}
      {veil ? <div className="backdrop__veil" /> : null}
      <div className="bg-noise absolute inset-0" />
    </div>
  );
}

/** Small rounded label above headlines. */
export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("eyebrow-pill inline-flex items-center gap-2 rounded-full border border-border px-3.5 py-1.5 text-xs font-medium text-foreground/85", className)}>
      <span aria-hidden="true" className="size-1.5 rounded-full bg-signal" />
      {children}
    </p>
  );
}

/** Sets the part of a headline that matches `highlight` in the italic serif accent. */
export function Highlight({ text, highlight }: { text: string; highlight?: string }) {
  if (!highlight || !text.includes(highlight)) return <>{text}</>;
  const i = text.indexOf(highlight);
  return (
    <>
      {text.slice(0, i)}
      <span className="serif-accent">{highlight}</span>
      {text.slice(i + highlight.length)}
    </>
  );
}

/**
 * Default serif accent for a title: the closing clause after the last comma
 * (if short), else the last two words; one- to three-word titles accent their
 * last word.
 */
export function autoHighlight(title: string): string | undefined {
  const comma = title.lastIndexOf(", ");
  const clause = comma > 0 ? title.slice(comma + 2) : "";
  if (clause && clause.split(" ").length <= 4) return clause;
  const words = title.trim().split(/\s+/);
  // A one-word title set entirely in the accent face reads as decoration, not emphasis.
  if (words.length < 2) return undefined;
  if (words.length >= 4) return words.slice(-2).join(" ");
  return words[words.length - 1] || undefined;
}

/** Page-level h1 in the site's headline style, with the serif accent and reveal. */
export function PageTitle({ children, className, highlight }: { children: React.ReactNode; className?: string; highlight?: string | false }) {
  return (
    <h1 data-reveal className={cn("text-balance text-4xl font-semibold leading-[1.05] tracking-[-0.03em] sm:text-5xl", className)}>
      {typeof children === "string" && highlight !== false ? <Highlight text={children} highlight={highlight || autoHighlight(children)} /> : children}
    </h1>
  );
}
