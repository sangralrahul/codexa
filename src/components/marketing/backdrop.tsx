import { cn } from "@/lib/utils";
import { Silk } from "./silk";

/**
 * Decorative backdrop: the live silk gradient, a soft veil that keeps text
 * readable, and film grain. Place inside a `relative` parent; it never
 * receives pointer events.
 */
export function Backdrop({ className, veil = true }: { className?: string; veil?: boolean }) {
  return (
    <div aria-hidden="true" className={cn("backdrop", className)}>
      <Silk />
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
