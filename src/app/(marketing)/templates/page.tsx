import { routeMetadata } from "@/lib/seo";
import { PublicGalleryPage, type GallerySearchParams } from "./_shared";

export const metadata = routeMetadata("/templates");

export default async function TemplatesPage({ searchParams }: { searchParams: Promise<GallerySearchParams> }) {
  const sp = await searchParams;
  return (
    <PublicGalleryPage
      searchParams={sp}
      category="all"
      title="Start from a real app."
      dim="real app."
      intro="Runnable starters for React single-page apps, static sites and Express APIs. Pick one, then describe what to change: the agent edits real files you can read, run and keep."
      crumbs={[{ name: "Templates", path: "/templates" }]}
    />
  );
}
