import * as React from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import { WrapText } from "lucide-react";
import rehypeHighlight from "rehype-highlight";
import { CopyButton } from "@/components/content/code-block";
import { tokenize, type CodeLang, type TokenKind } from "@/components/vignettes/tokenize";
import { cn } from "@/lib/utils";
import { FileGlyph } from "./file-tree";

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

/** Languages the shared tokenizer colours with the --syn-* tokens (same palette as the IDE and vignettes). */
const TOKEN_LANG: Record<string, CodeLang> = { typescript: "ts", tsx: "tsx", javascript: "js", jsx: "tsx", json: "json", xml: "html", css: "css", sql: "sql" };

const COLOR: Record<TokenKind, string> = {
  keyword: "text-syn-keyword",
  string: "text-syn-string",
  fn: "text-syn-fn",
  tag: "text-syn-tag",
  number: "text-syn-number",
  comment: "text-syn-comment italic",
  attr: "text-syn-attr",
  type: "text-syn-type",
  punct: "text-code-fg/60",
  plain: "",
};

/** True when the file renders line by line, so the "Wrap" toggle can wrap it with numbers aligned. */
export function canWrapCode(path: string) {
  return Boolean(TOKEN_LANG[languageForPath(path)]);
}

/**
 * "Wrap" toggle for CodeViewer (lines wrap while a `[data-code-wrap]` checkbox inside the nearest
 * `group/code` ancestor is checked; server-safe: a real checkbox, so it is keyboard- and
 * screen-reader-operable without JS). Place it anywhere inside a `group/code` ancestor of the
 * viewer; CodeViewer's own header already includes one.
 */
export function CodeWrapToggle({ className }: { className?: string }) {
  return (
    <label
      className={cn(
        "inline-flex h-7 cursor-pointer select-none items-center gap-1.5 rounded-md px-2 font-mono text-[11.5px] text-code-muted transition-colors duration-(--dur-2) hover:bg-white/[0.06] hover:text-code-fg",
        "has-[:checked]:bg-white/[0.08] has-[:checked]:text-code-fg has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring",
        className,
      )}
    >
      <input type="checkbox" data-code-wrap="" className="sr-only" />
      <WrapText className="size-3.5" aria-hidden="true" />
      Wrap
    </label>
  );
}

const mdComponents: Components = {
  pre: ({ children }) => <>{children}</>,
  code: ({ className, children }) => <code className={cn(className, "block")}>{children}</code>,
};

/**
 * Server-rendered, read-only source view with line numbers, on a dark code pane in both themes.
 * TS/TSX/JS/JSON/HTML/CSS/SQL use the shared tokenizer; other files fall back to rehype-highlight.
 * The code is real text in a <pre> (selectable, readable by assistive tech); line numbers are
 * aria-hidden. No Monaco on marketing pages. `bare` drops the header (when the caller draws tabs;
 * put a CodeWrapToggle in it, inside a `group/code` wrapper). Long lines scroll sideways under a
 * right-edge fade, or wrap (numbers stay aligned) while the Wrap toggle is on.
 */
export function CodeViewer({ path, code, className, bare = false, maxHeight }: { path: string; code: string; className?: string; bare?: boolean; maxHeight?: string }) {
  const language = languageForPath(path);
  const source = code.replace(/\n$/, "");
  const lines = source.split("\n");
  const tokenLang = TOKEN_LANG[language];
  const width = String(lines.length).length;

  let body: React.ReactNode;
  if (tokenLang) {
    const tokens = tokenize(source, tokenLang);
    body = tokens.map((line, i) => (
      <span key={i} className="flex">
        <span aria-hidden="true" className="sticky left-0 mr-4 shrink-0 select-none bg-code-bg pr-1 text-right tabular-nums text-code-muted/80" style={{ minWidth: `${width + 1}ch` }}>
          {i + 1}
        </span>
        <span className={"whitespace-pre group-has-[[data-code-wrap]:checked]/code:min-w-0 group-has-[[data-code-wrap]:checked]/code:whitespace-pre-wrap group-has-[[data-code-wrap]:checked]/code:[overflow-wrap:anywhere]"}>
          {line.length === 0 ? " " : line.map((t, j) => (t.k === "plain" ? <React.Fragment key={j}>{t.v}</React.Fragment> : <span key={j} className={COLOR[t.k]}>{t.v}</span>))}
        </span>
      </span>
    ));
  } else {
    const longestRun = Math.max(3, ...(source.match(/`+/g) ?? []).map((m) => m.length + 1));
    const fence = "`".repeat(longestRun);
    const markdown = `${fence}${language === "plaintext" ? "" : language}\n${source}\n${fence}`;
    body = (
      <span className="flex">
        <span aria-hidden="true" className="sticky left-0 mr-4 flex shrink-0 select-none flex-col bg-code-bg pr-1 text-right tabular-nums text-code-muted/80" style={{ minWidth: `${width + 1}ch` }}>
          {lines.map((_, i) => (
            <span key={i}>{i + 1}</span>
          ))}
        </span>
        <span className="min-w-0 whitespace-pre">
          <ReactMarkdown rehypePlugins={[[rehypeHighlight, { detect: false, ignoreMissing: true }]]} components={mdComponents}>
            {markdown}
          </ReactMarkdown>
        </span>
      </span>
    );
  }

  const name = path.split("/").pop() ?? path;
  return (
    <figure className={cn("group/code min-w-0 overflow-hidden bg-code-bg text-code-fg", !bare && "rounded-md border border-code-border", className)}>
      {!bare ? (
        <figcaption className="flex h-10 items-center justify-between gap-3 border-b border-code-border bg-white/[0.02] pl-3.5 pr-1.5">
          <span className="flex min-w-0 items-center gap-2 font-mono text-[12px]">
            <FileGlyph name={name} />
            <span className="truncate text-code-fg/90">{path}</span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <span className="text-meta text-code-muted">
              {lines.length} line{lines.length === 1 ? "" : "s"}
            </span>
            {tokenLang ? <CodeWrapToggle /> : null}
            <CopyButton text={code} label={`Copy ${name}`} />
          </span>
        </figcaption>
      ) : (
        <figcaption className="sr-only">{path}</figcaption>
      )}
      <div className="relative">
        <pre tabIndex={0} aria-label={`${path} source`} className="scrollbar-thin !m-0 !rounded-none !border-0 !bg-transparent !p-0 font-mono text-[12.5px] leading-[1.7] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring" style={maxHeight ? { maxHeight, overflow: "auto" } : { overflowX: "auto" }}>
          <code className={cn("block min-w-max px-3 py-3.5", tokenLang && "group-has-[[data-code-wrap]:checked]/code:min-w-0 group-has-[[data-code-wrap]:checked]/code:pr-5")}>{body}</code>
        </pre>
        {/* Lines that run past the edge fade out instead of being cut mid-word (clear of the scrollbars). */}
        <span aria-hidden="true" className={cn("pointer-events-none absolute bottom-2 right-2 top-0 w-12 bg-gradient-to-l from-code-bg to-transparent", tokenLang && "group-has-[[data-code-wrap]:checked]/code:hidden")} />
      </div>
    </figure>
  );
}
