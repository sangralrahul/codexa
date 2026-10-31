import { useState } from "react";
import { cn, templateShot } from "../lib/util";


/** The starter's screenshot (from the Codexa site) with a quiet placeholder while it loads, or a flat monochrome tile with the project's initial. */
export function ProjectThumb({ templateId, name, className, big }: { templateId: string | null; name: string; className?: string; big?: boolean }) {
  const [state, setState] = useState<"loading" | "ok" | "failed">("loading");
  const src = templateShot(templateId);
  if (src && state !== "failed") {
    return (
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        draggable={false}
        onLoad={() => setState("ok")}
        onError={() => setState("failed")}
        className={cn("shrink-0 object-cover object-top transition-opacity duration-300", state === "ok" ? "bg-white opacity-100" : "pulse bg-surface opacity-60", className)}
      />
    );
  }
  return (
    <span aria-hidden="true" className={cn("dot-grid flex shrink-0 items-center justify-center bg-card font-mono font-medium text-dim", big ? "text-[28px]" : "text-[10px]", className)}>
      {(name.trim()[0] ?? "C").toUpperCase()}
    </span>
  );
}
