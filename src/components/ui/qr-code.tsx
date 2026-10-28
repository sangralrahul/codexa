"use client";

import * as React from "react";
import qrcode from "qrcode-generator";
import { cn } from "@/lib/utils";

/** A QR code drawn as one SVG path (crisp at any size, follows the current text colour). */
export function QrCode({ value, size = 168, className, label }: { value: string; size?: number; className?: string; label: string }) {
  const { d, n } = React.useMemo(() => {
    const qr = qrcode(0, "M");
    qr.addData(value);
    qr.make();
    const count = qr.getModuleCount();
    let path = "";
    for (let r = 0; r < count; r++) for (let c = 0; c < count; c++) if (qr.isDark(r, c)) path += `M${c} ${r}h1v1h-1z`;
    return { d: path, n: count };
  }, [value]);
  const quiet = 2;
  return (
    <svg role="img" aria-label={label} width={size} height={size} viewBox={`${-quiet} ${-quiet} ${n + quiet * 2} ${n + quiet * 2}`} shapeRendering="crispEdges" className={cn("rounded-lg bg-white text-black", className)}>
      <path d={d} fill="currentColor" />
    </svg>
  );
}
