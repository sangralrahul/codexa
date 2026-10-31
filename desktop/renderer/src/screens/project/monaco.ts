import * as monaco from "monaco-editor";
import EditorWorker from "monaco-editor/editor/editor.worker?worker";
import JsonWorker from "monaco-editor/language/json/json.worker?worker";
import CssWorker from "monaco-editor/language/css/css.worker?worker";
import HtmlWorker from "monaco-editor/language/html/html.worker?worker";
import TsWorker from "monaco-editor/language/typescript/ts.worker?worker";

// Monaco is bundled with the app (no CDN); its language workers run from the app's own files.
self.MonacoEnvironment = {
  getWorker(_id: string, label: string) {
    if (label === "json") return new JsonWorker();
    if (label === "css" || label === "scss" || label === "less") return new CssWorker();
    if (label === "html" || label === "handlebars" || label === "razor") return new HtmlWorker();
    if (label === "typescript" || label === "javascript") return new TsWorker();
    return new EditorWorker();
  },
};

// The project's files live on the server; the editor checks syntax but doesn't resolve imports.
type TsDefaults = { setDiagnosticsOptions: (o: object) => void; setCompilerOptions: (o: object) => void };
type TsApi = { typescriptDefaults: TsDefaults; javascriptDefaults: TsDefaults };
// Monaco 0.55+ exposes the TypeScript API as monaco.typescript (older: monaco.languages.typescript).
const ts = ((monaco as unknown as { typescript?: TsApi }).typescript ?? (monaco.languages as unknown as { typescript?: TsApi }).typescript) as TsApi | undefined;
for (const d of [ts?.typescriptDefaults, ts?.javascriptDefaults]) {
  d?.setDiagnosticsOptions({ noSemanticValidation: true, noSyntaxValidation: false });
  d?.setCompilerOptions({ jsx: 4, allowJs: true, target: 99, module: 99, moduleResolution: 2, allowNonTsExtensions: true, esModuleInterop: true });
}

monaco.editor.defineTheme("codexa-dark", {
  base: "vs-dark",
  inherit: true,
  rules: [
    { token: "", foreground: "d4d4d4" },
    { token: "keyword", foreground: "ffffff" },
    { token: "type", foreground: "ededed" },
    { token: "type.identifier", foreground: "ededed" },
    { token: "identifier", foreground: "d4d4d4" },
    { token: "string", foreground: "a1a1a1" },
    { token: "number", foreground: "ededed" },
    { token: "comment", foreground: "6e6e6e", fontStyle: "italic" },
    { token: "delimiter", foreground: "8a8a8a" },
    { token: "tag", foreground: "ffffff" },
    { token: "attribute.name", foreground: "bdbdbd" },
    { token: "attribute.value", foreground: "a1a1a1" },
    { token: "regexp", foreground: "a1a1a1" },
  ],
  colors: { "editor.background": "#000000", "editor.lineHighlightBackground": "#0a0a0a", "editorGutter.background": "#000000", "editorLineNumber.foreground": "#4a4a4a", "editorLineNumber.activeForeground": "#a1a1a1", "editorIndentGuide.background1": "#1f1f1f", "editor.selectionBackground": "#3a3a3a", "editorCursor.foreground": "#ededed", "editorWidget.background": "#0a0a0a", "editorWidget.border": "#2b2b2b", "editorBracketHighlight.foreground1": "#a1a1a1", "editorBracketHighlight.foreground2": "#a1a1a1", "editorBracketHighlight.foreground3": "#a1a1a1", "editorBracketHighlight.foreground4": "#a1a1a1", "editorBracketHighlight.foreground5": "#a1a1a1", "editorBracketHighlight.foreground6": "#a1a1a1", "editorBracketMatch.border": "#6e6e6e" },
});
monaco.editor.defineTheme("codexa-light", {
  base: "vs",
  inherit: true,
  rules: [
    { token: "", foreground: "262626" },
    { token: "keyword", foreground: "000000" },
    { token: "type", foreground: "0a0a0a" },
    { token: "type.identifier", foreground: "0a0a0a" },
    { token: "identifier", foreground: "262626" },
    { token: "string", foreground: "5c5c5c" },
    { token: "number", foreground: "0a0a0a" },
    { token: "comment", foreground: "8f8f8f", fontStyle: "italic" },
    { token: "delimiter", foreground: "737373" },
    { token: "tag", foreground: "000000" },
    { token: "attribute.name", foreground: "404040" },
    { token: "attribute.value", foreground: "5c5c5c" },
    { token: "regexp", foreground: "5c5c5c" },
  ],
  colors: { "editor.background": "#ffffff", "editor.lineHighlightBackground": "#fafafa", "editorLineNumber.foreground": "#b5b5b5", "editorLineNumber.activeForeground": "#5c5c5c", "editorIndentGuide.background1": "#ebebeb", "editor.selectionBackground": "#e0e0e0", "editorCursor.foreground": "#0a0a0a", "editorBracketHighlight.foreground1": "#5c5c5c", "editorBracketHighlight.foreground2": "#5c5c5c", "editorBracketHighlight.foreground3": "#5c5c5c", "editorBracketHighlight.foreground4": "#5c5c5c", "editorBracketHighlight.foreground5": "#5c5c5c", "editorBracketHighlight.foreground6": "#5c5c5c", "editorBracketMatch.border": "#a3a3a3" },
});

const LANG: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  json: "json",
  css: "css",
  scss: "scss",
  html: "html",
  md: "markdown",
  yml: "yaml",
  yaml: "yaml",
  sql: "sql",
  svg: "xml",
  xml: "xml",
};
export const languageFor = (path: string) => LANG[path.split(".").pop()?.toLowerCase() ?? ""] ?? "plaintext";

export { monaco };
