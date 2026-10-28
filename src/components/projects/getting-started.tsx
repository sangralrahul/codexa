"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Lock, MessageSquareText, Play, Rocket, X } from "lucide-react";
import { cn } from "@/lib/utils";

export const CHECKLIST_COOKIE = "codexa_checklist";

export type ChecklistMilestones = { project: boolean; preview: boolean; deploy: boolean };

/**
 * First-run checklist. Every tick comes from a database row (a project exists, a preview
 * sandbox was started, a deployment was made), never from local progress. Once all three are
 * done it can be dismissed (a cookie, so the server stops rendering it: no flash on reload).
 * `layout="row"`: three steps side by side (first run); `"stack"`: compact, for a side column.
 * Deploys are blocked server-side until the email is verified, so the deploy step renders as
 * locked (with the reason) instead of as an available next step while the email is unverified.
 */
export function GettingStarted({
  milestones,
  canCreate,
  resumeHref,
  emailVerified = true,
  emailConfigured = true,
  layout = "row",
  className,
}: {
  milestones: ChecklistMilestones;
  canCreate: boolean;
  resumeHref?: string | null;
  /** Whether the signed-in user's email is verified (deploys require it). */
  emailVerified?: boolean;
  /** Whether this server can deliver account emails (capabilities.email). */
  emailConfigured?: boolean;
  /** "strip": one quiet line (returning users): progress, the next step and dismiss. */
  layout?: "row" | "stack" | "strip";
  className?: string;
}) {
  const router = useRouter();
  const [hidden, setHidden] = useState(false);
  const deployLocked = !milestones.deploy && !emailVerified;
  const steps: {
    id: string;
    done: boolean;
    icon: typeof Rocket;
    title: string;
    body: string;
    locked?: boolean;
    cta: { label: string; onClick: () => void } | { label: string; href: string } | null;
  }[] = [
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
      body: deployLocked
        ? emailConfigured
          ? "Needs a verified email. Use the link we emailed you, then publish from the editor."
          : "Needs a verified email. Email delivery isn't configured on this server; ask the operator."
        : "Publish from the editor to get a shareable URL.",
      locked: deployLocked,
      cta: deployLocked ? null : resumeHref ? { label: "Open a project", href: resumeHref } : null,
    },
  ];
  const done = steps.filter((s) => s.done).length;
  const allDone = done === steps.length;
  const next = steps.find((s) => !s.done && !s.locked)?.id;
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

  if (layout === "strip") {
    const nextStep = steps.find((s) => s.id === next);
    return (
      <section aria-labelledby="checklist-title" className={cn("flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[14px] border border-border bg-card/60 px-4 py-2.5", className)}>
        <h2 id="checklist-title" className="text-[13px] font-medium">
          {allDone ? "You're all set" : "Getting started"}
        </h2>
        <ol className="flex items-center gap-1.5" aria-label={`${done} of ${steps.length} steps done`}>
          {steps.map((s) => (
            <li key={s.id} title={s.title} className={cn("h-1.5 w-6 rounded-full", s.done ? "bg-success" : s.id === next ? "bg-foreground/60" : "bg-muted")}>
              <span className="sr-only">
                {s.title}: {s.done ? "done" : s.locked ? "locked" : "to do"}
              </span>
            </li>
          ))}
        </ol>
        {nextStep ? (
          <p className="min-w-0 flex-1 truncate text-[13px] text-muted-foreground">
            Next: <span className="text-foreground">{nextStep.title}</span>
            {nextStep.cta ? (
              "href" in nextStep.cta ? (
                <Link href={nextStep.cta.href} className="link-draw ml-2 inline-flex items-center gap-1 font-medium text-foreground">
                  {nextStep.cta.label} <ArrowRight className="size-3" aria-hidden="true" />
                </Link>
              ) : (
                <button type="button" onClick={nextStep.cta.onClick} className="link-draw ml-2 inline-flex items-center gap-1 font-medium text-foreground">
                  {nextStep.cta.label} <ArrowRight className="size-3" aria-hidden="true" />
                </button>
              )
            ) : null}
          </p>
        ) : (
          <p className="min-w-0 flex-1 truncate text-[13px] text-muted-foreground">{deployLocked ? "Verify your email to publish." : "You built, ran and shipped a project."}</p>
        )}
        <button type="button" onClick={dismiss} className="ml-auto flex size-7 items-center justify-center rounded-[8px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label="Hide getting started">
          <X className="size-4" aria-hidden="true" />
        </button>
      </section>
    );
  }

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
                s.done ? "border-border bg-surface/50" : s.locked ? "border-border bg-muted/40" : isNext ? "border-border-strong bg-card shadow-[inset_0_1px_0_var(--hairline),var(--shadow-sm)]" : "border-dashed border-border bg-transparent",
              )}
            >
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  s.done ? "step-done bg-success text-background" : s.locked ? "bg-muted text-muted-foreground" : isNext ? "bg-foreground text-background" : "bg-muted text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)]",
                )}
              >
                {s.done ? <Check className="size-3.5" strokeWidth={3} aria-hidden="true" /> : s.locked ? <Lock className="size-3.5" aria-hidden="true" /> : i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn("text-[13.5px] font-medium", s.done && "text-muted-foreground line-through decoration-border-strong", s.locked && "text-muted-foreground")}>
                  {s.title}
                  {s.done ? null : s.locked ? <span className="sr-only"> (locked)</span> : <span className="sr-only"> (to do)</span>}
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
