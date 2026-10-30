import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import { TEMPLATE_SHOTS, templateShotFor } from "@/components/templates/shots";
import { FEATURE_GROUPS } from "@/content/marketing/features";
import { HOW_IT_WORKS_STEPS } from "@/content/marketing/product";
import { PLANS, formatPrice } from "@/config/plans";
import { cn } from "@/lib/utils";

const MINI_PLANS = [PLANS.free, PLANS.pro, PLANS.team];

/** Tiny CSS pictures for related links (decorative), drawn from real data where there is some. */
function Mini({ href }: { href: string }) {
  if (href === "/templates" && TEMPLATE_SHOTS.has("vite-react-crm")) {
    return (
      <div className="relative h-full overflow-hidden rounded-lg bg-white shadow-[inset_0_0_0_1px_var(--border)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={templateShotFor("vite-react-crm", 320)} alt="" width={320} height={200} loading="lazy" decoding="async" className="h-full w-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-[1.04] group-focus-visible:scale-[1.04]" />
      </div>
    );
  }
  if (href === "/pricing") {
    // Real monthly prices from PLANS (USD), the recommended plan lit.
    return (
      <div className="grid h-full grid-cols-3 gap-1.5 p-3">
        {MINI_PLANS.map((p, i) => (
          <span
            key={p.id}
            className={cn(
              "flex min-w-0 flex-col justify-between rounded-md border px-2 py-1.5 transition-transform duration-500 ease-out group-hover:-translate-y-0.5 group-focus-visible:-translate-y-0.5",
              p.highlight ? "border-primary/40 bg-primary/10" : "border-border bg-background/70",
            )}
            style={{ transitionDelay: `${i * 50}ms` }}
          >
            <span className={cn("truncate font-mono text-[9.5px] uppercase tracking-[0.08em]", p.highlight ? "text-primary" : "text-muted-foreground")}>{p.name}</span>
            <span>
              <span className="mk-num block font-display text-[17px] font-bold leading-none tracking-[-0.02em]">{p.prices ? formatPrice(p.prices.USD.month, "USD") : "Custom"}</span>
              <span className="mt-0.5 block text-[9.5px] text-muted-foreground">a month</span>
            </span>
          </span>
        ))}
      </div>
    );
  }
  if (href === "/how-it-works") {
    // The five real steps as chips: two done, the third lit; hovering fills the rail further.
    return (
      <div className="flex h-full flex-col justify-center gap-3 px-3">
        <ol className="flex flex-wrap items-center justify-center gap-x-1 gap-y-1.5">
          {HOW_IT_WORKS_STEPS.map((st, i) => (
            <li key={st.title} className="flex items-center gap-1">
              <span
                className={cn(
                  "inline-flex h-6 items-center gap-1 rounded-full border px-2 font-mono text-[10.5px]",
                  i < 2 && "border-success/30 bg-success/10 text-foreground/85",
                  i === 2 && "border-primary/50 bg-primary/10 text-primary shadow-[0_0_0_3px_color-mix(in_oklab,var(--primary)_10%,transparent)]",
                  i > 2 && "border-border bg-background/70 text-muted-foreground",
                )}
              >
                {i < 2 ? <Check className="size-3 text-success" strokeWidth={2.5} /> : i === 2 ? <span className="size-1.5 rounded-full bg-primary" /> : null}
                {st.title}
              </span>
              {i < HOW_IT_WORKS_STEPS.length - 1 ? <span className="text-[11px] text-foreground-dim">›</span> : null}
            </li>
          ))}
        </ol>
        <span className="mx-auto block h-1 w-3/4 overflow-hidden rounded-full bg-muted shadow-[inset_0_0_0_1px_var(--border)]">
          <span className="block h-full w-1/2 origin-left rounded-full bg-primary transition-transform duration-700 ease-out group-hover:scale-x-[1.6] group-focus-visible:scale-x-[1.6]" />
        </span>
      </div>
    );
  }
  if (href === "/features") {
    // The spec sheet's own index: group names and how many features each lists (from the content model).
    return (
      <ol className="flex h-full flex-col justify-center gap-1 px-4 py-3 font-mono text-[10.5px]">
        {FEATURE_GROUPS.slice(0, 4).map((g, i) => (
          <li key={g.id} className="flex items-center gap-2.5 transition-transform duration-500 ease-out group-hover:translate-x-1 group-focus-visible:translate-x-1" style={{ transitionDelay: `${i * 40}ms` }}>
            <span className="text-primary">{String(i + 1).padStart(2, "0")}</span>
            <span className="truncate text-foreground/80">{g.navLabel}</span>
            <span className="h-px flex-1 bg-border" />
            <span className="tabular-nums text-muted-foreground">{g.features.length}</span>
          </li>
        ))}
      </ol>
    );
  }
  // Anything else: a small grid of tiles.
  return (
    <div className="grid h-full grid-cols-3 gap-1.5 p-3">
      {Array.from({ length: 6 }, (_, i) => (
        <span key={i} className={cn("rounded-md border border-border bg-background/70 transition-colors duration-300", i === 1 && "group-hover:border-primary/40 group-hover:bg-primary/10 group-focus-visible:border-primary/40 group-focus-visible:bg-primary/10")} />
      ))}
    </div>
  );
}

/** Three related links as cards with a mini picture each (PLAN §5.3 product pages). */
export function RelatedCards({ items, className }: { items: { label: string; href: string; description?: string }[]; className?: string }) {
  return (
    <ul data-reveal="stagger" data-spotlight="grid" className={cn("grid grid-cols-1 gap-3 sm:grid-cols-3", className)}>
      {items.slice(0, 3).map((r) => (
        <li key={r.href}>
          <Link href={r.href} className="glow-card group flex h-full flex-col rounded-[16px] border border-border p-2">
            <div aria-hidden="true" className="h-28 overflow-hidden rounded-[12px] bg-surface shadow-[inset_0_0_0_1px_var(--border)]">
              <Mini href={r.href} />
            </div>
            <div className="flex items-start justify-between gap-3 px-3 pb-2 pt-4">
              <span>
                <span className="block text-[15px] font-semibold tracking-tight">{r.label}</span>
                {r.description ? <span className="mt-1 block text-[13px] leading-snug text-muted-foreground">{r.description}</span> : null}
              </span>
              <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-[translate,color] duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground group-focus-visible:text-foreground" aria-hidden="true" />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
