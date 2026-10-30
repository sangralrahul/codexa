import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A dashboard side-column panel: a 1px-bordered card with a compact 36px header (icon, 12.5px title,
 * optional aside on the right) and an edge-to-edge body. Server-safe.
 */
export function PanelCard({
  title,
  icon: Icon,
  aside,
  children,
  className,
  id,
}: {
  title: string;
  icon?: LucideIcon;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  const headingId = id ?? `panel-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <section aria-labelledby={headingId} className={cn("overflow-hidden rounded-lg border border-border bg-card", className)}>
      <header className="flex h-9 items-center gap-2 border-b border-border px-3">
        {Icon ? <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" /> : null}
        <h2 id={headingId} className="min-w-0 flex-1 truncate text-[12.5px] font-semibold tracking-[-0.005em]">
          {title}
        </h2>
        {aside ? <div className="flex shrink-0 items-center gap-2 text-xs">{aside}</div> : null}
      </header>
      {children}
    </section>
  );
}
