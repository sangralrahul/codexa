"use client";

import { useCallback, useEffect, useState } from "react";
import { on } from "@/lib/client/events";
import { filesApi, snapshotsApi } from "./api";
import type { ChangeSummary } from "./types";

/**
 * Files that differ from the latest checkpoint (GET /changes), refreshed after any
 * files-changed or finished AI run (debounced) and whenever `version` changes.
 * Drives the explorer's A/M/D letters and the history timeline's "Now" node.
 */
export function useChanges(projectId: string, version: number) {
  const [snapshot, setSnapshot] = useState<{ id: string; name: string; createdAt: string } | null>(null);
  const [changes, setChanges] = useState<ChangeSummary[] | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await filesApi.changes(projectId);
      setSnapshot(res.snapshot);
      setChanges(res.changes);
      setError(false);
    } catch {
      setError(true);
    }
  }, [projectId]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load, version]);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | null = null;
    const later = () => {
      if (t) clearTimeout(t);
      t = setTimeout(() => void load(), 1200);
    };
    const offFiles = on("codexa:files-changed", later);
    const offRun = on("codexa:ai-run", (d) => d.status !== "running" && later());
    return () => {
      offFiles();
      offRun();
      if (t) clearTimeout(t);
    };
  }, [load]);

  return { snapshot, changes, error, reload: load };
}

/** Number of checkpoints (snapshots) for the header's History count. */
export function useSnapshotCount(projectId: string, version: number) {
  const [count, setCount] = useState<number | null>(null);
  const load = useCallback(async () => {
    try {
      const res = await snapshotsApi.list(projectId);
      setCount(res.snapshots.length);
    } catch {
      /* the history sheet shows the real error */
    }
  }, [projectId]);
  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load, version]);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | null = null;
    const later = () => {
      if (t) clearTimeout(t);
      t = setTimeout(() => void load(), 1500);
    };
    const offRun = on("codexa:ai-run", (d) => d.status !== "running" && later());
    const offRestored = on("codexa:restored", later);
    return () => {
      offRun();
      offRestored();
      if (t) clearTimeout(t);
    };
  }, [load]);
  return { count, reload: load };
}
