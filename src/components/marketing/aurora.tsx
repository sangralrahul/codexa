import { cn } from "@/lib/utils";

/**
 * Decorative animated background: drifting colour fields, a fading line grid
 * and film grain. Place inside a `relative` (and usually `overflow-hidden`)
 * parent; it never receives pointer events.
 */
export function Aurora({ className, grid = true, intensity = "full" }: { className?: string; grid?: boolean; intensity?: "full" | "soft" }) {
  return (
    <div aria-hidden="true" className={cn("aurora", intensity === "soft" && "opacity-60", className)}>
      <div className="aurora__blob aurora__blob--1" />
      <div className="aurora__blob aurora__blob--2" />
      <div className="aurora__blob aurora__blob--3" />
      {intensity === "full" ? <div className="aurora__blob aurora__blob--4" /> : null}
      {grid ? <div className="bg-grid absolute inset-0" /> : null}
      <div className="bg-noise absolute inset-0" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-background" />
    </div>
  );
}

/** Small rounded label with a travelling shine, used above headlines. */
export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("shine-pill inline-flex items-center gap-2 rounded-full border border-border px-3.5 py-1.5 text-xs font-medium text-foreground/90 shadow-sm", className)}>
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-glow-2 opacity-60" />
        <span className="relative inline-flex size-2 rounded-full bg-gradient-to-r from-glow-1 to-glow-2" />
      </span>
      {children}
    </p>
  );
}

/** Wraps the part of a headline that matches `highlight` in animated gradient text. */
export function Highlight({ text, highlight }: { text: string; highlight?: string }) {
  if (!highlight || !text.includes(highlight)) return <>{text}</>;
  const i = text.indexOf(highlight);
  return (
    <>
      {text.slice(0, i)}
      <span className="text-gradient">{highlight}</span>
      {text.slice(i + highlight.length)}
    </>
  );
}
