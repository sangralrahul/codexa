import * as React from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Code2, LifeBuoy, MessagesSquare } from "lucide-react";
import { routeMetadata } from "@/lib/seo";
import { getNavigation } from "@/lib/content";
import { sectionSidebar } from "@/lib/content/nav";
import { ArticleShell } from "@/components/docs/article-layout";
import { Breadcrumbs } from "@/components/docs/breadcrumbs";
import { DocIcon, categoryIcon } from "@/components/docs/doc-icons";
import { DeployArt, PreviewArt, PromptArt } from "@/components/docs/start-art";
import { CodeBlock } from "@/components/content/code-block";
import { SearchTrigger } from "@/components/search/search-dialog";
import { SearchExamples } from "@/components/search/search-examples";
import { tokenize, type TokenKind } from "@/components/vignettes/tokenize";
import { buttonClasses } from "@/components/ui/button";
import { parseTemplateSearch, searchTemplates, summarizeTemplate } from "@/templates";

export const metadata = routeMetadata("/docs");

/** Rotating in the hero field; deliberately different from the "Try" chips under it. */
const HERO_EXAMPLES = ["roll back a deployment", "share a project", "environment variables"];
const CHIP_EXAMPLES = ["deploy to a custom domain", "fix a failing build", "connect PostgreSQL"];

const START = [
  { n: "01", verb: "Prompt", title: "Describe what you want", body: "Create an account and a workspace, then write the first prompt. The agent plans before it edits files.", href: "/docs/getting-started", link: "Getting started", Art: PromptArt },
  { n: "02", verb: "Preview", title: "Run it in a sandbox", body: "Every project runs in an isolated sandbox with a live preview, logs and viewport controls.", href: "/docs/quickstart", link: "Quickstart", Art: PreviewArt },
  { n: "03", verb: "Deploy", title: "Ship and roll back", body: "Publish to Codexa hosting with version history, or connect a Vercel token. Roll back any time.", href: "/docs/deployment", link: "Deployment", Art: DeployArt },
];

