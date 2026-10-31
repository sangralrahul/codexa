import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Braces, ChevronRight, FileCode2, FileJson2, FileText, FileType2, Folder, FolderOpen, Hash, Image, Palette, RefreshCw, Save, Search, X } from "lucide-react";
import { ApiError, filesApi, runtimeApi, type FileEntry } from "../../lib/api";
import { cn } from "../../lib/util";
import { Button, Kbd, Spinner, toast } from "../../ui";
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

/** File-type icon and tint, like an IDE's explorer. */
const KINDS: Record<string, { icon: typeof FileCode2; tint: string; label: string }> = {
  tsx: { icon: Braces, tint: "text-muted", label: "TypeScript React" },
  ts: { icon: Braces, tint: "text-muted", label: "TypeScript" },
  jsx: { icon: Braces, tint: "text-muted", label: "JavaScript React" },
  js: { icon: Braces, tint: "text-muted", label: "JavaScript" },
  mjs: { icon: Braces, tint: "text-muted", label: "JavaScript" },
  cjs: { icon: Braces, tint: "text-muted", label: "JavaScript" },
  json: { icon: FileJson2, tint: "text-muted", label: "JSON" },
  css: { icon: Palette, tint: "text-muted", label: "CSS" },
  scss: { icon: Palette, tint: "text-muted", label: "SCSS" },
  html: { icon: FileCode2, tint: "text-muted", label: "HTML" },
  md: { icon: FileText, tint: "text-muted", label: "Markdown" },
  svg: { icon: Image, tint: "text-muted", label: "SVG" },
  png: { icon: Image, tint: "text-muted", label: "Image" },
  jpg: { icon: Image, tint: "text-muted", label: "Image" },
  webp: { icon: Image, tint: "text-muted", label: "Image" },
  yml: { icon: Hash, tint: "text-muted", label: "YAML" },
  yaml: { icon: Hash, tint: "text-muted", label: "YAML" },
  sql: { icon: FileType2, tint: "text-muted", label: "SQL" },
};
function kindOf(path: string) {
  const name = path.split("/").pop() ?? "";
  if (name === ".gitignore" || name === ".env" || name.startsWith(".env.")) return { icon: FileText, tint: "text-dim", label: "Config" };
  return KINDS[name.split(".").pop()?.toLowerCase() ?? ""] ?? { icon: FileText, tint: "text-dim", label: "Plain text" };
}
function FileIcon({ path, className }: { path: string; className?: string }) {
  const k = kindOf(path);
  return <k.icon className={cn("size-3.5 shrink-0", k.tint, className)} aria-hidden="true" />;
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
      return (
        <li key={n.path}>
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
            style={{ paddingLeft: 8 + depth * 12 }}
            className={cn("flex h-[26px] w-full items-center gap-1.5 rounded-md pr-2 text-left text-[12.5px]", active === n.path ? "bg-surface font-medium text-fg ring-1 ring-border" : "text-muted hover:bg-surface/70 hover:text-fg")}
          >
            {n.children ? <ChevronRight className={cn("size-3 shrink-0 text-dim transition-transform", isOpen && "rotate-90")} /> : <span className="w-3" />}
            {n.children ? isOpen ? <FolderOpen className="size-3.5 shrink-0 text-dim" /> : <Folder className="size-3.5 shrink-0 text-dim" /> : <FileIcon path={n.path} />}
            <span className="truncate">{n.name}</span>
            {dirty.has(n.path) ? <span className="ml-auto size-1.5 shrink-0 rounded-full bg-accent" /> : null}
          </button>
          {n.children && isOpen ? <ul>{renderNodes(n.children, depth + 1)}</ul> : null}
        </li>
      );
    });

  return (
    <div className="flex h-full">
      <aside className="flex w-[240px] shrink-0 flex-col border-r border-border bg-sidebar">
        <div className="flex h-11 items-center justify-between border-b border-border px-3">
          <span className="text-[11.5px] font-semibold uppercase tracking-wider text-dim">Explorer</span>
          <span className="flex items-center gap-1">
            {files ? <span className="text-[11px] tabular-nums text-dim">{files.length} files</span> : null}
            <Button variant="ghost" size="icon-sm" aria-label="Refresh files" title="Refresh files" onClick={() => void loadFiles()}>
              <RefreshCw />
            </Button>
          </span>
        </div>
        <div className="relative border-b border-border p-2">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-3.5 -translate-y-1/2 text-dim" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter files"
            aria-label="Filter files"
            className="h-7 w-full rounded-md border border-transparent bg-surface pl-7 pr-6 text-[12.5px] outline-none placeholder:text-dim focus:border-border-strong"
          />
          {filter ? (
            <button type="button" aria-label="Clear filter" onClick={() => setFilter("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-dim hover:text-fg">
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>
        <nav className="scroll min-h-0 flex-1 p-1.5">
          {files === null ? (
            <Spinner className="m-3" />
          ) : q ? (
            matches.length === 0 ? (
              <p className="px-2 py-4 text-center text-[12px] text-dim">No files match</p>
            ) : (
              <ul>
                {matches.map((f) => (
                  <li key={f.path}>
                    <button type="button" onClick={() => void openFile(f.path)} className={cn("flex h-[30px] w-full items-center gap-1.5 rounded-md px-2 text-left text-[12.5px]", active === f.path ? "bg-surface text-fg" : "text-muted hover:bg-surface/70 hover:text-fg")}>
                      <FileIcon path={f.path} />
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{f.path.split("/").pop()}</span>
                        {f.path.includes("/") ? <span className="block truncate text-[10.5px] leading-tight text-dim">{f.path.slice(0, f.path.lastIndexOf("/"))}</span> : null}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )
          ) : (
            <ul>{renderNodes(tree, 0)}</ul>
          )}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col bg-card">
        <div className="flex h-10 shrink-0 items-end gap-0.5 border-b border-border bg-sidebar/60 px-2">
          <div className="scroll flex min-w-0 flex-1 items-end gap-0.5 overflow-y-hidden">
            {tabs.map((t) => (
              <div
                key={t.path}
                className={cn("group flex h-[34px] shrink-0 items-center gap-1.5 rounded-t-lg border border-b-0 pl-2.5 pr-1 text-[12.5px]", active === t.path ? "border-border bg-card text-fg" : "border-transparent text-muted hover:text-fg")}
                onAuxClick={(e) => e.button === 1 && closeTab(t.path)}
              >
                <button type="button" onClick={() => setActive(t.path)} className="flex max-w-[200px] items-center gap-1.5 truncate" title={t.path}>
                  <FileIcon path={t.path} className="size-3" />
                  {t.path.split("/").pop()}
                </button>
                <button type="button" onClick={() => closeTab(t.path)} aria-label={`Close ${t.path}`} className="flex size-5 items-center justify-center rounded hover:bg-surface">
                  {dirty.has(t.path) ? <span className="size-1.5 rounded-full bg-accent group-hover:hidden" /> : null}
                  <X className={cn("size-3", dirty.has(t.path) && "hidden group-hover:block")} />
                </button>
              </div>
            ))}
          </div>
          {active && !readOnly ? (
            <div className="flex h-10 items-center gap-2 pl-2">
              <span className="hidden text-[11.5px] text-dim xl:inline">
                <Kbd>Ctrl S</Kbd>
              </span>
              <Button size="sm" variant={dirty.has(active) ? "primary" : "ghost"} disabled={!dirty.has(active)} loading={saving} onClick={() => void save()}>
                <Save /> Save
              </Button>
            </div>
          ) : null}
        </div>
        {active ? (
          <div className="flex h-8 shrink-0 items-center gap-1 border-b border-border px-3 text-[12px] text-muted">
            {active.split("/").map((seg, i, arr) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 ? <ChevronRight className="size-3 text-dim" /> : null}
                <span className={cn(i === arr.length - 1 && "flex items-center gap-1.5 font-medium text-fg")}>
                  {i === arr.length - 1 ? <FileIcon path={active} className="size-3" /> : null}
                  {seg}
                </span>
              </span>
            ))}
            <span className="ml-auto flex items-center gap-2 text-[11.5px]">
              {readOnly ? (
                <span className="text-dim">Read only</span>
              ) : dirty.has(active) ? (
                <span className="flex items-center gap-1.5 text-warning">
                  <span className="size-1.5 rounded-full bg-warning" /> Unsaved changes
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-dim">
                  <span className="size-1.5 rounded-full bg-success" /> Saved
                </span>
              )}
            </span>
          </div>
        ) : null}
        <div className="relative min-h-0 flex-1">
          <div ref={hostRef} className="absolute inset-0" />
          {!active ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-card text-center">
              <FileCode2 className="size-6 text-dim" />
              <p className="mt-3 text-[13.5px] font-medium">{files && files.length === 0 ? "This project has no files yet" : "Open a file to view or edit it"}</p>
              <p className="mt-1 text-[12.5px] text-muted">{files && files.length === 0 ? "Describe what to build in the chat and the AI creates them." : "Changes you save update the live preview."}</p>
            </div>
          ) : null}
        </div>
        {active ? (
          <div className="flex h-6 shrink-0 items-center gap-4 border-t border-border bg-sidebar/60 px-3 text-[11px] tabular-nums text-dim">
            <span>
              Ln {cursor.line}, Col {cursor.col}
            </span>
            <span>Spaces: 2</span>
            <span>UTF-8</span>
            <span className="ml-auto">{activeFile ? fmtSize(activeFile.size) : null}</span>
            <span className="text-muted">{activeTab?.binary ? "Binary" : kindOf(active).label}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
