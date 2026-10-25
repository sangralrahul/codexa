"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { filesApi } from "./api";
import type { FileEntry } from "./types";
import { emit, on } from "@/lib/client/events";
import { ClientApiError } from "@/lib/client/api";
import { readLocal, writeLocal, wsKey } from "./storage";
import { dirname } from "./paths";

export const AUTOSAVE_DELAY_MS = 800;

export type Doc = {
  saved: string;
  draft: string;
  updatedAt: string | null;
  loading: boolean;
  error: string | null;
  /** Set when the file changed remotely while there were unsaved local edits. */
  conflict: { remote: string; at: string } | null;
  /** Incremented when `draft` was replaced from outside the editor (load, reload, conflict resolution). */
  rev: number;
};

export type SaveStatus = "saved" | "saving" | "unsaved" | "error";

type Persisted = { tabs: string[]; active: string | null };

export function useEditorState(projectId: string, initialFiles: FileEntry[], canEdit: boolean) {
  const [files, setFiles] = useState<FileEntry[]>(initialFiles);
  const [filesError, setFilesError] = useState<string | null>(null);
  const [docs, setDocs] = useState<Record<string, Doc>>({});
  const [tabs, setTabs] = useState<string[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [reveal, setReveal] = useState<{ path: string; line: number; nonce: number } | null>(null);
  const [extraFolders, setExtraFolders] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  // "Latest value" refs so stable callbacks (timers, event listeners) see current state.
  const docsRef = useRef(docs);
  const filesRef = useRef(files);
  const tabsRef = useRef(tabs);
  useEffect(() => {
    docsRef.current = docs;
    filesRef.current = files;
    tabsRef.current = tabs;
  }, [docs, files, tabs]);

  // ---- docs ---------------------------------------------------------------
  const patchDoc = useCallback((path: string, patch: Partial<Doc> | ((d: Doc) => Partial<Doc>)) => {
    setDocs((prev) => {
      const cur = prev[path] ?? { saved: "", draft: "", updatedAt: null, loading: false, error: null, conflict: null, rev: 0 };
      const p = typeof patch === "function" ? patch(cur) : patch;
      return { ...prev, [path]: { ...cur, ...p } };
    });
  }, []);

  const loadDoc = useCallback(
    async (path: string, opts: { force?: boolean } = {}) => {
      const existing = docsRef.current[path];
      if (existing && !opts.force && (existing.loading || existing.updatedAt)) return;
      patchDoc(path, { loading: true, error: null });
      try {
        const res = await filesApi.read(projectId, path);
        patchDoc(path, (d) => {
          const dirty = d.updatedAt !== null && d.draft !== d.saved;
          if (dirty && res.content !== d.saved) {
            // Remote change while editing: keep the local draft, surface a conflict banner.
            return { saved: res.content, updatedAt: res.updatedAt, loading: false, conflict: { remote: res.content, at: res.updatedAt } };
          }
          return { saved: res.content, draft: res.content, updatedAt: res.updatedAt, loading: false, conflict: null, rev: d.rev + 1 };
        });
      } catch (err) {
        patchDoc(path, { loading: false, error: err instanceof Error ? err.message : "Failed to load file" });
      }
    },
    [projectId, patchDoc],
  );

  // ---- persistence of tabs ------------------------------------------------
  useEffect(() => {
    // localStorage is only readable after mount; restoring tabs here keeps SSR and the first client render identical.
    const p = readLocal<Persisted>(wsKey(projectId, "tabs"), { tabs: [], active: null });
    const known = new Set(initialFiles.map((f) => f.path));
    const t = p.tabs.filter((x) => known.has(x));
    const a = p.active && known.has(p.active) ? p.active : (t[0] ?? null);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from browser storage
    setTabs(t);
    setActive(a);
    setHydrated(true);
    if (a) void loadDoc(a);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    if (!hydrated) return;
    writeLocal(wsKey(projectId, "tabs"), { tabs, active } satisfies Persisted);
  }, [projectId, tabs, active, hydrated]);

  const refreshFiles = useCallback(async () => {
    try {
      const res = await filesApi.list(projectId);
      setFiles(res.files);
      setFilesError(null);
      return res.files;
    } catch (err) {
      setFilesError(err instanceof Error ? err.message : "Failed to load files");
      return null;
    }
  }, [projectId]);

  // ---- tabs ---------------------------------------------------------------
  const openFile = useCallback(
    (path: string, line?: number) => {
      setTabs((t) => (t.includes(path) ? t : [...t, path]));
      setActive(path);
      void loadDoc(path);
      if (line) setReveal({ path, line, nonce: Date.now() });
    },
    [loadDoc],
  );

  const closeTab = useCallback(
    (path: string) => {
      const t = tabsRef.current;
      const idx = t.indexOf(path);
      const next = t.filter((x) => x !== path);
      setTabs(next);
      setActive((a) => (a === path ? (next[Math.min(idx, next.length - 1)] ?? null) : a));
      const timer = timers.current.get(path);
      if (timer) clearTimeout(timer);
      timers.current.delete(path);
      setDocs((d) => {
        const { [path]: _gone, ...rest } = d;
        return rest;
      });
    },
    [],
  );

  // ---- saving -------------------------------------------------------------
  const saveFile = useCallback(
    async (path: string) => {
      if (!canEdit) return;
      const t = timers.current.get(path);
      if (t) {
        clearTimeout(t);
        timers.current.delete(path);
      }
      const doc = docsRef.current[path];
      if (!doc || doc.loading || doc.draft === doc.saved) return;
      const content = doc.draft;
      setSaving((s) => ({ ...s, [path]: true }));
      try {
        const res = await filesApi.write(projectId, path, content);
        patchDoc(path, { saved: content, updatedAt: res.file.updatedAt, error: null, conflict: null });
        setFiles((fs) => {
          const i = fs.findIndex((f) => f.path === path);
          const entry: FileEntry = { path, size: res.file.size, isBinary: false, updatedAt: res.file.updatedAt };
          if (i === -1) return [...fs, entry].sort((a, b) => a.path.localeCompare(b.path));
          const copy = fs.slice();
          copy[i] = entry;
          return copy;
        });
        emit("codexa:files-changed", { paths: [path], source: "editor" });
      } catch (err) {
        const msg = err instanceof ClientApiError ? err.message : "Could not save";
        patchDoc(path, { error: msg });
      } finally {
        setSaving((s) => {
          const { [path]: _done, ...rest } = s;
          return rest;
        });
      }
    },
    [projectId, canEdit, patchDoc],
  );

  const scheduleSave = useCallback(
    (path: string) => {
      const prev = timers.current.get(path);
      if (prev) clearTimeout(prev);
      timers.current.set(
        path,
        setTimeout(() => {
          timers.current.delete(path);
          void saveFile(path);
        }, AUTOSAVE_DELAY_MS),
      );
    },
    [saveFile],
  );

  const updateDraft = useCallback(
    (path: string, content: string) => {
      const cur = docsRef.current[path];
      if (!cur || cur.draft === content) return;
      patchDoc(path, { draft: content });
      if (canEdit) scheduleSave(path);
    },
    [patchDoc, scheduleSave, canEdit],
  );

  const saveAll = useCallback(async () => {
    const dirty = Object.entries(docsRef.current)
      .filter(([, d]) => d.draft !== d.saved && !d.loading)
      .map(([p]) => p);
    await Promise.all(dirty.map((p) => saveFile(p)));
  }, [saveFile]);

  // Flush pending timers on unmount (best effort; the browser may not wait for the request).
  useEffect(() => {
    const t = timers.current;
    return () => {
      for (const timer of t.values()) clearTimeout(timer);
      t.clear();
    };
  }, []);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      const dirty = Object.values(docsRef.current).some((d) => d.draft !== d.saved);
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, []);

  // ---- conflicts ----------------------------------------------------------
  const resolveConflict = useCallback(
    (path: string, choice: "remote" | "mine") => {
      const d = docsRef.current[path];
      if (!d?.conflict) return;
      if (choice === "remote") patchDoc(path, { draft: d.conflict.remote, saved: d.conflict.remote, conflict: null, rev: d.rev + 1 });
      else {
        patchDoc(path, { conflict: null });
        scheduleSave(path);
      }
    },
    [patchDoc, scheduleSave],
  );

  // ---- file tree mutations ---------------------------------------------------
  const createFile = useCallback(
    async (path: string, content = "") => {
      const res = await filesApi.write(projectId, path, content);
      setFiles((fs) => [...fs.filter((f) => f.path !== path), { path, size: res.file.size, isBinary: false, updatedAt: res.file.updatedAt }].sort((a, b) => a.path.localeCompare(b.path)));
      setExtraFolders((f) => f.filter((folder) => !path.startsWith(folder + "/")));
      patchDoc(path, (d) => ({ saved: content, draft: content, updatedAt: res.file.updatedAt, loading: false, conflict: null, error: null, rev: d.rev + 1 }));
      emit("codexa:files-changed", { paths: [path], source: "editor" });
      openFile(path);
    },
    [projectId, patchDoc, openFile],
  );

  const createFolder = useCallback((path: string) => {
    setExtraFolders((f) => (f.includes(path) ? f : [...f, path]));
  }, []);

  const renamePath = useCallback(
    async (from: string, to: string, isFolder: boolean) => {
      if (isFolder && !filesRef.current.some((f) => f.path.startsWith(from + "/"))) {
        // Empty (virtual) folder: rename locally only.
        setExtraFolders((f) => f.map((x) => (x === from || x.startsWith(from + "/") ? to + x.slice(from.length) : x)));
        return;
      }
      await filesApi.rename(projectId, from, to, isFolder);
      const map = (p: string) => (isFolder ? (p.startsWith(from + "/") ? to + p.slice(from.length) : p) : p === from ? to : p);
      const affected = filesRef.current.map((f) => f.path).filter((p) => map(p) !== p);
      setFiles((fs) => fs.map((f) => ({ ...f, path: map(f.path) })).sort((a, b) => a.path.localeCompare(b.path)));
      setExtraFolders((f) => f.map((x) => (isFolder && (x === from || x.startsWith(from + "/")) ? to + x.slice(from.length) : x)));
      setTabs((t) => t.map(map));
      setActive((a) => (a ? map(a) : a));
      setDocs((d) => {
        const out: Record<string, Doc> = {};
        for (const [p, doc] of Object.entries(d)) out[map(p)] = doc;
        return out;
      });
      timers.current.forEach((timer, p) => {
        if (map(p) !== p) {
          clearTimeout(timer);
          timers.current.delete(p);
        }
      });
      emit("codexa:files-changed", { paths: [...affected, ...affected.map(map)], source: "editor" });
    },
    [projectId],
  );

  const deletePath = useCallback(
    async (path: string, isFolder: boolean) => {
      const affected = isFolder ? filesRef.current.map((f) => f.path).filter((p) => p.startsWith(path + "/")) : [path];
      if (isFolder && !affected.length) {
        setExtraFolders((f) => f.filter((x) => x !== path && !x.startsWith(path + "/")));
        return;
      }
      await filesApi.remove(projectId, path, isFolder);
      const gone = new Set(affected);
      setFiles((fs) => fs.filter((f) => !gone.has(f.path)));
      setExtraFolders((f) => f.filter((x) => x !== path && !x.startsWith(path + "/")));
      for (const p of affected) closeTab(p);
      emit("codexa:files-changed", { paths: affected, source: "editor" });
    },
    [projectId, closeTab],
  );

  // ---- cross-panel events -------------------------------------------------
  useEffect(() => {
    const offChanged = on("codexa:files-changed", (detail) => {
      if (detail.source === "editor") return; // our own saves
      void refreshFiles().then((list) => {
        const known = new Set((list ?? filesRef.current).map((f) => f.path));
        const open = Object.keys(docsRef.current);
        // Snapshot restores replace every file, so re-check every open doc; otherwise only the listed paths.
        const affected = detail.paths?.length && detail.source !== "snapshot" ? open.filter((p) => detail.paths.includes(p)) : open;
        for (const p of affected) {
          if (!known.has(p)) {
            // Deleted remotely: keep the tab only if there are unsaved edits.
            const d = docsRef.current[p];
            if (d && d.draft !== d.saved) patchDoc(p, { conflict: { remote: "", at: new Date().toISOString() } });
            else closeTab(p);
          } else void loadDoc(p, { force: true });
        }
      });
    });
    const offOpen = on("codexa:open-file", (detail) => openFile(detail.path, detail.line));
    return () => {
      offChanged();
      offOpen();
    };
  }, [refreshFiles, loadDoc, openFile, closeTab, patchDoc]);

  /** Switch to an already-open tab (loads its content if it was restored from storage). */
  const activate = useCallback(
    (path: string) => {
      setActive(path);
      void loadDoc(path);
    },
    [loadDoc],
  );

  const dirtyPaths = useMemo(() => Object.entries(docs).filter(([, d]) => d.updatedAt !== null && d.draft !== d.saved).map(([p]) => p), [docs]);
  const errorPaths = useMemo(() => Object.entries(docs).filter(([, d]) => d.error).map(([p]) => p), [docs]);
  const status: SaveStatus = Object.keys(saving).length ? "saving" : errorPaths.length ? "error" : dirtyPaths.length ? "unsaved" : "saved";

  const folders = useMemo(() => {
    const set = new Set(extraFolders);
    for (const f of files) {
      let d = dirname(f.path);
      while (d) {
        set.add(d);
        d = dirname(d);
      }
    }
    return [...set];
  }, [files, extraFolders]);

  return {
    files,
    filesError,
    folders,
    extraFolders,
    docs,
    tabs,
    active,
    setActive: activate,
    reveal,
    status,
    dirtyPaths,
    hydrated,
    openFile,
    closeTab,
    updateDraft,
    saveFile,
    saveAll,
    refreshFiles,
    reloadDoc: (p: string) => loadDoc(p, { force: true }),
    resolveConflict,
    createFile,
    createFolder,
    renamePath,
    deletePath,
  };
}

export type EditorState = ReturnType<typeof useEditorState>;
