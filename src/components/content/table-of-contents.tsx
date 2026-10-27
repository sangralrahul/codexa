"use client";

import { useEffect, useRef, useState } from "react";
import type { Heading } from "@/lib/content/types";
import { GlideIndicator, useGlide } from "@/components/motion/glide";
import { cn } from "@/lib/utils";

/**
 * On-page table of contents with scroll-spy: the current section is aria-current="location"
 * and a 2px signal bar glides to it along the rail. Renders nothing for fewer than two headings.
 */
export function TableOfContents({ headings, className, title = "On this page" }: { headings: Heading[]; className?: string; title?: string }) {
  const [active, setActive] = useState<string>(headings[0]?.id ?? "");
  const listRef = useRef<HTMLDivElement>(null);
  const glide = useGlide(listRef, { selector: '[aria-current="location"]', itemSelector: "a", axis: "y" });

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
    <nav aria-label={title} className={cn("text-[13px]", className)}>
      <p className="text-label mb-3 text-muted-foreground">{title}</p>
      <div ref={listRef} className="relative border-l border-border">
        <GlideIndicator ref={glide} className="left-[-1px] w-[2px] rounded-full bg-signal shadow-none" />
        <ul className="space-y-0.5">
        {headings.map((h) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              aria-current={active === h.id ? "location" : undefined}
              className={cn(
                "relative z-[1] block py-1 pr-2 leading-snug transition-colors duration-(--dur-2) hover:text-foreground",
                h.depth === 3 ? "pl-6" : "pl-3.5",
                active === h.id ? "font-medium text-foreground" : "text-muted-foreground",
              )}
            >
              {h.text}
            </a>
          </li>
        ))}
        </ul>
      </div>
    </nav>
  );
}
