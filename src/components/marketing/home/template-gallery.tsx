import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { TemplatePreview } from "@/components/templates/template-preview";
import { SectionHeader } from "@/components/marketing/section";
import { CtaLink } from "@/components/marketing/premium";
import { HOME_GALLERY } from "@/content/marketing/home";
import { cn } from "@/lib/utils";
import type { WallTile } from "./data";

/**
 * H3 templates gallery: eight real starter screenshots on a masonry-ish grid (one 2×2 tile, one
 * 2×1 tile and six small, on a 4-column grid with dense packing), each with a caption that slides up on hover
 * or focus naming the starter and its framework. Every tile links to the starter's preview.
 */
export function TemplateGallery({ tiles, total, frameworkSummary }: { tiles: WallTile[]; total: number; frameworkSummary: string }) {
  const shown = tiles.slice(0, 8);
  return (
    <section aria-labelledby="templates-title" className="border-b border-border py-20 lg:py-28">
      <div className="container-x">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeader id="templates-title" index={HOME_GALLERY.index} title={HOME_GALLERY.title} lead={`${total} starter templates: ${frameworkSummary}. Open one to read its files, then remix it with a sentence.`} className="max-w-3xl" />
          <CtaLink href={HOME_GALLERY.browse.href} variant="secondary" arrow className="shrink-0 self-start lg:self-end">
            {HOME_GALLERY.browse.label}
          </CtaLink>
        </div>
        <ul className="mk-gallery mt-12">
          {shown.map((t, i) => (
            <li key={t.id} className={cn("mk-gallery__item", i === 0 && "mk-gallery__item--lg", i === 5 && "mk-gallery__item--wide")}>
              <Link href={t.href} aria-label={`${t.name} — ${t.frameworkName} starter template`} className="mk-gallery__link group/t">
                <TemplatePreview id={t.id} category={t.category} sizes={i === 0 || i === 5 ? "(min-width: 1024px) 600px, 100vw" : "(min-width: 1024px) 300px, (min-width: 640px) 50vw, 100vw"} className="h-full rounded-none border-0 shadow-none" imgClassName="h-full aspect-auto" />
                <span className="mk-gallery__caption">
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-semibold text-foreground">{t.name}</span>
                    <span className="block truncate text-[12px] text-muted-foreground">
                      {t.categoryName} · {t.frameworkName}
                    </span>
                  </span>
                  <ArrowUpRight className="size-4 shrink-0 text-foreground" aria-hidden="true" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-5 text-[13px] text-muted-foreground">{HOME_GALLERY.caption}</p>
      </div>
    </section>
  );
}
