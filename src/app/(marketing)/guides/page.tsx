import { routeMetadata } from "@/lib/seo";
import { listDocs } from "@/lib/content";
import { LEARN_SIDEBAR } from "@/lib/content/nav";
import { ArticleShell } from "@/components/docs/article-layout";
import { Breadcrumbs } from "@/components/docs/breadcrumbs";
import { ArticleGrid } from "@/components/docs/article-bits";
import { HubHeader } from "@/components/docs/hub-header";

export const metadata = routeMetadata("/guides");

export default async function GuidesPage() {
  const docs = await listDocs("guides");
  const present = (["beginner", "intermediate", "advanced"] as const).filter((l) => docs.some((d) => d.difficulty === l));
  const levels = present.length === 0 ? "All levels" : present.length === 1 ? present[0] : `${present[0]} to ${present[present.length - 1]}`;
  const levelLabel = levels[0].toUpperCase() + levels.slice(1);
  return (
    <ArticleShell sidebar={LEARN_SIDEBAR}>
      <Breadcrumbs items={[{ name: "Learn", path: "/learn" }, { name: "Guides", path: "/guides" }]} className="mb-8" />
      <HubHeader kicker="Guides" title="Guides." dim="Step by step, end to end." lead="Step-by-step guides for common projects. Each one uses the templates, agent and deployment options that exist today and says when something is not available yet.">
        <p className="text-meta mt-5 text-foreground-dim">
          {docs.length} guides · {levelLabel}
        </p>
      </HubHeader>
      <div className="mt-10">
        <ArticleGrid docs={docs} emptyMessage="No guides published yet." />
      </div>
    </ArticleShell>
  );
}
