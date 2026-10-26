import * as React from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import type { ContentBlock, ContentSection } from "@/content/marketing/types";
import { Alert } from "@/components/ui/misc";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Inline } from "./inline";
import { Steps } from "./steps";
import { VignetteWindow } from "./vignette-window";
import { RequestPathDiagram } from "./request-path-diagram";

function Block({ b, flip }: { b: ContentBlock; flip?: boolean }) {
  switch (b.type) {
    case "paragraph":
      return (
        <p className="text-foreground/85">
          <Inline text={b.text} />
        </p>
      );
    case "list": {
      const Tag = b.ordered ? "ol" : "ul";
      return (
        <Tag className={cn("space-y-2.5", b.ordered ? "list-none [counter-reset:item]" : "")}>
          {b.items.map((it, j) => (
            <li key={j} className="relative pl-7 text-foreground/85">
              {b.ordered ? (
                <span aria-hidden="true" className="absolute left-0 top-[0.2em] font-mono text-[11px] tabular-nums text-signal-ink">
                  {String(j + 1).padStart(2, "0")}
                </span>
              ) : (
                <span aria-hidden="true" className="absolute left-1 top-[0.7em] size-1.5 rounded-full bg-foreground/30" />
              )}
              <Inline text={it} />
            </li>
          ))}
        </Tag>
      );
    }
    case "table":
      return (
        <div className="overflow-x-auto rounded-[14px] border border-border">
          <table className="w-full min-w-[480px] border-collapse text-[14px]">
            {b.caption ? <caption className="sr-only">{b.caption}</caption> : null}
            <thead className="bg-surface">
              <tr>
                {b.columns.map((c) => (
                  <th key={c} scope="col" className="text-label px-4 py-3 text-left text-muted-foreground">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {b.rows.map((r, ri) => (
                <tr key={ri} className="border-t border-border align-top transition-colors hover:bg-foreground/[0.02]">
                  {r.map((cell, ci) =>
                    ci === 0 ? (
                      <th key={ci} scope="row" className="px-4 py-3 text-left font-medium">
                        <Inline text={cell} />
                      </th>
                    ) : (
                      <td key={ci} className="px-4 py-3 tabular-nums text-foreground/85">
                        <Inline text={cell} />
                      </td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "note":
      return (
        <Alert variant={b.variant ?? "info"} title={b.title} live={false}>
          <Inline text={b.text} />
        </Alert>
      );
    case "links":
      return (
        <ul data-spotlight="grid" className="grid gap-3 sm:grid-cols-2">
          {b.items.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="glow-card group flex h-full items-start justify-between gap-3 rounded-[14px] border border-border p-5">
                <span>
                  <span className="block font-medium">{l.label}</span>
                  {l.description ? <span className="mt-0.5 block text-sm text-muted-foreground">{l.description}</span> : null}
                </span>
                <ArrowUpRight className="mt-1 size-4 shrink-0 text-muted-foreground transition-[translate,color] duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground group-focus-visible:text-foreground" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      );
    case "code":
      return (
        <pre>
          <code>{b.code}</code>
        </pre>
      );
    case "definitions":
      return (
        <dl className="divide-y divide-border rounded-[14px] border border-border">
          {b.items.map((d) => (
            <div key={d.term} className="grid gap-1 p-4 sm:grid-cols-[200px_1fr] sm:gap-4">
              <dt className="font-medium">{d.term}</dt>
              <dd className="text-[15px] leading-relaxed text-muted-foreground">
                <Inline text={d.detail} />
              </dd>
            </div>
          ))}
        </dl>
      );
    case "features":
      return (
        <ul data-reveal="stagger" data-spotlight="grid" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {b.items.map((f) => {
            const Icon = f.icon;
            return (
              <li key={f.title} data-spotlight-tile className="rounded-[16px] border border-border bg-card p-5 shadow-[inset_0_1px_0_var(--hairline)]">
                <h3 className="flex items-center gap-2.5 text-[15.5px] font-semibold tracking-[-0.01em]">
                  {Icon ? <Icon className="size-4 shrink-0 text-signal-ink" aria-hidden="true" /> : null}
                  {f.title}
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
                  <Inline text={f.description} />
                </p>
              </li>
            );
          })}
        </ul>
      );
    case "facts":
      return (
        <div>
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[16px] border border-border bg-border sm:grid-cols-4">
            {b.items.map((f) => (
              <div key={f.label} className="bg-card p-5">
                <dt className="text-[12.5px] text-muted-foreground">{f.label}</dt>
                <dd className="mk-num mt-2 font-display text-[1.75rem] font-bold leading-none tracking-[-0.03em] [font-stretch:104%]">{f.value}</dd>
                {f.note ? <dd className="mt-1.5 text-[12px] text-muted-foreground">{f.note}</dd> : null}
              </div>
            ))}
          </dl>
          {b.source ? <p className="mt-2 font-mono text-[10.5px] text-foreground-dim">{b.source}</p> : null}
        </div>
      );
    case "steps":
      return <Steps steps={b.items} />;
    case "split":
      return (
        <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
          <div className={cn("space-y-4", flip && "lg:order-2")}>
            <p className="text-foreground/85">
              <Inline text={b.text} />
            </p>
            {b.points?.length ? (
              <ul className="space-y-2.5">
                {b.points.map((p) => (
                  <li key={p} className="relative pl-6 text-[15px] text-foreground/85">
                    <span aria-hidden="true" className="absolute left-0 top-[0.55em] h-px w-3 bg-signal" />
                    <Inline text={p} />
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <figure className={cn("min-w-0", flip && "lg:order-1")}>
            <VignetteWindow id={b.visual} />
            {b.caption ? <figcaption className="mt-3 text-[13px] text-muted-foreground">{b.caption}</figcaption> : null}
          </figure>
        </div>
      );
    case "diagram":
      return <RequestPathDiagram caption={b.caption} />;
    case "cta":
      return (
        <div className="e3 flex flex-col gap-5 rounded-[18px] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div>
            <p className="text-[17px] font-semibold tracking-[-0.01em]">{b.title}</p>
            {b.description ? <p className="mt-1 text-[14.5px] text-muted-foreground">{b.description}</p> : null}
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Link href={b.primary.href} className={buttonClasses("secondary", "md", "group")}>
              {b.primary.label}
              <ArrowRight className="size-4 transition-transform duration-300 ease-snap group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
            {b.secondary ? (
              <Link href={b.secondary.href} className={buttonClasses("outline", "md")}>
                {b.secondary.label}
              </Link>
            ) : null}
          </div>
        </div>
      );
  }
}

export function ContentBlocks({ blocks, flip }: { blocks: ContentBlock[]; flip?: boolean }) {
  return (
    <>
      {blocks.map((b, i) => (
        <Block key={i} b={b} flip={flip} />
      ))}
    </>
  );
}

/** Article sections: an h2 (or h3) per section with the blocks under it. Ids are the in-page anchors. */
export function ContentSections({ sections, headingLevel = 2 }: { sections: ContentSection[]; headingLevel?: 2 | 3 }) {
  const H = headingLevel === 2 ? "h2" : "h3";
  return (
    <>
      {sections.map((s) => (
        <section key={s.id} id={s.id} aria-labelledby={`${s.id}-heading`} className="scroll-mt-32">
          <H id={`${s.id}-heading`} className={headingLevel === 2 ? "text-display-4" : "text-lg font-semibold"}>
            {s.heading}
          </H>
          <div className="mt-4 space-y-5">
            <ContentBlocks blocks={s.blocks} />
          </div>
        </section>
      ))}
    </>
  );
}

const WIDE = new Set<ContentBlock["type"]>(["split", "diagram", "steps", "features", "facts"]);

/**
 * Landing rows: a 12-column grid per section, numbered heading on the left and blocks on the right.
 * Sections that carry a visual block (split, diagram, steps, features, facts) go full width under
 * their heading instead, and split blocks alternate sides from one row to the next.
 */
export function LandingSections({ sections }: { sections: ContentSection[] }) {
  return (
    <>
      {sections.map((s, i) => {
        const wide = s.blocks.some((b) => WIDE.has(b.type));
        return (
          <section key={s.id} id={s.id} aria-labelledby={`${s.id}-heading`} className="scroll-mt-28 border-t border-border/70 py-14 first:border-t-0 first:pt-0 lg:py-20">
            <div className={cn("grid gap-8 lg:gap-12", !wide && "lg:grid-cols-12")}>
              <header data-reveal className={cn(wide ? "max-w-3xl" : "lg:col-span-4")}>
                <p aria-hidden="true" className="text-label text-signal-ink">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <h2 id={`${s.id}-heading`} className="text-display-3 mt-4">
                  {s.heading}
                </h2>
              </header>
              <div data-reveal style={{ "--reveal-delay": "100ms" } as React.CSSProperties} className={cn("min-w-0 space-y-6 text-[16.5px] leading-[1.7]", !wide && "lg:col-span-8")}>
                <ContentBlocks blocks={s.blocks} flip={i % 2 === 1} />
              </div>
            </div>
          </section>
        );
      })}
    </>
  );
}
