import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import { routeMetadata } from "@/lib/seo";
import { listDocs } from "@/lib/content";
import { ROADMAP, type RoadmapColumn, type RoadmapItem } from "@/lib/content/roadmap";
import { Breadcrumbs } from "@/components/docs/breadcrumbs";
import { HubHeader } from "@/components/docs/hub-header";
import { cn } from "@/lib/utils";

export const metadata = routeMetadata("/roadmap");

const LANE: Record<RoadmapColumn["id"], { dot: string; pill: string }> = {
  now: { dot: "bg-success", pill: "border-success/30 bg-success/10" },
  next: { dot: "bg-info", pill: "border-info/30 bg-info/10" },
  later: { dot: "bg-foreground-dim", pill: "border-border-strong border-dashed bg-transparent" },
};

/**
 * Indeterminate "in progress" bar: no percentage, because we do not measure one. The sweep runs
 * three times on load (under five seconds) and again while the card is hovered or focused.
 */
function InProgress() {
  return (
    <span className="mt-4 flex items-center gap-3">
      <span aria-hidden="true" className="relative h-1 flex-1 overflow-hidden rounded-full bg-muted">
        <span className="absolute inset-y-0 -left-1/3 w-1/3 rounded-full bg-[linear-gradient(90deg,transparent,var(--info),transparent)] animate-[beam_1.6s_var(--ease-in-out)_3] group-hover:animate-[beam_1.6s_var(--ease-in-out)_infinite] group-focus-within:animate-[beam_1.6s_var(--ease-in-out)_infinite] calm:animate-none calm:group-hover:animate-none calm:group-focus-within:animate-none" />
      </span>
      <span className="font-mono text-[11px] text-muted-foreground">In progress</span>
    </span>
  );
}

function ItemCard({ item, lane, shipped }: { item: RoadmapItem; lane: RoadmapColumn["id"]; shipped: boolean }) {
  const later = lane === "later";
  return (
    <article
      className={cn(
        "group relative rounded-[16px] border p-4 transition-[border-color,box-shadow] duration-(--dur-2)",
        later ? "border-dashed border-border-strong bg-transparent" : "border-border bg-card shadow-[inset_0_1px_0_var(--hairline)] hover:border-border-strong hover:shadow-md",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className={cn("text-[15px] font-semibold leading-snug tracking-[-0.01em]", later && "text-foreground/85")}>
          {item.href ? (
            <Link href={item.href} className="outline-none after:absolute after:inset-0 after:rounded-[16px] focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-ring">
              {item.title}
            </Link>
          ) : (
            item.title
          )}
        </h3>
        {shipped ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success/12 px-2 py-0.5 font-mono text-[10.5px] font-medium text-success">
            <Check className="size-3" aria-hidden="true" />
            Shipped
          </span>
        ) : item.href ? (
          <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-[translate,color] duration-(--dur-2) group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" aria-hidden="true" />
        ) : null}
      </div>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">{item.description}</p>
      {shipped ? <p className="mt-3 font-mono text-[11px] text-foreground-dim">Release notes in the changelog</p> : lane === "later" ? null : <InProgress />}
    </article>
  );
}

export default async function RoadmapPage() {
  // An item counts as shipped only when it links to a changelog entry that exists.
  const changelog = new Set((await listDocs("changelog")).map((d) => d.href));
  const isShipped = (item: RoadmapItem) => Boolean(item.href && changelog.has(item.href));

  return (
    <div data-tone="docs" className="container-x pb-20 pt-6 sm:pt-8 lg:pt-10">
      <Breadcrumbs items={[{ name: "Roadmap", path: "/roadmap" }]} className="mb-8" />
      <HubHeader kicker="Roadmap" title="Now, next" dim="and later." lead="What has shipped, what we are building next, and what comes after. Priorities can change as we learn from real usage.">
        <p className="mt-6 max-w-2xl rounded-[14px] border border-border bg-surface/70 px-4 py-2.5 text-[13.5px] leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">No dates committed.</span>{" "}
          “Next” is being designed or built; “Later” is intended but not started. Shipped items link to the{" "}
          <Link href="/changelog" className="link-draw text-foreground">
            changelog
          </Link>
          .
        </p>
      </HubHeader>

      <div className="mt-12 grid gap-6 lg:grid-cols-3 lg:gap-5">
        {ROADMAP.map((col) => {
          const tone = LANE[col.id];
          return (
            <section key={col.id} aria-labelledby={`roadmap-${col.id}`} className={cn("flex flex-col rounded-[22px] p-2", col.id === "later" ? "border border-dashed border-border" : "bg-surface/60")}>
              <div className="px-3 pb-3 pt-3">
                <div className="flex items-center justify-between gap-3">
                  <h2 id={`roadmap-${col.id}`} className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold", tone.pill)}>
                    <span aria-hidden="true" className={cn("size-2 rounded-full", tone.dot)} />
                    {col.title}
                  </h2>
                  <span className="font-mono text-[12px] text-muted-foreground">
                    {col.items.length} {col.items.length === 1 ? "item" : "items"}
                  </span>
                </div>
                <p className="mt-2.5 text-[13.5px] text-muted-foreground">{col.summary}</p>
              </div>
              <ul className="flex flex-col gap-2">
                {col.items.map((item) => (
                  <li key={item.title}>
                    <ItemCard item={item} lane={col.id} shipped={isShipped(item)} />
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <p className="mt-12 text-sm text-muted-foreground">
        Have a request? Use{" "}
        <Link href="/request-feature" className="link-draw text-foreground">
          request a feature
        </Link>
        ; we read every one.
      </p>
    </div>
  );
}
