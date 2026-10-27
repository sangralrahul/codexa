import { Braces, Globe, LayoutTemplate } from "lucide-react";
import { TEMPLATE_SHOTS, templateShotFor } from "@/components/templates/shots";
import { TEMPLATE_API_ROUTES } from "@/components/templates/api-routes.generated";
import type { ApiRoute } from "@/components/templates/route-parse";
import { cn } from "@/lib/utils";

/** Thumbnail boxes (width × height in px, 16:10). */
const SIZES = {
  /** 20×13: sidebar Recent rows. */
  xs: { box: "h-[13px] w-5 rounded-[3px]", icon: "size-2.5", px: 40 },
  /** 32×20: command menu rows. */
  sm: { box: "h-5 w-8 rounded-[5px]", icon: "size-3", px: 64 },
  /** 40×25: projects table rows. */
  md: { box: "h-[25px] w-10 rounded-[6px]", icon: "size-3.5", px: 80 },
  /** 48×30: the composer's template chip and preset cards. */
  lg: { box: "h-[30px] w-12 rounded-[7px]", icon: "size-4", px: 96 },
} as const;

const FRAMEWORK_ICON: Record<string, typeof Globe> = { "node-express": Braces, static: Globe };

/** Route rows the code thumbnail draws per size (the boxes are 13–30px tall). */
const ROUTE_ROWS = { xs: 2, sm: 3, md: 3, lg: 4 } as const;
const METHOD_BAR: Record<ApiRoute["method"], string> = {
  GET: "bg-syn-string",
  POST: "bg-syn-fn",
  PUT: "bg-syn-number",
  PATCH: "bg-syn-number",
  DELETE: "bg-syn-tag",
};

/**
 * API starters have no screen: a miniature of their route listing instead (the same terminal card the
 * template pages show, drawn as bars). One row per real route, coloured by its HTTP method, the bar
 * length following the path length. Decorative.
 */
function RouteGlyph({ routes, size }: { routes: ApiRoute[]; size: keyof typeof SIZES }) {
  const rows = routes.slice(0, ROUTE_ROWS[size]);
  const bar = size === "xs" ? "h-px" : "h-[2px]";
  return (
    <span className={cn("flex size-full flex-col justify-center bg-code-bg", size === "xs" ? "gap-[2px] px-[3px]" : "gap-[3px] px-[4px]")}>
      {rows.map((r) => (
        <span key={`${r.method} ${r.path}`} className="flex items-center gap-[2px]">
          <span className={cn("w-[22%] shrink-0 rounded-full", bar, METHOD_BAR[r.method])} />
          <span className={cn("rounded-full bg-code-fg/35", bar)} style={{ width: `${Math.min(70, 18 + r.path.length * 3)}%` }} />
        </span>
      ))}
    </span>
  );
}

/**
 * A project's tiny thumbnail: the screenshot of the template it was created from (a real capture of
 * that starter, never presented as the user's own app; callers label it), a miniature of the real
 * route list for API starters (they have no screen), or a framework glyph when the template is
 * unknown. Decorative; server-safe.
 */
export function ProjectThumb({ templateId, framework, size = "xs", className }: { templateId: string | null | undefined; framework?: string; size?: keyof typeof SIZES; className?: string }) {
  const s = SIZES[size];
  const hasShot = Boolean(templateId && TEMPLATE_SHOTS.has(templateId));
  const routes = !hasShot && templateId ? TEMPLATE_API_ROUTES[templateId] : undefined;
  const Icon = (framework && FRAMEWORK_ICON[framework]) || LayoutTemplate;
  return (
    <span aria-hidden="true" className={cn("relative inline-flex shrink-0 items-center justify-center overflow-hidden bg-surface-2 shadow-[inset_0_0_0_1px_var(--border)]", s.box, className)}>
      {hasShot ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={templateShotFor(templateId as string, s.px)} alt="" loading="lazy" decoding="async" width={s.px} height={Math.round(s.px * 0.625)} className="size-full object-cover object-top" />
      ) : routes?.length ? (
        <RouteGlyph routes={routes} size={size} />
      ) : (
        <Icon className={cn(s.icon, "text-muted-foreground")} strokeWidth={2} />
      )}
      <span className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--foreground)_8%,transparent)]" />
    </span>
  );
}

/** True when the thumbnail shows a template screenshot (so the UI can say "Template preview"). */
export function hasTemplateShot(templateId: string | null | undefined) {
  return Boolean(templateId && TEMPLATE_SHOTS.has(templateId));
}

/**
 * Whether a project's picture needs the "Template preview" caption: true for screenshots and drawn
 * thumbnails; false for API starters, whose route listing already says what it is.
 */
export function needsTemplateCaption(templateId: string | null | undefined) {
  return !(templateId && TEMPLATE_API_ROUTES[templateId] && !TEMPLATE_SHOTS.has(templateId));
}
