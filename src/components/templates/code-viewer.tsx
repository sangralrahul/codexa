import ReactMarkdown, { type Components } from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import { CodeBlock } from "@/components/content/code-block";

const LANGUAGE_BY_EXT: Record<string, string> = {
  ts: "typescript",
  tsx: "tsx",
  js: "javascript",
  jsx: "jsx",
  mjs: "javascript",
  json: "json",
  html: "xml",
  css: "css",
  md: "markdown",
  yml: "yaml",
  yaml: "yaml",
  sh: "bash",
  sql: "sql",
};

export function languageForPath(path: string): string {
  const name = path.split("/").pop() ?? "";
  if (name === ".gitignore" || name === ".env" || name === ".env.example") return "bash";
  const ext = name.includes(".") ? name.split(".").pop()!.toLowerCase() : "";
  return LANGUAGE_BY_EXT[ext] ?? "plaintext";
}

const components: Components = {
  pre: ({ children }) => <>{children}</>,
  code: ({ className, children }) => (
    <code className={className} style={{ display: "block", padding: "1rem", overflowX: "auto", fontSize: "13px", lineHeight: 1.6 }}>
      {children}
    </code>
  ),
};

/**
 * Server-rendered, syntax-highlighted read-only code view. Uses react-markdown's
 * fenced code block with rehype-highlight so no Monaco bundle is loaded on
 * marketing pages. The fence is longer than any backtick run in the content.
 */
export function CodeViewer({ path, code, className }: { path: string; code: string; className?: string }) {
  const language = languageForPath(path);
  const longestRun = Math.max(3, ...(code.match(/`+/g) ?? []).map((m) => m.length + 1));
  const fence = "`".repeat(longestRun);
  const markdown = `${fence}${language === "plaintext" ? "" : language}\n${code.replace(/\n$/, "")}\n${fence}`;
  const lines = code.replace(/\n$/, "").split("\n").length;
  return (
    <figure className={className}>
      <figcaption className="flex items-center justify-between gap-3 rounded-t-lg border border-b-0 border-border bg-muted px-3 py-2 text-xs">
        <span className="truncate font-mono text-foreground">{path}</span>
        <span className="shrink-0 text-muted-foreground">
          {lines} line{lines === 1 ? "" : "s"}
        </span>
      </figcaption>
      <div className="overflow-hidden rounded-b-lg border border-border bg-code-bg text-code-fg [&_pre]:rounded-none [&_pre]:border-0">
        <CodeBlock language={language === "plaintext" ? undefined : language} className="my-0">
          <ReactMarkdown rehypePlugins={[[rehypeHighlight, { detect: false, ignoreMissing: true }]]} components={components}>
            {markdown}
          </ReactMarkdown>
        </CodeBlock>
      </div>
    </figure>
  );
}
