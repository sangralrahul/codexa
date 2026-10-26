import Link from "next/link";
import { Eye, FileCode2 } from "lucide-react";
import { getTemplate } from "@/templates";
import { TEMPLATE_CATEGORIES } from "@/templates";
import { TemplatePreview } from "@/components/templates/template-preview";
import { UseTemplateLink, templatePreviewHref } from "@/components/templates/template-card";
import { TEMPLATE_SHOTS } from "@/components/templates/shots";
import { cn } from "@/lib/utils";

/** Real starters for a page: name, category, file count and a captured screenshot. Unknown ids are skipped. */
export function railTemplates(ids: string[]) {
  return ids.flatMap((id) => {
    const t = getTemplate(id);
    if (!t) return [];
    return [{ id: t.id, name: t.name, description: t.description, category: t.category, categoryName: TEMPLATE_CATEGORIES.find((c) => c.id === t.category)?.name ?? t.category, files: Object.keys(t.files).length }];
  });
}

/**
 * "Start from" rail (PLAN §5.3 solution pages): two or three real starter templates with their
 * captured screenshots (panning on hover or focus), file counts, and the same Use template /
 * Preview links as the gallery.
 */
export function TemplateRail({ ids, signedIn, className }: { ids: string[]; signedIn: boolean; className?: string }) {
  const items = railTemplates(ids);
  return (
    <ul data-reveal="stagger" data-spotlight="grid" className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {items.map((t) => (
        <li key={t.id} className="glow-card group flex flex-col rounded-[18px] border border-border p-2.5">
          <div className="shot-pan relative overflow-hidden rounded-[12px] bg-gradient-to-br from-signal/[0.08] via-surface to-info/[0.08] px-4 pt-4">
            <TemplatePreview id={t.id} category={t.category} className="rounded-b-none border-b-0 shadow-lg" />
          </div>
          <div className="flex flex-1 flex-col px-2.5 pb-2 pt-4">
            <p className="text-label text-muted-foreground">{t.categoryName}</p>
            <h3 className="mt-2 text-[17px] font-semibold tracking-[-0.015em]">
              <Link href={templatePreviewHref(t.id)} className="outline-offset-4 hover:underline hover:decoration-border-strong hover:underline-offset-4">
                {t.name}
              </Link>
            </h3>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">{t.description}</p>
            <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
              <UseTemplateLink templateId={t.id} signedIn={signedIn} />
              <Link href={templatePreviewHref(t.id)} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border px-3 text-[13px] text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground">
                <Eye className="size-3.5" aria-hidden="true" />
                Preview
              </Link>
              <span className="ml-auto inline-flex items-center gap-1 text-[12px] text-muted-foreground">
                <FileCode2 className="size-3.5" aria-hidden="true" />
                {t.files} files
              </span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

const FAN_OFFSETS = [[0], [-0.5, 0.5], [0, -1, 1]];

/** A fanned stack of real starter screenshots (hero visual for solution pages; decorative). */
export function TemplateFan({ ids, className, caption = true, stack = false }: { ids: string[]; className?: string; caption?: boolean; /** Stacked at rest; fans out when the enclosing .group is hovered or focused. */ stack?: boolean }) {
  const items = railTemplates(ids).filter((t) => TEMPLATE_SHOTS.has(t.id)).slice(0, 3);
  if (!items.length) return null;
  return (
    <figure className={cn("relative", className)}>
      <div aria-hidden="true" className={cn("mk-fan relative mx-auto w-full", stack ? "mk-fan--stack aspect-[16/10]" : "aspect-[16/10.4] max-w-[640px]")}>
        {items.map((t, i) => {
          // The first (best-fitting) starter sits in front, centred; the others fan out behind it.
          const k = FAN_OFFSETS[items.length - 1][i];
          return (
          <div key={t.id} className="mk-fan__card" style={{ "--k": k, "--a": Math.abs(k), zIndex: 3 - i } as React.CSSProperties}>
            <div className="flex h-7 items-center gap-1.5 border-b border-border bg-surface/90 px-3">
              <span className="truncate font-mono text-[10px] text-muted-foreground">{t.name}</span>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/templates/${t.id}.webp`} alt="" width={960} height={600} loading={stack ? "lazy" : "eager"} decoding="async" className="aspect-[16/10] w-full bg-white object-cover object-top" />
          </div>
          );
        })}
      </div>
      {caption ? (
        <figcaption className="mt-2 text-center font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
          Real starters · screenshots captured from their builds
        </figcaption>
      ) : null}
    </figure>
  );
}
