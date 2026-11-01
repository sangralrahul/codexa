import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SHOT_HEIGHT, SHOT_WIDTH } from "@/components/templates/shots";
import { SectionHead } from "./frame";
import { Live } from "./live";
import type { HomeCategory, HomeTemplateTile } from "./data";

/** One tile: the 720w screenshot (lazy), the name and runtime tag. Copies made for the loop are hidden and out of the tab order. */
function Tile({ t, copy }: { t: HomeTemplateTile; copy: boolean }) {
  return (
    <li aria-hidden={copy || undefined}>
      <Link href={t.href} className="hm-tpl" tabIndex={copy ? -1 : undefined} aria-label={copy ? undefined : `${t.name}, ${t.runtime} template preview`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- template screenshot, 720w variant */}
        <img src={`/templates/${t.id}-720.webp`} alt="" width={SHOT_WIDTH / 2} height={SHOT_HEIGHT / 2} loading="lazy" decoding="async" />
        <span className="hm-tpl__cap">
          {t.name}
          <span>{t.runtime}</span>
        </span>
      </Link>
    </li>
  );
}

/**
 * 03 Templates: three rows of real template screenshots drifting in opposite directions (CSS, in a
 * <Live> region: paused off screen, on hover or focus, by the pause control, and static under calm,
 * where each row scrolls by hand instead). Category chips link into the gallery.
 */
export function HomeTemplates({ total, categoryCount, rows, categories }: { total: number; categoryCount: number; rows: HomeTemplateTile[][]; categories: HomeCategory[] }) {
  return (
    <section aria-labelledby="templates-title" className="mkg-row">
      <SectionHead id="templates-title" index="03" label="Templates" title={`${total} starters that run.`} dim={`${categoryCount} categories.`}>
        <p>Start from a working app instead of a blank page. Every template opens in the editor with its preview already running.</p>
      </SectionHead>
      <Live className="hm-marquee" pauseLabel="Pause the template marquee">
        {rows.map((row, r) => (
          <div key={r} className="hm-marquee__row" data-dir={r % 2 ? "right" : "left"} style={{ "--dur": `${70 + r * 12}s` } as React.CSSProperties}>
            <ul className="hm-marquee__track">
              {row.map((t) => (
                <Tile key={t.id} t={t} copy={false} />
              ))}
              {row.map((t) => (
                <Tile key={`${t.id}-copy`} t={t} copy />
              ))}
            </ul>
          </div>
        ))}
      </Live>
      <div className="hm-cats">
        <nav aria-label="Template categories" className="hm-cats__list">
          {categories.map((c) => (
            <Link key={c.id} href={c.href}>
              {c.name}
              <span>{c.count}</span>
            </Link>
          ))}
        </nav>
        <Link href="/templates" className="mkb mkb--solid">
          Browse {total} templates <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
