import * as React from "react";
import { CircleCheck, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { DeviceFrame } from "@/components/frames/device-frame";
import { templatePhoneShotSrc, templateShotFor } from "@/components/templates/shots";
import type { Scenario } from "../types";
import type { StageFrame } from "./script";

/**
 * Three glass cards that float over the window edges at different depths (PLAN §5.2):
 * "Snapshot saved" (top-right), "Type-check passed · 0 errors" (bottom-left) and a phone-sized
 * crop of the starter screenshot (right). Each appears when its chapter is reached; the snapshot
 * card is shown during the code chapters only, so it never covers the preview's device switch. Parallax is
 * applied by the parent through --px / --py (−1…1) and each card's --depth. Decorative.
 */
export function DepthCards({ frame, scenario }: { frame: StageFrame; scenario: Scenario }) {
  // Near-opaque glass: the cards float over live UI text, which must not show through.
  const card =
    "absolute z-[4] rounded-[14px] border border-border-strong bg-card/90 shadow-xl backdrop-blur-xl backdrop-saturate-150 [transition:opacity_var(--dur-4)_var(--ease-out),scale_var(--dur-4)_var(--ease-out),translate_200ms_var(--ease-out)] [translate:calc(var(--px,0)*var(--depth)*1px)_calc(var(--py,0)*var(--depth)*1px)] calm:[translate:none]";
  // "Snapshot saved" is a moment in the code chapters; it steps aside once the preview (and its device switch) takes over.
  const snapshot = frame.cards.snapshot && frame.view === "code";
  const phoneSrc = templatePhoneShotSrc(scenario.id) ?? templateShotFor(scenario.id, 360);
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden lg:block">
      <div
        className={cn(card, "-right-7 top-[132px] flex items-center gap-2.5 px-3 py-2.5", snapshot ? "scale-100 opacity-100" : "scale-95 opacity-0")}
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

      <div
        className={cn(card, "-bottom-4 -left-8 flex items-center gap-2.5 px-3 py-2.5", frame.cards.typecheck ? "scale-100 opacity-100" : "scale-95 opacity-0")}
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

      <div
        className={cn(card, "-right-10 bottom-10 w-[132px] rounded-[30px] border-0 bg-transparent p-0 shadow-none backdrop-blur-none backdrop-saturate-100", frame.cards.phone ? "scale-100 opacity-100" : "scale-95 opacity-0")}
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
