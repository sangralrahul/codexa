"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type DashboardTab = { id: string; label: string; count?: number; href?: string; hrefLabel?: string; content: React.ReactNode };

/** The tabbed panel under the dashboard hero (projects, templates, usage, guides). */
export function DashboardTabs({ tabs, initial }: { tabs: DashboardTab[]; initial?: string }) {
  const [active, setActive] = useState(initial ?? tabs[0]?.id);
  const tab = tabs.find((t) => t.id === active) ?? tabs[0];
  return (
    <div className="glass relative rounded-3xl border border-border/80 shadow-[0_-30px_80px_-40px_rgba(0,0,0,0.5)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-4 pt-3 sm:px-6">
        <div role="tablist" aria-label="Dashboard sections" className="-mb-px flex gap-1 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={t.id === tab.id}
              aria-controls={`panel-${t.id}`}
              onClick={() => setActive(t.id)}
              className={cn(
                "relative inline-flex shrink-0 items-center gap-2 px-3 pb-3 pt-2 text-sm transition-colors",
                t.id === tab.id ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
              {t.count !== undefined ? <span className={cn("rounded-full px-1.5 text-[11px] tabular-nums", t.id === tab.id ? "bg-foreground text-background" : "bg-muted")}>{t.count}</span> : null}
              <span aria-hidden="true" className={cn("absolute inset-x-2 -bottom-px h-0.5 origin-center rounded-full bg-foreground transition-transform duration-300", t.id === tab.id ? "scale-x-100" : "scale-x-0")} />
            </button>
          ))}
        </div>
        {tab.href ? (
          <Link href={tab.href} className="group mb-2 inline-flex items-center gap-1 text-[13px] text-muted-foreground transition-colors hover:text-foreground">
            {tab.hrefLabel ?? "View all"} <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        ) : null}
      </div>
      <div key={tab.id} id={`panel-${tab.id}`} role="tabpanel" aria-labelledby={`tab-${tab.id}`} className="animate-fade-in p-4 sm:p-6">
        {tab.content}
      </div>
    </div>
  );
}
