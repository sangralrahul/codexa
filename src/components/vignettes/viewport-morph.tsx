"use client";

import * as React from "react";
import { Monitor, Smartphone, Tablet } from "lucide-react";
import { cn } from "@/lib/utils";
import { DeviceFrame, type Device } from "@/components/frames/device-frame";
import { TemplatePreview } from "@/components/templates/template-preview";
import { useScript } from "./use-script";

const ORDER: Device[] = ["desktop", "tablet", "phone", "desktop"];
const LABEL: Record<Device, string> = { desktop: "Desktop", tablet: "Tablet", phone: "Phone" };
const ICON = { desktop: Monitor, tablet: Tablet, phone: Smartphone } as const;

/**
 * Preview on every viewport: the real starter screenshot morphs desktop → tablet → phone →
 * desktop inside a device frame (450ms spring per step). Uses TemplatePreview with its
 * existing props. Final frame (desktop) on the server and when calm. Decorative.
 */
export function ViewportMorph({ templateId, category, playing, className }: { templateId: string; category: string; playing?: boolean; className?: string }) {
  const { ref, index, started } = useScript([0, 1500, 3000, 4500], 5000, playing);
  const device = !started || index < 0 ? "desktop" : ORDER[Math.min(ORDER.length - 1, index)];
  return (
    <div ref={ref} aria-hidden="true" className={cn("flex w-full min-w-0 flex-col gap-3 [contain:inline-size]", className)}>
      <div className="flex items-center gap-1 self-center rounded-[9px] bg-muted p-0.5 shadow-[inset_0_0_0_1px_var(--border)]">
        {(["desktop", "tablet", "phone"] as const).map((d) => (
          <span
            key={d}
            className={cn(
              "inline-flex h-6 items-center gap-1 rounded-[7px] px-2 text-[11px] font-medium transition-[color,background-color,box-shadow] duration-300",
              device === d ? "bg-card text-foreground shadow-[var(--shadow-sm),inset_0_0_0_1px_var(--border)]" : "text-muted-foreground",
            )}
          >
            {React.createElement(ICON[d], { className: "size-3" })}
            {LABEL[d]}
          </span>
        ))}
      </div>
      <div className="h-[230px] [container-type:size]">
        <DeviceFrame device={device} fit="height">
          <TemplatePreview id={templateId} category={category} className="size-full rounded-none border-0 shadow-none" imgClassName="size-full aspect-auto object-cover object-top" />
        </DeviceFrame>
      </div>
    </div>
  );
}
