"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, ChevronRight, FileMinus2, FilePen, FilePlus2, FileSearch, FolderTree, ListChecks, Loader2, Search, TerminalSquare, Wrench, XCircle, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { emit } from "@/lib/client/events";
import { summarizeToolInput } from "@/lib/ai/tools/schemas";
import { AiMarkdown } from "./markdown";
import type { MessagePart, RunStatus } from "./types";

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

/** Plan steps as a checklist. Steps are ticked once the run has finished successfully. */
export function PlanPart({ steps, done }: { steps: string[]; done: boolean }) {
  return (
    <section className="rounded-lg border border-border bg-surface p-3" aria-label="Plan">
      <h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        <ListChecks className="size-3.5" aria-hidden="true" /> Plan
      </h4>
      <ol className="space-y-1.5">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <span
              role="checkbox"
              aria-checked={done}
              aria-readonly="true"
              className={cn("mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded border", done ? "border-success bg-success/10 text-success" : "border-border-strong text-transparent")}
            >
              <CheckCircle2 className="size-3" aria-hidden="true" />
            </span>
            <span className={cn(done && "text-muted-foreground")}>{step}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Stages as a compact vertical timeline. */
export function StageTimeline({ stages, running }: { stages: { stage: string; detail?: string }[]; running: boolean }) {
  if (!stages.length) return null;
  return (
    <ol className="relative ml-1.5 space-y-1 border-l border-border pl-3 text-xs" aria-label="Progress">
      {stages.map((s, i) => {
        const last = i === stages.length - 1;
        const failed = s.stage === "failed";
        const cancelled = s.stage === "cancelled";
        return (
          <li key={i} className="relative">
            <span
              aria-hidden="true"
              className={cn(
                "absolute -left-[17px] top-1 size-2 rounded-full",
                failed ? "bg-danger" : cancelled ? "bg-warning" : last && running ? "bg-signal animate-pulse" : "bg-success",
              )}
            />
            <span className={cn("font-medium", failed && "text-danger", cancelled && "text-warning")}>{stageLabel(s.stage)}</span>
            {last && running ? <Loader2 className="ml-1 inline size-3 animate-spin text-muted-foreground" aria-label="In progress" /> : null}
            {s.detail ? <span className="ml-1 text-muted-foreground">— {s.detail}</span> : null}
          </li>
        );
      })}
    </ol>
  );
}

/** Icon for a tool by name, so a run reads as a timeline of actions. */
function toolIcon(name: string): LucideIcon {
  if (/^(read|get|open)_?file/.test(name)) return FileSearch;
  if (/^(write|edit|update|create)_?file/.test(name)) return FilePen;
  if (/^(delete|remove)_?file/.test(name)) return FileMinus2;
  if (/^(list|tree)/.test(name)) return FolderTree;
  if (/search|grep|find/.test(name)) return Search;
  if (/run|command|exec|typecheck|build|test/.test(name)) return TerminalSquare;
  return Wrench;
}

/** A tool call and its result, collapsed by default. */
export function ToolCallRow({ call, result }: { call: Extract<MessagePart, { type: "tool_call" }>; result?: Extract<MessagePart, { type: "tool_result" }> }) {
  const summary = summarizeToolInput(call.name, call.input);
  const pending = !result;
  return (
    <details className="group rounded-md text-xs">
      <summary className="flex h-7 cursor-pointer list-none items-center gap-2 rounded-md px-2 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
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

/** File change chip; clicking opens the file in the editor via the cross-panel event bus. */
export function FileChangeChip({ path, action, summary }: { path: string; action: "create" | "update" | "delete"; summary?: string }) {
  const Icon = action === "create" ? FilePlus2 : action === "delete" ? FileMinus2 : FilePen;
  const tone = action === "create" ? "text-success" : action === "delete" ? "text-danger" : "text-primary";
  const label = action === "create" ? "Created" : action === "delete" ? "Deleted" : "Updated";
  return (
    <button
      type="button"
      onClick={() => emit("codexa:open-file", { path })}
      disabled={action === "delete"}
      title={action === "delete" ? `${label} ${path}` : `Open ${path}`}
      className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 font-mono text-[11px] transition-colors hover:border-border-strong hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-default disabled:opacity-70"
    >
      <Icon className={cn("size-3 shrink-0", tone)} aria-hidden="true" />
      <span className="sr-only">{label} </span>
      <span className="truncate">{path}</span>
      {summary ? <span className="text-muted-foreground">· {summary}</span> : null}
    </button>
  );
}

export function ErrorPart({ message }: { message: string }) {
  return (
    <div role="alert" className="flex items-start gap-2 rounded-lg border border-danger/40 bg-danger/5 p-2.5 text-xs text-foreground">
      <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-danger" aria-hidden="true" />
      <span className="whitespace-pre-wrap break-words">{message}</span>
    </div>
  );
}

/**
 * Render an assistant message's parts in order, grouping consecutive stages
 * into one timeline and consecutive file changes into one chip row.
 */
export function AssistantParts({ parts, status, streaming }: { parts: MessagePart[]; status?: RunStatus; streaming?: boolean }) {
  const resultsById = React.useMemo(() => {
    const m = new Map<string, Extract<MessagePart, { type: "tool_result" }>>();
    for (const p of parts) if (p.type === "tool_result") m.set(p.id, p);
    return m;
  }, [parts]);
  const done = status === "succeeded";
  const running = Boolean(streaming) || status === "running" || status === "queued";

  const blocks: React.ReactNode[] = [];
  let stages: { stage: string; detail?: string }[] = [];
  let files: Extract<MessagePart, { type: "file_change" }>[] = [];
  let tools: React.ReactNode[] = [];
  const flushTools = (key: string) => {
    if (tools.length)
      blocks.push(
        <div key={key} className="rounded-lg border border-border bg-surface/60 p-1" aria-label="Agent actions">
          {tools}
        </div>,
      );
    tools = [];
  };
  const flushStages = (key: string) => {
    if (stages.length) blocks.push(<StageTimeline key={key} stages={stages} running={false} />);
    stages = [];
  };
  const flushFiles = (key: string) => {
    if (files.length)
      blocks.push(
        <div key={key} className="flex flex-wrap gap-1.5">
          {files.map((f, i) => (
            <FileChangeChip key={`${f.path}-${i}`} path={f.path} action={f.action} summary={f.summary} />
          ))}
        </div>,
      );
    files = [];
  };

  parts.forEach((p, i) => {
    if (p.type === "tool_result") return; // rendered inside its tool call row
    if (p.type === "tool_call") {
      flushStages(`s${i}`);
      flushFiles(`f${i}`);
      tools.push(<ToolCallRow key={i} call={p} result={resultsById.get(p.id)} />);
      return;
    }
    flushTools(`t${i}`);
    if (p.type === "stage") {
      flushFiles(`f${i}`);
      stages.push({ stage: p.stage, detail: p.detail });
      return;
    }
    if (p.type === "file_change") {
      flushStages(`s${i}`);
      files.push(p);
      return;
    }
    flushStages(`s${i}`);
    flushFiles(`f${i}`);
    switch (p.type) {
      case "text":
        if (p.text.trim()) blocks.push(<AiMarkdown key={i} text={p.text} />);
        break;
      case "plan":
        blocks.push(<PlanPart key={i} steps={p.steps} done={done} />);
        break;
      case "error":
        blocks.push(<ErrorPart key={i} message={p.message} />);
        break;
    }
  });
  flushTools("t-tail");
  // The trailing stage group is the live one while streaming.
  if (stages.length) blocks.push(<StageTimeline key="s-tail" stages={stages} running={running} />);
  flushFiles("f-tail");

  return <div className="space-y-2.5">{blocks}</div>;
}
