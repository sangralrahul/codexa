import { Check, Flag, GitCompare, RotateCcw, Sparkles, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Small, static UI fragments for the bento grid, built with the same markup and tokens as the
 * app screens they stand for (history drawer, Publish dialog, sandbox terminal). They are
 * decorative: each is aria-hidden and the cell's title and copy carry the meaning, so nothing in
 * here is an inert control. Sample names only; no timings, counts or outcomes are invented.
 */

/** Version history: the working copy at the top, then two checkpoints with their actions (history-drawer.tsx). */
export function CheckpointList({ className }: { className?: string }) {
  const rows = [
    { name: "Before: add a cart drawer", kind: "AI run", Icon: Sparkles, tone: "bg-primary/12 text-primary ring-primary/30", files: 14 },
    { name: "Initial import", kind: "Checkpoint", Icon: Flag, tone: "bg-foreground/[0.07] text-foreground ring-border-strong", files: 12 },
  ];
  return (
    <div aria-hidden="true" className={cn("mk-frag", className)}>
      <ol className="relative">
        <span className="absolute bottom-3 left-[13px] top-3 w-px bg-border" />
        <li className="relative flex items-start gap-3 pb-4">
          <span className="relative z-[1] mt-0.5 flex size-[27px] shrink-0 items-center justify-center rounded-full bg-primary shadow-[0_0_0_4px_var(--card)]">
            <span className="size-2 rounded-full bg-background" />
          </span>
          <span className="min-w-0">
            <span className="block text-[13px] font-semibold text-foreground">Now · working copy</span>
            <span className="mt-0.5 block text-[11.5px] text-muted-foreground">The files as they are right now.</span>
          </span>
        </li>
        {rows.map((r) => (
          <li key={r.name} className="relative flex items-start gap-3 py-1.5">
            <span className={cn("relative z-[1] mt-0.5 flex size-[27px] shrink-0 items-center justify-center rounded-full ring-1 shadow-[0_0_0_4px_var(--card)]", r.tone)}>
              <r.Icon className="size-3.5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium text-foreground">{r.name}</span>
              <span className="mt-0.5 block text-[11.5px] text-muted-foreground">
                {r.kind} · {r.files} files
              </span>
              <span className="mt-1.5 flex gap-1.5">
                <span className="mk-frag__btn">
                  <GitCompare className="size-3" /> View diff
                </span>
                <span className="mk-frag__btn mk-frag__btn--ghost">
                  <RotateCcw className="size-3" /> Restore
                </span>
              </span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** The pre-publish checks panel: the real pass titles from site-checks.ts, and the count read from code. */
export function ChecksPanel({ total, className }: { total: number; className?: string }) {
  const passes = [
    { group: "Security", items: ["No API keys in the code", "No eval or new Function"] },
    { group: "SEO", items: ["Page title is set", "Meta description is set"] },
    { group: "Quality", items: ["Images have alt text", "In-page links work"] },
    { group: "Performance", items: ["Heavy files flagged before upload"] },
  ];
  return (
    <div aria-hidden="true" className={cn("mk-frag mk-frag--checks", className)}>
      <div className="flex items-center justify-between gap-3 border-b border-border pb-2.5">
        <span className="text-[13px] font-semibold text-foreground">Pre-publish checks</span>
        <span className="rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">{total} checks</span>
      </div>
      <ul className="mt-2 space-y-2.5">
        {passes.map((g) => (
          <li key={g.group}>
            <span className="block text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{g.group}</span>
            <ul className="mt-1 space-y-1">
              {g.items.map((t) => (
                <li key={t} className="flex items-center gap-2 text-[12.5px] text-foreground/90">
                  <span className="inline-grid size-4 shrink-0 place-items-center rounded-full bg-success/15 text-success">
                    <Check className="size-2.5" strokeWidth={3} />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      <div className="mk-frag__foot">
        <span>Every finding names the file and line. Fix them before publishing.</span>
        <span className="mk-frag__btn shrink-0">Fix with AI</span>
      </div>
    </div>
  );
}

/** The sandbox terminal: the agent's allowlisted commands (COMMANDS in schemas.ts), run inside the project's container. */
export function SandboxRail({ commands, className }: { commands: readonly string[]; className?: string }) {
  return (
    <div aria-hidden="true" className={cn("mk-frag mk-frag--term", className)}>
      <div className="flex items-center gap-2 border-b border-border pb-2 text-[11.5px] text-muted-foreground">
        <Terminal className="size-3.5" />
        <span className="font-medium text-foreground/80">Terminal</span>
        <span>·</span>
        <span className="truncate">container · candle-store</span>
      </div>
      <ol className="mt-2.5 space-y-1.5 font-mono text-[12px]">
        {commands.map((c) => (
          <li key={c} className="flex items-center gap-2">
            <span className="text-muted-foreground">$</span>
            <span className="text-foreground/90">{c === "install" ? "npm install" : `npm run ${c}`}</span>
            <span className="ml-auto text-[10.5px] text-muted-foreground">allowlisted</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** The Publish dialog's live state: the address with its Live badge and the four deploy steps (publish-popover.tsx STEPS). */
export function LiveBadge({ className }: { className?: string }) {
  const steps = [
    { label: "Checks", detail: "Security and quality scan" },
    { label: "Build", detail: "In the project's container" },
    { label: "Upload", detail: "Files stored in R2" },
    { label: "Live", detail: "Served at your address" },
  ];
  return (
    <div aria-hidden="true" className={cn("mk-frag", className)}>
      <div className="flex items-center justify-between gap-3 rounded-[10px] border border-border bg-surface px-3 py-2.5">
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-medium text-foreground">candle-store.example.com</span>
          <span className="block text-[11px] text-muted-foreground">Codexa hosting · rollback available</span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-1.5 text-[11.5px] font-medium uppercase tracking-wide text-success">
          <span className="live-dot" />
          Live
        </span>
      </div>
      <ol className="mt-3 grid grid-cols-4 gap-1.5">
        {steps.map((s) => (
          <li key={s.label} className="rounded-[8px] border border-border bg-card px-2 py-1.5">
            <span className="flex items-center gap-1 text-[11.5px] font-semibold text-foreground">
              <Check className="size-3 text-success" strokeWidth={3} />
              {s.label}
            </span>
            <span className="mt-0.5 block text-[10px] leading-snug text-muted-foreground">{s.detail}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
