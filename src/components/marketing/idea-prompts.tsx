"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Copy } from "lucide-react";
import { ideaHref, stashPendingIdea } from "@/lib/client/pending-idea";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

/**
 * Example prompts as "Try this prompt" chips (idea passport, PLAN §4.1): the idea is stashed for
 * 24 hours and carried through sign-up (or straight to the dashboard when signed in), so it lands
 * pre-filled in the composer. Copy puts the text on the clipboard instead.
 */
export function IdeaPrompts({ ideas, signedIn, className }: { ideas: string[]; signedIn: boolean; className?: string }) {
  const router = useRouter();
  const [copied, setCopied] = React.useState<number | null>(null);
  const [going, setGoing] = React.useState<number | null>(null);

  const tryIdea = (text: string, i: number) => {
    setGoing(i);
    stashPendingIdea(text, "solution");
    router.push(ideaHref(signedIn ? "/dashboard" : "/signup", text));
  };
  const copy = async (text: string, i: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(i);
      setTimeout(() => setCopied((c) => (c === i ? null : c)), 1600);
    } catch {
      toast.error("Could not copy", "Your browser blocked clipboard access. Select the text and copy it instead.");
    }
  };

  return (
    <ul className={cn("grid gap-2.5", className)}>
      {ideas.map((idea, i) => (
        <li key={idea} data-reveal style={{ "--reveal-delay": `${i * 70}ms` } as React.CSSProperties} className="group relative rounded-[14px] border border-border bg-card p-4 shadow-[inset_0_1px_0_var(--hairline)] transition-[border-color,box-shadow] duration-300 hover:border-border-strong hover:shadow-[inset_0_1px_0_var(--hairline),var(--shadow-md)] focus-within:border-border-strong">
          <p className="flex gap-3 text-[15px] leading-relaxed text-foreground">
            <span aria-hidden="true" className="select-none font-mono text-primary">›</span>
            <span>{idea}</span>
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 pl-6">
            <button
              type="button"
              onClick={() => tryIdea(idea, i)}
              disabled={going !== null}
              aria-label={`Try this prompt: ${idea}`}
              className="inline-flex h-8 items-center gap-1.5 rounded-full bg-foreground px-3.5 text-[13px] font-medium text-background transition-[opacity,translate] duration-200 hover:opacity-90 disabled:opacity-60"
            >
              {going === i ? "Opening…" : "Try this prompt"}
              <ArrowRight className="size-3.5 transition-transform duration-300 ease-snap group-hover:translate-x-0.5 group-focus-within:translate-x-0.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => copy(idea, i)}
              aria-label={copied === i ? "Copied" : `Copy prompt: ${idea}`}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border px-3 text-[13px] text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
            >
              {copied === i ? <Check className="check-draw size-3.5 text-success" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
              <span aria-live="polite">{copied === i ? "Copied" : "Copy"}</span>
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
