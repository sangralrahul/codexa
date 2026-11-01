import { useId, useRef, useState, type ReactNode } from "react";

export type ProjectFilterTab = { id: string; label: string; count: number | null; panel: ReactNode };

/**
 * Filter tabs over Home's projects table (All / Live / Drafts), ported from the web Overview. A proper
 * tablist: roving tabindex, arrow keys, Home/End, each tab labelling its panel. Only the selected panel
 * is rendered.
 */
export function ProjectFilters({ label, tabs, heading, actions }: { label: string; tabs: ProjectFilterTab[]; heading: ReactNode; actions?: ReactNode }) {
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
  const selected = tabs.find((t) => t.id === sel) ?? tabs[0];
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
              aria-selected={selected?.id === t.id}
              aria-controls={`${base}-panel`}
              tabIndex={selected?.id === t.id ? 0 : -1}
              onClick={() => setSel(t.id)}
              onKeyDown={(e) => onKey(e, i)}
              className="ov-filter"
            >
              {t.label}
              <span className="ov-filter__count">{t.count ?? "…"}</span>
            </button>
          ))}
        </div>
        {actions ? <div className="ml-auto flex items-center gap-2">{actions}</div> : null}
      </div>
      {selected ? (
        <div role="tabpanel" id={`${base}-panel`} aria-labelledby={`${base}-tab-${selected.id}`}>
          {selected.panel}
        </div>
      ) : null}
    </>
  );
}
