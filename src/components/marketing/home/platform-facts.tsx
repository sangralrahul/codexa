import Link from "next/link";
import * as React from "react";
import { ArrowRight, Cloud } from "lucide-react";
import { SectionHeader } from "@/components/marketing/section";
import { HOME_INTEGRATIONS, HOME_PROOF } from "@/content/marketing/home";
import type { ConstellationNode, ProofFact } from "./data";

export type ChangelogEntry = { title: string; date: string; href: string };

function formatDate(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/**
 * H4 + H5: facts read from the code that enforces them (each footnoted with its symbol and file),
 * the live status pill, the latest changelog entries, and the integrations a user can connect.
 * No usage, customer or speed numbers; the note says so.
 */
export function PlatformFacts({ facts, changelog, status, nodes }: { facts: ProofFact[]; changelog: ChangelogEntry[]; status: React.ReactNode; nodes: ConstellationNode[] }) {
  return (
    <section aria-labelledby="proof-title" className="border-b border-border py-20 lg:py-28">
      <div className="container-x">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-7">
            <SectionHeader id="proof-title" index={HOME_PROOF.index} title={HOME_PROOF.title} className="max-w-2xl" />
            <dl className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {facts.map((f) => (
                <div key={f.label} className="mk-card flex min-w-0 flex-col p-5">
                  <dd className="mk-num mk-gradient-text font-display text-[2.5rem] font-extrabold leading-none tracking-[-0.04em]">{f.value}</dd>
                  <dt className="mt-2 text-[13.5px] font-medium text-foreground/85">{f.label}</dt>
                  <dd className="mt-3 min-w-0 font-mono text-[10.5px] leading-snug text-muted-foreground">
                    <span title={f.symbol} className="block truncate">
                      {f.symbol}
                    </span>
                    <span title={f.file} className="block truncate">
                      {f.file}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-[13px] text-muted-foreground">{HOME_PROOF.note}</p>
            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
              {status}
              <span className="inline-flex items-center gap-1.5">
                <Cloud className="size-4" aria-hidden="true" />
                {HOME_PROOF.platformLine}
              </span>
            </div>
          </div>

          <div className="lg:col-span-5">
            <SectionHeader id="integrations-title" index={HOME_INTEGRATIONS.index} title={HOME_INTEGRATIONS.title} className="max-w-2xl" />
            <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">{HOME_INTEGRATIONS.lead}</p>
            <ul aria-label="Integrations you can connect" className="mt-5 flex flex-wrap gap-2">
              {nodes.map((n) => (
                <li key={n.id}>
                  <Link href={n.href} title={n.description} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-[13px] font-medium text-foreground shadow-sm transition-[border-color,box-shadow] hover:border-border-strong hover:shadow-md">
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
            {changelog.length ? (
              <div className="mt-8 border-t border-border pt-5">
                <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-primary">Changelog</p>
                <ul className="mt-2 divide-y divide-border">
                  {changelog.map((e) => (
                    <li key={e.href}>
                      <Link href={e.href} className="group/c flex items-center gap-3 py-2.5 text-[14px]">
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
    </section>
  );
}
