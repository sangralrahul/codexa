"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, MessageSquareText, Play, Rocket, X } from "lucide-react";
import { cn } from "@/lib/utils";

export const CHECKLIST_COOKIE = "codexa_checklist";

export type ChecklistMilestones = { project: boolean; preview: boolean; deploy: boolean };

/**
 * First-run checklist. Every tick comes from a database row (a project exists, a preview
 * sandbox was started, a deployment was made), never from local progress. Once all three are
 * done it can be dismissed (a cookie, so the server stops rendering it: no flash on reload).
 * `layout="row"`: three steps side by side (first run); `"stack"`: compact, for a side column.
 */
export function GettingStarted({ milestones, canCreate, resumeHref, layout = "row", className }: { milestones: ChecklistMilestones; canCreate: boolean; resumeHref?: string | null; layout?: "row" | "stack"; className?: string }) {
  const router = useRouter();
  const [hidden, setHidden] = useState(false);
  const steps = [
    {
      id: "project",
      done: milestones.project,
      icon: MessageSquareText,
      title: "Create your first project",
      body: "Describe it in the box above, or start from a template.",
      cta: canCreate ? { label: "Describe it", onClick: () => document.getElementById("idea-prompt")?.focus() } : null,
    },
    {
      id: "preview",
      done: milestones.preview,
      icon: Play,
      title: "Run a live preview",
      body: "Open a project and press Run to start it in a sandbox.",
      cta: resumeHref ? { label: "Open a project", href: resumeHref } : null,
    },
    {
      id: "deploy",
      done: milestones.deploy,
      icon: Rocket,
      title: "Deploy it",
      body: "Publish from the editor to get a shareable URL.",
      cta: resumeHref ? { label: "Open a project", href: resumeHref } : null,
    },
  ];
  const done = steps.filter((s) => s.done).length;
  const allDone = done === steps.length;
  const next = steps.find((s) => !s.done)?.id;
  if (hidden) return null;

  const dismiss = () => {
    try {
      document.cookie = `${CHECKLIST_COOKIE}=done; path=/; max-age=31536000; samesite=lax`;
    } catch {
      /* cookies blocked: hidden for this page view */
    }
    setHidden(true);
    router.refresh();
  };

  const row = layout === "row";
  return (
    <section aria-labelledby="checklist-title" className={cn("e1 relative overflow-hidden rounded-[18px]", row ? "p-5 sm:p-6" : "p-5", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 id="checklist-title" className="text-[15px] font-semibold tracking-[-0.01em]">
            {allDone ? "You're all set" : "Get started"}
          </h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">{allDone ? "You built, ran and shipped a project. Nice work." : "From a sentence to a live URL in three steps."}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="text-meta text-muted-foreground" aria-label={`${done} of ${steps.length} steps done`}>
            {done}/{steps.length}
          </span>
          {allDone ? (
            <button type="button" onClick={dismiss} className="flex size-7 items-center justify-center rounded-[8px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label="Dismiss checklist">
              <X className="size-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <span className="block h-full origin-left rounded-full bg-[image:var(--ember)] transition-transform duration-(--dur-5) ease-out calm:transition-none" style={{ transform: `scaleX(${done / steps.length})` }} />
      </div>
      <ol className={cn("mt-4 grid gap-3", row ? "md:grid-cols-3" : "")}>
        {steps.map((s, i) => {
          const isNext = s.id === next;
          return (
            <li
              key={s.id}
              className={cn(
                "relative flex gap-3 rounded-[14px] border p-3.5 transition-colors",
                s.done ? "border-border bg-surface/50" : isNext ? "border-border-strong bg-card shadow-[inset_0_1px_0_var(--hairline),var(--shadow-sm)]" : "border-dashed border-border bg-transparent",
              )}
            >
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  s.done ? "step-done bg-success text-background" : isNext ? "bg-foreground text-background" : "bg-muted text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)]",
                )}
              >
                {s.done ? <Check className="size-3.5" strokeWidth={3} aria-hidden="true" /> : i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn("text-[13.5px] font-medium", s.done && "text-muted-foreground line-through decoration-border-strong")}>
                  {s.title}
                  {s.done ? null : <span className="sr-only"> (to do)</span>}
                </p>
                {s.done ? <p className="mt-0.5 text-xs font-medium text-success">Done</p> : <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{s.body}</p>}
                {!s.done && isNext && s.cta ? (
                  "href" in s.cta && s.cta.href ? (
                    <Link href={s.cta.href} className="link-draw mt-2 inline-flex items-center gap-1 text-xs font-medium text-foreground">
                      {s.cta.label} <ArrowRight className="size-3" aria-hidden="true" />
                    </Link>
                  ) : "onClick" in s.cta ? (
                    <button type="button" onClick={s.cta.onClick} className="link-draw mt-2 inline-flex items-center gap-1 text-xs font-medium text-foreground">
                      {s.cta.label} <ArrowRight className="size-3" aria-hidden="true" />
                    </button>
                  ) : null
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
