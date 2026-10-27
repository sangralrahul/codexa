import type * as React from "react";
import Link from "next/link";
import { BrowserFrame } from "@/components/frames/browser-frame";
import { cn } from "@/lib/utils";
import { TemplatePreview } from "./template-preview";
import { templatePreviewHref } from "./template-card";

type FanStarter = { id: string; name: string; category: string };

/** Card placement: the card is centred, then moved by x/y (relative to its own box) and turned by r; dx/dr are the extra spread on hover. */
type Slot = { x: string; y: string; r: string; dx: string; dr: string; w: string };

const SLOTS: Record<1 | 2 | 3, Slot[]> = {
  1: [{ x: "-50%", y: "-50%", r: "0deg", dx: "0%", dr: "0deg", w: "82%" }],
  // [back-left, front-right]
  2: [
    { x: "-80%", y: "-56%", r: "-5deg", dx: "-6%", dr: "-2deg", w: "64%" },
    { x: "-22%", y: "-42%", r: "3deg", dx: "6%", dr: "2deg", w: "64%" },
  ],
  // [back-left, back-right, front-centre]
  3: [
    { x: "-86%", y: "-58%", r: "-7deg", dx: "-7%", dr: "-2deg", w: "60%" },
    { x: "-14%", y: "-58%", r: "7deg", dx: "7%", dr: "2deg", w: "60%" },
    { x: "-50%", y: "-40%", r: "0deg", dx: "0%", dr: "0deg", w: "60%" },
  ],
};

/**
 * Hero visual for the public templates gallery: up to three real starter screenshots in browser
 * cards, fanned out. `starters[0]` is the front card. Each card links to that starter's preview.
 * Motion: the cards are dealt from a stack when the figure first scrolls into view (MotionEffects'
 * `.is-visible`), and spread a little on hover. Calm mode and no-JS show the fanned final frame.
 * Labelled as starter screenshots (they are the templates as they ship, not AI output).
 */
export function StarterFan({ starters, caption, className }: { starters: FanStarter[]; caption: React.ReactNode; className?: string }) {
  const list = starters.slice(0, 3);
  if (!list.length) return null;
  const slots = SLOTS[list.length as 1 | 2 | 3];
  // Paint back to front: the lead starter is the last (front) card.
  const ordered = list.length === 1 ? list : [...list.slice(1), list[0]];

  return (
    <figure data-reveal data-fan="" className={cn("group/fan relative", className)}>
      <div className="relative h-[clamp(320px,28vw,400px)]">
        {/* Soft floor light under the stack. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-[8%] bottom-0 top-[18%] -z-10 rounded-[48px] bg-[radial-gradient(60%_60%_at_50%_45%,color-mix(in_oklab,var(--signal)_16%,transparent),transparent_72%)] blur-2xl" />
        {ordered.map((t, i) => {
          const s = slots[i];
          return (
            <div
              key={t.id}
              style={{ "--x": s.x, "--y": s.y, "--r": s.r, width: s.w, transitionDelay: `${160 + i * 90}ms` } as React.CSSProperties}
              className={cn(
                "absolute left-1/2 top-1/2 [rotate:var(--r)] [translate:var(--x)_var(--y)]",
                "transition-[translate,rotate] duration-(--dur-6) ease-snap calm:transition-none",
                // Dealt from a stack: until the figure is revealed (JS only), every card sits centred and straight.
                "in-[.js_[data-fan]:not(.is-visible)]:[rotate:0deg] in-[.js_[data-fan]:not(.is-visible)]:[translate:-50%_-50%]",
              )}
            >
              {/* Hover spread lives on its own layer, so it answers the pointer without the deal's delay. */}
              <div
                style={{ "--dx": s.dx, "--dr": s.dr } as React.CSSProperties}
                className="transition-[translate,rotate] duration-(--dur-4) ease-out group-hover/fan:[rotate:var(--dr)] group-hover/fan:[translate:var(--dx)_0] calm:transition-none calm:group-hover/fan:[rotate:0deg] calm:group-hover/fan:[translate:0_0]"
              >
                <Link
                  href={templatePreviewHref(t.id)}
                  aria-label={`Preview the ${t.name} starter`}
                  className={cn(
                    "group/card block rounded-[14px] outline-none transition-[translate] duration-(--dur-4) ease-out",
                    "hover:-translate-y-2 focus-visible:-translate-y-2 calm:hover:translate-y-0 calm:focus-visible:translate-y-0",
                    "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring",
                  )}
                >
                  <BrowserFrame
                    url={t.name}
                    chrome="minimal"
                    className="shadow-xl transition-[border-color,box-shadow] duration-(--dur-4) group-hover/card:border-foreground/30 group-hover/card:shadow-[var(--shadow-stage)]"
                  >
                    <TemplatePreview id={t.id} category={t.category} sizes="(min-width: 1024px) 360px, 1px" className="rounded-none border-0 shadow-none" />
                  </BrowserFrame>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
      <figcaption className="text-meta mt-5 text-center text-muted-foreground">{caption}</figcaption>
    </figure>
  );
}
