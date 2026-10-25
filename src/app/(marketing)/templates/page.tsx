import { routeMetadata } from "@/lib/seo";
import { PublicGalleryPage, type GallerySearchParams } from "./_shared";

export const metadata = routeMetadata("/templates");

export default async function TemplatesPage({ searchParams }: { searchParams: Promise<GallerySearchParams> }) {
  const sp = await searchParams;
  return (
    <PublicGalleryPage
      searchParams={sp}
      category="all"
      title="Starter templates"
      intro="Pick a runnable starting point — React single-page apps, static sites, or Express APIs — then describe what to change. Filter by category, framework and difficulty."
      crumbs={[{ name: "Templates", path: "/templates" }]}
    />
  );
}
