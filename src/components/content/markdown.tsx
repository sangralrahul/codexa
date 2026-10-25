import * as React from "react";
import Link from "next/link";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeHighlight from "rehype-highlight";
import { Link as LinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { CodeBlock } from "./code-block";
import { Callout, CALLOUT_PREFIX } from "./callout";

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

function Heading({ level, id, children, className }: { level: 2 | 3; id?: string; children: React.ReactNode; className?: string }) {
  const Tag = level === 2 ? "h2" : "h3";
  return (
    <Tag id={id} className={cn("group flex items-baseline gap-2", className)}>
      <span>{children}</span>
      {id ? (
        <a href={`#${id}`} aria-label={`Link to section`} className="!text-muted-foreground opacity-0 transition hover:!text-foreground focus-visible:opacity-100 group-hover:opacity-100 !no-underline">
          <LinkIcon className="size-3.5" aria-hidden="true" />
        </a>
      ) : null}
    </Tag>
  );
}

const components: Components = {
  h2: ({ node: _n, children, id }) => (
    <Heading level={2} id={id}>
      {children}
    </Heading>
  ),
  h3: ({ node: _n, children, id }) => (
    <Heading level={3} id={id}>
      {children}
    </Heading>
  ),
  pre: ({ node, children }) => <CodeBlock language={languageOf(node as HastNode | undefined)}>{children}</CodeBlock>,
  a: ({ node: _n, href = "", children, ...rest }) => {
    const internal = href.startsWith("/") || href.startsWith("#");
    if (internal) {
      return (
        <Link href={href} {...rest}>
          {children}
        </Link>
      );
    }
    return (
      <a href={href} rel="noopener noreferrer" target={href.startsWith("http") ? "_blank" : undefined} {...rest}>
        {children}
      </a>
    );
  },
  table: ({ node: _n, children }) => (
    <div className="my-4 overflow-x-auto">
      <table>{children}</table>
    </div>
  ),
  blockquote: ({ node, children }) => {
    const first = (node as HastNode | undefined)?.children?.find((c) => c.tagName === "p");
    const text = hastText(first).trimStart();
    const m = /^([A-Za-z]+):\s/.exec(text);
    const kind = m ? CALLOUT_PREFIX[m[1].toLowerCase()] : undefined;
    if (kind) {
      // Strip the "Note:" prefix from the first paragraph when rendering.
      const items = React.Children.toArray(children).filter((c) => typeof c !== "string" || c.trim() !== "");
      const [firstEl, ...rest] = items;
      const stripped = React.isValidElement<{ children?: React.ReactNode }>(firstEl) ? React.cloneElement(firstEl, {}, stripPrefix(firstEl.props.children, m![0])) : firstEl;
      return (
        <Callout kind={kind}>
          {stripped}
          {rest}
        </Callout>
      );
    }
    return <blockquote>{children}</blockquote>;
  },
  img: ({ node: _n, alt = "", src }) => (
    // Content images are local, static assets; Next <Image> needs dimensions we do not have.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={typeof src === "string" ? src : undefined} alt={alt} loading="lazy" />
  ),
};

function stripPrefix(children: React.ReactNode, prefix: string): React.ReactNode {
  const arr = React.Children.toArray(children);
  if (!arr.length) return children;
  const [head, ...tail] = arr;
  if (typeof head === "string") {
    return [head.startsWith(prefix) ? head.slice(prefix.length) : head, ...tail];
  }
  if (React.isValidElement<{ children?: React.ReactNode }>(head) && head.type === "strong") {
    // "**Note:** text" → drop the strong element and leading whitespace.
    const rest = tail.map((t, i) => (i === 0 && typeof t === "string" ? t.replace(/^[:\s]+/, "") : t));
    return rest;
  }
  return children;
}

/**
 * Server-rendered markdown with GitHub tables/task lists, heading ids, syntax
 * highlighting, copyable code blocks and callouts.
 */
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn("prose-codexa", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSlug, [rehypeHighlight, { detect: false, ignoreMissing: true }]]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
