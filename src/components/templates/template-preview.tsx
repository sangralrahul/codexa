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

/** Most route rows a 16:10 thumb shows; longer lists show this many minus one plus "+ N more". */
const THUMB_ROWS = 6;

/**
 * The template's real routes as a terminal listing. `thumb` (default) is a 16:10 tile that scales
 * with its own width (container units); `hero` is a full-size listing for the detail page, sized
 * like a real terminal and showing every route, with the real dev command when given.
 * In a thumb the listing is a flex column: the route list takes the free height and clips with a
 * fade (it can never run under the footer, however narrow the tile), and the footer stays pinned.
 */
export function RouteList({ routes, className, label = true, variant = "thumb", command }: { routes: ApiRoute[]; className?: string; label?: boolean; variant?: "thumb" | "hero"; command?: string }) {
  const hero = variant === "hero";
  const shown = hero || routes.length <= THUMB_ROWS ? routes : routes.slice(0, THUMB_ROWS - 1);
  const methods = new Set(routes.map((r) => r.method)).size;
  return (
    <div aria-hidden={hero ? undefined : true} className={cn("overflow-hidden rounded-lg border border-border bg-code-bg text-code-fg shadow-sm [container-type:inline-size]", className)}>
      <div className={cn("relative flex flex-col font-mono", hero ? "text-[13px] leading-[1.9] sm:text-[14px]" : "aspect-[16/10] text-[length:max(8px,2.55cqw)] leading-[1.65]")}>
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_80%_0%,color-mix(in_oklab,var(--syn-fn)_10%,transparent),transparent_70%)]" />
        <div className={cn("relative flex shrink-0 items-center border-b border-code-border", hero ? "h-11 gap-2 px-4" : "gap-[1.4cqw] px-[4cqw] py-[2.2cqw]")}>
          <span aria-hidden="true" className={cn("rounded-full bg-code-muted/50", hero ? "size-2.5" : "size-[1.6cqw] min-h-1 min-w-1")} />
          <span aria-hidden="true" className={cn("rounded-full bg-code-muted/50", hero ? "size-2.5" : "size-[1.6cqw] min-h-1 min-w-1")} />
          <span aria-hidden="true" className={cn("rounded-full bg-code-muted/50", hero ? "size-2.5" : "size-[1.6cqw] min-h-1 min-w-1")} />
          <span className={cn("truncate text-code-muted", hero ? "ml-2 text-[12px]" : "ml-[1.6cqw]")}>routes · read from the template&apos;s source</span>
        </div>
        <div
          className={cn(
            "relative min-h-0 flex-1",
            hero ? "px-5 py-5 sm:px-7 sm:py-6" : "overflow-hidden px-[4cqw] py-[2.6cqw] [mask-image:linear-gradient(to_bottom,black_calc(100%-1em),transparent)]",
          )}
        >
          <p className="text-code-muted">
            <span className="text-syn-keyword">$</span> express routes
          </p>
          <ul className={hero ? "mt-3" : "mt-[1.2cqw]"} aria-label={hero ? `${routes.length} routes` : undefined}>
            {shown.map((r) => (
              <li key={`${r.method} ${r.path}`} className={cn("flex whitespace-nowrap", hero ? "gap-5" : "gap-[2.4cqw]")}>
                <span className={cn("w-[6.2ch] shrink-0 font-medium", METHOD_TONE[r.method])}>{r.method}</span>
                <span className="truncate text-code-fg/90">{r.path.split(/(:\w+)/).map((part, i) => (part.startsWith(":") ? <span key={i} className="text-syn-attr">{part}</span> : part))}</span>
              </li>
            ))}
            {routes.length > shown.length ? <li className="text-code-muted">+ {routes.length - shown.length} more</li> : null}
          </ul>
          {hero && command ? (
            <p className="mt-5 text-code-muted">
              <span className="text-syn-keyword">$</span> <span className="text-code-fg/90">{command}</span>
            </p>
          ) : null}
        </div>
        {label ? (
          <p className={cn("relative mt-auto shrink-0 border-t border-code-border text-code-muted", hero ? "flex flex-wrap justify-between gap-x-4 px-5 py-3 text-[12px] sm:px-7" : "truncate px-[4cqw] py-[1.8cqw]")}>
            <span>
              {routes.length} route{routes.length === 1 ? "" : "s"} · API only, no screen to capture
            </span>
            {hero ? <span>{methods} HTTP method{methods === 1 ? "" : "s"}</span> : null}
          </p>
        ) : null}
      </div>
    </div>
  );
}
