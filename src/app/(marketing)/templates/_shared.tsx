import { Info } from "lucide-react";
import { CTABand } from "@/components/marketing/cta-band";
import { CaptureTile } from "@/components/marketing/captures";
import { GridFrame, GridRow, PageHero, RowHead } from "@/components/marketing/page-grid";
import { TemplateGallery, TEMPLATE_SHOTS, UseTemplateLink } from "@/components/templates";
import { TemplatePreview } from "@/components/templates/template-preview";
import { templatePreviewHref } from "@/components/templates/template-card";
import { templatePhoneShotSrc } from "@/components/templates/shots";
import { DeviceFrame } from "@/components/frames/device-frame";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { getTemplate, parseTemplateSearch, TEMPLATE_CATEGORIES, TEMPLATE_FRAMEWORKS, TEMPLATES, type TemplateCategory } from "@/templates";
import type { Crumb } from "@/content/marketing/types";

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

  const hero = starters[0];
  return (
    <div data-tone="product" className="relative overflow-x-clip">
      <PageHero
        crumbs={crumbs}
        eyebrow={category === "all" ? "Templates" : `Templates · ${TEMPLATE_CATEGORIES.find((c) => c.id === category)?.name ?? ""}`}
        title={dim && title.endsWith(dim) ? title.slice(0, -dim.length).trim() : title}
        dim={dim && title.endsWith(dim) ? dim : undefined}
        lede={intro}
        scene="milkyway"
        aside={
          visual && hero ? (
            <figure className="hidden min-w-0 lg:block">
              <Link href={templatePreviewHref(hero.id)} aria-label={`Preview the ${hero.name} starter`} className="group/shot block rounded-[14px] outline-offset-8">
                {TEMPLATE_SHOTS.get(hero.id)?.device === "phone" && templatePhoneShotSrc(hero.id) ? (
                  // Mobile apps have only a phone capture: show it on a phone, not in a browser window.
                  <div className="mx-auto w-[248px] transition-transform duration-500 ease-out group-hover/shot:-translate-y-1">
                    <DeviceFrame device="phone" className="!w-full drop-shadow-2xl">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={templatePhoneShotSrc(hero.id)!} alt={`${hero.name} starter on a phone`} width={390} height={844} decoding="async" className="size-full object-cover object-top" />
                    </DeviceFrame>
                  </div>
                ) : (
                <div className="pg-shot transition-transform duration-500 ease-out group-hover/shot:-translate-y-1">
                  <div aria-hidden="true" className="pg-shot__bar">
                    <span>
                      <i />
                      <i />
                      <i />
                    </span>
                    <b>Starter screenshot · {hero.name}</b>
                    <span className="w-[39px]" />
                  </div>
                  <TemplatePreview id={hero.id} category={hero.category} priority sizes="(min-width: 1024px) 680px, 1px" className="rounded-none border-0 shadow-none" />
                </div>
                )}
              </Link>
              <figcaption className="pg-cap">
                <span className="pg-cap__tag">Screenshot</span>
                {HONESTY}
              </figcaption>
            </figure>
          ) : undefined
        }
        asideWide
      >
        <dl className="pg-facts">
          {facts.map((f) => (
            <div key={f.label}>
              <dt>{f.label}</dt>
              <dd>{f.value}</dd>
            </div>
          ))}
        </dl>
      </PageHero>

      <GridFrame>
        {category === "all" ? (
          <GridRow aria-labelledby="how-title">
            <h2 id="how-title" className="sr-only">
              How templates work
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
              <ol className="pg-cells pg-cells--flush lg:border-r lg:border-border">
                {[
                  { n: "01", title: "Pick a starter", body: "Each one is a runnable project with real files, captured below as it ships." },
                  { n: "02", title: "Describe the change", body: "The agent reads the files, proposes a plan and edits with tools you can see." },
                  { n: "03", title: "Run, then publish", body: "Type-check and build run in a sandbox; publish with checks and keep every version." },
                ].map((s) => (
                  <li key={s.n}>
                    <p className="pg-cell__n">{s.n}</p>
                    <h3 className="pg-cell__h mt-5">{s.title}</h3>
                    <p className="pg-cell__p">{s.body}</p>
                  </li>
                ))}
              </ol>
              <figure className="min-w-0 border-t border-border p-(--g-pad) lg:border-t-0 lg:p-8">
                <CaptureTile id="composer" />
                <figcaption className="pg-cap">
                  <span className="pg-cap__tag">Captured</span>
                  The New project composer with a starter chosen.
                </figcaption>
              </figure>
            </div>
          </GridRow>
        ) : null}
        <GridRow aria-labelledby="gallery-title" className="pg-gallery">
          <RowHead id="gallery-title" index={category === "all" ? "01" : undefined} label={category === "all" ? "Gallery" : "In this category"} title={category === "all" ? "Every starter," : title} dim={category === "all" ? "filtered your way." : undefined}>
            <p>Search by name, filter by category or runtime, and open any starter to read its files before you use it.</p>
          </RowHead>
          <div className="border-t border-border px-(--g-pad) pb-16 pt-8">
            <TemplateGallery
              search={search}
              categoryMode="path"
              basePath="/templates"
              featuredCaption={false}
              renderAction={(t) => <UseTemplateLink templateId={t.id} signedIn={Boolean(user)} />}
            />
            <p className="mt-12 flex items-start gap-2 font-mono text-[11.5px] text-(--g-dim)">
              <Info className="mt-px size-3.5 shrink-0" aria-hidden="true" />
              Starter screenshots show each template as it ships. They are not output generated from a prompt; what you build will look like what you ask for.
            </p>
          </div>
        </GridRow>
      </GridFrame>
      <CTABand variant="prompt" title="Start from a template." description="Create a free account, pick a starter, and ask the AI agent to turn it into your app." secondary={{ label: "How it works", href: "/how-it-works" }} />
    </div>
  );
}
