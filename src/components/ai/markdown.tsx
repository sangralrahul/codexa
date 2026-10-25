"use client";

import * as React from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

/** Minimal hast shape we inspect; avoids importing hast types directly. */
type HastNode = { type: string; tagName?: string; value?: string; properties?: Record<string, unknown>; children?: HastNode[] };

function hastText(node?: HastNode): string {
  if (!node) return "";
  if (node.type === "text") return node.value ?? "";
  return (node.children ?? []).map(hastText).join("");
}

function languageOf(node?: HastNode): string | undefined {
  const code = node?.children?.find((c) => c.tagName === "code");
  const cls = code?.properties?.className;
  const list = Array.isArray(cls) ? cls.map(String) : typeof cls === "string" ? cls.split(" ") : [];
  return list.find((c) => c.startsWith("language-"))?.slice("language-".length);
}

function CodeBlock({ language, code, children }: { language?: string; code: string; children: React.ReactNode }) {
  const [copied, setCopied] = React.useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };
  return (
    <div className="group relative my-2 overflow-hidden rounded-lg border border-border bg-code-bg text-code-fg">
      <div className="flex items-center justify-between border-b border-border/60 px-3 py-1 text-[11px] text-muted-foreground">
        <span>{language ?? "code"}</span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          aria-label={copied ? "Copied" : "Copy code"}
        >
          {copied ? <Check className="size-3" aria-hidden="true" /> : <Copy className="size-3" aria-hidden="true" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 text-xs leading-relaxed [&>code]:bg-transparent [&>code]:p-0">{children}</pre>
    </div>
  );
}

const components: Components = {
  pre: ({ node, children }) => {
    const n = node as HastNode | undefined;
    return (
      <CodeBlock language={languageOf(n)} code={hastText(n)}>
        {children}
      </CodeBlock>
    );
  },
  code: ({ node: _n, className, children, ...rest }) => (
    <code className={cn("rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]", className)} {...rest}>
      {children}
    </code>
  ),
  a: ({ node: _n, href = "", children, ...rest }) => (
    <a href={href} target={href.startsWith("/") ? undefined : "_blank"} rel={href.startsWith("/") ? undefined : "noreferrer noopener"} className="text-primary underline underline-offset-2" {...rest}>
      {children}
    </a>
  ),
  table: ({ node: _n, children }) => (
    <div className="my-2 overflow-x-auto">
      <table className="w-full border-collapse text-xs [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:px-2 [&_th]:py-1 [&_th]:text-left">{children}</table>
    </div>
  ),
};

/** Renders assistant text as Markdown (GFM). Content is untrusted: no raw HTML is rendered. */
export function AiMarkdown({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn("ai-markdown text-sm leading-relaxed [&>*+*]:mt-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_h1]:text-base [&_h1]:font-semibold [&_h2]:text-sm [&_h2]:font-semibold [&_h3]:text-sm [&_h3]:font-medium", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components} skipHtml>
        {text}
      </ReactMarkdown>
    </div>
  );
}
