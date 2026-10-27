import { Server } from "lucide-react";
import { cn } from "@/lib/utils";
import { SHOT_HEIGHT, SHOT_WIDTH, TEMPLATE_SHOTS, templateShotSrc, templateShotSrcSet } from "@/components/templates/shots";
import { TemplateThumb } from "@/components/templates/template-thumb";

/**
 * A starter's real screenshot for onboarding cards (16:10). A plain <img>: these cards
 * hydrate after the root layout, so the picture carries no attributes that the global motion
 * engine rewrites before hydration. `srcset` lists only the captures that exist, so a 120px
 * goal card loads the 720w file and the preview window the 1440w one. API starters have no
 * screen: they get a plain "API" tile (no invented routes or timings); anything else without
 * a capture gets the drawn thumbnail.
 */
export function StarterShot({
  id,
  category,
  className,
  imgClassName,
  sizes = "(min-width: 1024px) 320px, 50vw",
  priority = false,
}: {
  id: string;
  category: string;
  className?: string;
  imgClassName?: string;
  /** Rendered width hint for picking a capture from the srcset. */
  sizes?: string;
  /** Load at once (cards visible on first paint) instead of when scrolled near. */
  priority?: boolean;
}) {
  if (TEMPLATE_SHOTS.has(id)) {
    return (
      <div className={cn("overflow-hidden rounded-[10px] bg-surface", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={templateShotSrc(id)}
          srcSet={templateShotSrcSet(id)}
          sizes={sizes}
          alt=""
          width={SHOT_WIDTH}
          height={SHOT_HEIGHT}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          className={cn("aspect-[16/10] w-full object-cover object-top", imgClassName)}
        />
      </div>
    );
  }
  if (id.startsWith("node-express")) {
    return (
      <div aria-hidden="true" className={cn("relative flex aspect-[16/10] w-full flex-col items-center justify-center gap-1.5 overflow-hidden rounded-[10px] bg-code-bg font-mono text-[10px] leading-none text-code-muted", className)}>
        <Server className="size-5 text-syn-fn" />
        <span>
          <span className="text-syn-keyword">express</span> · API
        </span>
      </div>
    );
  }
  return <TemplateThumb category={category} className={cn("rounded-[10px]", className)} />;
}
