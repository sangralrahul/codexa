import Link from "next/link";
import * as React from "react";
import { ArrowRight, Box, Database, Globe, History, Lock, MonitorSmartphone, type LucideIcon } from "lucide-react";
import { SectionHeader } from "@/components/marketing/section";
import { IconTile } from "@/components/marketing/premium";
import { HOME_INTEGRATIONS, HOME_PLATFORM_CF } from "@/content/marketing/home";
import type { ConstellationNode } from "./data";

export type ChangelogEntry = { title: string; date: string; href: string };

const ICONS: Record<string, LucideIcon> = { box: Box, monitor: MonitorSmartphone, database: Database, globe: Globe, history: History, lock: Lock };

function formatDate(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/**
 * "Runs on Cloudflare": six icon tiles (sandbox per project, previews in containers, hosting on R2,
 * custom domains, rollbacks, encrypted secrets), a request-path diagram drawn from CSS boxes
 * (browser → Worker → container → R2) with labels, then the live status pill, the connectable
 * integrations and the latest changelog entries. Facts from docs/CLOUDFLARE.md and the services.
 */
export function Platform({ status, nodes, changelog }: { status: React.ReactNode; nodes: ConstellationNode[]; changelog: ChangelogEntry[] }) {
  const { diagram } = HOME_PLATFORM_CF;
  return (
    <section aria-labelledby="platform-title" className="border-b border-border bg-surface py-20 lg:py-28">
      <div className="container-x">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-5">
            <SectionHeader id="platform-title" index={HOME_PLATFORM_CF.index} title={HOME_PLATFORM_CF.title} lead={HOME_PLATFORM_CF.lead} />
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {status}
              <Link href={HOME_PLATFORM_CF.docs.href} className="group/d link-draw inline-flex items-center gap-1 text-[14px] font-semibold text-primary">
                {HOME_PLATFORM_CF.docs.label}
                <ArrowRight className="size-3.5 transition-transform group-hover/d:translate-x-0.5" aria-hidden="true" />
              </Link>
            </div>

            {/* Request path diagram: four CSS boxes joined by hairlines, labelled. */}
            <figure className="mk-diagram mt-10" aria-label={diagram.caption}>
              <ol className="mk-diagram__row">
                {diagram.nodes.map((n, i) => (
                  <React.Fragment key={n.id}>
                    {i > 0 ? (
                      <li aria-hidden="true" className="mk-diagram__link">
                        <span className="mk-diagram__line" />
                        <span className="mk-diagram__arrow" />
                      </li>
                    ) : null}
                    <li className={`mk-diagram__node mk-diagram__node--${n.id}`}>
                      <span className="mk-diagram__label">{n.label}</span>
                      <span className="mk-diagram__sub">{n.sub}</span>
                    </li>
                  </React.Fragment>
                ))}
              </ol>
              <div className="mk-diagram__legend">
                <span>
                  <span className="mk-diagram__dot" /> Preview requests → container
                </span>
                <span>
                  <span className="mk-diagram__dot mk-diagram__dot--r2" /> Published sites → R2
                </span>
              </div>
              <figcaption className="mt-3 text-[12.5px] leading-relaxed text-muted-foreground">{diagram.caption}</figcaption>
            </figure>
          </div>

          <div className="lg:col-span-7">
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {HOME_PLATFORM_CF.tiles.map((t) => {
                const Icon = ICONS[t.icon] ?? Box;
                return (
                  <li key={t.id} className="mk-card mk-card--hover p-5">
                    <IconTile icon={Icon} />
                    <h3 className="mt-4 text-[15.5px] font-semibold tracking-[-0.01em] text-foreground">{t.title}</h3>
                    <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">{t.body}</p>
                  </li>
                );
              })}
            </ul>

            <div className="mt-10 grid grid-cols-1 gap-8 border-t border-border pt-8 md:grid-cols-2">
              <div>
                <p className="text-[12.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{HOME_INTEGRATIONS.index}</p>
                <ul aria-label="Integrations you can connect" className="mt-3 flex flex-wrap gap-2">
                  {nodes.map((n) => (
                    <li key={n.id}>
                      <Link href={n.href} title={n.description} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-[12.5px] font-medium text-foreground transition-[border-color,box-shadow] hover:border-border-strong hover:shadow-md">
                        {n.name}
                        <span className="text-[11px] font-normal text-muted-foreground">{n.categoryName}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                  <span>{HOME_INTEGRATIONS.trademark}</span>
                  <Link href={HOME_INTEGRATIONS.all.href} className="group/i link-draw inline-flex items-center gap-1 font-semibold text-primary">
                    {HOME_INTEGRATIONS.all.label}
                    <ArrowRight className="size-3 transition-transform group-hover/i:translate-x-0.5" aria-hidden="true" />
                  </Link>
                </p>
              </div>
              {changelog.length ? (
                <div>
                  <p className="text-[12.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Changelog</p>
                  <ul className="mt-1 divide-y divide-border">
                    {changelog.map((e) => (
                      <li key={e.href}>
                        <Link href={e.href} className="group/c flex items-center gap-3 py-2.5 text-[13.5px]">
                          <time dateTime={e.date} className="shrink-0 font-mono text-[11.5px] tabular-nums text-muted-foreground">
                            {formatDate(e.date)}
                          </time>
                          <span className="min-w-0 truncate font-medium text-foreground">{e.title}</span>
                          <ArrowRight className="ml-auto size-3.5 shrink-0 text-muted-foreground transition-transform group-hover/c:translate-x-0.5" aria-hidden="true" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
