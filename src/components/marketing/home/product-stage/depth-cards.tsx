import * as React from "react";
import { CircleCheck, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { DeviceFrame } from "@/components/frames/device-frame";
import type { Scenario } from "../types";
import type { StageFrame } from "./script";

/**
 * Three glass cards that float over the window edges at different depths (PLAN §5.2):
 * "Snapshot saved" (top-right), "Type-check passed · 0 errors" (bottom-left) and a phone-sized
 * crop of the starter screenshot (right). Each appears when its chapter is reached. Parallax is
 * applied by the parent through --px / --py (−1…1) and each card's --depth. Decorative.
 */
export function DepthCards({ frame, scenario }: { frame: StageFrame; scenario: Scenario }) {
  const card = "glass absolute z-[4] rounded-[14px] border border-border-strong shadow-xl [transition:opacity_var(--dur-4)_var(--ease-out),scale_var(--dur-4)_var(--ease-out),translate_200ms_var(--ease-out)] [translate:calc(var(--px,0)*var(--depth)*1px)_calc(var(--py,0)*var(--depth)*1px)] calm:[translate:none]";
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden lg:block">
      <div
        className={cn(card, "-right-7 top-[132px] flex items-center gap-2.5 px-3 py-2.5", frame.cards.snapshot ? "scale-100 opacity-100" : "scale-95 opacity-0")}
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
        className={cn(card, "-left-8 bottom-4 flex items-center gap-2.5 px-3 py-2.5", frame.cards.typecheck ? "scale-100 opacity-100" : "scale-95 opacity-0")}
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
        className={cn(card, "-right-10 bottom-10 w-[132px] rounded-[30px] border-0 bg-transparent p-0 shadow-none", frame.cards.phone ? "scale-100 opacity-100" : "scale-95 opacity-0")}
        style={{ "--depth": -5 } as React.CSSProperties}
      >
        <DeviceFrame device="phone" className="w-full!">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/templates/${scenario.id}.webp`} alt="" width={960} height={600} loading="lazy" decoding="async" className="size-full bg-white object-cover object-left-top" />
        </DeviceFrame>
      </div>
    </div>
  );
}
