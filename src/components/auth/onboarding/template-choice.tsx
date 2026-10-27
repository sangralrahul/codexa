"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TemplateSummary } from "@/lib/client/workspace/types";
import { StarterShot } from "./starter-shot";

const DIFFICULTY = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" } as const;
const FIRST = 6;

/**
 * Starter picker for onboarding: a radiogroup with roving focus (arrow keys, Home/End).
 * The list arrives ranked by the chosen goals; matches carry "Suggested for you".
 * Shows six (plus the selected one) until "Show all".
 */
export function TemplateChoice({
  templates,
  suggested,
  value,
  onChange,
}: {
  templates: TemplateSummary[];
  suggested: Set<string>;
  value: string;
  onChange: (id: string) => void;
}) {
  const [all, setAll] = React.useState(false);
  const groupRef = React.useRef<HTMLDivElement>(null);
  const visible = React.useMemo(() => {
    if (all) return templates;
    const head = templates.slice(0, FIRST);
    const selected = templates.find((t) => t.id === value);
    return selected && !head.includes(selected) ? [...head, selected] : head;
  }, [all, templates, value]);

  const onKey = (e: React.KeyboardEvent) => {
    const step: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    const i = Math.max(0, visible.findIndex((t) => t.id === value));
    let next: TemplateSummary | undefined;
    if (e.key in step) next = visible[(i + step[e.key] + visible.length) % visible.length];
    else if (e.key === "Home") next = visible[0];
    else if (e.key === "End") next = visible[visible.length - 1];
    if (!next) return;
    e.preventDefault();
    onChange(next.id);
    const id = next.id;
    requestAnimationFrame(() => groupRef.current?.querySelector<HTMLElement>(`[data-id="${CSS.escape(id)}"]`)?.focus());
  };

  return (
    <div>
      <div ref={groupRef} role="radiogroup" aria-label="Starter template" onKeyDown={onKey} className="grid gap-3 sm:grid-cols-2">
        {visible.map((t, i) => {
          const selected = t.id === value;
          const isSuggested = suggested.has(t.id);
          return (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              data-id={t.id}
              onClick={() => onChange(t.id)}
              style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }}
              className={cn(
                "ob-tpl pop-in group relative flex flex-col rounded-[14px] border bg-card p-2 text-left transition-[border-color,translate] duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                selected ? "border-transparent" : "border-border hover:border-border-strong",
              )}
            >
              <span className="shot-pan block overflow-hidden rounded-[10px]">
                <StarterShot id={t.id} category={t.category} sizes="(min-width: 640px) 250px, 90vw" priority={i < 4} />
              </span>
              <span className="mt-2.5 block min-w-0 truncate px-1 text-[13px] font-medium text-foreground">{t.name}</span>
              <span className="flex min-w-0 items-center gap-1.5 px-1 pb-1 pt-0.5 text-xs">
                {isSuggested ? (
                  <>
                    <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-signal" />
                    <span className="shrink-0 font-medium text-signal-ink">Suggested for you</span>
                    <span className="truncate text-muted-foreground">· {DIFFICULTY[t.difficulty]}</span>
                  </>
                ) : (
                  <span className="truncate text-muted-foreground">
                    {t.frameworkName} · {DIFFICULTY[t.difficulty]}
                  </span>
                )}
              </span>
              {selected ? (
                <span className="pop-in absolute right-3.5 top-3.5 flex size-6 items-center justify-center rounded-full bg-signal text-background shadow-md">
                  <Check className="size-3.5" aria-hidden="true" />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      {templates.length > FIRST ? (
        <button
          type="button"
          aria-expanded={all}
          onClick={() => setAll((v) => !v)}
          className="mx-auto mt-4 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {all ? "Show fewer" : `Show all ${templates.length} starters`}
          <ChevronDown className={cn("size-3.5 transition-transform duration-200", all && "rotate-180")} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
