import { Camera, Info } from "lucide-react";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { CTABand } from "@/components/marketing/cta-band";
import { Kicker } from "@/components/marketing/page-header";
import { SplitHeading } from "@/components/motion/split-heading";
import { TemplateGallery, TEMPLATE_SHOTS, UseTemplateLink } from "@/components/templates";
import { StarterFan } from "@/components/templates/starter-fan";
import { getCurrentUser } from "@/lib/auth/session";
import { getTemplate, parseTemplateSearch, TEMPLATE_CATEGORIES, TEMPLATE_FRAMEWORKS, TEMPLATES, type TemplateCategory } from "@/templates";
import type { Crumb } from "@/content/marketing/types";
import { cn } from "@/lib/utils";

export type GallerySearchParams = { q?: string; framework?: string; sort?: string; category?: string };

/**
 * Starters fanned in the /templates hero, front card first. Deliberately not the Featured row
 * (dashboard, storefront, SaaS) right below, so the first screen shows six different starters.
 */
const HERO_STARTERS = ["vite-react-landing", "vite-react-ops-dashboard", "static-landing"];

const HONESTY = "Screenshots are captured from each template's own build; API templates show their real route list.";

/** Shared page body for /templates and /templates/[category]. */
export async function PublicGalleryPage({
  searchParams,
  category,
  title,
  intro,
  crumbs,
  dim,
}: {
  searchParams: GallerySearchParams;
  category: TemplateCategory | "all";
  title: string;
  intro: string;
  crumbs: Crumb[];
  /** Trailing words of the H1 set in the dimmed second tone (the hubs' heading style). */
  dim?: string;
}) {
  const user = await getCurrentUser();
  const search = parseTemplateSearch({ q: searchParams.q, framework: searchParams.framework, sort: searchParams.sort, category });
  const facts = [
    { value: TEMPLATES.length, label: "starters" },
    { value: TEMPLATE_FRAMEWORKS.length, label: "runtimes" },
    { value: TEMPLATE_CATEGORIES.length, label: "categories" },
  ];

  // Hero visual: real screenshots only. The category pages fan their own starters (featured first).
  const pool =
    category === "all"
      ? HERO_STARTERS.map((id) => getTemplate(id)).filter((t) => t !== undefined)
      : TEMPLATES.filter((t) => t.category === category).sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)));
  const starters = pool.filter((t) => TEMPLATE_SHOTS.has(t.id)).slice(0, 3).map((t) => ({ id: t.id, name: t.name, category: t.category }));
  const visual = starters.length > 0;

  return (
    <div data-tone="product">
      <header className="relative overflow-x-clip">
        <div className="container-x relative pb-12 pt-6 sm:pt-8 lg:pb-14 lg:pt-10">
          <Breadcrumbs items={crumbs} />
          <div className={cn("mt-10 grid items-center gap-10 lg:mt-12", visual && "lg:grid-cols-12 lg:gap-12")}>
            <div className={visual ? "lg:col-span-6" : "max-w-3xl"}>
              <Kicker className="mb-6">Templates</Kicker>
              <SplitHeading as="h1" size="display-2" dim={dim} className="max-w-[14ch]">
                {title}
              </SplitHeading>
              <p data-reveal style={{ "--reveal-delay": "220ms" } as React.CSSProperties} className="text-lead mt-6">
                {intro}
              </p>
              <div data-reveal style={{ "--reveal-delay": "300ms" } as React.CSSProperties} className="mt-8 flex flex-col gap-4">
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
                {/* The one honesty line in the hero; on large screens it is the fan's caption instead. */}
                <p className={cn("flex max-w-2xl items-start gap-2 text-[13px] leading-relaxed text-muted-foreground", visual && "lg:hidden")}>
                  <Camera className="mt-0.5 size-3.5 shrink-0 text-signal-ink" aria-hidden="true" />
                  <span>{HONESTY}</span>
                </p>
              </div>
            </div>
            {visual ? (
              <div className="hidden min-w-0 lg:col-span-6 lg:block">
                <StarterFan
                  starters={starters}
                  caption={
                    <span className="inline-flex items-center gap-2">
                      <Camera className="size-3.5 shrink-0 text-signal-ink" aria-hidden="true" />
                      <span>
                        <span className="font-medium text-foreground/85">Starter screenshots.</span> {HONESTY}
                      </span>
                    </span>
                  }
                />
              </div>
            ) : null}
          </div>
        </div>
        <div aria-hidden="true" className="horizon-line" />
      </header>
      <div className="container-x pb-14 pt-8 sm:pt-10">
        <TemplateGallery
          search={search}
          categoryMode="path"
          basePath="/templates"
          featuredCaption={false}
          renderAction={(t) => <UseTemplateLink templateId={t.id} signedIn={Boolean(user)} />}
        />
        <p className="text-meta mt-12 flex items-start gap-2 text-muted-foreground">
          <Info className="mt-px size-3.5 shrink-0" aria-hidden="true" />
          Starter screenshots show each template as it ships. They are not output generated from a prompt; what you build will look like what you ask for.
        </p>
      </div>
      <CTABand variant="prompt" title="Start from a template" description="Create a free account, pick a starter, and ask the AI agent to turn it into your app." secondary={{ label: "How it works", href: "/how-it-works" }} />
    </div>
  );
}
