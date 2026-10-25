"use client";

import { useMemo, useState } from "react";
import { Check, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TemplateSummary } from "@/lib/client/workspace/types";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/input";

const CATEGORY_NAMES: Record<string, string> = {
  websites: "Websites",
  "web-apps": "Web apps",
  saas: "SaaS",
  dashboards: "Dashboards",
  ecommerce: "Ecommerce",
  portfolios: "Portfolios",
  "ai-tools": "AI tools",
  "admin-panels": "Admin panels",
  crm: "CRM",
  "landing-pages": "Landing pages",
  "mobile-first": "Mobile-first",
};

/** Radio-group style template chooser grouped by category (or framework). */
export function TemplatePicker({ templates, value, onChange, compact }: { templates: TemplateSummary[]; value: string; onChange: (id: string) => void; compact?: boolean }) {
  const [groupBy, setGroupBy] = useState<"category" | "framework">("category");
  const groups = useMemo(() => {
    const map = new Map<string, TemplateSummary[]>();
    for (const t of templates) {
      const key = groupBy === "category" ? (CATEGORY_NAMES[t.category] ?? t.category) : t.frameworkName;
      (map.get(key) ?? map.set(key, []).get(key)!).push(t);
    }
    return [...map.entries()];
  }, [templates, groupBy]);

  return (
    <div>
      {!compact ? (
        <div className="mb-3 flex items-center justify-end gap-2 text-xs">
          <label htmlFor="template-group" className="text-muted-foreground">
            Group by
          </label>
          <Select id="template-group" value={groupBy} onChange={(e) => setGroupBy(e.target.value as "category" | "framework")} className="h-8 w-32 text-xs">
            <option value="category">Category</option>
            <option value="framework">Framework</option>
          </Select>
        </div>
      ) : null}
      <div role="radiogroup" aria-label="Template" className="space-y-5">
        {groups.map(([group, list]) => (
          <div key={group}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group}</h3>
            <div className={cn("grid gap-2", compact ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3")}>
              {list.map((t) => {
                const selected = t.id === value;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => onChange(t.id)}
                    className={cn(
                      "flex flex-col items-start rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      selected ? "border-primary bg-primary/5" : "border-border bg-card hover:border-border-strong",
                    )}
                  >
                    <div className="flex w-full items-start justify-between gap-2">
                      <span className="text-sm font-medium">{t.name}</span>
                      {selected ? <Check className="size-4 shrink-0 text-primary" aria-hidden="true" /> : null}
                    </div>
                    <span className="mt-1 line-clamp-2 text-xs text-muted-foreground">{t.description}</span>
                    <span className="mt-2 flex flex-wrap items-center gap-1">
                      <Badge variant="primary" className="text-[10px]">
                        {t.frameworkName}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {t.difficulty}
                      </Badge>
                      {t.prebuilt ? (
                        <Badge variant="success" className="gap-0.5 text-[10px]">
                          <Zap className="size-3" aria-hidden="true" /> prebuilt deps
                        </Badge>
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">“Prebuilt deps” templates start faster in the preview sandbox because their dependencies are already installed on the runner image.</p>
    </div>
  );
}
