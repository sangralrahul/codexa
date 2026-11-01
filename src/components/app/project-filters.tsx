"use client";

import { useId, useRef, useState } from "react";

export type ProjectFilterTab = { id: string; label: string; count: number; panel: React.ReactNode };

/**
 * Filter tabs over the Overview's projects table (All / Live / Drafts). The panels are rendered on the
 * server from real data; this only switches between them. A proper tablist: roving tabindex, arrow
 * keys, Home/End, each tab labelling its panel.
 */
export function ProjectFilters({ label, tabs, heading, actions }: { label: string; tabs: ProjectFilterTab[]; heading: React.ReactNode; actions?: React.ReactNode }) {
  const [sel, setSel] = useState(tabs[0]?.id);
  const base = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const last = tabs.length - 1;
    const to = e.key === "ArrowRight" ? (i === last ? 0 : i + 1) : e.key === "ArrowLeft" ? (i === 0 ? last : i - 1) : e.key === "Home" ? 0 : e.key === "End" ? last : -1;
    if (to < 0) return;
    e.preventDefault();
    setSel(tabs[to].id);
    refs.current[to]?.focus();
  };
  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        {heading}
        <div role="tablist" aria-label={label} className="ov-filters">
          {tabs.map((t, i) => (
            <button
              key={t.id}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${base}-tab-${t.id}`}
              aria-selected={sel === t.id}
              aria-controls={`${base}-panel-${t.id}`}
              tabIndex={sel === t.id ? 0 : -1}
              onClick={() => setSel(t.id)}
              onKeyDown={(e) => onKey(e, i)}
              className="ov-filter"
            >
              {t.label}
              <span className="ov-filter__count">{t.count}</span>
            </button>
          ))}
        </div>
        {actions ? <div className="ml-auto flex items-center gap-2">{actions}</div> : null}
      </div>
      {tabs.map((t) => (
        <div key={t.id} role="tabpanel" id={`${base}-panel-${t.id}`} aria-labelledby={`${base}-tab-${t.id}`} hidden={sel !== t.id}>
          {t.panel}
        </div>
      ))}
    </>
  );
}
