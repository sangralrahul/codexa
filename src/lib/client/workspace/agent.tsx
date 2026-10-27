"use client";

import * as React from "react";
import { api } from "@/lib/client/api";
import type { AgentMode, AiStatus, FileChangeStat, RunValidation } from "@/components/ai/types";
import { changedLines, type LineChanges } from "./line-diff";

/**
 * Shared, real-time view of the AI agent for the whole workspace. The chat panel reports
 * what the SSE stream says (run, stage, file_change, done); everything else reads it:
 * the header status pill and timer, the preview beam and "Agent is editing · N files",
 * the explorer flash, the editor's AI dots and gutter marks, the mobile badge.
 * Nothing here is simulated: no event, no state change.
 */
export type AgentFileChange = { path: string; action: "create" | "update" | "delete"; at: number; runId: string | null };

export type AgentRunState = {
  key: string;
  runId: string | null;
  mode: AgentMode;
  status: "running" | "succeeded" | "failed" | "cancelled";
  stage: string;
  stageDetail?: string;
  startedAt: number;
  finishedAt: number | null;
  files: AgentFileChange[];
};

export type RunDetails = {
  stats: FileChangeStat[];
  snapshotBefore: { id: string; name: string; createdAt: string } | null;
};

export type AgentReporter = {
  start: (mode: AgentMode) => void;
  identify: (runId: string) => void;
  stage: (stage: string, detail?: string) => void;
  file: (path: string, action: AgentFileChange["action"]) => void;
  done: (status: AgentRunState["status"], runId: string | null, changed: { path: string; action: string }[], validation?: RunValidation) => void;
};

export type AgentContextValue = {
  projectId: string | null;
  ai: AiStatus | null;
  setAi: (s: AiStatus | null) => void;
  run: AgentRunState | null;
  running: boolean;
  /** Every file the agent touched in this session, newest event wins. */
  touched: Record<string, AgentFileChange>;
  /** Gutter marks for the files of the latest finished run (cleared per file after it is viewed). */
  gutter: Record<string, LineChanges>;
  markViewed: (path: string) => void;
  /** Cached /ai/runs/:id details (diff stats and the pre-run checkpoint). */
  details: Record<string, RunDetails | "loading" | "error">;
  loadDetails: (runId: string, opts?: { force?: boolean }) => Promise<void>;
  /** The checks result of the latest run that ran them (feeds the dock's Problems). */
  validation: (RunValidation & { runId: string | null; at: number }) | null;
  activeFile: string | null;
  setActiveFile: (p: string | null) => void;
  /** Files the agent changed since the preview was last looked at (mobile badge dot). */
  unseen: number;
  markSeen: () => void;
  report: AgentReporter;
};

const noop = () => {};
const NOOP_REPORTER: AgentReporter = { start: noop, identify: noop, stage: noop, file: noop, done: noop };

const AgentContext = React.createContext<AgentContextValue>({
  projectId: null,
  ai: null,
  setAi: noop,
  run: null,
  running: false,
  touched: {},
  gutter: {},
  markViewed: noop,
  details: {},
  loadDetails: async () => {},
  validation: null,
  activeFile: null,
  setActiveFile: noop,
  unseen: 0,
  markSeen: noop,
  report: NOOP_REPORTER,
});

export function useAgent() {
  return React.useContext(AgentContext);
}

type DiffRow = { path: string; action: "create" | "update" | "delete"; before: string | null; after: string | null };

