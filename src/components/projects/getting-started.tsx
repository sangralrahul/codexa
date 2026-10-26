import Link from "next/link";
import { ArrowRight, Check, FolderGit2, LayoutTemplate, MessageSquareText, Rocket, Wand2 } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * First-run panel on the dashboard: how a project goes from a sentence to a running app,
 * drawn as three small animated steps (an illustration of the flow, not live data).
 */
export function GettingStarted({ canCreate }: { canCreate: boolean }) {
  const steps = [
    {
      icon: MessageSquareText,
      title: "Describe it",
      body: "Say what you want in plain words, or start from a template.",
      art: (
        <div className="rounded-lg border border-border bg-background/70 p-3 font-mono text-[11px]">
          <span className="text-muted-foreground">› </span>
          <span className="typing-line inline-block align-bottom">a habit tracker with streaks</span>
          <span className="caret" />
        </div>
      ),
    },
    {
      icon: Wand2,
      title: "Codexa builds it",
      body: "The agent plans, writes real files, type-checks and fixes errors.",
      art: (
        <ul className="space-y-1 rounded-lg border border-border bg-background/70 p-3 font-mono text-[11px]">
          {["Plan 3 changes", "write src/App.tsx", "type-check passed"].map((t, i) => (
            <li key={t} className="tick-in flex items-center gap-1.5" style={{ animationDelay: `${i * 0.5}s` }}>
              <Check className="size-3 text-success" aria-hidden="true" /> {t}
            </li>
          ))}
        </ul>
      ),
    },
    {
      icon: Rocket,
      title: "Run and ship",
      body: "Preview it live in a sandbox, then deploy with one click.",
      art: (
        <div className="flex items-center justify-between rounded-lg border border-border bg-background/70 p-3 text-[11px]">
          <span className="flex items-center gap-1.5">
            <span className="relative flex size-2">
              <span className="absolute inset-0 animate-ping rounded-full bg-success/60" />
              <span className="relative size-2 rounded-full bg-success" />
            </span>
            Preview running
          </span>
          <span className="rounded-md bg-foreground px-2 py-0.5 font-medium text-background">Deploy</span>
        </div>
      ),
    },
  ];
  return (
    <div className="glass relative overflow-hidden rounded-2xl border border-border p-6 sm:p-8">
      <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-signal/15 blur-3xl" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-signal">Get started</p>
          <h3 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">Your first app is one sentence away</h3>
          <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">Type an idea in the box above, or pick a starting point. Everything Codexa makes is real code you can read, edit and export.</p>
        </div>
        {canCreate ? (
          <div className="flex shrink-0 flex-wrap gap-2">
            <Link href="/new-project" className={buttonClasses("secondary", "md", "btn-solid rounded-lg")}>
              <LayoutTemplate className="size-4" aria-hidden="true" /> Start from a template
            </Link>
            <Link href="/import-project" className={buttonClasses("outline", "md", "rounded-lg")}>
              <FolderGit2 className="size-4" aria-hidden="true" /> Import from GitHub
            </Link>
          </div>
        ) : null}
      </div>
      <ol className="relative mt-8 grid gap-4 md:grid-cols-3">
        {steps.map((s, i) => (
          <li key={s.title} data-reveal style={{ "--reveal-delay": `${i * 120}ms` } as React.CSSProperties} className="relative rounded-xl border border-border bg-card/80 p-4">
            {i < steps.length - 1 ? <ArrowRight aria-hidden="true" className="absolute -right-3.5 top-1/2 z-10 hidden size-5 -translate-y-1/2 rounded-full border border-border bg-background p-0.5 text-muted-foreground md:block" /> : null}
            <div className="flex items-center gap-2.5">
              <span className={cn("flex size-8 items-center justify-center rounded-lg border border-border bg-surface")}>
                <s.icon className="size-4" aria-hidden="true" />
              </span>
              <span className="font-mono text-[11px] text-muted-foreground">0{i + 1}</span>
            </div>
            <p className="mt-3 text-sm font-semibold">{s.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.body}</p>
            <div className="mt-4" aria-hidden="true">
              {s.art}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
