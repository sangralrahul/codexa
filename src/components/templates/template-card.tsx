import Link from "next/link";
import { ArrowRight, Check, Eye, Sparkles } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TemplateCardData } from "./types";
import { TemplatePreview } from "./template-preview";
import { FEATURED_LEAD, templateMeta } from "./gallery-search";

const FEATURED_IDS: ReadonlySet<string> = new Set(FEATURED_LEAD);

export function templatePreviewHref(id: string) {
  return `/templates/preview/${id}`;
}

export type TemplateTileVariant = "browse" | "select" | "compact";

/**
 * The one template tile used by every gallery (PLAN §5.4). Server-safe.
 * - browse: edge-to-edge 16:10 screenshot (slow pan on hover/focus), 15px name, one-line description,
 *   muted meta "React · 12 files · Beginner", a "Featured" label over the image, and actions
 *   (Preview, Use template). With a pointer that hovers, the actions float over the screenshot and
 *   appear on hover/focus-within; on touch screens they sit in the card body under the meta line
 *   (no scrim over the screenshot, and the Featured label stays visible).
 *   The whole tile is a stretched link to `href` with a visible focus ring.
 *   The Featured label marks the gallery's Featured row starters only (FEATURED_LEAD), so a starter
 *   carries it on every surface or on none. Hooks for galleries: `data-tile-desc`, `data-tile-actions`.
 * - select: no link or actions; wrap it in your own radio/label. Shows a check when `selected`.
 * - compact: smaller tile for rails and "related" lists; link only.
 * `size="lg"` is the Featured-row tile. The tile carries `view-transition-name: tpl-<id>` so filter
 * and sort changes morph (keep at most one tile per template on a page).
 */