const TONE: Record<TokenKind, string> = {
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

/** JSON rendered with the shared tokenizer (same palette as the editor and vignettes). */
function Json({ value }: { value: unknown }) {
  const lines = tokenize(JSON.stringify(value, null, 2), "json");
  return (
    <code>
      {lines.map((line, i) => (
        <React.Fragment key={i}>
          {line.map((t, j) => (t.k === "plain" ? <React.Fragment key={j}>{t.v}</React.Fragment> : <span key={j} className={TONE[t.k]}>{t.v}</span>))}
          {i < lines.length - 1 ? "\n" : null}
        </React.Fragment>
      ))}
    </code>
  );
}

export default async function DocsIndexPage() {
  const [groups, sidebar] = await Promise.all([getNavigation("docs"), sectionSidebar("docs")]);
  // The response below is computed with the same functions the endpoint uses, for the same query,
  // then trimmed to the first match and a few fields so it fits the card.
  const matches = searchTemplates(parseTemplateSearch({ category: "dashboards" })).map(summarizeTemplate);
  const sample = { templates: matches.slice(0, 1).map((t) => ({ id: t.id, name: t.name, category: t.category, framework: t.framework, fileCount: t.fileCount })), total: matches.length };

  return (
    <ArticleShell sidebar={sidebar}>
      <Breadcrumbs items={[{ name: "Documentation", path: "/docs" }]} className="mb-8" />

      {/* Search hero */}
      <header className="relative max-w-3xl">
        <p className="text-label mb-4 flex items-center gap-2.5 text-muted-foreground">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-primary" />
          Documentation
        </p>
        <h1 className="mk-h1 max-w-[20ch]">
          Build, run and ship <span className="text-dim">with Codexa.</span>
        </h1>
        <p className="text-lead mt-4">How Codexa works, from your first prompt to a deployed application. Everything here describes the product as it ships today; roadmap items are marked as such.</p>
        <div className="mt-7 max-w-2xl">
          <SearchTrigger variant="hero" examples={HERO_EXAMPLES} />
          <SearchExamples examples={CHIP_EXAMPLES} className="mt-4" />
        </div>
      </header>

      {/* The three steps (the "Start here" category below lists every getting-started page) */}
      <section aria-labelledby="start-heading" className="mt-14">
        <div className="flex items-end justify-between gap-4">
          <h2 id="start-heading" className="text-[20px] font-semibold tracking-[-0.015em]">
            From prompt to deploy
          </h2>
          <span className="text-meta text-foreground-dim">Illustrations of each step</span>
        </div>
        <ol className="mt-5 grid gap-4 md:grid-cols-3">
          {START.map(({ n, verb, title, body, href, link, Art }) => (
            <li key={n} className="relative">
              <Link
                href={href}
                className="group shot-pan flex h-full flex-col rounded-[12px] border border-border bg-card p-2.5 transition-[border-color,box-shadow] duration-(--dur-3) hover:border-border-strong hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <Art />
                <span className="flex flex-1 flex-col px-2.5 pb-2 pt-4">
                  <span className="text-label text-muted-foreground">
                    {n} — {verb}
                  </span>
                  <span className="mt-2 text-[17px] font-semibold tracking-[-0.01em]">{title}</span>
                  <span className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</span>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium">
                    {link}
                    <ArrowRight className="size-3.5 transition-transform duration-(--dur-3) group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      {/* Call the API */}
      <section aria-labelledby="api-heading" className="mt-14 grid gap-8 rounded-[12px] border border-border bg-surface/60 p-6 sm:p-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center">
        <div>
          <p className="text-label flex items-center gap-2 text-muted-foreground">
            <Code2 className="size-3.5" aria-hidden="true" />
            HTTP API
          </p>
          <h2 id="api-heading" className="mt-3 text-[20px] font-semibold tracking-[-0.015em]">
            Call the API
          </h2>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-muted-foreground">
            Everything in the workspace is backed by a JSON API. Listing starter templates is public; project, file and deployment calls use your session.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/api" className={buttonClasses("primary", "md")}>
              API overview
            </Link>
            <Link href="/api/reference" className={buttonClasses("outline", "md")}>
              Reference
            </Link>
          </div>
        </div>
        <div className="min-w-0 space-y-3">
          <CodeBlock language="bash" className="my-0" bodyClassName="whitespace-pre-wrap [overflow-wrap:anywhere]">
            <code>
              <span className="text-code-muted">$ </span>
              <span className="text-syn-fn">curl</span> <span className="text-syn-string">&quot;$HOST/api/v1/templates?category=dashboards&quot;</span>
            </code>
          </CodeBlock>
          <CodeBlock title={`200 OK · 1 of ${matches.length} shown`} className="my-0">
            <Json value={sample} />
          </CodeBlock>
        </div>
      </section>

      {/* Categories */}
      <div className="mt-14 space-y-12">
        {groups.map((g) => {
          const Icon = categoryIcon(g.category);
          return (
            <section key={g.category} aria-labelledby={`group-${g.category}`} id={`group-${g.category}`} className="scroll-mt-20">
              <div className="flex items-center gap-3 border-b border-border pb-3">
                <span className="grid size-8 place-items-center rounded-[8px] border border-border bg-surface text-foreground">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <h2 id={`group-${g.category}`} className="text-[19px] font-semibold tracking-[-0.015em]">
                  {g.category}
                </h2>
                <span className="text-meta text-foreground-dim">{g.items.length} pages</span>
              </div>
              <ul className="mt-2 grid gap-x-6 sm:grid-cols-2">
                {g.items.map((d) => (
                  <li key={d.href}>
                    <Link href={d.href} className="group -mx-2.5 flex items-start gap-3.5 rounded-[8px] px-2.5 py-3 transition-colors duration-(--dur-2) hover:bg-surface focus-visible:outline-2 focus-visible:outline-ring">
                      <DocIcon href={d.href} category={d.category} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 font-medium">
                          {d.title}
                          <ArrowUpRight className="size-3.5 text-muted-foreground opacity-0 transition-[opacity,translate] duration-(--dur-2) group-hover:-translate-y-px group-hover:translate-x-px group-hover:opacity-100" aria-hidden="true" />
                        </span>
                        <span className="mt-0.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{d.description}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      {/* Help strip */}
      <section aria-label="More help" className="mt-14 grid gap-3 sm:grid-cols-3">
        {[
          { href: "/help", title: "Help center", body: "Answers about accounts, previews and billing.", Icon: LifeBuoy },
          { href: "/docs/troubleshooting", title: "Troubleshooting", body: "Error codes and what to do about them.", Icon: Code2 },
          { href: "/support", title: "Contact support", body: "Send your project id and the error you saw.", Icon: MessagesSquare },
        ].map(({ href, title, body, Icon }) => (
          <Link key={href} href={href} className="group flex items-start gap-3 rounded-[12px] border border-border bg-card p-4 transition-colors duration-(--dur-2) hover:border-border-strong hover:bg-surface">
            <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground group-hover:text-foreground" aria-hidden="true" />
            <span>
              <span className="block text-sm font-medium">{title}</span>
              <span className="mt-0.5 block text-sm text-muted-foreground">{body}</span>
            </span>
          </Link>
        ))}
      </section>
    </ArticleShell>
  );
}
