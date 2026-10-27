import { cn } from "@/lib/utils";

/**
 * Home hero light, in two parts (CSS in globals.css "Aurora"; calm mode holds it still):
 * - <Aurora>: the sky behind the whole hero. First child of a `relative isolate overflow-clip` section.
 * - <AuroraSun>: a vivid sunrise of brand colour swirling slowly, with a bright rim. Render it inside
 *   the `relative` wrapper of the prompt box: its horizon crosses the composer on every viewport.
 * - <AuroraFinish>: film grain over both and a fade into the page. Last child of the section.
 */
export function Aurora({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("aurora", className)}>
      <div className="aurora__sky" />
    </div>
  );
}

export function AuroraSun() {
  return (
    <div aria-hidden="true" className="aurora-sun">
      <div className="aurora__sun">
        <span className="aurora__swirl" />
        <span className="aurora__depth" />
      </div>
      <div className="aurora__rim" />
    </div>
  );
}

export function AuroraFinish() {
  return (
    <>
      <div aria-hidden="true" className="aurora__grain absolute inset-0" />
      <div aria-hidden="true" className="aurora__fade" />
    </>
  );
}
