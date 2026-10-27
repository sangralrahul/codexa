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

/** Leading "1. " of a numbered step heading, written by the author in the markdown. */
const STEP_PREFIX = /^(\d+)\.\s+/;

/**
 * rehype plugin (steps mode): wraps each numbered H2 ("## 1. Create a project") and everything up to
 * the next H2 in a `div[data-step]`, so the step can draw a continuous rail down its left edge. The
 * heading keeps its text and id (rehype-slug runs first), so the table of contents is unchanged.
 */
function rehypeSteps() {
  return (tree: HastNode) => {
    const out: HastNode[] = [];
    let current: HastNode | null = null;
    for (const node of tree.children ?? []) {
      if (node.type === "element" && node.tagName === "h2") {
        const m = STEP_PREFIX.exec(hastText(node));
        if (m) {
          node.properties = { ...node.properties, dataStepHeading: m[1] };
          current = { type: "element", tagName: "div", properties: { dataStep: m[1] }, children: [node] };
          out.push(current);
          continue;
        }
        current = null;
      }
      if (current) current.children!.push(node);
      else out.push(node);
    }
    tree.children = out;
  };
}

/** Drops the author's "1. " from the first text child (the step badge shows the number instead). */
function stripStepPrefix(children: React.ReactNode): React.ReactNode {
  const arr = React.Children.toArray(children);
  if (typeof arr[0] === "string") arr[0] = arr[0].replace(STEP_PREFIX, "");
  return arr;
}

function Heading({ level, id, step, children, className }: { level: 2 | 3; id?: string; step?: string; children: React.ReactNode; className?: string }) {
  const Tag = level === 2 ? "h2" : "h3";
  return (
    <Tag id={id} className={cn("group flex items-baseline gap-2", className)}>
      {step ? (
        <>
          <span
            aria-hidden="true"
            className="absolute -left-[15px] grid size-[29px] -translate-y-px place-items-center rounded-full border border-border-strong bg-background font-mono text-[12px] font-medium text-foreground shadow-[0_0_0_4px_var(--background)]"
          >
            {step}
          </span>
          <span className="sr-only">Step {step}: </span>
        </>
      ) : null}
      <span>{step ? stripStepPrefix(children) : children}</span>
      {id ? (
        <a href={`#${id}`} aria-label={`Link to section`} className="!text-muted-foreground opacity-0 transition hover:!text-foreground focus-visible:opacity-100 group-hover:opacity-100 !no-underline">
          <LinkIcon className="size-3.5" aria-hidden="true" />
        </a>
      ) : null}
    </Tag>
  );
}

const components: Components = {
  h2: ({ node, children, id }) => {
    const step = (node as HastNode | undefined)?.properties?.dataStepHeading;
    return (
      <Heading level={2} id={id} step={typeof step === "string" ? step : undefined}>
        {children}
      </Heading>
    );
  },
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
 * `steps`: numbered H2s ("## 1. …") become a step rail: a numbered badge on a vertical line that
 * runs down each step's content (for quickstarts, guides and tutorials).
 */
export function Markdown({ children, className, steps = false }: { children: string; className?: string; steps?: boolean }) {
  return (
    <div
      className={cn(
        "prose-codexa",
        steps &&
          // Each step is a block with a left rail; the heading's top margin stays inside it (pt-px) so the
          // rail runs unbroken from step to step. Step 1's rail starts at its badge.
          "[&_[data-step]]:relative [&_[data-step]]:ml-3.5 [&_[data-step]]:border-l [&_[data-step]]:border-border [&_[data-step]]:pb-2 [&_[data-step]]:pl-8 [&_[data-step]]:pt-px [&_[data-step='1']]:mt-10 [&_[data-step='1']>h2:first-child]:mt-0",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={steps ? [rehypeSlug, rehypeSteps, [rehypeHighlight, { detect: false, ignoreMissing: true }]] : [rehypeSlug, [rehypeHighlight, { detect: false, ignoreMissing: true }]]}
        components={components}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
