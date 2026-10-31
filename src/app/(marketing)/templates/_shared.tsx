import { Camera, Info } from "lucide-react";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { CTABand } from "@/components/marketing/cta-band";
import { Kicker } from "@/components/marketing/page-header";
import { BrowserWindow, Mesh } from "@/components/marketing/premium";
import { CaptureTile } from "@/components/marketing/captures";
import { Highlight } from "@/components/marketing/backdrop";
import { TemplateGallery, TEMPLATE_SHOTS, UseTemplateLink } from "@/components/templates";
import { TemplatePreview } from "@/components/templates/template-preview";
import { templatePreviewHref } from "@/components/templates/template-card";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { getTemplate, parseTemplateSearch, TEMPLATE_CATEGORIES, TEMPLATE_FRAMEWORKS, TEMPLATES, type TemplateCategory } from "@/templates";
import type { Crumb } from "@/content/marketing/types";
import { cn } from "@/lib/utils";

export type GallerySearchParams = { q?: string; framework?: string; sort?: string; category?: string };

/**
 * Starters in the /templates hero, lead first. Deliberately not the Featured row (dashboard,
 * storefront, SaaS) right below, so the first screen shows different starters.
 */
const HERO_STARTERS = ["vite-react-ops-dashboard", "vite-react-landing", "static-landing"];

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
      <header className="relative isolate overflow-x-clip border-b border-border">
        <Mesh variant="soft" />
        <div className="container-x relative pb-16 pt-8 sm:pt-10 lg:pb-24">
          <Breadcrumbs items={crumbs} />
          <div className={cn("mk-rise mt-10 grid items-center gap-12 lg:mt-14", visual && "lg:grid-cols-12 lg:gap-14")}>
            <div className={visual ? "lg:col-span-5" : "max-w-3xl"}>
              <Kicker className="mb-5">Templates</Kicker>
              <h1 className="mk-h1 max-w-[18ch]">
                <Highlight text={title} highlight={dim} />
              </h1>
              <p className="mk-lead mt-6">{intro}</p>
              <div className="mt-8 flex flex-col gap-5">
                <dl className="flex flex-wrap gap-x-8 gap-y-3">
                  {facts.map((f) => (
                    <div key={f.label} className="flex items-baseline gap-2">
                      <dt className="sr-only">{f.label}</dt>
                      <dd className="flex items-baseline gap-2">
                        <span className="mk-gradient-text font-display text-[32px] font-extrabold tabular-nums tracking-[-0.04em]">{f.value}</span>
                        <span className="text-[13px] font-medium text-muted-foreground">{f.label}</span>
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className="flex max-w-2xl items-start gap-2 text-[13px] leading-relaxed text-muted-foreground">
                  <Camera className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" />
                  <span>{HONESTY}</span>
                </p>
              </div>
            </div>
            {visual ? (
              <figure className="hidden min-w-0 lg:col-span-7 lg:block">
                <Link href={templatePreviewHref(starters[0].id)} aria-label={`Preview the ${starters[0].name} starter`} className="mk-hero-shot group/shot block rounded-[16px] outline-offset-8">
                  <BrowserWindow url={`Preview · ${starters[0].name} starter`}>
                    <TemplatePreview id={starters[0].id} category={starters[0].category} priority sizes="(min-width: 1024px) 680px, 1px" className="rounded-none border-0 shadow-none" />
                  </BrowserWindow>
                </Link>
                {starters.length > 1 ? (
                  <ul className="mt-5 grid grid-cols-2 gap-4">
                    {starters.slice(1).map((t) => (
                      <li key={t.id}>
                        <Link href={templatePreviewHref(t.id)} aria-label={`Preview the ${t.name} starter`} className="mk-card mk-lift group/small block rounded-[12px] p-1.5 outline-offset-4">
                          <TemplatePreview id={t.id} category={t.category} sizes="(min-width: 1024px) 330px, 1px" className="rounded-[8px] border-border/70 shadow-none" />
                          <span className="mt-1.5 block truncate px-1.5 pb-1 text-[12.5px] font-medium text-muted-foreground">{t.name}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <figcaption className="sr-only">{HONESTY}</figcaption>
              </figure>
            ) : null}
          </div>
        </div>
      </header>
      {category === "all" ? (
        <div className="border-b border-border bg-surface">
          <div className="container-x grid grid-cols-1 items-center gap-8 py-12 lg:grid-cols-12 lg:gap-12">
            <ol className="grid gap-4 sm:grid-cols-3 lg:col-span-7">
              {[
                { n: "01", title: "Pick a starter", body: "Each one is a runnable project with real files, captured below as it ships." },
                { n: "02", title: "Describe the change", body: "The agent reads the files, proposes a plan and edits with tools you can see." },
                { n: "03", title: "Run, then publish", body: "Type-check and build run in a sandbox; publish with checks and keep every version." },
              ].map((s) => (
                <li key={s.n} className="mk-card p-5">
                  <span className="font-mono text-[11.5px] text-muted-foreground">{s.n}</span>
                  <span className="mt-2 block text-[15.5px] font-semibold text-foreground">{s.title}</span>
                  <span className="mt-1.5 block text-[13.5px] leading-relaxed text-muted-foreground">{s.body}</span>
                </li>
              ))}
            </ol>
            <figure className="min-w-0 lg:col-span-5">
              <CaptureTile id="composer" />
              <figcaption className="mt-2 text-[12px] text-muted-foreground">The New project composer with a starter chosen, captured from the app.</figcaption>
            </figure>
          </div>
        </div>
      ) : null}
      <div className="container-x pb-20 pt-12 sm:pt-14">
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
      <CTABand variant="prompt" title="Start from a template." description="Create a free account, pick a starter, and ask the AI agent to turn it into your app." secondary={{ label: "How it works", href: "/how-it-works" }} />
    </div>
  );
}
