"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

const LABELS: Record<string, string> = { ts: "TypeScript", typescript: "TypeScript", tsx: "TSX", js: "JavaScript", javascript: "JavaScript", jsx: "JSX", bash: "Shell", sh: "Shell", shell: "Shell", json: "JSON", css: "CSS", html: "HTML", xml: "HTML", sql: "SQL", yaml: "YAML", yml: "YAML", md: "Markdown", markdown: "Markdown", http: "HTTP", text: "Text" };

/** Copy control: the icon morphs into a drawn check on success (width locked, announced politely). */
export function CopyButton({ getText, text, className, label = "Copy code" }: { getText?: () => string; /** Static text (use from server components, which cannot pass functions). */ text?: string; className?: string; label?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<number | null>(null);
  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text ?? getText?.() ?? "");
      setState("copied");
    } catch {
      setState("failed");
    }
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState("idle"), 1800);
  }

  return (
    <button
      type="button"
      onClick={copy}
      data-no-ripple
      aria-label={state === "copied" ? "Copied" : label}
      className={cn(
        "relative inline-flex h-7 items-center gap-1.5 rounded-md px-2 font-sans text-[11.5px] font-medium transition-[color,background-color] duration-(--dur-2)",
        state === "copied" ? "text-success" : state === "failed" ? "text-danger" : "text-code-muted hover:bg-white/[0.06] hover:text-code-fg",
        "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
        className,
      )}
    >
      <span className="relative grid size-3.5 place-items-center" aria-hidden="true">
        <Copy className={cn("col-start-1 row-start-1 size-3.5 transition-[opacity,scale] duration-(--dur-2) ease-snap", state === "copied" && "scale-50 opacity-0")} />
        {state === "copied" ? <Check key="ok" className="check-draw col-start-1 row-start-1 size-3.5" strokeWidth={2.5} /> : null}
      </span>
      <span className="grid">
        <span className={cn("col-start-1 row-start-1 transition-opacity duration-(--dur-2)", state !== "idle" && "opacity-0")}>Copy</span>
        <span className={cn("col-start-1 row-start-1 transition-opacity duration-(--dur-2)", state === "idle" && "opacity-0")} aria-hidden={state === "idle"}>
          {state === "failed" ? "Failed" : "Copied"}
        </span>
      </span>
      <span className="sr-only" role="status" aria-live="polite">
        {state === "copied" ? "Copied to clipboard" : state === "failed" ? "Copy failed" : ""}
      </span>
    </button>
  );
}

/**
 * A code pane (dark in both themes) with a header strip — language label and a copy control that
 * morphs into a check. The code itself is rendered on the server (rehype-highlight or tokens);
 * this only reads its text on click. `title` replaces the language label (e.g. a file path).
 */
export function CodeBlock({ children, language, title, className, bodyClassName }: { children: React.ReactNode; language?: string; title?: React.ReactNode; className?: string; bodyClassName?: string }) {
  const ref = useRef<HTMLPreElement>(null);
  const label = title ?? (language ? (LABELS[language.toLowerCase()] ?? language) : null);
  return (
    <div className={cn("code-block group relative my-5 overflow-hidden rounded-[14px] border border-code-border bg-code-bg text-code-fg shadow-[inset_0_1px_0_rgb(255_255_255/0.04),var(--shadow-sm)]", className)}>
      <div className="flex h-9 items-center justify-between gap-3 border-b border-code-border bg-white/[0.02] pl-3.5 pr-1.5">
        <span className="flex min-w-0 items-center gap-2 font-mono text-[11px] text-code-muted">
          <span aria-hidden="true" className="flex gap-1">
            <span className="size-[7px] rounded-full bg-code-muted/40" />
            <span className="size-[7px] rounded-full bg-code-muted/40" />
            <span className="size-[7px] rounded-full bg-code-muted/40" />
          </span>
          {label ? <span className="truncate">{label}</span> : null}
        </span>
        <CopyButton getText={() => ref.current?.textContent ?? ""} />
      </div>
      <pre ref={ref} className={cn("scrollbar-thin !m-0 !rounded-none !border-0 !bg-transparent px-4 py-3.5 text-[13px] leading-[1.7] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring", bodyClassName)} tabIndex={0}>
        {children}
      </pre>
    </div>
  );
}
