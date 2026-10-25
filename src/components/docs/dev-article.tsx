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
  return (
    <ArticleShell sidebar={DEV_SIDEBAR}>
      <ArticleBody crumbs={trail} title={title} description={route?.description} headings={headings}>
        <Markdown>{markdown}</Markdown>
        {children}
      </ArticleBody>
    </ArticleShell>
  );
}
