"use client";

import { useMemo, useState } from "react";
import { Check, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TemplateSummary } from "@/lib/client/workspace/types";
import { Badge } from "@/components/ui/badge";
import { TemplatePreview } from "@/components/templates/template-preview";

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

/** Radio-group template chooser with category filter chips. */
export function TemplatePicker({ templates, value, onChange, compact }: { templates: TemplateSummary[]; value: string; onChange: (id: string) => void; compact?: boolean }) {
  const [category, setCategory] = useState("all");
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of templates) counts.set(t.category, (counts.get(t.category) ?? 0) + 1);
    return [...counts.entries()];
  }, [templates]);
  const groups: [string, TemplateSummary[]][] = [[category, category === "all" ? templates : templates.filter((t) => t.category === category)]];

  return (
    <div>
      <div className="-mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1 pb-1 scrollbar-thin" role="tablist" aria-label="Template categories">
        {[["all", templates.length] as [string, number], ...categories].map(([c, n]) => (
          <button
            key={c}
            type="button"
            role="tab"
            aria-selected={category === c}
            onClick={() => setCategory(c)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors",
              category === c ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:border-border-strong hover:text-foreground",
            )}
          >
            {c === "all" ? "All" : (CATEGORY_NAMES[c] ?? c)}
            <span className="tabular-nums opacity-60">{n}</span>
          </button>
        ))}
      </div>
      <div role="radiogroup" aria-label="Template" className="space-y-7">
        {groups.map(([group, list]) => (
          <div key={group}>
            <div className={cn("grid gap-3", compact ? "sm:grid-cols-2" : "sm:grid-cols-2 xl:grid-cols-3")}>
              {list.map((t, i) => {
                const selected = t.id === value;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => onChange(t.id)}
                    style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                    className={cn(
                      "pop-in group relative flex flex-col items-start rounded-xl border bg-card p-2.5 text-left transition-[border-color,box-shadow,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.985]",
                      selected ? "border-foreground ring-2 ring-foreground/80" : "border-border hover:border-border-strong",
                    )}
                  >
                    <TemplatePreview id={t.id} category={t.category} className={cn("w-full transition-opacity", selected ? "opacity-100" : "opacity-90 group-hover:opacity-100")} imgClassName="transition-transform duration-500 group-hover:scale-[1.03]" />
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
