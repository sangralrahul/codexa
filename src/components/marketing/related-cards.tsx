import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { TEMPLATE_SHOTS } from "@/components/templates/shots";
import { cn } from "@/lib/utils";

/** Tiny CSS pictures for related links (decorative). */
function Mini({ href }: { href: string }) {
  if (href === "/templates" && TEMPLATE_SHOTS.has("vite-react-crm")) {
    return (
      <div className="relative h-full overflow-hidden rounded-lg bg-white shadow-[inset_0_0_0_1px_var(--border)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/templates/vite-react-crm.webp" alt="" width={320} height={200} loading="lazy" decoding="async" className="h-full w-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-[1.04]" />
      </div>
    );
  }
  if (href === "/pricing") {
    return (
      <div className="flex h-full items-end gap-2 px-4 pb-3">
        {[28, 52, 76].map((h, i) => (
          <span key={h} className={cn("flex-1 rounded-t-md border border-b-0 border-border bg-background/70 transition-transform duration-500 ease-out group-hover:-translate-y-1", i === 1 && "border-signal/40 bg-signal/10")} style={{ height: `${h}%`, transitionDelay: `${i * 50}ms` }} />
        ))}
      </div>
    );
  }
  if (href === "/how-it-works") {
    return (
      <div className="flex h-full items-center gap-1.5 px-4">
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className="flex flex-1 items-center gap-1.5">
            <span className={cn("size-2.5 shrink-0 rounded-full border border-border-strong bg-background transition-colors duration-300", i < 3 && "group-hover:border-signal group-hover:bg-signal/30")} style={{ transitionDelay: `${i * 70}ms` }} />
            {i < 4 ? <span className="h-px flex-1 bg-border-strong" /> : null}
          </span>
        ))}
      </div>
    );
  }
  // Features (and anything else): a small grid of tiles.
  return (
    <div className="grid h-full grid-cols-3 gap-1.5 p-3">
      {Array.from({ length: 6 }, (_, i) => (
        <span key={i} className={cn("rounded-md border border-border bg-background/70 transition-colors duration-300", i === 1 && "group-hover:border-signal/40 group-hover:bg-signal/10")} />
      ))}
    </div>
  );
}

/** Three related links as cards with a mini picture each (PLAN §5.3 product pages). */
export function RelatedCards({ items, className }: { items: { label: string; href: string; description?: string }[]; className?: string }) {
  return (
    <ul data-reveal="stagger" data-spotlight="grid" className={cn("grid gap-3 sm:grid-cols-3", className)}>
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
