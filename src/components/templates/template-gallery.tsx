import { FRAMEWORKS, TEMPLATE_CATEGORIES, TEMPLATE_FRAMEWORKS, TEMPLATES, getTemplate, summarizeTemplate, type TemplateSearch } from "@/templates";
import { GalleryFilters } from "./gallery-filters";
import { GalleryResults } from "./gallery-results";
import { GalleryProvider } from "./gallery-state";
import { FEATURED_LEAD } from "./gallery-search";
import { TemplateTile } from "./template-card";
import { TemplatePreviewSheet } from "./template-sheet";
import { templateSheetDetail, type TemplateSheetDetail } from "./template-details";
import type { TemplateCardData } from "./types";

export type GalleryProps = {
  search: Required<TemplateSearch>;
  categoryMode: "path" | "query";
  basePath: string;
  /** Renders the "Use template" control for a tile. */
  renderAction: (template: TemplateCardData) => React.ReactNode;
  /**
   * In-app only: tiles and Preview open a preview sheet in place (`?preview=<id>`, deep-linkable)
   * instead of the public preview page. `renderSheetAction` renders the sheet's sticky footer action.
   */
  sheet?: { initial: string | null; renderSheetAction: (template: TemplateCardData) => React.ReactNode };
  /** Sticky offset classes for the filter bar (under the page's own header). */
  stickyClassName?: string;
  /** Show the "Screenshots captured from each starter's own build" line by the Featured row (default true; off where the page already says it). */
  featuredCaption?: boolean;
};

/**
 * Server component: renders every tile once (actions included), then hands them to the client
 * gallery, which filters, orders and morphs them instantly while keeping the URL in sync.
 * A Featured row of three large tiles leads the unfiltered view.
 */
export function TemplateGallery({ search, categoryMode, basePath, renderAction, sheet, stickyClassName, featuredCaption = true }: GalleryProps) {
  const items: TemplateCardData[] = TEMPLATES.map(summarizeTemplate);
  const frameworks = TEMPLATE_FRAMEWORKS.map((id) => ({ id, name: FRAMEWORKS[id].name }));
  const sheetLink = (id: string) => {
    const sp = new URLSearchParams();
    if (search.q) sp.set("q", search.q);
    if (search.framework !== "all") sp.set("framework", search.framework);
    if (search.sort !== "featured") sp.set("sort", search.sort);
    if (categoryMode === "query" && search.category !== "all") sp.set("category", search.category);
    sp.set("preview", id);
    return `${basePath}?${sp.toString()}`;
  };
  const linkProps = (id: string) => (sheet ? { href: sheetLink(id), previewLinkProps: { "data-template-preview": id } } : {});

  const tiles: Record<string, React.ReactNode> = {};
  const featured: Record<string, React.ReactNode> = {};
  for (const t of items) tiles[t.id] = <TemplateTile template={t} action={renderAction(t)} {...linkProps(t.id)} />;
  FEATURED_LEAD.forEach((id, i) => {
    const t = items.find((x) => x.id === id);
    if (t) featured[id] = <TemplateTile template={t} size="lg" priority={i === 0} action={renderAction(t)} {...linkProps(t.id)} />;
  });

  let details: Record<string, TemplateSheetDetail> | null = null;
  let sheetActions: Record<string, React.ReactNode> | null = null;
  if (sheet) {
    details = {};
    sheetActions = {};
    for (const t of items) {
      details[t.id] = templateSheetDetail(getTemplate(t.id)!);
      sheetActions[t.id] = sheet.renderSheetAction(t);
    }
  }
  const initialPreview = sheet?.initial && getTemplate(sheet.initial) ? sheet.initial : null;

  return (
    <GalleryProvider initial={search} items={items} categoryMode={categoryMode} basePath={basePath} initialPreview={initialPreview}>
      <GalleryFilters categories={TEMPLATE_CATEGORIES.map((c) => ({ id: c.id, name: c.name }))} frameworks={frameworks} stickyClassName={stickyClassName} />
      <GalleryResults tiles={tiles} featured={featured} caption={featuredCaption} />
      {details && sheetActions ? <TemplatePreviewSheet details={details} actions={sheetActions} /> : null}
    </GalleryProvider>
  );
}
