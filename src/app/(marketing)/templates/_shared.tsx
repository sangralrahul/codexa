import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { CTABand } from "@/components/marketing/cta-band";
import { TemplateGallery, UseTemplateLink } from "@/components/templates";
import { getCurrentUser } from "@/lib/auth/session";
import { parseTemplateSearch, type TemplateCategory } from "@/templates";
import type { Crumb } from "@/content/marketing/types";
import { PageTitle } from "@/components/marketing/backdrop";

export type GallerySearchParams = { q?: string; framework?: string; sort?: string; category?: string };

/** Shared page body for /templates and /templates/[category]. */
export async function PublicGalleryPage({
  searchParams,
  category,
  title,
  intro,
  crumbs,
}: {
  searchParams: GallerySearchParams;
  category: TemplateCategory | "all";
  title: string;
  intro: string;
  crumbs: Crumb[];
}) {
  const user = await getCurrentUser();
  const search = parseTemplateSearch({ q: searchParams.q, framework: searchParams.framework, sort: searchParams.sort, category });
  return (
    <>
      <div className="container-x py-10 sm:py-14">
        <Breadcrumbs items={crumbs} />
        <header className="mt-6 max-w-3xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-primary">Templates</p>
          <PageTitle className="lg:text-6xl">{title}</PageTitle>
          <p className="mt-4 text-lg text-muted-foreground">{intro}</p>
          <p className="mt-3 text-sm text-muted-foreground">
            Every template is a real set of files with documented dependencies. Previews show the actual file tree and source — there are no screenshots or mock-ups.
          </p>
        </header>
        <div className="mt-10">
          <TemplateGallery search={search} categoryMode="path" basePath="/templates" renderAction={(t) => <UseTemplateLink templateId={t.id} signedIn={Boolean(user)} />} />
        </div>
      </div>
      <CTABand title="Start from a template" description="Create a free account, pick a starter, and ask the AI agent to turn it into your app." primary={{ label: "Start Building Free", href: "/signup" }} secondary={{ label: "How it works", href: "/how-it-works" }} />
    </>
  );
}
