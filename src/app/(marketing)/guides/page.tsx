import { routeMetadata } from "@/lib/seo";
import { listDocs } from "@/lib/content";
import { LEARN_SIDEBAR } from "@/lib/content/nav";
import { ArticleShell } from "@/components/docs/article-layout";
import { Breadcrumbs } from "@/components/docs/breadcrumbs";
import { ArticleGrid } from "@/components/docs/article-bits";

export const metadata = routeMetadata("/guides");

export default async function GuidesPage() {
  const docs = await listDocs("guides");
  return (
    <ArticleShell sidebar={LEARN_SIDEBAR}>
      <Breadcrumbs items={[{ name: "Learn", path: "/learn" }, { name: "Guides", path: "/guides" }]} className="mb-4" />
      <header className="max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Guides</h1>
        <p className="mt-3 text-base text-muted-foreground sm:text-lg">Step-by-step guides for common projects. Each one uses the templates, agent and deployment options that exist today and says when something is not available yet.</p>
      </header>
      <div className="mt-8">
        <ArticleGrid docs={docs} emptyMessage="No guides published yet." />
      </div>
    </ArticleShell>
  );
}