export function TemplateTile({
  template,
  action,
  variant = "browse",
  size = "md",
  href,
  previewHref,
  previewLinkProps,
  selected = false,
  priority = false,
  sizes,
  as: Root = "li",
  headingLevel = "h3",
  className,
}: {
  template: TemplateCardData;
  /** The "Use template" control (a link on the public site, a client button in the app). */
  action?: React.ReactNode;
  variant?: TemplateTileVariant;
  size?: "md" | "lg";
  /** Where the tile links (default: the public preview page). */
  href?: string;
  /** Target of the "Preview" action (default: `href`). */
  previewHref?: string;
  /** Extra attributes for the tile and Preview links (e.g. data-template-preview for the in-app sheet). */
  previewLinkProps?: Record<string, string>;
  selected?: boolean;
  priority?: boolean;
  sizes?: string;
  as?: "li" | "div";
  headingLevel?: "h2" | "h3";
  className?: string;
}) {
  const t = template;
  const target = href ?? templatePreviewHref(t.id);
  const lg = size === "lg";
  const compact = variant === "compact";
  const linked = variant !== "select";
  const featured = FEATURED_IDS.has(t.id) && !compact;
  const Heading = headingLevel;
  const imgSizes = sizes ?? (lg ? "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" : compact ? "(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw" : undefined);

  return (
    <Root
      data-template-tile={t.id}
      data-selected={variant === "select" ? String(selected) : undefined}
      className={cn("group/tile shot-pan relative flex min-w-0 flex-col", className)}
      style={{ viewTransitionName: `tpl-${t.id}` }}
    >
      <div
        data-spotlight-tile
        className={cn(
          "relative isolate overflow-hidden border bg-surface-2 shadow-[inset_0_1px_0_var(--hairline),var(--shadow-sm)] transition-[translate,border-color,box-shadow] duration-(--dur-4) ease-out",
          lg ? "rounded-lg" : compact ? "rounded-md" : "rounded-lg",
          "border-border group-hover/tile:border-border-strong group-hover/tile:shadow-lg",
          linked && "group-hover/tile:-translate-y-0.5 group-active/tile:translate-y-0 calm:group-hover/tile:translate-y-0",
          "group-has-[[data-tile-link]:focus-visible]/tile:outline-2 group-has-[[data-tile-link]:focus-visible]/tile:outline-offset-[3px] group-has-[[data-tile-link]:focus-visible]/tile:outline-ring",
          variant === "select" && selected && "border-foreground/40 shadow-lg outline-2 outline-offset-[3px] outline-ring",
        )}
      >
        <TemplatePreview id={t.id} category={t.category} priority={priority} sizes={imgSizes} className="rounded-none border-0 shadow-none" />
        {/* Soft floor so the floating actions read on any screenshot (pointer devices only; touch keeps the screenshot clean). */}
        {variant === "browse" ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-2/5 bg-gradient-to-t from-background/70 via-background/25 to-transparent opacity-0 transition-opacity duration-(--dur-3) group-focus-within/tile:opacity-100 group-hover/tile:opacity-100 [@media(hover:none)]:hidden"
          />
        ) : null}
        {featured ? (
          <span
            data-featured-label
            className="absolute bottom-3 left-3 z-[2] inline-flex h-6 items-center gap-1.5 rounded-full bg-background/85 px-2.5 font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-foreground shadow-[inset_0_0_0_1px_var(--border),var(--shadow-sm)] backdrop-blur-md transition-opacity duration-(--dur-3) group-hover/tile:opacity-0 group-focus-within/tile:opacity-0 [@media(hover:none)]:opacity-100"
          >
            <Sparkles className="size-3 text-accent" aria-hidden="true" />
            Featured
          </span>
        ) : null}
        {variant === "select" ? (
          <span
            aria-hidden="true"
            className={cn(
              "absolute right-3 top-3 z-[2] grid size-6 place-items-center rounded-full border shadow-sm transition-[opacity,scale] duration-(--dur-3) ease-snap",
              selected ? "scale-100 border-transparent bg-foreground text-background opacity-100" : "scale-75 border-border bg-card/80 opacity-0 group-hover/tile:scale-100 group-hover/tile:opacity-100",
            )}
          >
            <Check className="size-3.5" strokeWidth={2.5} />
          </span>
        ) : null}
      </div>

      <div className={cn("px-0.5", lg ? "mt-4" : compact ? "mt-2.5" : "mt-3.5")}>
        <Heading className={cn("font-semibold leading-snug tracking-[-0.01em] text-foreground", lg ? "text-[17px]" : compact ? "text-[14px]" : "text-[15px]")}>
          {linked ? (
            <Link
              data-tile-link
              href={target}
              {...previewLinkProps}
              className="outline-none after:absolute after:inset-0 after:z-[1] after:rounded-lg after:content-['']"
            >
              {t.name}
            </Link>
          ) : (
            t.name
          )}
        </Heading>
        {!compact ? (
          <p data-tile-desc="" className={cn("mt-1 text-muted-foreground", lg ? "line-clamp-2 text-[14px] leading-relaxed" : "line-clamp-1 text-[13px]")}>
            {t.description}
          </p>
        ) : null}
        <p className={`text-meta ${cn("text-foreground-dim", compact ? "mt-1" : "mt-2")}`}>{templateMeta(t)}</p>
      </div>
      {variant === "browse" ? (
        // Pointer devices: floats over the image area (same 16:10 box) but outside the media layer,
        // so it stacks above the stretched title link; the empty area passes clicks through to the link.
        // Touch devices: an in-flow row under the meta line (still above the stretched link).
        <div
          data-tile-actions=""
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 z-[3] flex aspect-[16/10] items-end justify-end p-3 transition-[translate] duration-(--dur-4) ease-out",
            "[@media(hover:none)]:relative [@media(hover:none)]:aspect-auto [@media(hover:none)]:justify-start [@media(hover:none)]:px-0.5 [@media(hover:none)]:pb-0 [@media(hover:none)]:pt-3",
            linked && "group-hover/tile:-translate-y-0.5 calm:group-hover/tile:translate-y-0",
          )}
        >
          <div
            className={cn(
              "pointer-events-auto flex flex-wrap items-end justify-end gap-2",
              "translate-y-1.5 opacity-0 transition-[opacity,translate] duration-(--dur-3) ease-out",
              "group-focus-within/tile:translate-y-0 group-focus-within/tile:opacity-100 group-hover/tile:translate-y-0 group-hover/tile:opacity-100",
              "has-[[role=alert]]:translate-y-0 has-[[role=alert]]:opacity-100",
              "[@media(hover:none)]:translate-y-0 [@media(hover:none)]:justify-start [@media(hover:none)]:opacity-100 [@media(hover:none)]:transition-none",
              "[&_[role=alert]]:max-w-[16rem] [&_[role=alert]]:rounded-lg [&_[role=alert]]:bg-card [&_[role=alert]]:p-2 [&_[role=alert]]:shadow-lg",
            )}
          >
            <Link
              href={previewHref ?? target}
              {...previewLinkProps}
              className={buttonClasses("outline", "sm", "border-border bg-card/85 text-foreground backdrop-blur-md hover:bg-card [@media(hover:none)]:bg-card")}
              aria-label={`Preview ${t.name}`}
            >
              <Eye className="size-3.5" aria-hidden="true" />
              Preview
            </Link>
            {action}
          </div>
        </div>
      ) : null}
    </Root>
  );
}

/**
 * Gallery card (kept for existing callers): a browse TemplateTile. `action` is the
 * "Use template" control: a link for the public site, or a client button in the app.
 */
export function TemplateCard({ template, action }: { template: TemplateCardData; action: React.ReactNode }) {
  return <TemplateTile template={template} action={action} />;
}

/** Public "Use template" link: new-project for signed-in users, signup (with next) otherwise. */
export function UseTemplateLink({ templateId, signedIn, size = "sm", label = "Use template", className }: { templateId: string; signedIn: boolean; size?: "sm" | "md" | "lg"; label?: string; className?: string }) {
  const target = `/new-project?template=${encodeURIComponent(templateId)}`;
  const href = signedIn ? target : `/signup?next=${encodeURIComponent(target)}`;
  return (
    <Link href={href} className={buttonClasses("primary", size, cn("group/use", className))}>
      {label}
      <ArrowRight className={cn(size === "sm" ? "size-3.5" : "size-4", "transition-transform duration-(--dur-3) ease-snap group-hover/use:translate-x-0.5")} aria-hidden="true" />
    </Link>
  );
}
