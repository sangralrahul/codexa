import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { TemplatePreview } from "@/components/templates/template-preview";
import { SectionHeader } from "@/components/marketing/section";
import { HOME_CHIPS, HOME_WALL } from "@/content/marketing/home";
import type { WallTile } from "./data";

/** How many starters the strip shows (the rest are one click away on /templates). */
const COUNT = 6;

/**
 * H3 templates strip: six real starters in a flat grid, each a captured screenshot with its name and
 * framework, linking to the starter's preview. The chip starters go first so the strip matches the
 * composer's examples; the rest fill up from the gallery order.
 */
export function TemplateStrip({ tiles, total, frameworkSummary }: { tiles: WallTile[]; total: number; frameworkSummary: string }) {
  const first = HOME_CHIPS.map((c) => tiles.find((t) => t.id === c.templateId)).filter((t): t is WallTile => Boolean(t));
  const rest = tiles.filter((t) => !first.some((f) => f.id === t.id));
  const shown = [...first, ...rest].slice(0, COUNT);
  return (
    <section aria-labelledby="templates-title" className="border-b border-border bg-surface/60 py-14 lg:py-20">
      <div className="container-x">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeader index={HOME_WALL.index} title={HOME_WALL.title} lead={`${total} starter templates: ${frameworkSummary}. Open one to read its files, then remix it with a sentence.`} className="max-w-3xl" />
          <Link href={HOME_WALL.browse.href} className="group/b inline-flex shrink-0 items-center gap-1 text-sm font-medium text-foreground lg:pb-1">
            <span className="link-draw">{HOME_WALL.browse.label}</span>
            <ArrowRight className="size-3.5 transition-transform group-hover/b:translate-x-0.5" aria-hidden="true" />
          </Link>
        </div>
        <ul className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((t) => (
            <li key={t.id}>
              <Link href={t.href} aria-label={`${t.name} — ${t.frameworkName} starter template`} className="group/t block rounded-[12px] border border-border bg-card p-2 outline-offset-4 transition-[border-color,box-shadow] duration-200 hover:border-border-strong hover:shadow-md">
                <TemplatePreview id={t.id} category={t.category} pan sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw" className="rounded-[8px] shadow-none" />
                <span className="flex items-center justify-between gap-3 px-2 pb-1.5 pt-3">
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-semibold text-foreground">{t.name}</span>
                    <span className="block truncate text-[12.5px] text-muted-foreground">
                      {t.categoryName} · {t.frameworkName}
                    </span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover/t:translate-x-0.5" aria-hidden="true" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-muted-foreground">{HOME_WALL.caption}</p>
      </div>
    </section>
  );
}
