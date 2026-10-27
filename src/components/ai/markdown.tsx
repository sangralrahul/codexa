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
    <div className="group relative my-2 overflow-hidden rounded-xl border border-code-border bg-code-bg text-code-fg">
      <div className="flex items-center justify-between border-b border-code-border px-3 py-1 font-mono text-[11px] text-code-muted">
        <span>{language ?? "code"}</span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 transition-colors hover:bg-code-fg/10 hover:text-code-fg focus-visible:outline-2 focus-visible:outline-ring"
          aria-label={copied ? "Copied" : "Copy code"}
        >
          {copied ? <Check className="pop-in size-3 text-success" aria-hidden="true" /> : <Copy className="size-3" aria-hidden="true" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-[12.5px] leading-relaxed [&>code]:bg-transparent [&>code]:p-0 [&>code]:text-code-fg [&>code]:shadow-none">{children}</pre>
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
    <code className={cn("rounded-md bg-muted px-1 py-0.5 font-mono text-[0.84em] shadow-[inset_0_0_0_1px_var(--border)]", className)} {...rest}>
      {children}
    </code>
  ),
  a: ({ node: _n, href = "", children, ...rest }) => (
    <a href={href} target={href.startsWith("/") ? undefined : "_blank"} rel={href.startsWith("/") ? undefined : "noreferrer noopener"} className="font-medium text-foreground underline decoration-signal/50 underline-offset-[3px] transition-colors hover:decoration-signal" {...rest}>
      {children}
    </a>
  ),
  // Model headings sit inside a chat message: keep the page's single h1 and a sane outline
  // by rendering them a few levels down, at chat-sized type.
  h1: ({ node: _n, children }) => <h3 className="text-[16px] font-semibold tracking-tight">{children}</h3>,
  h2: ({ node: _n, children }) => <h4 className="text-[15px] font-semibold">{children}</h4>,
  h3: ({ node: _n, children }) => <h5 className="text-[15px] font-medium">{children}</h5>,
  h4: ({ node: _n, children }) => <h6 className="text-[14px] font-medium">{children}</h6>,
  h5: ({ node: _n, children }) => <h6 className="text-[14px] font-medium">{children}</h6>,
  h6: ({ node: _n, children }) => <h6 className="text-[14px] font-medium text-muted-foreground">{children}</h6>,
  table: ({ node: _n, children }) => (
    <div className="my-2 overflow-x-auto">
      <table className="w-full border-collapse text-xs [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:px-2 [&_th]:py-1 [&_th]:text-left">{children}</table>
    </div>
  ),
};

/** Renders assistant text as Markdown (GFM). Content is untrusted: no raw HTML is rendered. */
export function AiMarkdown({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn("ai-markdown text-[15px] leading-[1.65] text-pretty [&>*+*]:mt-2.5 [&_li+li]:mt-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:marker:text-muted-foreground [&_strong]:font-semibold [&_blockquote]:border-l-2 [&_blockquote]:border-border-strong [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components} skipHtml>
        {text}
      </ReactMarkdown>
    </div>
  );
}
