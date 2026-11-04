import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, FileCode2, Folder, FolderOpen, Lock, RefreshCw, Save, Search, X } from "lucide-react";
import { ApiError, filesApi, runtimeApi, type FileEntry } from "../../lib/api";
import { cn } from "../../lib/util";
import { Button, Spinner, Tip, toast } from "../../ui";
import { FileIcon, kindOf } from "./fileKinds";
import { isDark } from "../../app/theme";
import { languageFor, monaco } from "./monaco";

type Node = { name: string; path: string; children?: Node[] };

function buildTree(files: FileEntry[]): Node[] {
  const root: Node = { name: "", path: "", children: [] };
  for (const f of files) {
    const parts = f.path.split("/");
    let cur = root;
    parts.forEach((part, i) => {
      const path = parts.slice(0, i + 1).join("/");
      const leaf = i === parts.length - 1;
      let next = cur.children!.find((c) => c.name === part);
      if (!next) {
        next = leaf ? { name: part, path } : { name: part, path, children: [] };
        cur.children!.push(next);
      }
      cur = next;
    });
  }
  const sort = (nodes: Node[]) => {
    nodes.sort((a, b) => Number(Boolean(b.children)) - Number(Boolean(a.children)) || a.name.localeCompare(b.name));
    nodes.forEach((n) => n.children && sort(n.children));
  };
  sort(root.children!);
  return root.children!;
}

/** The file most people want first: the app's entry component, then the page, then anything readable. */
function entryFile(files: FileEntry[]): string | null {
  const names = new Set(files.map((f) => f.path));
  for (const p of ["src/App.tsx", "src/App.jsx", "src/app.tsx", "src/index.ts", "src/index.js", "src/server.ts", "server.js", "index.html", "src/main.tsx", "README.md"]) if (names.has(p)) return p;
  return files.find((f) => !f.isBinary)?.path ?? null;
}

const fmtSize = (n: number) => (n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);

type Tab = { path: string; model: monaco.editor.ITextModel; saved: string; binary?: boolean };

