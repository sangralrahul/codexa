import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { ContentBlock, ContentSection } from "@/content/marketing/types";
import { Alert } from "@/components/ui/misc";
import { Inline } from "./inline";

export function ContentBlocks({ blocks }: { blocks: ContentBlock[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        switch (b.type) {
          case "paragraph":
            return (
              <p key={i} className="text-base leading-relaxed text-foreground/90">
                <Inline text={b.text} />
              </p>
            );
          case "list": {
            const Tag = b.ordered ? "ol" : "ul";
            return (
              <Tag key={i} className={b.ordered ? "list-decimal space-y-1.5 pl-6" : "list-disc space-y-1.5 pl-6"}>
                {b.items.map((it, j) => (
                  <li key={j} className="leading-relaxed text-foreground/90">
                    <Inline text={it} />
                  </li>
                ))}
              </Tag>
            );
          }
          case "table":
            return (
              <div key={i} className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[480px] text-sm">
                  {b.caption ? <caption className="sr-only">{b.caption}</caption> : null}
                  <thead className="bg-muted">
                    <tr>
                      {b.columns.map((c) => (
                        <th key={c} scope="col" className="px-3 py-2 text-left font-semibold">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.map((r, ri) => (
                      <tr key={ri} className="border-t border-border align-top">
                        {r.map((cell, ci) =>
                          ci === 0 ? (
                            <th key={ci} scope="row" className="px-3 py-2 text-left font-medium">
                              <Inline text={cell} />
                            </th>
                          ) : (
                            <td key={ci} className="px-3 py-2 text-foreground/90">
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
              <Alert key={i} variant={b.variant ?? "info"} title={b.title}>
                <Inline text={b.text} />
              </Alert>
            );
          case "links":
            return (
              <ul key={i} className="grid gap-3 sm:grid-cols-2">
                {b.items.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card p-4 hover:bg-muted">
                      <span>
                        <span className="block font-medium">{l.label}</span>
                        {l.description ? <span className="mt-0.5 block text-sm text-muted-foreground">{l.description}</span> : null}
                      </span>
                      <ArrowUpRight className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            );
          case "code":
            return (
              <pre key={i}>
                <code>{b.code}</code>
              </pre>
            );
          case "definitions":
            return (
              <dl key={i} className="divide-y divide-border rounded-lg border border-border">
                {b.items.map((d) => (
                  <div key={d.term} className="grid gap-1 p-4 sm:grid-cols-[200px_1fr] sm:gap-4">
                    <dt className="font-medium">{d.term}</dt>
                    <dd className="text-sm leading-relaxed text-muted-foreground">
                      <Inline text={d.detail} />
                    </dd>
                  </div>
                ))}
              </dl>
            );
        }
      })}
    </>
  );
}

export function ContentSections({ sections, headingLevel = 2 }: { sections: ContentSection[]; headingLevel?: 2 | 3 }) {
  const H = headingLevel === 2 ? "h2" : "h3";
  return (
    <>
      {sections.map((s) => (
        <section key={s.id} id={s.id} aria-labelledby={`${s.id}-heading`} className="scroll-mt-24">
          <H id={`${s.id}-heading`} className={headingLevel === 2 ? "text-xl font-semibold tracking-tight sm:text-2xl" : "text-lg font-semibold"}>
            {s.heading}
          </H>
          <div className="mt-3 space-y-4">
            <ContentBlocks blocks={s.blocks} />
          </div>
        </section>
      ))}
    </>
  );
}
