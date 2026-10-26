"use client";

import { useMemo, useState } from "react";
import { Check, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TemplateSummary } from "@/lib/client/workspace/types";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/input";
import { TemplateThumb } from "@/components/templates/template-thumb";

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
      <div role="radiogroup" aria-label="Template" className="space-y-7">
        {groups.map(([group, list]) => (
          <div key={group}>
            <h3 className="mb-2.5 flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {group}
              <span className="tabular-nums text-muted-foreground/70">{list.length}</span>
            </h3>
            <div className={cn("grid gap-3", compact ? "sm:grid-cols-2" : "sm:grid-cols-2 xl:grid-cols-3")}>
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
                      "group relative flex flex-col items-start rounded-xl border bg-card p-2.5 text-left transition-[border-color,box-shadow,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.985]",
                      selected ? "border-foreground ring-2 ring-foreground/80" : "border-border hover:border-border-strong",
                    )}
                  >
                    <TemplateThumb category={t.category} className={cn("w-full transition-opacity", selected ? "opacity-100" : "opacity-90 group-hover:opacity-100")} />
                    {selected ? (
                      <span className="pop-in absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-foreground text-background shadow-sm">
                        <Check className="size-3" aria-hidden="true" />
                      </span>
                    ) : null}
                    <div className="mt-2.5 w-full px-0.5">
                      <span className="text-sm font-medium">{t.name}</span>
                      <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{t.description}</span>
                      <span className="mt-2 flex flex-wrap items-center gap-1">
                        <Badge variant="outline" className="text-[10px]">
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
                    </div>
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
