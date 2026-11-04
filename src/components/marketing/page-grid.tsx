import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SpaceBackdrop } from "@/components/space/space-backdrop";
import type { DarkSceneId } from "@/components/space/scenes";
import type { Crumb } from "@/content/marketing/types";
import { cn } from "@/lib/utils";
import { Breadcrumbs } from "./breadcrumbs";
import { PAGE_SCENE_SETS, sceneForPath, type PageScene } from "./page-scenes";

/**
 * The inner pages' share of the home page's "Monochrome Grid": a slim live space banner behind the
 * page title (PageHero), the 1200px framed column of hairline rows (GridFrame / GridRow), crosshair
 * marks on row corners, the numbered section head (mono eyebrow, two-tone H2, paragraph on the right)
 * and 1px hairline cell grids. Styles: the "Inner pages" block in marketing.css (pg-*).
 */

export type { PageScene };

type Corner = "tl" | "tr" | "bl" | "br";

/** 21px plus signs centred on a row's corners (decorative). */
export function Crosshairs({ corners = ["tl", "tr"] }: { corners?: Corner[] }) {
  return (
    <>
      {corners.map((c) => (
        <span key={c} aria-hidden="true" className={cn("pg-x", `pg-x--${c}`)} />
      ))}
    </>
  );
}

/** Mono eyebrow with a square bullet: "01  Pricing". */
export function Eyebrow({ index, children, className }: { index?: string; children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("mk-eyebrow", className)}>
      <i aria-hidden="true" />
      <span>
        {index ? <span className="mr-2.5">{index}</span> : null}
        {children}
      </span>
    </p>
  );
}

export type HeroAction = { label: string; href: string };

/**
 * The inner-page hero: breadcrumbs, a mono eyebrow, the H1 (an optional `dim` second line in the
 * muted tone), a lede and up to two actions, over a fixed live scene (SpaceBackdrop "banner") with the
 * frame's rails running through it and crosshairs on the bottom corners. `aside` sits beside the copy
 * from lg (a meta list, a form, a picture); `children` go under the copy.
 */
export function PageHero({
  crumbs,
  eyebrow,
  title,
  dim,
  lede,
  actions,
  scene: sceneProp,
  align = "left",
  aside,
  asideWide = false,
  children,
  className,
}: {
  crumbs: Crumb[];
  eyebrow?: string;
  title: React.ReactNode;
  dim?: React.ReactNode;
  lede?: React.ReactNode;
  actions?: HeroAction[];
  /** The banner scene; by default the page's own (sceneForPath on the last crumb). */
  scene?: PageScene;
  align?: "left" | "center";
  aside?: React.ReactNode;
  /** Give the aside the wider share of the row (product pictures). */
  asideWide?: boolean;
  children?: React.ReactNode;
  className?: string;
}) {
  const center = align === "center" && !aside;
  const [primary, ...rest] = actions ?? [];
  const scene = sceneProp ?? sceneForPath(crumbs[crumbs.length - 1]?.path);
  return (
    <header className={cn("pg-hero", className)} data-align={center ? "center" : "left"} data-aside={aside ? (asideWide ? "wide" : "split") : undefined} data-scene={scene} data-space-host>
      <SpaceBackdrop sets={PAGE_SCENE_SETS[scene]} variant="banner" picker={false} />
      <div aria-hidden="true" className="pg-hero__rails" />
      <div className="pg-hero__inner">
        <Breadcrumbs items={crumbs} className={cn("pg-hero__crumbs", center && "flex justify-center")} />
        <div className={cn("pg-hero__grid", aside ? (asideWide ? "pg-hero__grid--wide" : "pg-hero__grid--split") : null)}>
          <div className="pg-hero__copy mk-rise">
            {eyebrow ? <Eyebrow className={cn(center && "justify-center")}>{eyebrow}</Eyebrow> : null}
            <h1 className="pg-h1">
              {title}
              {dim ? (
                <>
                  {" "}
                  <span className="pg-dim">{dim}</span>
                </>
              ) : null}
            </h1>
            {lede ? <div className="pg-lede">{lede}</div> : null}
            {primary ? (
              <div className="pg-ctas">
                <Link href={primary.href} className="mkb mkb--solid mkb--lg pg-cta">
                  {primary.label}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
                {rest.map((a) => (
                  <Link key={a.href} href={a.href} className="mkb mkb--lg pg-glass">
                    {a.label}
                  </Link>
                ))}
              </div>
            ) : null}
            {children}
          </div>
          {aside ? <div className="pg-hero__aside min-w-0">{aside}</div> : null}
        </div>
      </div>
      <div aria-hidden="true" className="pg-hero__frame">
        <Crosshairs corners={["bl", "br"]} />
      </div>
    </header>
  );
}

/** The 1200px column with hairline sides; rows stack inside it. */
export function GridFrame({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mk-frame pg-frame", className)}>{children}</div>;
}

/** A row of the frame: hairline bottom edge, crosshairs on its top corners. */
export function GridRow({ children, className, crosshairs = true, ...rest }: React.HTMLAttributes<HTMLElement> & { crosshairs?: boolean }) {
  return (
    <section className={cn("pg-row", className)} {...rest}>
      {children}
      {crosshairs ? <Crosshairs /> : null}
    </section>
  );
}

/** The numbered row head: mono eyebrow, two-tone H2, and a paragraph on the right (stacked below lg). */
export function RowHead({ id, index, label, title, dim, children, className }: { id?: string; index?: string; label: string; title: React.ReactNode; dim?: React.ReactNode; children?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("pg-sh", !children && "pg-sh--solo", className)}>
      <div>
        <Eyebrow index={index}>{label}</Eyebrow>
        <h2 id={id} className="pg-h2">
          {title}
          {dim ? (
            <>
              <br />
              <span>{dim}</span>
            </>
          ) : null}
        </h2>
      </div>
      {children ? <div className="pg-sh__p">{children}</div> : null}
    </div>
  );
}

/**
 * The closing band shared by inner pages: a live scene (the home page's galaxy by night, its star
 * chart by day), the frame's rails, a two-tone line and up to two actions, or any children.
 */
export function ClosingBand({ title, dim, lede, actions, scene = "galaxy", children }: { title: React.ReactNode; dim?: React.ReactNode; lede?: React.ReactNode; actions?: HeroAction[]; scene?: DarkSceneId; children?: React.ReactNode }) {
  const [primary, ...rest] = actions ?? [];
  return (
    <section aria-label="Get started" className="pg-final" data-space-host>
      <SpaceBackdrop scene={scene} variant="banner" />
      <div aria-hidden="true" className="pg-hero__rails pg-hero__rails--full" />
      <div className="pg-final__inner">
        <h2 className="pg-final__h">
          {title}
          {dim ? (
            <>
              <br />
              <span>{dim}</span>
            </>
          ) : null}
        </h2>
        {lede ? <p className="pg-lede pg-final__lede">{lede}</p> : null}
        {primary ? (
          <div className="pg-ctas justify-center">
            <Link href={primary.href} className="mkb mkb--solid mkb--lg pg-cta">
              {primary.label}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            {rest.map((a) => (
              <Link key={a.href} href={a.href} className="mkb mkb--lg pg-glass">
                {a.label}
              </Link>
            ))}
          </div>
        ) : null}
        {children}
      </div>
      <div aria-hidden="true" className="pg-hero__frame">
        <Crosshairs corners={["tl", "tr"]} />
      </div>
    </section>
  );
}
