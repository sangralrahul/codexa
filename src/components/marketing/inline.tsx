import * as React from "react";
import Link from "next/link";

const LINK_RE = /\[([^\]]+)\]\(([^)\s]+)\)/g;

/** Render a string with markdown-style links and `code` spans as React nodes. */
export function Inline({ text }: { text: string }) {
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const m of text.matchAll(LINK_RE)) {
    const start = m.index ?? 0;
    if (start > last) nodes.push(<CodeSpans key={key++} text={text.slice(last, start)} />);
    const [, label, href] = m;
    const isExternal = /^https?:\/\//.test(href) || href.startsWith("mailto:");
    nodes.push(
      isExternal ? (
        <a key={key++} href={href} className="font-medium text-primary underline underline-offset-4 hover:text-primary-hover" rel="noopener noreferrer">
          {label}
        </a>
      ) : (
        <Link key={key++} href={href} className="font-medium text-primary underline underline-offset-4 hover:text-primary-hover">
          {label}
        </Link>
      ),
    );
    last = start + m[0].length;
  }
  if (last < text.length) nodes.push(<CodeSpans key={key++} text={text.slice(last)} />);
  return <>{nodes}</>;
}

function CodeSpans({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`)/g);
  return (
    <>
      {parts.map((p, i) => (p.startsWith("`") && p.endsWith("`") && p.length > 1 ? <code key={i}>{p.slice(1, -1)}</code> : <React.Fragment key={i}>{p}</React.Fragment>))}
    </>
  );
}
