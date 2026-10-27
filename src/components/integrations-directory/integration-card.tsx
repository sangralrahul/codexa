import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { IntegrationDefinition } from "@/config/integrations";
import { cn } from "@/lib/utils";
import { capabilityLabel } from "./details";
import { categoryName } from "./search";
import { IntegrationMark } from "./integration-mark";

export function integrationHref(id: string) {
  return `/integrations/${id}`;
}

export function StatusBadge({ status }: { status: IntegrationDefinition["status"] }) {
  return status === "available" ? (
    <Badge variant="success">
      <span className="sr-only">Status: </span>Available
    </Badge>
  ) : (
    <Badge variant="outline">
      <span className="sr-only">Status: </span>Planned
    </Badge>
  );
}

/**
 * Directory card. Available adapters show their brand mark (nominative use); planned ones get a
 * dashed border and a half-opacity monogram, and say plainly that nothing can be connected yet.
 */
export function IntegrationCard({ integration }: { integration: IntegrationDefinition }) {
  const i = integration;
  const planned = i.status !== "available";
  return (
    <li
      data-spotlight-tile
      className={cn(
        "group relative flex h-full flex-col rounded-[20px] border p-5 transition-[border-color,box-shadow,translate] duration-(--dur-3)",
        planned
          ? "border-dashed border-border-strong bg-transparent hover:border-foreground/30"
          : "border-border bg-card shadow-[inset_0_1px_0_var(--hairline)] hover:-translate-y-0.5 hover:border-border-strong hover:shadow-lg calm:hover:translate-y-0",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "grid size-11 shrink-0 place-items-center rounded-[13px] border",
            planned ? "border-dashed border-border-strong text-muted-foreground" : "border-border bg-surface text-foreground shadow-[inset_0_1px_0_var(--hairline)]",
          )}
        >
          <IntegrationMark id={i.id} name={i.name} planned={planned} className="size-5" />
        </span>
        <div className="flex flex-wrap justify-end gap-1.5">
          <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[11px] text-muted-foreground">{categoryName(i.category)}</span>
          <StatusBadge status={i.status} />
        </div>
      </div>
      <h3 className="mt-4 flex items-center gap-1.5 text-[16px] font-semibold leading-tight tracking-[-0.01em]">
        <Link href={integrationHref(i.id)} className="outline-none after:absolute after:inset-0 after:rounded-[20px] focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-ring">
          {i.name}
        </Link>
        <ArrowUpRight className="size-3.5 text-muted-foreground opacity-0 transition-[opacity,translate] duration-(--dur-2) group-hover:-translate-y-px group-hover:translate-x-px group-hover:opacity-100" aria-hidden="true" />
      </h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{i.description}</p>
      <div className="mt-auto pt-4">
        {i.capabilities.length ? (
          <ul className="flex flex-wrap gap-1.5" aria-label="Capabilities">
            {i.capabilities.slice(0, 3).map((c) => (
              <li key={c} className="rounded-md bg-muted px-2 py-0.5 text-[12px] text-muted-foreground">
                {capabilityLabel(c)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="font-mono text-[12px] text-muted-foreground">On the roadmap · no adapter yet</p>
        )}
      </div>
    </li>
  );
}
