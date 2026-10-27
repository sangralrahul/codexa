"use client";

/**
 * Client-only Monaco module. Imported through next/dynamic with ssr:false (see code-editor.tsx)
 * so the AMD loader never runs on the server. Monaco assets (including workers) are served
 * from our own origin at /monaco/vs — never from a CDN.
 */
import { useCallback, useEffect, useRef } from "react";
import { Editor, DiffEditor, loader, type Monaco, type OnMount } from "@monaco-editor/react";
import type { editor as MonacoEditorNs } from "monaco-editor";
import { useTheme } from "@/components/theme/theme-provider";
import { Spinner } from "@/components/ui/misc";
import type { LineChanges } from "@/lib/client/workspace/line-diff";
import { DAY, NIGHT, defineCodexaThemes } from "./monaco-theme";

loader.config({ paths: { vs: "/monaco/vs" } });

let compilerConfigured = false;
function configure(monaco: Monaco) {
  defineCodexaThemes(monaco);
  if (compilerConfigured) return;
  compilerConfigured = true;
  // TSX/JSX support and quieter diagnostics for project files that reference deps we do not have locally.
  const compiler = {
    jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
    target: monaco.languages.typescript.ScriptTarget.ES2022,
    module: monaco.languages.typescript.ModuleKind.ESNext,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    allowJs: true,
    allowNonTsExtensions: true,
    esModuleInterop: true,
    strict: true,
    noEmit: true,
  };
  monaco.languages.typescript.typescriptDefaults.setCompilerOptions(compiler);
  monaco.languages.typescript.javascriptDefaults.setCompilerOptions(compiler);
  // The browser has none of the project's node_modules types, so semantic checks would flag every
  // import and JSX element. Keep syntax validation (real errors) and leave type-checking to the runner.
  const diag = { noSemanticValidation: true, noSyntaxValidation: false, noSuggestionDiagnostics: true };
  monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions(diag);
  monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions(diag);
}

/** Re-define the token themes whenever the site theme flips, then apply the matching one. */
function useCodexaTheme(monacoRef: React.RefObject<Monaco | null>) {
  const { resolved } = useTheme();
  const theme = resolved === "dark" ? NIGHT : DAY;
  useEffect(() => {
    const monaco = monacoRef.current;
    if (!monaco) return;
    // Let the theme class land on <html> before reading the tokens.
    const raf = requestAnimationFrame(() => {
      defineCodexaThemes(monaco);
      monaco.editor.setTheme(theme);
    });
    return () => cancelAnimationFrame(raf);
  }, [theme, monacoRef]);
  return theme;
}

export type CodeEditorHandle = {
  editor: MonacoEditorNs.IStandaloneCodeEditor;
  monaco: Monaco;
};

export type CodeEditorProps = {
  path: string;
  language: string;
  value: string;
  readOnly?: boolean;
  onChange: (value: string) => void;
  onMount?: (handle: CodeEditorHandle) => void;
  /** Shortcut hooks fired from inside the editor so they work when Monaco has focus. */
  onSave?: () => void;
  onQuickOpen?: () => void;
  onSearchAll?: () => void;
  revealLine?: number | null;
  /**
   * Bumped whenever `value` changed outside the editor (file loaded/reloaded, conflict resolved,
   * snapshot restored). Typing never re-pushes `value` into Monaco, which avoids the dropped-keystroke
   * race of a fully controlled editor when React state lags behind fast input.
   */
  revision?: number;
  /** Lines the AI added or modified in this file (gutter marks). */
  marks?: LineChanges | null;
  /** Cursor position, for the status bar. */
  onCursor?: (pos: { line: number; column: number }) => void;
};

const Loading = () => (
  <div className="flex h-full items-center justify-center text-sm text-muted-foreground" role="status">
    <Spinner className="mr-2" /> Loading editor…
  </div>
);