export function AgentProvider({ projectId, children }: { projectId: string; children: React.ReactNode }) {
  const [ai, setAi] = React.useState<AiStatus | null>(null);
  const [run, setRun] = React.useState<AgentRunState | null>(null);
  const [touched, setTouched] = React.useState<Record<string, AgentFileChange>>({});
  const [gutter, setGutter] = React.useState<Record<string, LineChanges>>({});
  const [details, setDetails] = React.useState<AgentContextValue["details"]>({});
  const [activeFile, setActiveFile] = React.useState<string | null>(null);
  const [validation, setValidation] = React.useState<AgentContextValue["validation"]>(null);
  const [unseen, setUnseen] = React.useState(0);
  const runRef = React.useRef<AgentRunState | null>(null);
  const detailsRef = React.useRef(details);
  React.useEffect(() => {
    runRef.current = run;
    detailsRef.current = details;
  }, [run, details]);

  const loadDetails = React.useCallback(
    async (runId: string, opts: { force?: boolean; gutter?: boolean } = {}) => {
      const cur = detailsRef.current[runId];
      if (cur && cur !== "error" && !opts.force) return;
      setDetails((d) => ({ ...d, [runId]: "loading" }));
      try {
        const res = await api<{ stats: FileChangeStat[]; diff: DiffRow[]; snapshotBefore: RunDetails["snapshotBefore"] }>(
          `/api/v1/projects/${encodeURIComponent(projectId)}/ai/runs/${encodeURIComponent(runId)}`,
        );
        setDetails((d) => ({ ...d, [runId]: { stats: res.stats, snapshotBefore: res.snapshotBefore } }));
        if (opts.gutter) {
          const marks: Record<string, LineChanges> = {};
          for (const row of res.diff) {
            if (row.action === "delete") continue;
            const c = changedLines(row.before, row.after);
            if (c.added.length || c.modified.length) marks[row.path] = c;
          }
          setGutter(marks);
        }
      } catch {
        setDetails((d) => ({ ...d, [runId]: "error" }));
      }
    },
    [projectId],
  );

  const report = React.useMemo<AgentReporter>(
    () => ({
      start: (mode) => {
        setRun({ key: `run-${Date.now()}`, runId: null, mode, status: "running", stage: "queued", startedAt: Date.now(), finishedAt: null, files: [] });
      },
      identify: (runId) => setRun((r) => (r ? { ...r, runId } : r)),
      stage: (stage, detail) => setRun((r) => (r ? { ...r, stage, stageDetail: detail } : r)),
      file: (path, action) => {
        const at = Date.now();
        const runId = runRef.current?.runId ?? null;
        setRun((r) => (r ? { ...r, files: [...r.files.filter((f) => f.path !== path), { path, action, at, runId }] } : r));
        setTouched((t) => ({ ...t, [path]: { path, action, at, runId } }));
        setUnseen((n) => n + 1);
      },
      done: (status, runId, changed, v) => {
        setRun((r) => (r ? { ...r, status, runId: runId ?? r.runId, finishedAt: Date.now(), stage: status === "succeeded" ? "done" : status } : r));
        if (v && !v.skipped) setValidation({ ...v, runId, at: Date.now() });
        if (runId && changed.length) void loadDetails(runId, { force: true, gutter: true });
      },
    }),
    [loadDetails],
  );

  const markViewed = React.useCallback((path: string) => {
    setGutter((g) => {
      if (!g[path]) return g;
      const { [path]: _gone, ...rest } = g;
      return rest;
    });
  }, []);

  const value = React.useMemo<AgentContextValue>(
    () => ({
      projectId,
      ai,
      setAi,
      run,
      running: run?.status === "running",
      touched,
      gutter,
      markViewed,
      details,
      loadDetails: (id, opts) => loadDetails(id, opts),
      validation,
      activeFile,
      setActiveFile,
      unseen,
      markSeen: () => setUnseen(0),
      report,
    }),
    [projectId, ai, run, touched, gutter, markViewed, details, loadDetails, validation, activeFile, unseen, report],
  );

  return <AgentContext.Provider value={value}>{children}</AgentContext.Provider>;
}

/** The six stages of the run rail and the server stages that light each one. */
export const RAIL = [
  { id: "context", label: "Context", stages: ["loading_context"], title: "Reading the project" },
  { id: "plan", label: "Plan", stages: ["planning"], title: "Planning" },
  { id: "edit", label: "Edit", stages: ["working", "answering"], title: "Editing" },
  { id: "validate", label: "Validate", stages: ["validating"], title: "Validating" },
  { id: "repair", label: "Repair", stages: ["repairing"], title: "Repairing" },
  { id: "done", label: "Done", stages: ["done"], title: "Done" },
] as const;

export function railIndex(stage: string): number {
  return RAIL.findIndex((r) => (r.stages as readonly string[]).includes(stage));
}
