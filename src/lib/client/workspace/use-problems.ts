"use client";

import { useEffect, useMemo, useState } from "react";
import { useAgent } from "./agent";
import { parseProblems, type Problem } from "./problems";
import { useLogSnapshot, type LogStore } from "./runtime";

/**
 * Problems = what the dev server printed to stderr (parsed into file:line when it can be)
 * plus the failed checks of the latest AI run. Re-parsed at most every 300ms.
 */
export function useProblems(store: LogStore, files: { path: string }[]): Problem[] {
  const snap = useLogSnapshot(store);
  const { validation } = useAgent();
  const known = useMemo(() => new Set(files.map((f) => f.path)), [files]);
  const [runtime, setRuntime] = useState<Problem[]>([]);

  useEffect(() => {
    const t = setTimeout(() => {
      const lines = store.lines.filter((l) => l.stream !== "stdout").slice(-600);
      setRuntime(parseProblems(lines.map((l) => ({ text: l.line, stream: l.stream })), "runtime", known));
    }, 300);
    return () => clearTimeout(t);
  }, [snap.version, store, known]);

  const checks = useMemo(() => {
    if (!validation || validation.ok || !validation.output) return [];
    const lines = validation.output.split("\n").map((text) => ({ text, stream: "stderr" as const }));
    const parsed = parseProblems(lines, "checks", known);
    return parsed.length ? parsed : [{ id: `checks-${validation.at}`, severity: "error" as const, message: `${validation.command ?? "Checks"} failed after the last AI run`, source: "checks" as const, context: lines.slice(-30).map((l) => l.text) }];
  }, [validation, known]);

  return useMemo(() => [...checks, ...runtime], [checks, runtime]);
}