export function MonacoCodeEditor({ path, language, value, readOnly, onChange, onMount, onSave, onQuickOpen, onSearchAll, revealLine, revision = 0, marks, onCursor }: CodeEditorProps) {
  const monacoRef = useRef<Monaco | null>(null);
  const theme = useCodexaTheme(monacoRef);
  const editorRef = useRef<MonacoEditorNs.IStandaloneCodeEditor | null>(null);
  const decorations = useRef<MonacoEditorNs.IEditorDecorationsCollection | null>(null);
  const cbs = useRef({ onSave, onQuickOpen, onSearchAll, onCursor });
  useEffect(() => {
    cbs.current = { onSave, onQuickOpen, onSearchAll, onCursor };
  }, [onSave, onQuickOpen, onSearchAll, onCursor]);

  const handleMount = useCallback<OnMount>(
    (editor, monaco) => {
      editorRef.current = editor;
      monacoRef.current = monaco;
      const KM = monaco.KeyMod;
      const KC = monaco.KeyCode;
      editor.addCommand(KM.CtrlCmd | KC.KeyS, () => cbs.current.onSave?.());
      editor.addCommand(KM.CtrlCmd | KC.KeyP, () => cbs.current.onQuickOpen?.());
      editor.addCommand(KM.CtrlCmd | KM.Shift | KC.KeyF, () => cbs.current.onSearchAll?.());
      editor.onDidChangeCursorPosition((e) => cbs.current.onCursor?.({ line: e.position.lineNumber, column: e.position.column }));
      decorations.current = editor.createDecorationsCollection([]);
      // Geist Mono may finish loading after Monaco measured the fallback font.
      void document.fonts?.ready.then(() => monaco.editor.remeasureFonts());
      const pos = editor.getPosition();
      if (pos) cbs.current.onCursor?.({ line: pos.lineNumber, column: pos.column });
      onMount?.({ editor, monaco });
    },
    [onMount],
  );

  // Apply external content changes. Models are keyed by path, so switching tabs keeps each file's
  // in-editor text; this only writes when the external value genuinely differs.
  useEffect(() => {
    const ed = editorRef.current;
    const model = ed?.getModel();
    if (!ed || !model || model.getValue() === value) return;
    const pos = ed.getPosition();
    ed.executeEdits("external", [{ range: model.getFullModelRange(), text: value, forceMoveMarkers: true }]);
    ed.pushUndoStop();
    if (pos) ed.setPosition(pos);
    // `value` is intentionally not a dependency: it changes on every keystroke and must never be
    // written back into the editor; only an explicit revision bump (or a path switch) does that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision, path]);

  useEffect(() => {
    if (!revealLine || !editorRef.current) return;
    const ed = editorRef.current;
    ed.revealLineInCenter(revealLine);
    ed.setPosition({ lineNumber: revealLine, column: 1 });
    ed.focus();
  }, [revealLine, path]);

  // AI gutter marks: green bar for added lines, amber for modified ones (from the run's real diff).
  useEffect(() => {
    const monaco = monacoRef.current;
    const collection = decorations.current;
    if (!collection || !monaco) return;
    if (!marks) {
      collection.clear();
      return;
    }
    const success = getComputedStyle(document.documentElement).getPropertyValue("--success").trim();
    const warning = getComputedStyle(document.documentElement).getPropertyValue("--warning").trim();
    const deco = (line: number, kind: "added" | "modified"): MonacoEditorNs.IModelDeltaDecoration => ({
      range: new monaco.Range(line, 1, line, 1),
      options: {
        isWholeLine: true,
        linesDecorationsClassName: kind === "added" ? "ws-gutter-added" : "ws-gutter-modified",
        className: kind === "added" ? "ws-line-ai" : undefined,
        overviewRuler: { color: kind === "added" ? success : warning, position: monaco.editor.OverviewRulerLane.Left },
        stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
      },
    });
    collection.set([...marks.added.map((l) => deco(l, "added")), ...marks.modified.map((l) => deco(l, "modified"))]);
  }, [marks, path, revision]);

  return (
    <Editor
      path={`file:///${path}`}
      language={language}
      defaultValue={value}
      theme={theme}
      loading={<Loading />}
      beforeMount={configure}
      onMount={handleMount}
      onChange={(v) => onChange(v ?? "")}
      options={{
        readOnly,
        fontSize: 13.5,
        lineHeight: 20,
        fontFamily: "var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, monospace",
        fontLigatures: true,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        wordWrap: "off",
        renderLineHighlight: "line",
        smoothScrolling: true,
        cursorBlinking: "smooth",
        cursorSmoothCaretAnimation: "on",
        cursorWidth: 2,
        padding: { top: 14, bottom: 14 },
        stickyScroll: { enabled: true, maxLineCount: 4 },
        bracketPairColorization: { enabled: true },
        guides: { bracketPairs: "active", indentation: true, highlightActiveIndentation: true },
        lineDecorationsWidth: 10,
        lineNumbersMinChars: 3,
        glyphMargin: false,
        folding: true,
        showFoldingControls: "mouseover",
        overviewRulerBorder: false,
        hideCursorInOverviewRuler: true,
        roundedSelection: true,
        scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10, useShadows: false },
        fixedOverflowWidgets: true,
        ariaLabel: `Editor for ${path}`,
      }}
    />
  );
}

/**
 * Read-only side-by-side diff. `modelKey` scopes the Monaco models (e.g. to a snapshot id) so a
 * file's diff never shows stale text from a previous comparison. Models are kept on unmount:
 * disposing them before the widget resets throws inside Monaco, and they are tiny.
 */
export function MonacoDiff({ original, modified, language, path, modelKey = "diff" }: { original: string; modified: string; language: string; path: string; modelKey?: string }) {
  const monacoRef = useRef<Monaco | null>(null);
  const theme = useCodexaTheme(monacoRef);
  return (
    <DiffEditor
      original={original}
      modified={modified}
      language={language}
      originalModelPath={`diff-original:///${modelKey}/${path}`}
      modifiedModelPath={`diff-modified:///${modelKey}/${path}`}
      keepCurrentOriginalModel
      keepCurrentModifiedModel
      theme={theme}
      loading={<Loading />}
      beforeMount={configure}
      onMount={(_e, monaco) => {
        monacoRef.current = monaco;
      }}
      options={{
        readOnly: true,
        originalEditable: false,
        renderSideBySide: true,
        fontSize: 12.5,
        lineHeight: 19,
        fontFamily: "var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, monospace",
        fontLigatures: true,
        minimap: { enabled: false },
        automaticLayout: true,
        scrollBeyondLastLine: false,
        renderOverviewRuler: false,
        diffWordWrap: "on",
      }}
    />
  );
}