/** Files + editor: a tree of the project's files and Monaco tabs; Ctrl+S saves to Codexa and syncs the preview. */
export function CodeView({ projectId, filesVersion, readOnly }: { projectId: string; filesVersion: number; readOnly: boolean }) {
  const [files, setFiles] = useState<FileEntry[] | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set(["src"]));
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("");
  const [cursor, setCursor] = useState({ line: 1, col: 1 });
  const hostRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const tabsRef = useRef<Tab[]>([]);
  const autoOpened = useRef(false);

  useEffect(() => {
    tabsRef.current = tabs;
  }, [tabs]);

  const loadFiles = useCallback(async () => {
    try {
      setFiles((await filesApi.list(projectId)).files);
    } catch (err) {
      setFiles([]);
      toast.error("Couldn't load files", err instanceof ApiError ? err.message : undefined);
    }
  }, [projectId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads data from the API when the inputs change
    void loadFiles();
  }, [loadFiles, filesVersion]);

  // Reload open, unchanged tabs after the AI edits files.
  useEffect(() => {
    if (!filesVersion) return;
    for (const t of tabsRef.current) {
      if (t.model.getValue() !== t.saved) continue;
      filesApi
        .read(projectId, t.path)
        .then((r) => {
          if (t.model.getValue() === t.saved && r.content !== t.saved) {
            t.saved = r.content;
            t.model.setValue(r.content);
          }
        })
        .catch(() => {});
    }
  }, [filesVersion, projectId]);

  // The editor itself.
  useEffect(() => {
    if (!hostRef.current) return;
    const editor = monaco.editor.create(hostRef.current, {
      automaticLayout: true,
      fontFamily: '"Geist Mono", "Cascadia Code", Consolas, monospace',
      fontSize: 13,
      lineHeight: 20,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      padding: { top: 12 },
      renderLineHighlight: "line",
      smoothScrolling: true,
      cursorBlinking: "smooth",
      bracketPairColorization: { enabled: true },
      guides: { bracketPairs: "active", indentation: true },
      tabSize: 2,
      theme: isDark() ? "codexa-dark" : "codexa-light",
      readOnly,
    });
    editorRef.current = editor;
    const pos = editor.onDidChangeCursorPosition((e) => setCursor({ line: e.position.lineNumber, col: e.position.column }));
    const onTheme = () => monaco.editor.setTheme(isDark() ? "codexa-dark" : "codexa-light");
    window.addEventListener("codexa:theme", onTheme);
    return () => {
      window.removeEventListener("codexa:theme", onTheme);
      pos.dispose();
      editor.dispose();
      for (const t of tabsRef.current) t.model.dispose();
    };
  }, [readOnly]);

  useEffect(() => {
    const editor = editorRef.current;
    const tab = tabs.find((t) => t.path === active);
    editor?.setModel(tab?.model ?? null);
    if (tab) {
      const p = editor?.getPosition();
      setCursor({ line: p?.lineNumber ?? 1, col: p?.column ?? 1 });
    }
  }, [active, tabs]);

  const openFile = useCallback(
    async (path: string) => {
      const existing = tabsRef.current.find((t) => t.path === path);
      if (existing) return setActive(path);
      try {
        const r = await filesApi.read(projectId, path);
        const model = monaco.editor.createModel(r.isBinary ? "// Binary file: not shown." : r.content, r.isBinary ? "plaintext" : languageFor(path), monaco.Uri.parse(`file:///${path}`));
        const tab: Tab = { path, model, saved: r.content, binary: r.isBinary };
        model.onDidChangeContent(() =>
          setDirty((d) => {
            const n = new Set(d);
            if (model.getValue() !== tab.saved) n.add(path);
            else n.delete(path);
            return n;
          }),
        );
        setTabs((t) => [...t, tab]);
        setActive(path);
        // Reveal the file's folders in the tree.
        setOpen((o) => {
          const s = new Set(o);
          const parts = path.split("/");
          for (let i = 1; i < parts.length; i++) s.add(parts.slice(0, i).join("/"));
          return s;
        });
      } catch (err) {
        toast.error("Couldn't open the file", err instanceof ApiError ? err.message : undefined);
      }
    },
    [projectId],
  );

  // Open the entry file the first time the files arrive, so the view is never empty.
  useEffect(() => {
    if (autoOpened.current || !files || files.length === 0 || tabsRef.current.length > 0) return;
    const p = entryFile(files);
    if (!p) return;
    autoOpened.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- opens the entry file once the list arrives (async, after a fetch)
    void openFile(p);
  }, [files, openFile]);

  const closeTab = (path: string) => {
    const tab = tabsRef.current.find((t) => t.path === path);
    if (tab && tab.model.getValue() !== tab.saved && !window.confirm(`Discard unsaved changes to ${path}?`)) return;
    tab?.model.dispose();
    setTabs((t) => t.filter((x) => x.path !== path));
    setDirty((d) => {
      const n = new Set(d);
      n.delete(path);
      return n;
    });
    if (active === path) setActive(tabsRef.current.filter((x) => x.path !== path).at(-1)?.path ?? null);
  };

  const save = useCallback(async () => {
    const tab = tabsRef.current.find((t) => t.path === active);
    if (!tab || tab.binary || readOnly) return;
    const content = tab.model.getValue();
    if (content === tab.saved) return;
    setSaving(true);
    try {
      await filesApi.write(projectId, tab.path, content);
      tab.saved = content;
      setDirty((d) => {
        const n = new Set(d);
        n.delete(tab.path);
        return n;
      });
      void runtimeApi.sync(projectId, [tab.path]).catch(() => {});
    } catch (err) {
      toast.error("Couldn't save", err instanceof ApiError ? err.message : undefined);
    } finally {
      setSaving(false);
    }
  }, [active, projectId, readOnly]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save]);

  const tree = useMemo(() => buildTree(files ?? []), [files]);
  const q = filter.trim().toLowerCase();
  const matches = useMemo(() => (q ? (files ?? []).filter((f) => f.path.toLowerCase().includes(q)).slice(0, 80) : []), [files, q]);
  const activeFile = files?.find((f) => f.path === active);
  const activeTab = tabs.find((t) => t.path === active);

  const renderNodes = (nodes: Node[], depth: number) =>
    nodes.map((n) => {
      const isOpen = open.has(n.path);
      const isActive = active === n.path;
      return (
        <li key={n.path} role="treeitem" aria-expanded={n.children ? isOpen : undefined} aria-selected={isActive}>
          <button
            type="button"
            onClick={() =>
              n.children
                ? setOpen((o) => {
                    const s = new Set(o);
                    if (s.has(n.path)) s.delete(n.path);
                    else s.add(n.path);
                    return s;
                  })
                : void openFile(n.path)
            }
            style={{ paddingLeft: 6 + depth * 12 }}
            title={n.path}
            className={cn(
              "relative flex h-6 w-full items-center gap-1.5 rounded-[5px] pr-2 text-left text-[12.5px] transition-colors",
              isActive ? "bg-surface text-fg" : "text-muted hover:bg-surface/70 hover:text-fg",
            )}
          >
            {/* Indent guides, one per level. */}
            {Array.from({ length: depth }, (_, i) => (
              <span key={i} aria-hidden="true" className="absolute inset-y-0 w-px bg-border" style={{ left: 12 + i * 12 }} />
            ))}
            {n.children ? <ChevronRight className={cn("size-3 shrink-0 text-dim transition-transform", isOpen && "rotate-90")} /> : <span className="w-3 shrink-0" />}
            {n.children ? isOpen ? <FolderOpen className="size-3.5 shrink-0 text-[#d4a017]" /> : <Folder className="size-3.5 shrink-0 text-[#d4a017]" /> : <FileIcon path={n.path} />}
            <span className={cn("truncate", isActive && "font-medium")}>{n.name}</span>
            {dirty.has(n.path) ? <span className="ml-auto size-1.5 shrink-0 rounded-full bg-fg" aria-label="Unsaved" /> : null}
          </button>
          {n.children && isOpen ? <ul role="group">{renderNodes(n.children, depth + 1)}</ul> : null}
        </li>
      );
    });

  return (
    <div className="flex h-full bg-bg">
      <aside className="flex w-[240px] shrink-0 flex-col border-r border-border bg-sidebar" aria-label="Explorer">
        <div className="ws-bar gap-1 bg-sidebar pl-3 pr-1.5">
          <span className="ws-label">Explorer</span>
          {files ? <span className="mono ml-auto text-[10.5px] tabular-nums text-dim">{files.length} files</span> : <span className="ml-auto" />}
          <Tip label="Refresh files" align="end">
            <button type="button" className="ws-icon ws-icon--sm" aria-label="Refresh files" onClick={() => void loadFiles()}>
              <RefreshCw />
            </button>
          </Tip>
        </div>
        <div className="relative px-2 pb-1.5 pt-2">
          <Search className="pointer-events-none absolute left-4 top-1/2 mt-[1px] size-3.5 -translate-y-1/2 text-dim" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setFilter("")}
            placeholder="Filter files"
            aria-label="Filter files"
            className="h-7 w-full rounded-md border border-border bg-bg pl-7 pr-7 text-[12.5px] outline-none transition-colors placeholder:text-dim focus:border-[var(--mark)]"
          />
          {filter ? (
            <button type="button" aria-label="Clear filter" onClick={() => setFilter("")} className="absolute right-3.5 top-1/2 mt-[1px] -translate-y-1/2 rounded-sm text-dim hover:text-fg">
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>
        <nav className="scroll min-h-0 flex-1 px-1.5 pb-2" aria-label="Files">
          {files === null ? (
            <div className="space-y-1.5 px-2 py-2" aria-label="Loading files">
              {[70, 52, 84, 46, 64, 58].map((w, i) => (
                <span key={i} className="pulse block h-3 rounded-sm bg-surface" style={{ width: `${w}%` }} />
              ))}
            </div>
          ) : q ? (
            matches.length === 0 ? (
              <p className="px-2 py-6 text-center text-[12px] text-dim">No files match “{filter.trim()}”</p>
            ) : (
              <ul>
                {matches.map((f) => (
                  <li key={f.path}>
                    <button type="button" onClick={() => void openFile(f.path)} className={cn("flex h-[34px] w-full items-center gap-2 rounded-[5px] px-2 text-left text-[12.5px] transition-colors", active === f.path ? "bg-surface text-fg" : "text-muted hover:bg-surface/70 hover:text-fg")}>
                      <FileIcon path={f.path} />
                      <span className="min-w-0">
                        <span className="block truncate font-medium leading-tight">{f.path.split("/").pop()}</span>
                        {f.path.includes("/") ? <span className="mono block truncate text-[10.5px] leading-tight text-dim">{f.path.slice(0, f.path.lastIndexOf("/"))}</span> : null}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )
          ) : files.length === 0 ? (
            <p className="px-2 py-6 text-center text-[12px] leading-relaxed text-dim">No files yet.</p>
          ) : (
            <ul role="tree" aria-label="Project files">
              {renderNodes(tree, 0)}
            </ul>
          )}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col bg-bg">
        <div className="flex h-9 shrink-0 items-stretch border-b border-border bg-sidebar">
          <div className="flex min-w-0 flex-1 items-stretch overflow-x-auto overflow-y-hidden [scrollbar-width:none]" role="tablist" aria-label="Open files">
            {tabs.map((t) => {
              const on = active === t.path;
              return (
                <div
                  key={t.path}
                  className={cn("group relative flex shrink-0 items-center gap-1 border-r border-border pl-3 pr-1.5 text-[12.5px] transition-colors", on ? "bg-bg text-fg" : "text-muted hover:bg-surface/60 hover:text-fg")}
                  onAuxClick={(e) => e.button === 1 && closeTab(t.path)}
                >
                  {on ? <span aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-fg" /> : null}
                  {on ? <span aria-hidden="true" className="absolute inset-x-0 -bottom-px h-px bg-bg" /> : null}
                  <button type="button" role="tab" aria-selected={on} onClick={() => setActive(t.path)} className="flex h-full max-w-[200px] items-center gap-1.5 truncate" title={t.path}>
                    <FileIcon path={t.path} className="size-3" />
                    <span className="truncate">{t.path.split("/").pop()}</span>
                  </button>
                  <button type="button" onClick={() => closeTab(t.path)} aria-label={`Close ${t.path}`} className={cn("flex size-5 items-center justify-center rounded-[4px] text-dim transition-colors hover:bg-surface hover:text-fg", !on && !dirty.has(t.path) && "opacity-0 group-hover:opacity-100 focus-visible:opacity-100")}>
                    {dirty.has(t.path) ? <span className="size-1.5 rounded-full bg-fg group-hover:hidden" /> : null}
                    <X className={cn("size-3", dirty.has(t.path) && "hidden group-hover:block")} />
                  </button>
                </div>
              );
            })}
          </div>
          {active && !readOnly ? (
            <div className="flex items-center gap-2 border-l border-border pl-2 pr-1.5">
              <Tip label="Save" keys="Ctrl S" align="end">
                <Button size="xs" variant={dirty.has(active) ? "primary" : "ghost"} disabled={!dirty.has(active)} loading={saving} onClick={() => void save()}>
                  {saving ? null : <Save className="!size-3.5" />} Save
                </Button>
              </Tip>
            </div>
          ) : null}
        </div>
        {active ? (
          <div className="flex h-7 shrink-0 items-center gap-1 border-b border-border bg-bg px-3 text-[12px] text-muted">
            <nav aria-label="File path" className="flex min-w-0 items-center gap-1">
              {active.split("/").map((seg, i, arr) => (
                <span key={i} className="flex min-w-0 items-center gap-1">
                  {i > 0 ? <ChevronRight className="size-3 shrink-0 text-dim" /> : null}
                  <span className={cn("truncate", i === arr.length - 1 ? "flex items-center gap-1.5 text-fg" : "text-dim")}>
                    {i === arr.length - 1 ? <FileIcon path={active} className="size-3" /> : null}
                    {seg}
                  </span>
                </span>
              ))}
            </nav>
            <span className="ml-auto flex shrink-0 items-center gap-2 text-[11.5px]">
              {readOnly ? (
                <span className="flex items-center gap-1.5 text-dim">
                  <Lock className="size-3" /> Read only
                </span>
              ) : dirty.has(active) ? (
                <span className="flex items-center gap-1.5 text-warning">
                  <span className="ws-dot bg-warning" /> Unsaved
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-dim">
                  <span className="ws-dot bg-success" /> Saved
                </span>
              )}
            </span>
          </div>
        ) : null}
        <div className="relative min-h-0 flex-1">
          <div ref={hostRef} className="absolute inset-0" />
          {!active ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-bg text-center">
              <span className="flex size-10 items-center justify-center rounded-lg border border-border bg-card text-dim">
                <FileCode2 className="size-5" />
              </span>
              <p className="mt-4 text-[14px] font-semibold tracking-[-0.01em]">{files && files.length === 0 ? "This project has no files yet" : "Open a file to view or edit it"}</p>
              <p className="mt-1 max-w-[320px] text-[12.5px] leading-relaxed text-muted">{files && files.length === 0 ? "Describe what to build in the chat and the AI creates them." : "Pick one in the explorer. Changes you save update the live preview."}</p>
              {files && files.length ? (
                <p className="mt-4 flex items-center gap-1.5 text-[11.5px] text-dim">
                  <span className="mono rounded-[4px] border border-border px-1 text-[10.5px] text-muted">Ctrl S</span> saves the open file
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
        {active ? (
          <div className="ws-status text-[11px] tabular-nums text-dim">
            <span className="ws-status__item">
              Ln {cursor.line}, Col {cursor.col}
            </span>
            <span className="ws-status__item">Spaces: 2</span>
            <span className="ws-status__item">UTF-8</span>
            <span className="ml-auto" />
            {activeFile ? <span className="ws-status__item mono">{fmtSize(activeFile.size)}</span> : null}
            <span className="ws-status__item flex items-center gap-1.5 text-muted">
              <FileIcon path={active} className="size-3" />
              {activeTab?.binary ? "Binary" : kindOf(active).label}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
