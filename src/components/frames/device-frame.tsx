import * as React from "react";
import { cn } from "@/lib/utils";

export type Device = "desktop" | "tablet" | "phone";

const ASPECT: Record<Device, number> = { desktop: 16 / 10, tablet: 3 / 4, phone: 9 / 19.5 };
// fit="width": share of the container width per device.
const WIDTH: Record<Device, string> = { desktop: "100%", tablet: "62%", phone: "32%" };
const PAD: Record<Device, number> = { desktop: 6, tablet: 9, phone: 8 };

/**
 * Device bezel around a screen (desktop, tablet, phone). Changing `device` morphs the width
 * (450ms spring; instant when calm). Children fill the screen — use an
 * `<img className="size-full object-cover object-top">` or a TemplatePreview.
 * - fit="width" (default): width is a share of the container; height follows the aspect.
 * - fit="height": fills the container height; the parent must set `[container-type:size]`.
 */
export function DeviceFrame({ device, children, className, fit = "width" }: { device: Device; children: React.ReactNode; className?: string; fit?: "width" | "height" }) {
  const pad = PAD[device];
  const width = fit === "height" ? `calc((100cqh - ${pad * 2}px) * ${ASPECT[device].toFixed(4)} + ${pad * 2}px)` : WIDTH[device];
  return (
    <div data-device={device} className={cn("device-frame relative mx-auto max-w-full", className)} style={{ width }}>
      <div
        className={cn(
          "relative shadow-xl",
          device === "desktop" && "rounded-[14px] border border-border-strong bg-card",
          device === "tablet" && "rounded-[26px] bg-code-bg ring-1 ring-border-strong",
          device === "phone" && "rounded-[36px] bg-code-bg ring-1 ring-border-strong",
        )}
        style={{ padding: pad }}
      >
        {device === "phone" ? <span aria-hidden="true" className="absolute left-1/2 top-[13px] z-[2] h-[14px] w-[30%] -translate-x-1/2 rounded-full bg-code-bg" /> : null}
        <div
          className={cn("relative overflow-hidden bg-card", device === "desktop" ? "rounded-[9px]" : device === "tablet" ? "rounded-[18px]" : "rounded-[28px]")}
          style={{ aspectRatio: String(ASPECT[device]) }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
