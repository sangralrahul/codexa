import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, File, FileCode2, Folder, FolderOpen, RefreshCw, Save, X } from "lucide-react";
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

type Tab = { path: string; model: monaco.editor.ITextModel; saved: string; binary?: boolean };

/** Files + editor: a tree of the project's files and Monaco tabs; Ctrl+S saves to Codexa and syncs the preview. */
export function CodeView({ projectId, filesVersion, readOnly }: { projectId: string; filesVersion: number; readOnly: boolean }) {
  const [files, setFiles] = useState<FileEntry[] | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set(["src"]));
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const tabsRef = useRef<Tab[]>([]);

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
      fontFamily: '"Cascadia Code", Consolas, monospace',
      fontSize: 13,
      lineHeight: 20,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      padding: { top: 12 },
      renderLineHighlight: "line",
      smoothScrolling: true,
      tabSize: 2,
      theme: isDark() ? "codexa-dark" : "codexa-light",
      readOnly,
    });
    editorRef.current = editor;
    const onTheme = () => monaco.editor.setTheme(isDark() ? "codexa-dark" : "codexa-light");
    window.addEventListener("codexa:theme", onTheme);
    return () => {
      window.removeEventListener("codexa:theme", onTheme);
      editor.dispose();
      for (const t of tabsRef.current) t.model.dispose();
    };
  }, [readOnly]);

  useEffect(() => {
    const editor = editorRef.current;
    const tab = tabs.find((t) => t.path === active);
    editor?.setModel(tab?.model ?? null);
  }, [active, tabs]);

  const openFile = async (path: string) => {
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
    } catch (err) {
      toast.error("Couldn't open the file", err instanceof ApiError ? err.message : undefined);
    }
  };

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
            className={cn("flex h-7 w-full items-center gap-1.5 rounded-md pr-2 text-left text-[12.5px]", active === n.path ? "bg-surface font-medium text-fg" : "text-muted hover:bg-surface/70 hover:text-fg")}
          >
            {n.children ? <ChevronRight className={cn("size-3 shrink-0 transition-transform", isOpen && "rotate-90")} /> : <span className="w-3" />}
            {n.children ? isOpen ? <FolderOpen className="size-3.5 shrink-0 text-dim" /> : <Folder className="size-3.5 shrink-0 text-dim" /> : /\.(tsx?|jsx?|css|html|json)$/.test(n.name) ? <FileCode2 className="size-3.5 shrink-0 text-dim" /> : <File className="size-3.5 shrink-0 text-dim" />}
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
          <span className="text-[12px] font-semibold uppercase tracking-wide text-dim">Files</span>
          <Button variant="ghost" size="icon-sm" aria-label="Refresh files" onClick={() => void loadFiles()}>
            <RefreshCw />
          </Button>
        </div>
        <nav className="scroll min-h-0 flex-1 p-1.5">{files === null ? <Spinner className="m-3" /> : <ul>{renderNodes(tree, 0)}</ul>}</nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col bg-card">
        <div className="flex h-11 shrink-0 items-end gap-0.5 border-b border-border px-2">
          <div className="scroll flex min-w-0 flex-1 items-end gap-0.5 overflow-y-hidden">
            {tabs.map((t) => (
              <div key={t.path} className={cn("group flex h-9 shrink-0 items-center gap-1.5 rounded-t-lg border border-b-0 pl-3 pr-1.5 text-[12.5px]", active === t.path ? "border-border bg-card text-fg" : "border-transparent text-muted hover:text-fg")}>
                <button type="button" onClick={() => setActive(t.path)} className="max-w-[180px] truncate">
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
            <div className="flex h-11 items-center gap-2 pl-2">
              <span className="hidden text-[11.5px] text-dim xl:inline">
                <Kbd>Ctrl S</Kbd>
              </span>
              <Button size="sm" variant={dirty.has(active) ? "primary" : "ghost"} disabled={!dirty.has(active)} loading={saving} onClick={() => void save()}>
                <Save /> Save
              </Button>
            </div>
          ) : null}
        </div>
        <div className="relative min-h-0 flex-1">
          <div ref={hostRef} className="absolute inset-0" />
          {!active ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-card text-center">
              <FileCode2 className="size-6 text-dim" />
              <p className="mt-3 text-[13.5px] font-medium">Open a file to view or edit it</p>
              <p className="mt-1 text-[12.5px] text-muted">Changes you save update the live preview.</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
