"use client";

import { CircleAlert, FlaskConical, GitBranch, Sparkles, TriangleAlert, Users } from "lucide-react";
import { useRuntime, useNow, formatUptime } from "@/lib/client/workspace/runtime";
import { useAgent } from "@/lib/client/workspace/agent";
import type { Problem } from "@/lib/client/workspace/problems";
import { StatusDot } from "@/components/ui/misc";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar } from "@/components/ui/avatar";
import { languageLabel } from "@/components/editor/language";
import { cn } from "@/lib/utils";
import { usePeers } from "./presence";

const item =
  "inline-flex h-full shrink-0 items-center gap-1.5 rounded-md px-2 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring";

/**
 * The 26px status bar. Every item is real state and opens the panel it describes:
 * runtime → preview, branch → GitHub, problems → dock, Ln/Col → go to line,
 * language → commands, model → the agent, presence → who is here.
 */
export function StatusBar({
  branch,
  problems,
  cursor,
  language,
  onOpenPreview,
  onOpenGithub,
  onOpenProblems,
  onGoToLine,
  onOpenCommands,
  onOpenAgent,
}: {
  branch: string | null;
  problems: Problem[];
  cursor: { line: number; column: number } | null;
  language: string | null;
  onOpenPreview: () => void;
  onOpenGithub: () => void;
  onOpenProblems: () => void;
  onGoToLine: () => void;
  onOpenCommands: () => void;
  onOpenAgent: () => void;
}) {
  const rt = useRuntime();
  const agent = useAgent();
  const { connected, others, self } = usePeers();
  const running = rt.status === "running";
  const startedAt = rt.session?.startedAt ? Date.parse(rt.session.startedAt) : null;
  const now = useNow(30_000, running && Boolean(startedAt));
  const errors = problems.filter((p) => p.severity === "error").length;
  const warnings = problems.length - errors;

  const runtimeLabel =
    rt.status === "running"
      ? `Running${startedAt ? ` · ${formatUptime(now - startedAt)}` : ""}`
      : rt.status === "starting"
        ? "Starting…"
        : rt.status === "error"
          ? "Preview error"
          : rt.status === "unavailable"
            ? rt.configured
              ? "Preview unavailable"
              : "Previews not configured"
            : rt.status === "unknown"
              ? "Checking…"
              : "Stopped";
  const dot = rt.status === "running" ? "ok" : rt.status === "starting" ? "busy" : rt.status === "error" ? "error" : rt.status === "unavailable" ? "warn" : "idle";

  return (
    <footer className="flex h-[26px] shrink-0 items-stretch gap-0.5 px-1.5 text-[11.5px] text-muted-foreground" aria-label="Status bar">
      <button type="button" onClick={onOpenPreview} className={item} title="Open the preview">
        <StatusDot status={dot} pulse={running} />
        <span className="tabular-nums">{runtimeLabel}</span>
      </button>
      {branch ? (
        <button type="button" onClick={onOpenGithub} className={item} title="GitHub">
          <GitBranch className="size-3.5" aria-hidden="true" />
          <span className="max-w-[10rem] truncate font-mono">{branch}</span>
        </button>
      ) : null}
      <button type="button" onClick={onOpenProblems} className={item} title="Open problems">
        <CircleAlert className={cn("size-3.5", errors && "text-danger")} aria-hidden="true" />
        <span className={cn("font-mono tabular-nums", errors && "text-danger")}>{errors}</span>
        <span className="sr-only"> error{errors === 1 ? "" : "s"},</span>
        <TriangleAlert className={cn("ml-1 size-3.5", warnings && "text-warning")} aria-hidden="true" />
        <span className={cn("font-mono tabular-nums", warnings && "text-warning")}>{warnings}</span>
        <span className="sr-only"> warning{warnings === 1 ? "" : "s"}</span>
      </button>

      <div className="ml-auto flex items-stretch gap-0.5">
        {cursor ? (
          <button type="button" onClick={onGoToLine} className={cn(item, "hidden sm:inline-flex")} title="Go to line">
            <span className="font-mono tabular-nums">
              Ln {cursor.line}, Col {cursor.column}
            </span>
          </button>
        ) : null}
        {language ? (
          <button type="button" onClick={onOpenCommands} className={cn(item, "hidden sm:inline-flex")} title="Commands">
            {languageLabel(language)}
          </button>
        ) : null}
        <button type="button" onClick={onOpenAgent} className={item} title={agent.ai ? `AI provider: ${agent.ai.provider}` : "AI agent"}>
          {agent.ai?.mock ? (
            <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 font-medium text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)]" title="AI_MOCK=1 is set: responses are scripted. Development only.">
              <FlaskConical className="size-3" aria-hidden="true" /> Mock AI
            </span>
          ) : agent.ai?.configured ? (
            <>
              <Sparkles className={cn("size-3.5", agent.running && "text-primary")} aria-hidden="true" />
              <span className="max-w-[12rem] truncate font-mono">{agent.ai.model}</span>
            </>
          ) : agent.ai ? (
            <>
              <Sparkles className="size-3.5" aria-hidden="true" /> AI not configured
            </>
          ) : null}
        </button>
        {connected ? (
          <Popover>
            <PopoverTrigger asChild>
              <button type="button" className={item} aria-label={`${others.length + 1} ${others.length ? "people" : "person"} in this project`}>
                <Users className="size-3.5" aria-hidden="true" />
                <span className="font-mono tabular-nums">{others.length + 1}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent side="top" align="end" className="w-64 p-2">
              <p className="px-1.5 pb-1.5 text-[12px] font-medium text-muted-foreground">In this project now</p>
              <ul className="space-y-0.5">
                {self ? (
                  <li className="flex items-center gap-2 rounded-lg px-1.5 py-1 text-[13px]">
                    <Avatar name={self.name} seed={self.userId} size="sm" presence="online" />
                    <span className="truncate">{self.name}</span>
                    <span className="ml-auto text-[11px] text-muted-foreground">you</span>
                  </li>
                ) : null}
                {others.map((p) => (
                  <li key={p.id} className="flex items-center gap-2 rounded-lg px-1.5 py-1 text-[13px]">
                    <Avatar name={p.name} seed={p.userId} size="sm" presence="online" />
                    <span className="min-w-0 truncate">{p.name}</span>
                    {p.activeFile ? <span className="ml-auto max-w-[45%] truncate font-mono text-[10.5px] text-muted-foreground">{p.activeFile}</span> : null}
                  </li>
                ))}
              </ul>
            </PopoverContent>
          </Popover>
        ) : null}
      </div>
    </footer>
  );
}
