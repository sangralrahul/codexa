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
  const diag = { diagnosticCodesToIgnore: [2307, 2792, 7016, 2503, 2580, 2304] }; // cannot find module / name
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
};

const Loading = () => (
  <div className="flex h-full items-center justify-center text-sm text-muted-foreground" role="status">
    <Spinner className="mr-2" /> Loading editor…
  </div>
);

export function MonacoCodeEditor({ path, language, value, readOnly, onChange, onMount, onSave, onQuickOpen, onSearchAll, revealLine }: CodeEditorProps) {
  const { resolved } = useTheme();
  const theme = resolved === "dark" ? "codexa-dark" : "codexa-light";
  const editorRef = useRef<MonacoEditorNs.IStandaloneCodeEditor | null>(null);
  const cbs = useRef({ onSave, onQuickOpen, onSearchAll });
  cbs.current = { onSave, onQuickOpen, onSearchAll };

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
      value={value}
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

export function MonacoDiff({ original, modified, language, path }: { original: string; modified: string; language: string; path: string }) {
  const { resolved } = useTheme();
  return (
    <DiffEditor
      original={original}
      modified={modified}
      language={language}
      originalModelPath={`diff-original:///${path}`}
      modifiedModelPath={`diff-modified:///${path}`}
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
