import * as React from "react";
import { Braces, FileCode2, FileText, Image as ImageIcon, Palette } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS = { code: FileCode2, json: Braces, style: Palette, image: ImageIcon, text: FileText } as const;

function iconKind(path: string): keyof typeof ICONS {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  if (["ts", "tsx", "js", "jsx", "mjs", "html"].includes(ext)) return "code";
  if (ext === "json") return "json";
  if (["css", "scss"].includes(ext)) return "style";
  if (["png", "jpg", "jpeg", "webp", "svg", "gif"].includes(ext)) return "image";
  return "text";
}

const ACTION = {
  A: { text: "text-success", title: "Added" },
  M: { text: "text-warning", title: "Modified" },
  D: { text: "text-danger", title: "Deleted" },
} as const;

/**
 * File row: icon, muted directory + basename, optional A/M/D letter. `fresh` materialises it
 * (rows grow 0fr→1fr, icon springs, a selection sweep crosses the path — M10).
 * `delay` (ms) staggers several fresh rows. Server-safe; decorative inside vignettes.
 */
export function FileRow({
  path,
  action,
  fresh = false,
  active = false,
  delay = 0,
  meta,
  className,
}: {
  path: string;
  action?: "A" | "M" | "D";
  fresh?: boolean;
  active?: boolean;
  delay?: number;
  /** Right-aligned extra, e.g. "+12 −3". */
  meta?: React.ReactNode;
  className?: string;
}) {
  const slash = path.lastIndexOf("/");
  const dir = slash >= 0 ? path.slice(0, slash + 1) : "";
  const base = slash >= 0 ? path.slice(slash + 1) : path;
  const row = (
    <div
      className={cn(
        "flex h-7 items-center gap-2 rounded-md px-2 font-mono text-[12px]",
        active ? "bg-selection text-foreground" : "text-foreground/85",
        action === "D" && "text-muted-foreground line-through decoration-danger/60",
        className,
      )}
    >
      {React.createElement(ICONS[iconKind(path)], {
        className: cn("size-3.5 shrink-0 text-muted-foreground", fresh && "materialize__icon"),
        style: fresh ? ({ "--materialize-delay": `${delay}ms` } as React.CSSProperties) : undefined,
        "aria-hidden": true,
      })}
      <span className={cn("min-w-0 truncate rounded-[3px]", fresh && "materialize__sweep")} style={fresh ? ({ "--materialize-delay": `${delay}ms` } as React.CSSProperties) : undefined}>
        <span className="text-muted-foreground">{dir}</span>
        {base}
      </span>
      {meta ? <span className="ml-auto shrink-0 text-[11px] tabular-nums text-muted-foreground">{meta}</span> : null}
      {action ? (
        <span title={ACTION[action].title} className={cn("shrink-0 text-[11px] font-semibold", meta ? "" : "ml-auto", ACTION[action].text)}>
          {action}
        </span>
      ) : null}
    </div>
  );
  if (!fresh) return row;
  return (
    <div className="materialize" style={{ "--materialize-delay": `${delay}ms` } as React.CSSProperties}>
      <div>{row}</div>
    </div>
  );
}
