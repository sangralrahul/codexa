import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A dashboard side-column panel: a premium card with a 48px header (gradient icon tile, 15px title,
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
    <section aria-labelledby={headingId} className={cn("card-premium overflow-hidden", className)}>
      <header className="flex h-12 items-center gap-2.5 border-b border-border px-4">
        {Icon ? (
          <span className="icon-tile size-7 rounded-[8px]" aria-hidden="true">
            <Icon className="size-3.5" />
          </span>
        ) : null}
        <h2 id={headingId} className="text-section-title min-w-0 flex-1 truncate">
          {title}
        </h2>
        {aside ? <div className="flex shrink-0 items-center gap-2 text-xs">{aside}</div> : null}
      </header>
      {children}
    </section>
  );
}
