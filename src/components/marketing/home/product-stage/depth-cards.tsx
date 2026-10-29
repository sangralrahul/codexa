import * as React from "react";
import { CircleCheck, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { DeviceFrame } from "@/components/frames/device-frame";
import { templatePhoneShotSrc, templateShotFor } from "@/components/templates/shots";
import type { Scenario } from "../types";
import type { StageFrame } from "./script";

/**
 * How far a card may hang past the window edge. The stage is `min(1360px, 100vw - 48px)` wide and
 * centred, so the page gutter beside it is max(24px, (100vw - 1360px) / 2). A card overhangs by the
 * gutter minus 32px (it always keeps at least 32px of air to the window edge), at most 24px; where
 * the gutter is narrow (below ~1424px) the value goes negative and the card tucks 8px inside the frame.
 */
const EDGE = "clamp(-8px, max(24px, (100vw - 1360px) / 2) - 32px, 24px)";

/**
 * Three cards that float over the window edges at different depths (PLAN §5.2):
 * "Snapshot saved" (top-right), "Type-check passed · 0 errors" (bottom-left, above the status bar
 * so it never covers its text) and a phone-sized crop of the starter screenshot (right). Each
 * appears when its chapter is reached; the snapshot card is shown during the code chapters only, so
 * it never covers the preview's device switch. They stay inside the page gutter at every width.
 * Parallax is applied by the parent through --px / --py (−1…1) and each card's --depth. Decorative.
 */
export function DepthCards({ frame, scenario }: { frame: StageFrame; scenario: Scenario }) {
  // Opaque card surface: the cards float over live UI text and the white screenshot, which must not show through.
  const card =
    "absolute z-[4] rounded-[14px] border border-border-strong bg-card shadow-xl [transition:opacity_var(--dur-4)_var(--ease-out),scale_var(--dur-4)_var(--ease-out),translate_200ms_var(--ease-out)] [translate:calc(var(--px,0)*var(--depth)*1px)_calc(var(--py,0)*var(--depth)*1px)] calm:[translate:none]";
  // "Snapshot saved" is a moment in the code chapters; it steps aside once the preview (and its device switch) takes over.
  const snapshot = frame.cards.snapshot && frame.view === "code";
  const phoneSrc = templatePhoneShotSrc(scenario.id) ?? templateShotFor(scenario.id, 360);
  return (
    <div aria-hidden="true" data-depth-cards className="pointer-events-none absolute inset-0 hidden lg:block" style={{ "--edge": EDGE } as React.CSSProperties}>
      <div
        className={cn(card, "right-[calc(var(--edge)*-1)] top-[132px] flex items-center gap-2.5 px-3 py-2", snapshot ? "scale-100 opacity-100" : "scale-95 opacity-0")}
        style={{ "--depth": 4 } as React.CSSProperties}
      >
        <span className="inline-flex size-7 items-center justify-center rounded-full bg-signal/12 text-signal">
          <History className="size-3.5" />
        </span>
        <span className="text-[12px] leading-tight">
          <span className="block font-medium text-foreground">Snapshot saved</span>
          <span className="block text-muted-foreground">Restore point before the run</span>
        </span>
      </div>

      {/* Sits above the 26px status bar (over the composer's corner), never over the runtime/branch/problems text. */}
      <div
        className={cn(card, "bottom-11 left-[calc(var(--edge)*-1)] flex items-center gap-2.5 px-3 py-2", frame.cards.typecheck ? "scale-100 opacity-100" : "scale-95 opacity-0")}
        style={{ "--depth": 6 } as React.CSSProperties}
      >
        <span className="inline-flex size-7 items-center justify-center rounded-full bg-success/15 text-success">
          <CircleCheck className="size-4" />
        </span>
        <span className="text-[12px] leading-tight">
          <span className="block font-medium text-foreground">Type-check passed</span>
          <span className="block font-mono text-[11px] text-muted-foreground">0 errors · build ok</span>
        </span>
      </div>

      {/* Smaller below xl, where the canvas is narrower and the gutter is at its minimum. */}
      <div
        className={cn(
          card,
          "bottom-12 right-[calc(var(--edge)*-1)] w-[104px] rounded-[26px] border-0 bg-transparent p-0 shadow-none xl:bottom-10 xl:w-[132px] xl:rounded-[30px]",
          frame.cards.phone ? "scale-100 opacity-100" : "scale-95 opacity-0",
        )}
        style={{ "--depth": -5 } as React.CSSProperties}
      >
        <DeviceFrame device="phone" className="w-full!">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={phoneSrc} alt="" width={390} height={844} loading="lazy" decoding="async" className="size-full bg-white object-cover object-left-top" />
        </DeviceFrame>
      </div>
    </div>
  );
}
