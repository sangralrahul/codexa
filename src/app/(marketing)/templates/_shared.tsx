import { Camera, Info } from "lucide-react";
import { CTABand } from "@/components/marketing/cta-band";
import { PageHeader } from "@/components/marketing/page-header";
import { TemplateGallery, TEMPLATE_SHOTS, UseTemplateLink } from "@/components/templates";
import { getCurrentUser } from "@/lib/auth/session";
import { parseTemplateSearch, TEMPLATE_CATEGORIES, TEMPLATE_FRAMEWORKS, TEMPLATES, type TemplateCategory } from "@/templates";
import type { Crumb } from "@/content/marketing/types";

export type GallerySearchParams = { q?: string; framework?: string; sort?: string; category?: string };

/** Shared page body for /templates and /templates/[category]. */
export async function PublicGalleryPage({
  searchParams,
  category,
  title,
  intro,
  crumbs,
  mark,
}: {
  searchParams: GallerySearchParams;
  category: TemplateCategory | "all";
  title: string;
  intro: string;
  crumbs: Crumb[];
  /** Words of the H1 that get the selection mark (once per page). */
  mark?: string;
}) {
  const user = await getCurrentUser();
  const search = parseTemplateSearch({ q: searchParams.q, framework: searchParams.framework, sort: searchParams.sort, category });
  const shots = TEMPLATES.filter((t) => TEMPLATE_SHOTS.has(t.id)).length;
  const facts = [
    { value: TEMPLATES.length, label: "starters" },
    { value: TEMPLATE_FRAMEWORKS.length, label: "runtimes" },
    { value: TEMPLATE_CATEGORIES.length, label: "categories" },
    { value: shots, label: "captured screenshots" },
  ];
  return (
    <div data-tone="product">
      <PageHeader variant="index" crumbs={crumbs} kicker="Templates" headline={title} mark={mark} lede={intro}>
        <div data-reveal style={{ "--reveal-delay": "300ms" } as React.CSSProperties} className="flex flex-col gap-4">
          <dl className="flex flex-wrap gap-x-7 gap-y-3">
            {facts.map((f) => (
              <div key={f.label} className="flex items-baseline gap-2">
                <dt className="sr-only">{f.label}</dt>
                <dd className="flex items-baseline gap-2">
                  <span className="font-display text-[26px] font-semibold tabular-nums tracking-[-0.03em]">{f.value}</span>
                  <span className="text-meta text-muted-foreground">{f.label}</span>
                </dd>
              </div>
            ))}
          </dl>
          <p className="flex max-w-2xl items-start gap-2 text-[13px] leading-relaxed text-muted-foreground">
            <Camera className="mt-0.5 size-3.5 shrink-0 text-signal-ink" aria-hidden="true" />
            <span>
              Screenshots are captured from each template&apos;s own build; API templates show their real route list. Every template is a real set of files with documented dependencies.
            </span>
          </p>
        </div>
      </PageHeader>
      <div className="container-x pb-20 pt-8 sm:pt-10">
        <TemplateGallery search={search} categoryMode="path" basePath="/templates" renderAction={(t) => <UseTemplateLink templateId={t.id} signedIn={Boolean(user)} />} />
        <p className="text-meta mt-14 flex items-start gap-2 text-muted-foreground">
          <Info className="mt-px size-3.5 shrink-0" aria-hidden="true" />
          Starter screenshots show each template as it ships. They are not output generated from a prompt; what you build will look like what you ask for.
        </p>
      </div>
      <CTABand variant="prompt" title="Start from a template" description="Create a free account, pick a starter, and ask the AI agent to turn it into your app." secondary={{ label: "How it works", href: "/how-it-works" }} />
    </div>
  );
}
