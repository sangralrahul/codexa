import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { TemplatePreview } from "@/components/templates/template-preview";
import { SectionHeader } from "@/components/marketing/section";
import { CtaLink } from "@/components/marketing/premium";
import { HOME_CHIPS, HOME_WALL } from "@/content/marketing/home";
import type { WallTile } from "./data";

/** How many starters the strip shows (the rest are one click away on /templates). */
const COUNT = 6;

/**
 * H3 templates strip on the off-white band: six real starters, each a captured screenshot in a
 * card that lifts on hover, with its name and framework, linking to the starter's preview. The chip
 * starters go first so the strip matches the composer's examples; the rest fill up from the gallery.
 */
export function TemplateStrip({ tiles, total, frameworkSummary }: { tiles: WallTile[]; total: number; frameworkSummary: string }) {
  const first = HOME_CHIPS.map((c) => tiles.find((t) => t.id === c.templateId)).filter((t): t is WallTile => Boolean(t));
  const rest = tiles.filter((t) => !first.some((f) => f.id === t.id));
  const shown = [...first, ...rest].slice(0, COUNT);
  return (
    <section aria-labelledby="templates-title" className="border-b border-border bg-surface py-20 lg:py-28">
      <div className="container-x">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeader id="templates-title" index={HOME_WALL.index} title={HOME_WALL.title} lead={`${total} starter templates: ${frameworkSummary}. Open one to read its files, then remix it with a sentence.`} className="max-w-3xl" />
          <CtaLink href={HOME_WALL.browse.href} variant="secondary" arrow className="shrink-0 self-start lg:self-end">
            {HOME_WALL.browse.label}
          </CtaLink>
        </div>
        <ul className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((t) => (
            <li key={t.id}>
              <Link href={t.href} aria-label={`${t.name} — ${t.frameworkName} starter template`} className="mk-card mk-lift group/t block rounded-[16px] p-2.5 outline-offset-4">
                <TemplatePreview id={t.id} category={t.category} pan sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw" className="rounded-[10px] border-border/70 shadow-none" />
                <span className="flex items-center justify-between gap-3 px-2.5 pb-2 pt-3.5">
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-semibold text-foreground">{t.name}</span>
                    <span className="block truncate text-[13px] text-muted-foreground">
                      {t.categoryName} · {t.frameworkName}
                    </span>
                  </span>
                  <span className="mk-tile mk-tile--sm transition-colors group-hover/t:bg-[image:var(--brand-gradient)] group-hover/t:text-primary-foreground">
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-5 text-[13px] text-muted-foreground">{HOME_WALL.caption}</p>
      </div>
    </section>
  );
}
