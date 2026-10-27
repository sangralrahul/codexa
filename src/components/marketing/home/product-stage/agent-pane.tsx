import * as React from "react";
import { ArrowUp, History, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoMark } from "@/components/logo";
import { StepRow, StepIcon } from "@/components/vignettes/step-row";
import { templateShotFor } from "@/components/templates/shots";
import type { Scenario } from "../types";
import type { AgentRow, StageFrame } from "./script";

/** One agent tool row: mono tool name, muted target, result detail. */
export function ToolRow({ row, connector, illustrative }: { row: AgentRow; connector?: boolean; illustrative?: string }) {
  return (
    <StepRow
      state={row.state}
      mono
      connector={connector}
      className={cn("py-[3px]", row.fresh && "materialize__sweep rounded-[4px]")}
      label={
        <>
          <span className="text-foreground">{row.tool}</span>
          {row.target ? <span className="text-muted-foreground"> {row.target}</span> : null}
        </>
      }
      detail={
        row.detail ? (
          <span className="inline-flex flex-wrap items-center gap-x-1.5">
            <span className={cn(row.state === "done" && /^\+/.test(row.detail) && "text-success")}>{row.detail}</span>
            {row.state === "error" && illustrative ? (
              <span className="rounded-[4px] border border-danger/30 px-1 py-px text-[10px] uppercase tracking-[0.08em] text-danger/90">{illustrative}</span>
            ) : null}
          </span>
        ) : undefined
      }
    />
  );
}

/**
 * The top of the thread once the prompt is sent: the project the run works on (the real starter,
 * its real screenshot and file count). Anchors the column so it never reads as an empty box.
 */
export function StarterContext({ scenario, className }: { scenario: Scenario; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5 rounded-[12px] border border-border bg-background/50 p-1.5 pr-3 shadow-[inset_0_1px_0_var(--hairline)]", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={templateShotFor(scenario.id, 120)} alt="" width={64} height={40} loading="lazy" decoding="async" className="h-10 w-16 shrink-0 rounded-[7px] bg-white object-cover object-left-top shadow-[0_0_0_1px_var(--border)]" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12px] font-medium text-foreground">{scenario.slug}</span>
        <span className="block truncate text-[11px] text-muted-foreground">
          {scenario.name} starter · {scenario.fileCount} files
        </span>
      </span>
    </div>
  );
}

/** The six-segment run rail (context, plan, edit, validate, repair, done) that lights as the run moves. */
function RunRail({ frame }: { frame: StageFrame }) {
  const lit = [frame.context.length > 0, frame.plan.visible, frame.writes.length > 0, frame.checks.length > 0, frame.checks.some((c) => c.key === "fix"), frame.finished];
  return (
    <div aria-hidden="true" className="grid grid-cols-6 gap-1">
      {lit.map((on, i) => (
        <span key={i} className="h-[3px] overflow-hidden rounded-full bg-border">
          <span
            className={cn(
              "block h-full origin-left rounded-full transition-transform duration-(--dur-4) ease-out",
              i === 4 ? "bg-warning" : i === 5 ? "bg-success" : "bg-signal",
              on ? "scale-x-100" : "scale-x-0",
            )}
          />
        </span>
      ))}
    </div>
  );
}

/**
 * The Agent column of the replayed workspace (mirrors the IDE's agent-first layout):
 * a thread that stays scrolled to the newest item, the Agent Run card, and the composer.
 */
