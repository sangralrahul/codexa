import { cn } from "@/lib/utils";

/**
 * Hero light: slow curtains of colour drifting across the top, a breathing glow and a faint grid
 * that fades into the page. CSS only (globals.css "Aurora"); calm mode holds it still.
 * Place as the first child of a `relative isolate` section; it never takes pointer events.
 */
export function Aurora({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("aurora", className)}>
      <div className="aurora__curtain" />
      <div className="aurora__grid" />
      <div className="aurora__glow" />
      <div className="aurora__fade" />
    </div>
  );
}
