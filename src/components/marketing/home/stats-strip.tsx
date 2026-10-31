import { HOME_STATS } from "@/content/marketing/home";
import { Kicker } from "@/components/marketing/premium";
import type { ProofFact } from "./data";

/**
 * Stats strip: four large numerals read from the registries that enforce them (data.ts), each
 * footnoted with the symbol and file it comes from. `sub` adds a second line under the templates
 * count ("across N categories"), also read from code.
 */
export function StatsStrip({ stats, categoryCount }: { stats: ProofFact[]; categoryCount: number }) {
  return (
    <section aria-labelledby="stats-title" className="border-b border-border">
      <div className="container-x py-14 lg:py-16">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Kicker className="mb-3">{HOME_STATS.index}</Kicker>
            <h2 id="stats-title" className="mk-h3">
              {HOME_STATS.title}
            </h2>
          </div>
          <p className="max-w-[56ch] text-[13px] leading-relaxed text-muted-foreground">{HOME_STATS.note}</p>
        </div>
        <dl className="mk-stats mt-10">
          {stats.map((f, i) => (
            <div key={f.label} className="mk-stat">
              <dd className="mk-num mk-stat__value">{f.value}</dd>
              <dt className="mk-stat__label">
                {f.label}
                {i === 0 ? <span className="block text-muted-foreground">across {categoryCount} categories</span> : null}
              </dt>
              <dd className="mk-stat__source">
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
      </div>
    </section>
  );
}
