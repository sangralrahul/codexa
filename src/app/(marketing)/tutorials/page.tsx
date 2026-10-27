import { routeMetadata } from "@/lib/seo";
import { listDocs } from "@/lib/content";
import { LEARN_SIDEBAR } from "@/lib/content/nav";
import { ArticleShell } from "@/components/docs/article-layout";
import { Breadcrumbs } from "@/components/docs/breadcrumbs";
import { ArticleGrid } from "@/components/docs/article-bits";
import { HubHeader } from "@/components/docs/hub-header";

export const metadata = routeMetadata("/tutorials");

export default async function TutorialsPage() {
  const docs = await listDocs("tutorials");
  const present = (["beginner", "intermediate", "advanced"] as const).filter((l) => docs.some((d) => d.difficulty === l));
  const levels = present.length === 0 ? "All levels" : present.length === 1 ? present[0] : `${present[0]} to ${present[present.length - 1]}`;
  const levelLabel = levels[0].toUpperCase() + levels.slice(1);
  return (
    <ArticleShell sidebar={LEARN_SIDEBAR}>
      <Breadcrumbs items={[{ name: "Learn", path: "/learn" }, { name: "Tutorials", path: "/tutorials" }]} className="mb-8" />
      <HubHeader kicker="Tutorials" title="Tutorials." dim="One feature at a time." lead="Short, hands-on exercises you can finish in one sitting. They focus on one feature each so you can see exactly what the agent and the editor do.">
        <p className="text-meta mt-5 text-foreground-dim">
          {docs.length} tutorials · {levelLabel}
        </p>
      </HubHeader>
      <div className="mt-10">
        <ArticleGrid docs={docs} emptyMessage="No tutorials published yet." />
      </div>
    </ArticleShell>
  );
}
