"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Sticky in-page index: highlights the section currently in view, and the
 * marker slides between items as you scroll or click.
 */
export function ScrollSpyNav({ items, label = "On this page" }: { items: { id: string; title: string }[]; label?: string }) {
  const [active, setActive] = useState(items[0]?.id);

  useEffect(() => {
    const visible = new Map<string, number>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.set(e.target.id, e.boundingClientRect.top);
          else visible.delete(e.target.id);
        }
        const first = items.find((it) => visible.has(it.id));
        if (first) setActive(first.id);
      },
      { rootMargin: "-20% 0px -55% 0px" },
    );
    for (const it of items) {
      const el = document.getElementById(it.id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, [items]);

  const index = Math.max(0, items.findIndex((it) => it.id === active));
  return (
    <nav aria-label={label} className="relative">
      <p className="mb-3 font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <div className="relative border-l border-border">
        <span
          aria-hidden="true"
          className="absolute -left-px top-0 h-8 w-px bg-foreground transition-transform duration-500 ease-[cubic-bezier(0.3,1.2,0.4,1)]"
          style={{ transform: `translateY(${index * 2}rem)` }}
        />
        <ul>
          {items.map((it, i) => (
            <li key={it.id}>
              <a
                href={`#${it.id}`}
                aria-current={it.id === active ? "location" : undefined}
                onClick={() => setActive(it.id)}
                className={cn(
                  "flex h-8 items-center gap-3 pl-4 text-sm transition-colors duration-300",
                  it.id === active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                <span className="truncate">{it.title}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
