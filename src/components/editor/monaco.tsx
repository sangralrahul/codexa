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

loader.config({ paths: { vs: "/monaco/vs" } });

let themesDefined = false;
function defineThemes(monaco: Monaco) {
  if (themesDefined) return;
  themesDefined = true;
  monaco.editor.defineTheme("codexa-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": "#0b0c0f",
      "editor.lineHighlightBackground": "#14161b",
      "editorGutter.background": "#0b0c0f",
      "editor.selectionBackground": "#2f4a86",
      "editorLineNumber.foreground": "#4c5261",
      "editorLineNumber.activeForeground": "#9aa3b2",
      "editorIndentGuide.background1": "#1f2229",
    },
  });
  monaco.editor.defineTheme("codexa-light", {
    base: "vs",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": "#ffffff",
      "editor.lineHighlightBackground": "#f4f6f9",
      "editorLineNumber.foreground": "#9aa3b2",
      "editorLineNumber.activeForeground": "#5b6270",
    },
  });
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
};

const Loading = () => (
  <div className="flex h-full items-center justify-center text-sm text-muted-foreground" role="status">
    <Spinner className="mr-2" /> Loading editor…
  </div>
);

export function MonacoCodeEditor({ path, language, value, readOnly, onChange, onMount, onSave, onQuickOpen, onSearchAll, revealLine, revision = 0 }: CodeEditorProps) {
  const { resolved } = useTheme();
  const theme = resolved === "dark" ? "codexa-dark" : "codexa-light";
  const editorRef = useRef<MonacoEditorNs.IStandaloneCodeEditor | null>(null);
  const cbs = useRef({ onSave, onQuickOpen, onSearchAll });
  useEffect(() => {
    cbs.current = { onSave, onQuickOpen, onSearchAll };
  }, [onSave, onQuickOpen, onSearchAll]);

  const handleMount = useCallback<OnMount>(
    (editor, monaco) => {
      editorRef.current = editor;
      const KM = monaco.KeyMod;
      const KC = monaco.KeyCode;
      editor.addCommand(KM.CtrlCmd | KC.KeyS, () => cbs.current.onSave?.());
      editor.addCommand(KM.CtrlCmd | KC.KeyP, () => cbs.current.onQuickOpen?.());
      editor.addCommand(KM.CtrlCmd | KM.Shift | KC.KeyF, () => cbs.current.onSearchAll?.());
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

  return (
    <Editor
      path={`file:///${path}`}
      language={language}
      defaultValue={value}
      theme={theme}
      loading={<Loading />}
      beforeMount={defineThemes}
      onMount={handleMount}
      onChange={(v) => onChange(v ?? "")}
      options={{
        readOnly,
        fontSize: 13,
        fontFamily: "var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, monospace",
        fontLigatures: false,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        wordWrap: "off",
        renderLineHighlight: "line",
        smoothScrolling: true,
        cursorBlinking: "smooth",
        padding: { top: 12 },
        bracketPairColorization: { enabled: true },
        scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
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
  const { resolved } = useTheme();
  return (
    <DiffEditor
      original={original}
      modified={modified}
      language={language}
      originalModelPath={`diff-original:///${modelKey}/${path}`}
      modifiedModelPath={`diff-modified:///${modelKey}/${path}`}
      keepCurrentOriginalModel
      keepCurrentModifiedModel
      theme={resolved === "dark" ? "codexa-dark" : "codexa-light"}
      loading={<Loading />}
      beforeMount={defineThemes}
      options={{
        readOnly: true,
        originalEditable: false,
        renderSideBySide: true,
        fontSize: 12,
        minimap: { enabled: false },
        automaticLayout: true,
        scrollBeyondLastLine: false,
        renderOverviewRuler: false,
        diffWordWrap: "on",
      }}
    />
  );
}
