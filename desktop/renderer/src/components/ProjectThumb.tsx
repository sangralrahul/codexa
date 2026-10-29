import { useState } from "react";
import { cn, templateShot } from "../lib/util";

const TONES = ["from-orange-200 to-rose-200", "from-sky-200 to-indigo-200", "from-emerald-200 to-teal-200", "from-amber-200 to-orange-200", "from-violet-200 to-fuchsia-200", "from-slate-200 to-zinc-300"];

/** The starter's screenshot (from the Codexa site) with a quiet placeholder while it loads, or a calm tile with the project's initial. */
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
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return (
    <span aria-hidden="true" className={cn("flex shrink-0 items-center justify-center bg-gradient-to-br font-semibold text-black/45", TONES[h % TONES.length], big ? "text-[28px]" : "text-[10px]", className)}>
      {(name.trim()[0] ?? "C").toUpperCase()}
    </span>
  );
}
