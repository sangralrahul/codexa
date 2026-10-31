import Link from "next/link";
import { templateShotSrc, templateShotSrcSet, SHOT_HEIGHT, SHOT_WIDTH } from "@/components/templates/shots";
import { SectionHead } from "./frame";
import type { HomeCategory, HomeTemplateTile } from "./data";

/** 02 Templates: a mono category strip (links into the gallery) and four starters with real screenshots. */
export function HomeTemplates({ total, categoryCount, categories, tiles }: { total: number; categoryCount: number; categories: HomeCategory[]; tiles: HomeTemplateTile[] }) {
  return (
    <section aria-labelledby="templates-title" className="mkg-row">
      <SectionHead id="templates-title" index="02" label="Templates" title={`${total} starters that run.`} dim={`${categoryCount} categories.`}>
        <p>Start from a working app instead of a blank page. Every template opens in the editor with its preview already running.</p>
      </SectionHead>
      <nav aria-label="Template categories" className="mkg-cats">
        <Link href="/templates" className="mkg-cats__on">
          All
        </Link>
        {categories.map((c) => (
          <Link key={c.id} href={c.href}>
            {c.name}
          </Link>
        ))}
      </nav>
      <ul className="mkg-tpl">
        {tiles.map((t) => (
          <li key={t.id}>
            <Link href={t.href} aria-label={`${t.name}, ${t.runtime} starter template`} className="mkg-tpl__link">
              {/* eslint-disable-next-line @next/next/no-img-element -- template screenshot with srcset */}
              <img src={templateShotSrc(t.id)} srcSet={templateShotSrcSet(t.id)} sizes="(min-width: 1200px) 260px, (min-width: 640px) 50vw, 100vw" alt="" width={SHOT_WIDTH} height={SHOT_HEIGHT} loading="lazy" decoding="async" />
              <span className="mkg-tpl__cap">
                {t.name}
                <span>{t.runtime}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
