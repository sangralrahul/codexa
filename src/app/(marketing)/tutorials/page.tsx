import { routeMetadata } from "@/lib/seo";
import { listDocs } from "@/lib/content";
import { LEARN_SIDEBAR } from "@/lib/content/nav";
import { ArticleShell } from "@/components/docs/article-layout";
import { Breadcrumbs } from "@/components/docs/breadcrumbs";
import { ArticleGrid } from "@/components/docs/article-bits";
import { PageTitle } from "@/components/marketing/backdrop";

export const metadata = routeMetadata("/tutorials");

export default async function TutorialsPage() {
  const docs = await listDocs("tutorials");
  return (
    <ArticleShell sidebar={LEARN_SIDEBAR}>
      <Breadcrumbs items={[{ name: "Learn", path: "/learn" }, { name: "Tutorials", path: "/tutorials" }]} className="mb-4" />
      <header className="max-w-3xl">
        <PageTitle>Tutorials</PageTitle>
        <p className="mt-3 text-base text-muted-foreground sm:text-lg">Short, hands-on exercises you can finish in one sitting. They focus on one feature each so you can see exactly what the agent and the editor do.</p>
      </header>
      <div className="mt-8">
        <ArticleGrid docs={docs} emptyMessage="No tutorials published yet." />
      </div>
    </ArticleShell>
  );
}