export function AgentPane({ frame, scenario, typed, illustrative, className }: { frame: StageFrame; scenario: Scenario; typed: string; illustrative: string; className?: string }) {
  const composing = !frame.sent;
  return (
    <div className={cn("flex min-h-0 flex-col overflow-hidden rounded-[12px] border border-border bg-card shadow-sm", className)}>
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border px-3">
        <span className="font-medium">Agent</span>
        <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10.5px] font-medium text-muted-foreground">Build</span>
        <span className="ml-auto truncate text-[11.5px] text-muted-foreground">{scenario.frameworkName}</span>
      </div>

      {/* Thread: newest at the bottom; when it overflows, older items slide up under the fade. */}
      <div className="relative min-h-0 flex-1 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_28px)]">
        <div className="absolute inset-0 flex flex-col justify-end gap-2.5 p-3 pt-4">
          <StarterContext scenario={scenario} className="mb-auto" />
          {!frame.sent ? (
            <div key="welcome" className="mb-auto flex flex-col items-center gap-2.5 text-center">
              <LogoMark size={28} />
              <p className="font-display text-[22px] font-semibold leading-tight tracking-[-0.02em] text-foreground [font-stretch:104%]">
                What should we <span className="text-dim">build</span> next?
              </p>
              <p className="max-w-[24ch] text-[12px] text-muted-foreground">Describe a change. The agent plans it, edits the files and checks the build.</p>
            </div>
          ) : null}
          {frame.sent ? (
            <div key="bubble" className="ml-6 rounded-2xl rounded-tr-md bg-muted px-3 py-2 text-[12.5px] leading-relaxed text-foreground shadow-[inset_0_0_0_1px_var(--border)] [animation:pop-in_var(--dur-4)_var(--ease-out)_both]">
              {scenario.prompt}
            </div>
          ) : null}

          {frame.working || frame.finished ? (
            <div className="rounded-[12px] border border-border bg-background/60 p-2.5 shadow-[inset_0_1px_0_var(--hairline)] [animation:pop-in_var(--dur-4)_var(--ease-out)_both]">
              <div className="mb-2 flex items-center gap-2">
                <LogoMark size={16} state={frame.finished ? "success" : "running"} />
                <span className={cn("truncate text-[12px] font-medium", frame.working ? "text-shimmer" : "text-foreground")}>{frame.stage ?? "Working"}</span>
                {frame.repairing ? <span className="ml-auto shrink-0 rounded-full bg-warning/15 px-1.5 py-px text-[10.5px] font-medium text-warning">Repair</span> : null}
              </div>
              <RunRail frame={frame} />

              <ol className="mt-2">
                {frame.contextFolded ? (
                  <StepRow
                    state="done"
                    className="py-[3px]"
                    label={<span className="text-foreground/85">Read the project and wrote a plan</span>}
                    detail={`${frame.context.length} actions`}
                  />
                ) : (
                  frame.context.map((r, i) => <ToolRow key={r.key} row={r} connector={i < frame.context.length - 1} />)
                )}
              </ol>

              {frame.plan.visible ? (
                <div className="mt-2 rounded-[10px] bg-surface/80 px-2.5 py-2 shadow-[inset_0_0_0_1px_var(--border)] [animation:pop-in_var(--dur-4)_var(--ease-out)_both]">
                  <p className="text-label mb-1.5 text-muted-foreground">Plan</p>
                  <ol className="space-y-1">
                    {scenario.plan.map((p, i) => (
                      <li key={i} className="flex items-start gap-2 text-[11.5px] leading-[1.45]">
                        <StepIcon state={frame.plan.done[i] ? "done" : "pending"} className="mt-px size-3.5" />
                        <span className={cn("min-w-0", frame.plan.done[i] ? "text-foreground/85" : "text-muted-foreground")}>{p}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}

              {frame.snapshot ? (
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2 py-0.5 text-[11px] text-muted-foreground [animation:pop-in_var(--dur-4)_var(--ease-out)_both]">
                  <History className="size-3 text-signal" aria-hidden="true" />
                  Snapshot saved · restore point
                </p>
              ) : null}

              {frame.writes.length ? (
                <ol className="mt-2">
                  {frame.writes.map((r, i) => (
                    <ToolRow key={r.key} row={r} connector={i < frame.writes.length - 1} />
                  ))}
                </ol>
              ) : null}

              {frame.checks.length ? (
                <ol className="mt-1.5 border-t border-border pt-1.5">
                  {frame.checks.map((r, i) => (
                    <ToolRow key={r.key} row={r} connector={i < frame.checks.length - 1} illustrative={illustrative} />
                  ))}
                </ol>
              ) : null}
            </div>
          ) : null}

          {frame.finished ? (
            <div className="flex gap-2 rounded-[12px] bg-surface px-2.5 py-2 text-[12px] leading-relaxed shadow-[inset_0_0_0_1px_var(--border)] [animation:pop-in_var(--dur-4)_var(--ease-out)_both]">
              <Sparkles className="mt-0.5 size-3.5 shrink-0 text-signal" aria-hidden="true" />
              <span className="text-foreground/90">
                Built from the {scenario.name} starter: {scenario.writes.length} files written, type-check and build passed. A snapshot was saved first, so you can restore it.
              </span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Composer */}
      <div className="shrink-0 border-t border-border p-2.5">
        <div className={cn("relative rounded-[12px] border bg-background/70 px-3 pb-9 pt-2.5 text-[12.5px] leading-relaxed transition-[border-color,box-shadow] duration-(--dur-3)", composing && typed ? "border-border-strong shadow-[0_0_0_3px_color-mix(in_oklab,var(--signal)_12%,transparent)]" : "border-border")}>
          <p className={cn("line-clamp-2 min-h-[2.6em]", composing && typed ? "text-foreground" : "text-muted-foreground")}>
            {composing && typed ? (
              <>
                {typed}
                {typed.length < scenario.prompt.length ? <span className="caret" /> : null}
              </>
            ) : (
              "Ask Codexa to change something…"
            )}
          </p>
          <span
            className={cn(
              "absolute bottom-2 right-2 inline-flex size-6 items-center justify-center rounded-full transition-[background-color,color,scale] duration-(--dur-2)",
              composing && typed.length >= scenario.prompt.length ? "scale-90 bg-signal text-[var(--ember-ink)]" : "bg-muted text-muted-foreground",
            )}
          >
            <ArrowUp className="size-3.5" />
          </span>
          <span className="absolute bottom-2.5 left-3 text-[10.5px] text-muted-foreground">Build mode</span>
        </div>
      </div>
    </div>
  );
}
