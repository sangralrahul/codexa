"use client";

import { useEffect, useState } from "react";
import type { Heading } from "@/lib/content/types";
import { cn } from "@/lib/utils";

/**
 * On-page table of contents with scroll-spy. Renders nothing when there are
 * fewer than two headings so short pages do not get an empty rail.
 */
export function TableOfContents({ headings, className, title = "On this page" }: { headings: Heading[]; className?: string; title?: string }) {
  const [active, setActive] = useState<string>(headings[0]?.id ?? "");

  useEffect(() => {
    if (headings.length === 0) return;
    const elements = headings.map((h) => document.getElementById(h.id)).filter((el): el is HTMLElement => Boolean(el));
    if (elements.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: [0, 1] },
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [headings]);

  if (headings.length < 2) return null;

  return (
    <nav aria-label={title} className={cn("text-sm", className)}>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      <ul className="space-y-1 border-l border-border">
        {headings.map((h) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              aria-current={active === h.id ? "location" : undefined}
              className={cn(
                "-ml-px block border-l py-1 pr-2 text-muted-foreground transition hover:text-foreground",
                h.depth === 3 ? "pl-6" : "pl-3",
                active === h.id ? "border-primary font-medium text-foreground" : "border-transparent",
              )}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
