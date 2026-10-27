import * as React from "react";
import { Braces, Cloud } from "lucide-react";
import { Odometer } from "@/components/motion/odometer";
import { HOME_PROOF } from "@/content/marketing/home";
import type { ProofFact } from "./data";
import { ChangelogTicker, type TickerEntry } from "./changelog-ticker";

/**
 * H2 "Built in the open" (PLAN §5.2): four odometers fed only from code (each footnoted with its
 * source), the latest changelog entries, the live status pill and one factual hosting line.
 * No usage, customer or speed numbers — the note says so.
 */
export function ProofStrip({ facts, changelog, status }: { facts: ProofFact[]; changelog: TickerEntry[]; status: React.ReactNode }) {
  return (
    <section aria-labelledby="proof-title" className="relative pb-12 pt-16 sm:py-20 lg:pb-12 lg:pt-16">
      <div className="container-x">
        <div data-reveal className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-label mb-4 text-signal-ink">{HOME_PROOF.index}</p>
            <h2 id="proof-title" className="text-display-3">
              {HOME_PROOF.title}
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            {status}
            <span className="inline-flex items-center gap-1.5">
              <Cloud className="size-4 text-muted-foreground" aria-hidden="true" />
              {HOME_PROOF.platformLine}
            </span>
          </div>
        </div>

        <dl data-reveal="stagger" className="e1 mt-8 grid grid-cols-2 overflow-hidden rounded-2xl lg:grid-cols-4">
          {facts.map((f, i) => (
            <div
              key={f.label}
              className={`relative flex min-w-0 flex-col gap-2.5 px-3.5 py-4 sm:gap-3 sm:p-7 ${i % 2 === 1 ? "border-l border-border" : ""} ${i >= 2 ? "border-t border-border lg:border-t-0" : ""} ${i === 2 ? "lg:border-l" : ""}`}
            >
              <dt className="order-2 text-sm text-foreground/85">{f.label}</dt>
              <dd className="order-1">
                <Odometer value={f.value} className="text-display-2 tracking-[-0.025em]" />
              </dd>
              {/* Source footnote: the identifier on one unbroken line, the file on its own line below (sm+).
                  On a very narrow cell the identifier truncates (full text in the title) rather than breaking. */}
              <dd className="order-3 mt-auto min-w-0 font-mono leading-snug text-muted-foreground">
                <span className="flex min-w-0 items-center gap-1.5">
                  <Braces className="hidden size-3 shrink-0 sm:block" aria-hidden="true" />
                  <span title={f.symbol} className="min-w-0 truncate text-[10px] tracking-[-0.01em] sm:text-[11px] sm:tracking-normal">
                    {f.symbol}
                  </span>
                </span>
                <span title={f.file} className="mt-0.5 hidden truncate text-[11px] sm:block sm:pl-[18px]">
                  {f.file}
                </span>
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <ChangelogTicker entries={changelog} />
          <p className="max-w-md font-mono text-[11px] leading-relaxed text-muted-foreground lg:text-right">{HOME_PROOF.note}</p>
        </div>
      </div>
    </section>
  );
}
