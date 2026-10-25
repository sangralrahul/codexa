import { basename, extensionOf } from "@/lib/client/workspace/paths";

/** Map a file path to a Monaco language id. Unknown extensions fall back to plaintext. */
const byExtension: Record<string, string> = {
  ts: "typescript",
  mts: "typescript",
  cts: "typescript",
  tsx: "typescript",
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  jsx: "javascript",
  json: "json",
  jsonc: "json",
  css: "css",
  scss: "scss",
  less: "less",
  html: "html",
  htm: "html",
  md: "markdown",
  mdx: "markdown",
  yml: "yaml",
  yaml: "yaml",
  toml: "ini",
  ini: "ini",
  env: "ini",
  sql: "sql",
  sh: "shell",
  bash: "shell",
  zsh: "shell",
  py: "python",
  go: "go",
  rs: "rust",
  svg: "xml",
  xml: "xml",
  txt: "plaintext",
  graphql: "graphql",
  gql: "graphql",
  dockerfile: "dockerfile",
};

const byName: Record<string, string> = {
  dockerfile: "dockerfile",
  ".env": "ini",
  ".env.local": "ini",
  ".env.example": "ini",
  ".gitignore": "plaintext",
  ".npmrc": "ini",
  ".prettierrc": "json",
  ".eslintrc": "json",
  "tsconfig.json": "json",
};

export function languageForPath(path: string): string {
  const name = basename(path).toLowerCase();
  if (byName[name]) return byName[name];
  if (name.startsWith(".env")) return "ini";
  const ext = extensionOf(path);
  return byExtension[ext] ?? "plaintext";
}

/** Human label used in the status bar. */
export function languageLabel(id: string): string {
  const labels: Record<string, string> = {
    typescript: "TypeScript",
    javascript: "JavaScript",
    json: "JSON",
    css: "CSS",
    scss: "SCSS",
    less: "Less",
    html: "HTML",
    markdown: "Markdown",
    yaml: "YAML",
    ini: "Config",
    sql: "SQL",
    shell: "Shell",
    python: "Python",
    go: "Go",
    rust: "Rust",
    xml: "XML",
    plaintext: "Plain text",
    graphql: "GraphQL",
    dockerfile: "Dockerfile",
  };
  return labels[id] ?? id;
}

/** Monaco can format these out of the box (built-in workers / formatters). */
export function canFormat(languageId: string) {
  return ["typescript", "javascript", "json", "css", "scss", "less", "html"].includes(languageId);
}
