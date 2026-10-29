"use client";

import * as React from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleSlash,
  FileMinus2,
  FilePen,
  FilePlus2,
  FileSearch,
  FolderTree,
  Hammer,
  Image as ImageIcon,
  Info,
  Loader2,
  Search,
  ShieldCheck,
  TerminalSquare,
  Wand2,
  Wrench,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { emit } from "@/lib/client/events";
import { useCalm } from "@/lib/client/motion";
import { summarizeToolInput } from "@/lib/ai/tools/schemas";
import { RAIL, railIndex } from "@/lib/client/workspace/agent";
import { formatElapsed, useNow } from "@/lib/client/workspace/runtime";
import { LogoMark } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { AiMarkdown } from "./markdown";
import type { FileChangeStat, MessagePart, RunStatus, RunValidation } from "./types";

const STAGE_LABELS: Record<string, string> = {
  queued: "Queued",
  loading_context: "Reading the project",
  planning: "Planning",
  working: "Editing the project",
  answering: "Answering",
  validating: "Validating",
  repairing: "Repairing",
  done: "Done",
  failed: "Failed",
  cancelled: "Cancelled",
};

export function stageLabel(stage: string) {
  return STAGE_LABELS[stage] ?? stage.replace(/_/g, " ");
}

type StagePart = Extract<MessagePart, { type: "stage" }>;
type ToolCallPart = Extract<MessagePart, { type: "tool_call" }>;
type ToolResultPart = Extract<MessagePart, { type: "tool_result" }>;
type FilePart = Extract<MessagePart, { type: "file_change" }>;

/* ---------------------------------------------------------------------------
   Plan
   --------------------------------------------------------------------------- */

