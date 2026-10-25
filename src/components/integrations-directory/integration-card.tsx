import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { IntegrationDefinition } from "@/config/integrations";
import { capabilityLabel } from "./details";
import { categoryName } from "./search";

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

export function IntegrationCard({ integration }: { integration: IntegrationDefinition }) {
  const i = integration;
  return (
    <li className="flex h-full flex-col rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm transition-colors hover:border-border-strong">
      <div className="flex items-start justify-between gap-3">
        <Badge variant="primary">{categoryName(i.category)}</Badge>
        <StatusBadge status={i.status} />
      </div>
      <h3 className="mt-3 text-base font-semibold leading-tight">
        <Link href={integrationHref(i.id)} className="hover:text-primary focus-visible:outline-2 focus-visible:outline-ring">
          {i.name}
        </Link>
      </h3>
      <p className="mt-1.5 text-sm text-muted-foreground">{i.description}</p>
      {i.capabilities.length ? (
        <ul className="mt-3 space-y-1 text-xs text-muted-foreground" aria-label="Capabilities">
          {i.capabilities.slice(0, 3).map((c) => (
            <li key={c} className="flex gap-1.5">
              <span aria-hidden="true">·</span>
              {capabilityLabel(c)}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">On the roadmap — no adapter yet.</p>
      )}
      <div className="mt-auto pt-4">
        <Link href={integrationHref(i.id)} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          {i.status === "available" ? "Setup guide" : "Details"}
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>
    </li>
  );
}
