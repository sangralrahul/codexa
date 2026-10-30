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
  rules: [],
  colors: { "editor.background": "#16181c", "editor.lineHighlightBackground": "#1c1f24", "editorGutter.background": "#16181c", "editorLineNumber.foreground": "#4b515b", "editorIndentGuide.background1": "#262a31" },
});
monaco.editor.defineTheme("codexa-light", {
  base: "vs",
  inherit: true,
  rules: [],
  colors: { "editor.background": "#ffffff", "editor.lineHighlightBackground": "#f5f6f8", "editorLineNumber.foreground": "#b3b9c3", "editorIndentGuide.background1": "#e4e7eb" },
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
