"use client";

import { useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Wraps a <pre> block with a copy button. The code itself is rendered on the
 * server (highlighted by rehype-highlight); we only read its text on click.
 */
export function CodeBlock({ children, language, className }: { children: React.ReactNode; language?: string; className?: string }) {
  const ref = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  async function copy() {
    const text = ref.current?.textContent ?? "";
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setFailed(false);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setFailed(true);
      setTimeout(() => setFailed(false), 1800);
    }
  }

  return (
    <div className={cn("group relative my-4", className)}>
      {language ? (
        <span className="pointer-events-none absolute left-3 top-2 text-[10px] font-medium uppercase tracking-wider text-code-fg/60" aria-hidden="true">
          {language}
        </span>
      ) : null}
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? "Copied" : "Copy code"}
        className="absolute right-2 top-2 inline-flex h-7 items-center gap-1 rounded-md border border-white/10 bg-black/30 px-2 text-[11px] text-code-fg/80 opacity-80 transition hover:bg-black/50 hover:text-code-fg focus-visible:opacity-100 group-hover:opacity-100"
      >
        {copied ? <Check className="size-3.5" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
        <span>{copied ? "Copied" : failed ? "Copy failed" : "Copy"}</span>
      </button>
      <pre ref={ref} className={cn("!m-0", language && "pt-7")} tabIndex={0}>
        {children}
      </pre>
    </div>
  );
}
