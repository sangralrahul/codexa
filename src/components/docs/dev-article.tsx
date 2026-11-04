import type { ReactNode } from "react";
import { Markdown } from "@/components/content";
import { extractHeadings } from "@/lib/content/markdown";
import { DEV_SIDEBAR } from "@/lib/content/nav";
import { getRoute } from "@/config/routes";
import { ArticleBody, ArticleShell } from "./article-layout";
import type { Crumb } from "./breadcrumbs";

/**
 * Hand-written developer page: markdown body + optional React children
 * rendered after it, inside the developer sidebar and with a table of
 * contents derived from the markdown headings.
 */
export function DevArticle({ path, markdown, children, crumbs, extraHeadings = [] }: { path: string; markdown: string; children?: ReactNode; crumbs?: Crumb[]; extraHeadings?: { depth: 2 | 3; text: string; id: string }[] }) {
  const route = getRoute(path);
  const title = route?.title ?? path;
  const trail: Crumb[] = crumbs ?? (path.startsWith("/api/") ? [{ name: "Developers", path: "/developers" }, { name: "API", path: "/api" }, { name: title, path }] : path === "/developers" ? [{ name: "Developers", path }] : [{ name: "Developers", path: "/developers" }, { name: title, path }]);
  const headings = [...extractHeadings(markdown), ...extraHeadings];
  // Reading time from the page's own text (220 words a minute), the same rule as the markdown pages.
  const minutes = Math.max(1, Math.round(markdown.replace(/```[\s\S]*?```/g, " ").split(/\s+/).filter(Boolean).length / 220));
  const kicker = path.startsWith("/api") ? "API" : path === "/developers" ? "Developers" : path === "/sdk" ? "SDK" : path === "/cli" ? "CLI" : "Developers";
  const meta = (
    <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[12px] text-muted-foreground">
      <span>Codexa Team</span>
      <span aria-hidden="true" className="text-foreground-dim">
        ·
      </span>
      <span>{minutes} min read</span>
      {headings.length >= 2 ? (
        <>
          <span aria-hidden="true" className="text-foreground-dim">
            ·
          </span>
          <span>{headings.filter((h) => h.depth === 2).length} sections</span>
        </>
      ) : null}
    </p>
  );
  return (
    <ArticleShell sidebar={DEV_SIDEBAR}>
      <ArticleBody crumbs={trail} title={title} description={route?.description} headings={headings} kicker={kicker} meta={meta}>
        <Markdown>{markdown}</Markdown>
        {children}
      </ArticleBody>
    </ArticleShell>
  );
}
