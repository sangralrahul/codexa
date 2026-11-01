import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Splits `text` into words that rise in on first paint with a staggered blur-to-sharp fade (CSS only,
 * so it runs from the server HTML with no hydration step). `start` offsets the stagger index so several
 * runs in one headline continue one sequence. Calm mode shows the words at rest.
 */
export function RiseWords({ text, start = 0, className }: { text: string; start?: number; className?: string }) {
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <>
      {words.map((w, i) => (
        <React.Fragment key={`${w}-${i}`}>
          {i > 0 ? " " : null}
          <span className={cn("rise-word", className)} style={{ "--rise-i": start + i } as React.CSSProperties}>
            {w}
          </span>
        </React.Fragment>
      ))}
    </>
  );
}

/** One element (e.g. a RotatingText slot) joining a RiseWords sequence at stagger `index`. */
export function Rise({ index, className, children }: { index: number; className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("rise-word", className)} style={{ "--rise-i": index } as React.CSSProperties}>
      {children}
    </span>
  );
}