/** Plan steps as a numbered checklist. Steps are ticked only once the run has really succeeded. */
export function PlanPart({ steps, done, pending }: { steps: string[]; done: boolean; pending?: boolean }) {
  return (
    <section className="space-y-2" aria-label="Plan">
      <h3 className="text-[13px] font-semibold text-foreground">{pending ? "Proposed plan" : "Plan"}</h3>
      <ol className="space-y-1.5">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-2.5 text-[14px] leading-snug">
            <span
              role="checkbox"
              aria-checked={done}
              aria-readonly="true"
              aria-label={`Step ${i + 1}`}
              className={cn(
                "mt-px inline-flex size-[18px] shrink-0 items-center justify-center rounded-full border font-mono text-[10px] tabular-nums transition-colors duration-300",
                done ? "border-success/50 bg-success/12 text-success" : "border-border-strong text-muted-foreground",
              )}
            >
              {done ? <Check className="check-draw size-3" strokeWidth={3} style={{ ["--check-delay" as string]: `${i * 60}ms` }} aria-hidden="true" /> : i + 1}
            </span>
            <span className={cn("min-w-0", done && "text-muted-foreground")}>{step}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ---------------------------------------------------------------------------
   Stage rail and header
   --------------------------------------------------------------------------- */

type SegState = "done" | "active" | "error" | "cancelled" | "skipped" | "pending";

function railStates(stages: StagePart[], status: RunStatus | undefined, running: boolean): SegState[] {
  const reached = new Set<number>();
  let current = -1;
  for (const s of stages) {
    const i = railIndex(s.stage);
    if (i >= 0) {
      reached.add(i);
      current = i;
    }
  }
  const max = reached.size ? Math.max(...reached) : -1;
  const failed = status === "failed";
  const cancelled = status === "cancelled";
  return RAIL.map((_, i) => {
    if ((failed || cancelled) && i === current && i !== RAIL.length - 1) return failed ? "error" : "cancelled";
    if (running && i === current) return "active";
    if (reached.has(i)) return "done";
    if (i < max) return "skipped";
    return "pending";
  });
}

const SEG_TEXT: Record<SegState, string> = { done: "complete", active: "in progress", error: "failed", cancelled: "cancelled", skipped: "skipped", pending: "not started" };

/** Six segments (context, plan, edit, validate, repair, done) lit only by real stage events. */
export function StageRail({ stages, status, running }: { stages: StagePart[]; status?: RunStatus; running: boolean }) {
  const states = railStates(stages, status, running);
  return (
    <ol className="grid grid-cols-6 gap-1" aria-label="Progress">
      {RAIL.map((seg, i) => (
        <li key={seg.id} className="min-w-0">
          <span className="ws-rail-seg block" data-state={states[i]} aria-hidden="true" />
          <span
            aria-hidden="true"
            className={cn(
              "mt-1 block truncate text-[10.5px] leading-none",
              states[i] === "active" ? "font-medium text-foreground" : states[i] === "done" ? "text-muted-foreground" : states[i] === "error" ? "text-danger" : "text-muted-foreground/60",
            )}
          >
            {seg.label}
          </span>
          <span className="sr-only">
            {seg.title}: {SEG_TEXT[states[i]]}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** Live elapsed timer from the client start time; a fixed duration once finished. */
export function RunTimer({ startedAt, finishedAt, running, className }: { startedAt?: number | null; finishedAt?: number | null; running: boolean; className?: string }) {
  const now = useNow(1000, running && Boolean(startedAt));
  if (!startedAt) return null;
  const end = running ? now : finishedAt;
  if (!end) return null;
  const text = !running && end - startedAt < 1000 ? "<1s" : formatElapsed(end - startedAt);
  return (
    <span className={cn("font-mono text-[11.5px] tabular-nums text-muted-foreground", className)} aria-label={running ? `Elapsed ${text}` : `Took ${text}`}>
      {text}
    </span>
  );
}

/* ---------------------------------------------------------------------------
   Tools
   --------------------------------------------------------------------------- */

/** Icon for a tool by name, so a run reads as a timeline of actions. */
function toolIcon(name: string): LucideIcon {
  if (/^(read|get|open)_?file/.test(name)) return FileSearch;
  if (/^(write|edit|update|create)_?file/.test(name)) return FilePen;
  if (/^(delete|remove)_?file/.test(name)) return FileMinus2;
  if (/^(list|tree)/.test(name)) return FolderTree;
  if (/image/.test(name)) return ImageIcon;
  if (/search|grep|find/.test(name)) return Search;
  if (/run|command|exec|typecheck|build|test/.test(name)) return TerminalSquare;
  return Wrench;
}

/** A tool call and its result, collapsed by default. */
export function ToolCallRow({ call, result }: { call: ToolCallPart; result?: ToolResultPart }) {
  const summary = summarizeToolInput(call.name, call.input);
  const pending = !result;
  return (
    <details className="group rounded-lg text-xs">
      <summary className="flex h-7 cursor-pointer list-none items-center gap-2 rounded-lg px-2 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
        {React.createElement(toolIcon(call.name), { className: "size-3.5 shrink-0 text-muted-foreground", "aria-hidden": true })}
        <code className="shrink-0 font-mono text-[11.5px] font-medium">{call.name}</code>
        <span className="min-w-0 truncate font-mono text-[11px] text-muted-foreground">{summary}</span>
        <span className="ml-auto flex shrink-0 items-center gap-1.5">
          {pending ? (
            <Loader2 className="size-3.5 animate-spin text-muted-foreground" aria-label="Running" />
          ) : result.isError ? (
            <XCircle className="size-3.5 text-danger" aria-label="Failed" />
          ) : (
            <CheckCircle2 className="size-3.5 text-success" aria-label="Succeeded" />
          )}
          <ChevronRight className="size-3 text-muted-foreground transition-transform group-open:rotate-90" aria-hidden="true" />
        </span>
      </summary>
      <div className="mx-2 mb-1.5 mt-1 space-y-2 border-l border-border pl-3">
        <div>
          <p className="mb-1 text-[11px] font-medium text-muted-foreground">Input</p>
          <pre className="max-h-48 overflow-auto rounded-md bg-muted p-2 font-mono text-[11px] leading-snug">{formatInput(call.input)}</pre>
        </div>
        {result ? (
          <div>
            <p className="mb-1 text-[11px] font-medium text-muted-foreground">{result.isError ? "Error" : "Output"}</p>
            <pre className={cn("max-h-48 overflow-auto rounded-md p-2 font-mono text-[11px] leading-snug", result.isError ? "bg-danger/5 text-danger" : "bg-muted")}>{result.output}</pre>
          </div>
        ) : null}
      </div>
    </details>
  );
}

function formatInput(input: unknown) {
  if (input && typeof input === "object") {
    const entries = Object.entries(input as Record<string, unknown>);
    return entries.map(([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v, null, 1)}`).join("\n");
  }
  return String(input ?? "");
}

/** "Ran 14 actions" with per-tool icons; expands to every call and its output. */
export function ActionsSummary({ calls, results, running }: { calls: ToolCallPart[]; results: Map<string, ToolResultPart>; running: boolean }) {
  if (!calls.length) return null;
  const pending = calls.filter((c) => !results.has(c.id));
  const failed = calls.filter((c) => results.get(c.id)?.isError).length;
  const icons = [...new Set(calls.map((c) => toolIcon(c.name)))].slice(0, 5);
  const live = running ? pending[pending.length - 1] : undefined;
  return (
    <details className="group rounded-xl border border-border bg-surface/50">
      <summary className="flex h-9 cursor-pointer list-none items-center gap-2 rounded-xl px-2.5 text-[12.5px] transition-colors hover:bg-muted/60 focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
        <span className="flex -space-x-1" aria-hidden="true">
          {icons.map((Icon, i) => (
            <span key={i} className="flex size-5 items-center justify-center rounded-md border border-border bg-card text-muted-foreground">
              <Icon className="size-3" />
            </span>
          ))}
        </span>
        <span className="shrink-0 whitespace-nowrap font-medium">
          Ran {calls.length} action{calls.length === 1 ? "" : "s"}
        </span>
        {failed ? <span className="shrink-0 whitespace-nowrap text-danger">· {failed} failed</span> : null}
        {live ? (
          <span className="min-w-0 truncate font-mono text-[11px] text-muted-foreground">
            · {live.name} {summarizeToolInput(live.name, live.input)}
          </span>
        ) : null}
        <span className="ml-auto flex items-center gap-1.5">
          {running && pending.length ? <Loader2 className="size-3.5 animate-spin text-muted-foreground" aria-label="Running" /> : null}
          <ChevronRight className="size-3.5 text-muted-foreground transition-transform group-open:rotate-90" aria-hidden="true" />
        </span>
      </summary>
      <div className="border-t border-border p-1" aria-label="Agent actions">
        {calls.map((c) => (
          <ToolCallRow key={c.id} call={c} result={results.get(c.id)} />
        ))}
      </div>
    </details>
  );
}

/* ---------------------------------------------------------------------------
   Files
   --------------------------------------------------------------------------- */

const ACTION_META = {
  create: { letter: "A", label: "Created", tone: "text-success bg-success/10", Icon: FilePlus2 },
  update: { letter: "M", label: "Updated", tone: "text-warning bg-warning/10", Icon: FilePen },
  delete: { letter: "D", label: "Deleted", tone: "text-danger bg-danger/10", Icon: FileMinus2 },
} as const;

/** File change chip; clicking opens the file in the editor via the cross-panel event bus. */
export function FileChangeChip({ path, action, summary }: { path: string; action: "create" | "update" | "delete"; summary?: string }) {
  const meta = ACTION_META[action];
  return (
    <button
      type="button"
      onClick={() => emit("codexa:open-file", { path })}
      disabled={action === "delete"}
      title={action === "delete" ? `${meta.label} ${path}` : `Open ${path}`}
      className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 font-mono text-[11px] transition-colors hover:border-border-strong hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-default disabled:opacity-70"
    >
      <meta.Icon className={cn("size-3 shrink-0", meta.tone.split(" ")[0])} aria-hidden="true" />
      <span className="sr-only">{meta.label} </span>
      <span className="truncate">{path}</span>
      {summary ? <span className="text-muted-foreground">· {summary}</span> : null}
    </button>
  );
}

/** "Writing files": each real file_change slides in (M10); the newest row carries the caret while live. */
export function WritingFiles({ files, running, stats }: { files: FilePart[]; running: boolean; stats?: FileChangeStat[] }) {
  if (!files.length) return null;
  const byPath = new Map<string, FilePart>();
  for (const f of files) byPath.set(f.path, f);
  const rows = [...byPath.values()];
  const statOf = new Map((stats ?? []).map((s) => [s.path, s]));
  return (
    <section aria-label={running ? "Writing files" : "Files changed"} className="space-y-1.5">
      <h3 className="flex items-center gap-2 text-[13px] font-semibold">
        {running ? "Writing files" : "Files changed"}
        <span className="rounded-full bg-muted px-1.5 font-mono text-[10.5px] font-medium tabular-nums text-muted-foreground">{rows.length}</span>
      </h3>
      <ul className="overflow-hidden rounded-xl border border-border">
        {rows.map((f, i) => {
          const meta = ACTION_META[f.action];
          const stat = statOf.get(f.path);
          const newest = running && i === rows.length - 1;
          return (
            <li key={f.path} className="materialize border-b border-border last:border-b-0" style={{ ["--materialize-delay" as string]: `${Math.min(i, 8) * 30}ms` }}>
              <div>
                <button
                  type="button"
                  onClick={() => emit("codexa:open-file", { path: f.path })}
                  disabled={f.action === "delete"}
                  title={f.action === "delete" ? `${meta.label} ${f.path}` : `Open ${f.path}`}
                  className="materialize__sweep group flex h-8 w-full items-center gap-2 px-2.5 text-left transition-colors hover:bg-muted/70 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring disabled:cursor-default"
                >
                  <span className={cn("materialize__icon inline-flex size-[18px] shrink-0 items-center justify-center rounded-[5px] font-mono text-[10px] font-semibold", meta.tone)} aria-hidden="true">
                    {meta.letter}
                  </span>
                  <span className="sr-only">{meta.label} </span>
                  <span className={cn("min-w-0 truncate font-mono text-[12px]", f.action === "delete" && "text-muted-foreground line-through", newest && "ws-write-caret")}>{f.path}</span>
                  {stat ? (
                    <span className="ml-auto shrink-0 font-mono text-[11px] tabular-nums">
                      <span className="text-success">+{stat.added}</span> <span className="text-danger">−{stat.removed}</span>
                    </span>
                  ) : f.summary ? (
                    <span className="ml-auto shrink-0 truncate text-[11px] text-muted-foreground">{f.summary}</span>
                  ) : null}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ---------------------------------------------------------------------------
   Checks
   --------------------------------------------------------------------------- */

/** Validation as the agent reported it, or as recorded in the persisted run (for older messages). */
export function deriveValidation(parts: MessagePart[], runError?: string | null): RunValidation | undefined {
  if (runError && /^Validation \(/.test(runError)) {
    const m = runError.match(/^Validation \(([^)]+)\)[^\n]*\n?([\s\S]*)$/);
    return { ok: false, command: m?.[1], output: m?.[2]?.trim() || undefined };
  }
  const v = [...parts].reverse().find((p): p is StagePart => p.type === "stage" && p.stage === "validating" && Boolean(p.detail) && !/^Re-running/.test(p.detail ?? ""));
  if (!v?.detail) return undefined;
  const passed = v.detail.match(/^(\S+) passed$/);
  if (passed) return { ok: true, command: passed[1] };
  return { ok: true, skipped: v.detail };
}

/** The Checks block: typecheck passed, skipped (with the reason), or failed with output and "Fix with AI". */
export function ChecksBlock({ validation, onFix }: { validation: RunValidation; onFix?: (v: RunValidation) => void }) {
  if (validation.skipped) {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-border bg-surface/50 px-3 py-2 text-[12.5px] text-muted-foreground" role="note">
        <CircleSlash className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        <span>
          <span className="font-medium text-foreground">Checks skipped.</span> {validation.skipped}
        </span>
      </div>
    );
  }
  if (validation.ok) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-success/25 bg-success/[0.06] px-3 py-2 text-[12.5px]">
        <ShieldCheck className="size-3.5 shrink-0 text-success" aria-hidden="true" />
        <span>
          <code className="font-mono font-medium">{validation.command ?? "check"}</code> passed
        </span>
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-xl border border-danger/30 bg-danger/[0.05]" role="group" aria-label="Checks failed">
      <div className="flex items-center gap-2 px-3 py-2 text-[12.5px]">
        <XCircle className="size-3.5 shrink-0 text-danger" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <code className="font-mono font-medium">{validation.command ?? "check"}</code> failed
        </span>
        {onFix ? (
          <button
            type="button"
            onClick={() => onFix(validation)}
            className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-lg bg-foreground px-2.5 text-[12px] font-medium text-background transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Wand2 className="size-3.5" aria-hidden="true" /> Fix with AI
          </button>
        ) : null}
      </div>
      {validation.output ? (
        <details className="group border-t border-danger/20">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 px-3 py-1.5 text-[12px] text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
            <ChevronRight className="size-3 transition-transform group-open:rotate-90" aria-hidden="true" /> Output
          </summary>
          <pre className="max-h-56 overflow-auto bg-code-bg px-3 py-2 font-mono text-[11px] leading-5 text-code-fg">{validation.output}</pre>
        </details>
      ) : null}
    </div>
  );
}

export function ErrorPart({ message }: { message: string }) {
  return (
    <div role="alert" className="flex items-start gap-2 rounded-xl border border-danger/35 bg-danger/[0.06] p-2.5 text-[13px] text-foreground">
      <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-danger" aria-hidden="true" />
      <span className="whitespace-pre-wrap break-words">{message}</span>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   The Agent Run card
   --------------------------------------------------------------------------- */

export type RunCardMeta = {
  /** Client start time for live runs, or the server createdAt for persisted ones (ms). */
  startedAt?: number | null;
  finishedAt?: number | null;
  /** Finished during this session (plays the success/error settle once). */
  live?: boolean;
  validation?: RunValidation;
  runError?: string | null;
  stats?: FileChangeStat[];
  onFix?: (v: RunValidation) => void;
  /** Plan mode: build the proposed plan (shown only on the latest finished plan). */
  onApprovePlan?: (steps: string[]) => void;
  /** Plan mode: ask for changes to the plan instead. */
  onRevisePlan?: () => void;
};

/**
 * Render an assistant message: the run card (header with the mark and live stage, the six-segment
 * rail, the plan, the files being written, the collapsed actions and the checks), then the agent's
 * own words and any errors in order. Everything shown comes from real SSE / persisted parts.
 */
export function AssistantParts({ parts, status, streaming, meta = {} }: { parts: MessagePart[]; status?: RunStatus; streaming?: boolean; meta?: RunCardMeta }) {
  const calm = useCalm();
  const running = Boolean(streaming) || status === "running" || status === "queued";
  const done = status === "succeeded";

  const stages: StagePart[] = [];
  const calls: ToolCallPart[] = [];
  const results = new Map<string, ToolResultPart>();
  const files: FilePart[] = [];
  let plan: string[] | null = null;
  let planPending = false;
  for (const p of parts) {
    if (p.type === "stage") stages.push(p);
    else if (p.type === "tool_call") calls.push(p);
    else if (p.type === "tool_result") results.set(p.id, p);
    else if (p.type === "file_change") files.push(p);
    else if (p.type === "plan") {
      plan = p.steps;
      planPending = p.approval === "pending";
    }
  }
  const isRun = stages.length > 0 || calls.length > 0 || files.length > 0 || plan !== null || running;
  const last = stages[stages.length - 1];
  const stage = status === "failed" ? "failed" : status === "cancelled" ? "cancelled" : status === "succeeded" ? "done" : (last?.stage ?? "queued");
  const rawDetail = status === "succeeded" ? (last?.stage === "done" ? last.detail : undefined) : running ? last?.detail : undefined;
  const detail = rawDetail && rawDetail.trim().toLowerCase() !== stageLabel(stage).toLowerCase() ? rawDetail : undefined;
  const validation = meta.validation ?? (running ? undefined : deriveValidation(parts, meta.runError));

  const logoState = running ? (calm ? "idle" : "running") : meta.live ? (status === "succeeded" ? "success" : status === "failed" ? "error" : "idle") : "idle";

  // Text and errors keep their order; a streaming message ends with the caret.
  const prose: React.ReactNode[] = [];
  let lastTextIndex = -1;
  parts.forEach((p, i) => {
    if (p.type === "text" && p.text.trim()) lastTextIndex = i;
  });
  parts.forEach((p, i) => {
    if (p.type === "text" && p.text.trim()) prose.push(<AiMarkdown key={i} text={p.text} className={cn(streaming && i === lastTextIndex && "ws-streaming-text")} />);
    else if (p.type === "error") prose.push(<ErrorPart key={i} message={p.message} />);
  });

  return (
    <div className="space-y-3">
      {isRun ? (
        <div className="space-y-3 rounded-2xl border border-border bg-card p-3 shadow-[inset_0_1px_0_var(--hairline)]">
          <div className="flex items-start gap-3">
            <span className="ws-orb mt-0.5 rounded-lg" data-running={running && !calm ? "" : undefined}>
              <LogoMark size={22} state={logoState} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-[14px] font-semibold leading-tight">
                <span key={stage} className={cn("stage-swap truncate", running && "text-shimmer", status === "failed" && "text-danger", status === "cancelled" && "text-warning")}>
                  {stageLabel(stage)}
                </span>
                {status === "succeeded" ? <CheckCircle2 className="size-3.5 shrink-0 text-success" aria-hidden="true" /> : null}
              </p>
              {detail ? <p className="mt-0.5 truncate text-[12px] text-muted-foreground" title={detail}>{detail}</p> : null}
            </div>
            <RunTimer startedAt={meta.startedAt} finishedAt={meta.finishedAt} running={running} className="mt-0.5 shrink-0" />
          </div>
          <StageRail stages={stages} status={status} running={running} />
          {plan ? <PlanPart steps={plan} done={done && !planPending} pending={planPending} /> : null}
          {plan && planPending && done && meta.onApprovePlan ? (
            <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
              <Button size="sm" appearance="app" onClick={() => meta.onApprovePlan?.(plan ?? [])}>
                <Hammer className="size-3.5" aria-hidden="true" /> Approve and build
              </Button>
              {meta.onRevisePlan ? (
                <Button size="sm" variant="outline" appearance="app" onClick={meta.onRevisePlan}>
                  Change the plan
                </Button>
              ) : null}
            </div>
          ) : null}
          <WritingFiles files={files} running={running} stats={meta.stats} />
          <ActionsSummary calls={calls} results={results} running={running} />
          {validation ? <ChecksBlock validation={validation} onFix={meta.onFix} /> : null}
        </div>
      ) : null}
      {prose.length ? <div className="space-y-2.5">{prose}</div> : null}
      {!isRun && !prose.length && running ? (
        <p className="flex items-center gap-2 text-[13px] text-muted-foreground">
          <Info className="size-3.5" aria-hidden="true" /> Starting…
        </p>
      ) : null}
    </div>
  );
}
