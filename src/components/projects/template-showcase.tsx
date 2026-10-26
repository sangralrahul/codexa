"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { TemplatePreview } from "@/components/templates/template-preview";
import { cn } from "@/lib/utils";

export type ShowcaseTemplate = { id: string; name: string; description: string; category: string; frameworkName: string };

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
  "mobile-first": "Mobile",
};

/** Soft colour wash behind each template screenshot, by category (theme tokens only). */
const WASH: Record<string, string> = {
  default: "from-signal/[0.14] via-surface to-info/[0.12]",
  dashboards: "from-info/[0.18] via-surface to-success/[0.10]",
  ecommerce: "from-warning/[0.18] via-surface to-signal/[0.10]",
  "ai-tools": "from-info/[0.16] via-surface to-signal/[0.14]",
  portfolios: "from-foreground/[0.10] via-surface to-info/[0.10]",
  "landing-pages": "from-signal/[0.18] via-surface to-warning/[0.10]",
  websites: "from-success/[0.14] via-surface to-info/[0.10]",
  saas: "from-info/[0.14] via-surface to-signal/[0.12]",
  crm: "from-success/[0.16] via-surface to-warning/[0.10]",
  "admin-panels": "from-foreground/[0.08] via-surface to-signal/[0.12]",
  "mobile-first": "from-signal/[0.12] via-surface to-success/[0.12]",
  "web-apps": "from-info/[0.12] via-surface to-signal/[0.12]",
};

/** Dashboard template strip: category chips filter a grid of template cards that open New project. */
export function TemplateShowcase({ templates, limit = 8 }: { templates: ShowcaseTemplate[]; limit?: number }) {
  const [category, setCategory] = useState("all");
  const categories = useMemo(() => [...new Set(templates.map((t) => t.category))], [templates]);
  const shown = (category === "all" ? templates : templates.filter((t) => t.category === category)).slice(0, limit);
  return (
    <div>
      <div className="-mx-1 mb-5 flex gap-1.5 overflow-x-auto px-1 pb-1 scrollbar-thin" role="tablist" aria-label="Template categories">
        {["all", ...categories].map((c) => (
          <button
            key={c}
            type="button"
            role="tab"
            aria-selected={category === c}
            onClick={() => setCategory(c)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1 text-xs transition-colors",
              category === c ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:border-border-strong hover:text-foreground",
            )}
          >
            {c === "all" ? "All" : (CATEGORY_NAMES[c] ?? c)}
          </button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {shown.map((t, i) => (
          <Link
            key={`${category}-${t.id}`}
            href={`/new-project?template=${encodeURIComponent(t.id)}`}
            style={{ animationDelay: `${i * 50}ms` }}
            className="pop-in tilt-shine group flex flex-col rounded-xl border border-border bg-card shadow-sm transition-[border-color,box-shadow] hover:border-border-strong hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className={cn("relative overflow-hidden rounded-t-xl border-b border-border bg-gradient-to-br px-5 pt-5", WASH[t.category] ?? WASH.default)}>
              <TemplatePreview id={t.id} category={t.category} className="translate-y-1 rounded-b-none border-b-0 shadow-lg transition-transform duration-500 ease-out group-hover:-translate-y-1" />
              <span className="absolute inset-x-3 bottom-3 flex translate-y-2 items-center justify-center gap-1.5 rounded-lg bg-foreground py-1.5 text-xs font-medium text-background opacity-0 shadow-lg transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                Use template <ArrowRight className="size-3.5" aria-hidden="true" />
              </span>
            </div>
            <div className="flex flex-1 flex-col p-4">
              <span className="text-sm font-medium">{t.name}</span>
              <span className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{t.description}</span>
              <span className="mt-auto pt-3 text-[11px] text-muted-foreground">{t.frameworkName}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
