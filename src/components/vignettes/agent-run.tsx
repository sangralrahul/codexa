"use client";

import * as React from "react";
import { RotateCcw, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoMark } from "@/components/logo";
import { useTypewriter } from "@/components/motion/timeline";
import { StepRow, type StepState } from "./step-row";
import { useScript } from "./use-script";

export type AgentStep = { tool: string; target?: string; result?: string };

const DEFAULT_PROMPT = "Add an invoices table with GST totals and a paid / unpaid filter.";
// Real agent tool names (src/lib/ai/tools/schemas.ts) and stage labels (message-parts.tsx).
const DEFAULT_STEPS: AgentStep[] = [
  { tool: "list_files", result: "12 files" },
  { tool: "read_file", target: "src/App.tsx" },
  { tool: "propose_plan", result: "3 steps" },
  { tool: "write_file", target: "src/components/InvoiceTable.tsx", result: "+48" },
  { tool: "edit_file", target: "src/App.tsx", result: "+6 −2" },
  { tool: "run_command", target: "typecheck", result: "0 errors" },
];
const STAGES = ["Reading the project", "Reading the project", "Planning", "Editing the project", "Editing the project", "Validating"];
const TYPE_MS = 1700;
const STEP_MS = 560;

/**
 * Agent run card (M8): the prompt types in, tool rows tick, the run ends with a summary.
 * A scripted replay with the real tool and stage names; label it with an IllustrationBadge.
 * Interactive: "Run again" replays it. Final frame on the server and when calm.
 */
export function AgentRun({
  playing,
  className,
  prompt = DEFAULT_PROMPT,
  steps = DEFAULT_STEPS,
  summary = "Added the invoices table, GST totals and the filter. A snapshot was saved first, so you can restore it.",
}: {
  playing?: boolean;
  className?: string;
  prompt?: string;
  steps?: AgentStep[];
  summary?: string;
}) {
  // Cue 0: typing; cue i+1: step i starts; last cue: done.
  const schedule = React.useMemo(() => [0, ...steps.map((_, i) => TYPE_MS + i * STEP_MS), TYPE_MS + steps.length * STEP_MS], [steps]);
  const { ref, index, done, started, calm, playing: live, restart } = useScript(schedule, TYPE_MS + steps.length * STEP_MS + 400, playing);
  const [run, setRun] = React.useState(0);
  const typed = useTypewriter(prompt, { playing: started && live, cps: 46, complete: !started || calm || index > 0, restartKey: run });
  const stepState = (i: number): StepState | null => (index < i + 1 ? null : index === i + 1 ? "active" : "done");
  const current = done ? "Done" : index >= 1 ? STAGES[Math.min(STAGES.length - 1, index - 1)] : "Ready";

  return (
    <div ref={ref} className={cn("relative flex w-full min-w-0 flex-col gap-3 text-[13px] [contain:inline-size]", className)}>
      <div aria-hidden="true" className="space-y-3">
        <div className="ml-8 rounded-2xl rounded-tr-md bg-muted px-3.5 py-2.5 leading-relaxed text-foreground shadow-[inset_0_0_0_1px_var(--border)]">
          {typed}
          {started && !calm && index === 0 ? <span className="caret" /> : null}
        </div>
        <div className="rounded-xl border border-border bg-card/90 p-3 shadow-sm">
          <div className="mb-1.5 flex items-center gap-2">
            <LogoMark size={16} state={done ? "idle" : index >= 1 ? "running" : "idle"} />
            <span className="font-medium">Agent</span>
            <span className={cn("truncate text-[12px]", !done && index >= 1 ? "text-shimmer" : "text-muted-foreground")}>{current}</span>
            <span className="ml-auto rounded-md bg-muted px-1.5 py-0.5 text-[10.5px] font-medium text-muted-foreground">Build</span>
          </div>
          <ol>
            {steps.map((step, i) => {
              const st = stepState(i);
              if (!st) return null;
              return (
                <StepRow
                  key={`${step.tool}-${i}`}
                  state={st}
                  mono
                  connector={i < steps.length - 1 && (stepState(i + 1) ?? null) !== null}
                  label={
                    <>
                      <span className="text-foreground">{step.tool}</span>
                      {step.target ? <span className="text-muted-foreground"> {step.target}</span> : null}
                    </>
                  }
                  detail={st === "done" && step.result ? step.result : undefined}
                />
              );
            })}
          </ol>
        </div>
        {done ? (
          <div className="pop-in flex gap-2 rounded-xl bg-surface px-3 py-2.5 leading-relaxed shadow-[inset_0_0_0_1px_var(--border)]">
            <Sparkles className="mt-0.5 size-3.5 shrink-0 text-signal" />
            <span className="text-foreground/90">{summary}</span>
          </div>
        ) : null}
      </div>
      {done && !calm ? (
        <button
          type="button"
          onClick={() => {
            setRun((r) => r + 1);
            restart();
          }}
          aria-label="Replay the agent run illustration"
          className="pop-in inline-flex h-7 items-center gap-1.5 self-start rounded-full border border-border bg-background/70 px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
        >
          <RotateCcw className="size-3" aria-hidden="true" /> Run again
        </button>
      ) : null}
    </div>
  );
}
