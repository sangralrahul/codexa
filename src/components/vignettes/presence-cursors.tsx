"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useScript } from "./use-script";

type Cursor = { label: string; tone: string; path: [number, number][] };

// Role labels, not invented people (PLAN §2.5: no invented avatars).
const CURSORS: Cursor[] = [
  { label: "You", tone: "var(--signal)", path: [[18, 64], [46, 30], [70, 54]] },
  { label: "Editor", tone: "var(--accent)", path: [[78, 22], [58, 70], [30, 44]] },
];

/**
 * Teams: two collaborators' cursors move over the same file, each with a role label, and
 * the presence stack shows who is here. Moves once through three points, then rests.
 * Final frame on the server and when calm. Decorative.
 */
export function PresenceCursors({ playing, className }: { playing?: boolean; className?: string }) {
  const { ref, index, started } = useScript([0, 1100, 2200], 2800, playing);
  const pos = !started || index < 0 ? 2 : index;
  return (
    <div ref={ref} aria-hidden="true" className={cn("relative w-full min-w-0 overflow-hidden rounded-xl border border-border bg-card [contain:inline-size]", className)}>
      <div className="flex items-center gap-2 border-b border-border px-3 py-2 text-[12px]">
        <span className="font-mono text-muted-foreground">src/App.tsx</span>
        <span className="ml-auto flex -space-x-1.5">
          {CURSORS.map((c) => (
            <span key={c.label} className="flex size-5 items-center justify-center rounded-full text-[9px] font-semibold text-white ring-2 ring-card" style={{ background: c.tone }}>
              {c.label[0]}
            </span>
          ))}
        </span>
        <span className="text-[11px] text-muted-foreground">2 here</span>
      </div>
      <div className="relative h-[170px] space-y-2.5 p-4 [container-type:size]">
        {[82, 64, 90, 48, 72, 56].map((w, i) => (
          <span key={i} className="block h-2 rounded-full bg-foreground/[0.07]" style={{ width: `${w}%`, marginLeft: i % 3 === 1 ? "8%" : i % 3 === 2 ? "16%" : 0 }} />
        ))}
        <span className="absolute left-[46%] top-[34%] h-4 w-[22%] rounded-[3px] bg-signal/15 ring-1 ring-signal/40" />
        {CURSORS.map((c) => {
          const [x, y] = c.path[Math.min(c.path.length - 1, pos)];
          return (
            <span
              key={c.label}
              className="absolute left-0 top-0 transition-transform duration-[1000ms] ease-in-out calm:transition-none"
              style={{ transform: `translate(${x}cqw, ${y}cqh)` }}
            >
              <svg width="14" height="16" viewBox="0 0 14 16" className="drop-shadow-sm" style={{ color: c.tone }}>
                <path d="M1 1l11.5 6.2-5 1.2-2.3 4.9L1 1z" fill="currentColor" stroke="var(--card)" strokeWidth="1.2" strokeLinejoin="round" />
              </svg>
              <span className="ml-3 -mt-0.5 inline-block rounded-full px-1.5 py-px text-[10px] font-medium text-white" style={{ background: c.tone }}>
                {c.label}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
