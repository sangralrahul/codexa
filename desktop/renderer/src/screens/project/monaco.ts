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

// Syntax colours: the same palette as the web editor (--syn-* in src/app/globals.css). The app chrome
// stays monochrome; code keeps its colours so it reads at a glance. Light mode uses deeper versions
// of each hue so they hold contrast on white.
const DARK = { fg: "e6e6e6", keyword: "c4a7ff", string: "9fe0b0", fn: "8fb8ff", tag: "ff9f7a", number: "ffcf7a", comment: "7d8594", attr: "7fd8d0", type: "8fe3e0", delim: "a1a1aa" };
const LIGHT = { fg: "1f2328", keyword: "7c3aed", string: "15803d", fn: "1d4ed8", tag: "c2410c", number: "b45309", comment: "6b7280", attr: "0f766e", type: "0e7490", delim: "57606a" };

function rules(c: typeof DARK) {
  return [
    { token: "", foreground: c.fg },
    { token: "comment", foreground: c.comment, fontStyle: "italic" },
    { token: "keyword", foreground: c.keyword },
    { token: "keyword.control", foreground: c.keyword },
    { token: "storage", foreground: c.keyword },
    { token: "string", foreground: c.string },
    { token: "string.escape", foreground: c.number },
    { token: "number", foreground: c.number },
    { token: "regexp", foreground: c.string },
    { token: "type", foreground: c.type },
    { token: "type.identifier", foreground: c.type },
    { token: "identifier", foreground: c.fg },
    { token: "delimiter", foreground: c.delim },
    { token: "tag", foreground: c.tag },
    { token: "metatag", foreground: c.tag },
    { token: "attribute.name", foreground: c.attr },
    { token: "attribute.value", foreground: c.string },
    { token: "variable.predefined", foreground: c.fn },
    { token: "function", foreground: c.fn },
    { token: "key", foreground: c.attr },
    { token: "string.key.json", foreground: c.attr },
    { token: "string.value.json", foreground: c.string },
    { token: "keyword.json", foreground: c.keyword },
    { token: "selector", foreground: c.tag },
    { token: "attribute.value.number", foreground: c.number },
    { token: "attribute.value.unit", foreground: c.number },
    { token: "markup.heading", foreground: c.fn, fontStyle: "bold" },
  ];
}

monaco.editor.defineTheme("codexa-dark", {
  base: "vs-dark",
  inherit: true,
  rules: rules(DARK),
  colors: {
    "editor.background": "#000000",
    "editor.foreground": "#e6e6e6",
    "editor.lineHighlightBackground": "#0a0a0a",
    "editorGutter.background": "#000000",
    "editorLineNumber.foreground": "#4a4a4a",
    "editorLineNumber.activeForeground": "#a1a1a1",
    "editorIndentGuide.background1": "#1f1f1f",
    "editorIndentGuide.activeBackground1": "#3a3a3a",
    "editor.selectionBackground": "#264f78",
    "editor.inactiveSelectionBackground": "#3a3d41",
    "editorCursor.foreground": "#ededed",
    "editorWidget.background": "#0a0a0a",
    "editorWidget.border": "#2b2b2b",
    "editorBracketHighlight.foreground1": "#ffd700",
    "editorBracketHighlight.foreground2": "#da70d6",
    "editorBracketHighlight.foreground3": "#179fff",
    "editorBracketMatch.border": "#6e6e6e",
  },
});

monaco.editor.defineTheme("codexa-light", {
  base: "vs",
  inherit: true,
  rules: rules(LIGHT),
  colors: {
    "editor.background": "#ffffff",
    "editor.foreground": "#1f2328",
    "editor.lineHighlightBackground": "#fafafa",
    "editorLineNumber.foreground": "#b5b5b5",
    "editorLineNumber.activeForeground": "#666666",
    "editorIndentGuide.background1": "#ebebeb",
    "editorIndentGuide.activeBackground1": "#c8c8c8",
    "editor.selectionBackground": "#add6ff",
    "editor.inactiveSelectionBackground": "#e5ebf1",
    "editorCursor.foreground": "#0a0a0a",
    "editorBracketHighlight.foreground1": "#0431fa",
    "editorBracketHighlight.foreground2": "#319331",
    "editorBracketHighlight.foreground3": "#7b3814",
    "editorBracketMatch.border": "#a3a3a3",
  },
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
