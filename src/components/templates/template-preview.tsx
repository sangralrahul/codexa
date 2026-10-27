import { cn } from "@/lib/utils";
import { TemplateThumb } from "./template-thumb";
import { SHOT_HEIGHT, SHOT_WIDTH, TEMPLATE_SHOTS, templateShotSrc, templateShotSrcSet } from "./shots";
import { TEMPLATE_API_ROUTES } from "./api-routes.generated";
import type { ApiRoute } from "./route-parse";

const DEFAULT_SIZES = "(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw";

/**
 * Template picture: a real screenshot of the template's own build when one exists (srcset lists
 * only files the capture script produced), the template's real route list for API-only templates
 * (they have no screen; no timings, nothing invented), otherwise the drawn thumbnail.
 * - `sizes`: rendered width hint for srcset (defaults to a gallery-cell estimate).
 * - `priority`: eager + high fetch priority (only for the page's lead image).
 * - `pan`: wrap in `.shot-pan` (slow top→bottom pan on hover/focus); `"force"` pans now.
 * Server-safe and client-safe (no file contents are imported).
 */
export function TemplatePreview({
  id,
  category,
  className,
  imgClassName,
  sizes,
  priority,
  pan,
  alt = "",
}: {
  id: string;
  category: string;
  className?: string;
  imgClassName?: string;
  sizes?: string;
  priority?: boolean;
  pan?: boolean | "force";
  alt?: string;
}) {
  if (TEMPLATE_SHOTS.has(id)) {
    return (
      <div data-pan={pan === "force" ? "" : undefined} className={cn("overflow-hidden rounded-lg border border-border bg-white shadow-sm", pan && "shot-pan", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={templateShotSrc(id)}
          srcSet={templateShotSrcSet(id)}
          sizes={sizes ?? DEFAULT_SIZES}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : undefined}
          decoding="async"
          width={SHOT_WIDTH}
          height={SHOT_HEIGHT}
          data-develop=""
          // MotionEffects may mark a cached image as developed before React hydrates it.
          suppressHydrationWarning
          className={cn("aspect-[16/10] w-full object-cover object-top", imgClassName)}
        />
      </div>
    );
  }
  const routes = TEMPLATE_API_ROUTES[id];
  if (routes) return <RouteList routes={routes} className={className} />;
  return <TemplateThumb category={category} className={className} />;
}

const METHOD_TONE: Record<ApiRoute["method"], string> = {
  GET: "text-syn-string",
  POST: "text-syn-fn",
  PUT: "text-syn-number",
  PATCH: "text-syn-number",
  DELETE: "text-syn-tag",
};

/** The template's real routes as a terminal listing. Scales with its own width (container units). */
export function RouteList({ routes, className, label = true }: { routes: ApiRoute[]; className?: string; label?: boolean }) {
  const shown = routes.slice(0, 7);
  return (
    <div aria-hidden="true" className={cn("overflow-hidden rounded-lg border border-border bg-code-bg text-code-fg shadow-sm [container-type:inline-size]", className)}>
      <div className="relative flex aspect-[16/10] flex-col font-mono text-[length:max(8px,2.55cqw)] leading-[1.75]">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_80%_0%,color-mix(in_oklab,var(--syn-fn)_10%,transparent),transparent_70%)]" />
        <div className="relative flex items-center gap-[1.4cqw] border-b border-code-border px-[4cqw] py-[2.2cqw]">
          <span className="size-[1.6cqw] min-h-1 min-w-1 rounded-full bg-code-muted/50" />
          <span className="size-[1.6cqw] min-h-1 min-w-1 rounded-full bg-code-muted/50" />
          <span className="size-[1.6cqw] min-h-1 min-w-1 rounded-full bg-code-muted/50" />
          <span className="ml-[1.6cqw] truncate text-code-muted">routes · read from the template&apos;s source</span>
        </div>
        <div className="relative min-h-0 flex-1 px-[4cqw] py-[3cqw]">
          <p className="text-code-muted">
            <span className="text-syn-keyword">$</span> express routes
          </p>
          <ul className="mt-[1.2cqw]">
            {shown.map((r) => (
              <li key={`${r.method} ${r.path}`} className="flex gap-[2.4cqw] whitespace-nowrap">
                <span className={cn("w-[6.2ch] shrink-0 font-medium", METHOD_TONE[r.method])}>{r.method}</span>
                <span className="truncate text-code-fg/90">{r.path.split(/(:\w+)/).map((part, i) => (part.startsWith(":") ? <span key={i} className="text-syn-attr">{part}</span> : part))}</span>
              </li>
            ))}
            {routes.length > shown.length ? <li className="text-code-muted">+ {routes.length - shown.length} more</li> : null}
          </ul>
        </div>
        {label ? (
          <p className="relative border-t border-code-border px-[4cqw] py-[1.8cqw] text-code-muted">
            {routes.length} route{routes.length === 1 ? "" : "s"} · API only, no screen to capture
          </p>
        ) : null}
      </div>
    </div>
  );
}
