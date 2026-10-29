import "server-only";
import { Check } from "lucide-react";
import { TEMPLATES } from "@/templates";
import { SHOT_HEIGHT, SHOT_WIDTH, TEMPLATE_SHOTS, templateShotSrc, templateShotSrcSet } from "@/components/templates/shots";
import { cn } from "@/lib/utils";

/** The starter shown in the panel: the first of these that has a captured screenshot. */
const SHOT_IDS = ["vite-react-saas", "vite-react-dashboard", "vite-react-landing"];

const POINTS = ["Real files you own", "Isolated previews for every project", "One-click deploys"];

function panelShot() {
  const id = SHOT_IDS.find((x) => TEMPLATE_SHOTS.has(x));
  if (!id) return null;
  return { id, name: TEMPLATES.find((t) => t.id === id)?.name ?? "Starter template" };
}

/**
 * Large screens only: a quiet, theme-aware panel beside the form. One headline, three plain
 * points and one real starter screenshot (labelled as such) bleeding off the bottom-right edge.
 * No animation, no canvas.
 */
export function AuthPanel({ className }: { className?: string }) {
  const shot = panelShot();
  return (
    <aside aria-labelledby="auth-panel-title" className={cn("auth-panel relative flex flex-col overflow-hidden rounded-[20px] border border-border bg-surface", className)}>
      <div className="relative max-w-[34rem] px-12 pt-14 xl:px-16 xl:pt-16">
        <h2 id="auth-panel-title" className="text-display-4 text-foreground">
          From a sentence to a running app.
        </h2>
        <ul className="mt-6 flex flex-col gap-3 text-[15px] text-muted-foreground">
          {POINTS.map((p) => (
            <li key={p} className="flex items-center gap-3">
              <span aria-hidden="true" className="flex size-5 shrink-0 items-center justify-center rounded-full bg-background shadow-[inset_0_0_0_1px_var(--border-strong)]">
                <Check className="size-3 text-foreground" strokeWidth={2.5} />
              </span>
              {p}
            </li>
          ))}
        </ul>
      </div>

      {shot ? (
        <figure className="relative mt-12 flex min-h-[280px] flex-1 flex-col pl-12 xl:mt-14 xl:pl-16">
          <figcaption className="mb-3 text-xs text-muted-foreground">Screenshot of the {shot.name} template</figcaption>
          <div className="auth-shot flex min-h-0 w-[135%] flex-1 flex-col overflow-hidden rounded-tl-[14px] border-l border-t border-border-strong bg-card">
            <div aria-hidden="true" className="flex h-8 shrink-0 items-center gap-1.5 border-b border-border bg-surface-2 px-3">
              <span className="size-2 rounded-full bg-border-strong" />
              <span className="size-2 rounded-full bg-border-strong" />
              <span className="size-2 rounded-full bg-border-strong" />
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={templateShotSrc(shot.id)}
              srcSet={templateShotSrcSet(shot.id)}
              sizes="(min-width: 1024px) 50vw, 0px"
              alt=""
              width={SHOT_WIDTH}
              height={SHOT_HEIGHT}
              decoding="async"
              fetchPriority="low"
              className="block h-auto w-full"
            />
          </div>
        </figure>
      ) : null}
    </aside>
  );
}
