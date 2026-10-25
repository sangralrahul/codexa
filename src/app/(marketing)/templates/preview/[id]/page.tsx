import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowRight, FileCode2, Info } from "lucide-react";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { CTABand } from "@/components/marketing/cta-band";
import { CodeViewer, DifficultyBadge, FileTree, FrameworkBadge, TemplateCard, UseTemplateLink } from "@/components/templates";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { jsonLd, pageMetadata } from "@/lib/seo";
import { FRAMEWORKS, getTemplate, searchTemplates, summarizeTemplate, TEMPLATE_CATEGORIES, type Template } from "@/templates";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ file?: string }>;

/** The file shown first: the main source file for each framework, then README. */
const DEFAULT_FILES = ["src/App.tsx", "src/server.ts", "index.html", "README.md"];

function defaultFile(t: Template) {
  return DEFAULT_FILES.find((f) => f in t.files) ?? Object.keys(t.files)[0];
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const t = getTemplate(id);
  if (!t) return pageMetadata({ title: "Template not found", description: "This template does not exist.", path: `/templates/preview/${id}`, noindex: true });
  return pageMetadata({ title: `${t.name} template`, description: t.description, path: `/templates/preview/${t.id}` });
}

export default async function TemplatePreviewPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const [{ id }, sp, user] = await Promise.all([params, searchParams, getCurrentUser()]);
  const t = getTemplate(id);
  if (!t) notFound();
  const paths = Object.keys(t.files);
  const selected = sp.file && sp.file in t.files ? sp.file : defaultFile(t);
  const category = TEMPLATE_CATEGORIES.find((c) => c.id === t.category)!;
  const framework = FRAMEWORKS[t.framework];
  const deps = Object.entries(t.dependencies);
  const related = searchTemplates({ category: t.category })
    .filter((r) => r.id !== t.id)
    .slice(0, 3)
    .map(summarizeTemplate);
  const hrefFor = (path: string) => `/templates/preview/${t.id}?file=${encodeURIComponent(path)}`;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd({
          "@context": "https://schema.org",
          "@type": "SoftwareSourceCode",
          name: t.name,
          description: t.description,
          programmingLanguage: t.framework === "static" ? "JavaScript" : "TypeScript",
          runtimePlatform: framework.name,
          isAccessibleForFree: true,
        })}
      />
      <div className="container-x py-10 sm:py-14">
        <Breadcrumbs
          items={[
            { name: "Templates", path: "/templates" },
            { name: category.name, path: `/templates/${category.id}` },
            { name: t.name, path: `/templates/preview/${t.id}` },
          ]}
        />

        <header className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-1.5">
              <FrameworkBadge name={framework.name} />
              <DifficultyBadge level={t.difficulty} />
              {t.featured ? <Badge variant="accent">Featured</Badge> : null}
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{t.name}</h1>
            <p className="mt-3 text-lg text-muted-foreground">{t.description}</p>
            {t.longDescription ? <p className="mt-3 text-base text-muted-foreground">{t.longDescription}</p> : null}
            {t.tags.length ? (
              <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Tags">
                {t.tags.map((tag) => (
                  <li key={tag}>
                    <Badge variant="outline">{tag}</Badge>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
            <UseTemplateLink templateId={t.id} signedIn={Boolean(user)} size="md" label="Use this template" />
            <Link href={`/templates/${category.id}`} className={buttonClasses("outline", "md")}>
              More {category.name.toLowerCase()} templates
            </Link>
          </div>
        </header>

        <p className="mt-8 flex items-start gap-2 rounded-lg border border-border bg-surface p-3 text-sm text-muted-foreground" role="note">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            This preview is the template&apos;s actual file tree and source code — exactly what is copied into a new project. Codexa does not publish screenshots or mock-ups of templates; run the project to see it
            rendered.
          </span>
        </p>

        <section aria-labelledby="files-heading" className="mt-8">
          <h2 id="files-heading" className="text-xl font-semibold tracking-tight">
            Files
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {paths.length} file{paths.length === 1 ? "" : "s"}
            </span>
          </h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
            <div className="rounded-lg border border-border bg-card p-3 lg:sticky lg:top-24 lg:self-start lg:max-h-[70vh] lg:overflow-auto">
              <FileTree paths={paths} selected={selected} hrefFor={hrefFor} />
            </div>
            <div className="min-w-0" id="code" aria-live="polite">
              <CodeViewer path={selected} code={t.files[selected]} />
            </div>
          </div>
        </section>

        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          <section aria-labelledby="deps-heading">
            <h2 id="deps-heading" className="text-xl font-semibold tracking-tight">
              Dependencies
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {deps.length
                ? `Documented from the template's package.json. The runtime has a prebuilt dependency set for ${framework.name}, so installs are fast.`
                : "This template has no dependencies and no build step; files are served as-is."}
            </p>
            {deps.length ? (
              <div className="mt-4 overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th scope="col" className="px-3 py-2 font-medium">
                        Package
                      </th>
                      <th scope="col" className="px-3 py-2 font-medium">
                        Version
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {deps.map(([name, version]) => (
                      <tr key={name} className="border-t border-border">
                        <td className="px-3 py-2 font-mono text-xs">{name}</td>
                        <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{version}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>

          <section aria-labelledby="run-heading">
            <h2 id="run-heading" className="text-xl font-semibold tracking-tight">
              How it runs
            </h2>
            <dl className="mt-4 grid grid-cols-[max-content_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Framework</dt>
              <dd>{framework.name}</dd>
              <dt className="text-muted-foreground">Dev command</dt>
              <dd className="font-mono text-xs">{t.settings.devCommand || framework.devCommand}</dd>
              <dt className="text-muted-foreground">Build command</dt>
              <dd className="font-mono text-xs">{t.settings.buildCommand || framework.buildCommand || "none (static files)"}</dd>
              <dt className="text-muted-foreground">Output directory</dt>
              <dd className="font-mono text-xs">{t.settings.outputDir || framework.outputDir}</dd>
              <dt className="text-muted-foreground">Port</dt>
              <dd className="font-mono text-xs">{t.settings.port ?? framework.port}</dd>
              <dt className="text-muted-foreground">Opens at</dt>
              <dd className="font-mono text-xs">{t.previewPath ?? "/"}</dd>
              <dt className="text-muted-foreground">Difficulty</dt>
              <dd className="capitalize">{t.difficulty}</dd>
            </dl>
            <p className="mt-4 text-sm text-muted-foreground">
              Projects run in an isolated sandbox with a live preview. Read the{" "}
              <Link href="/docs/projects" className="text-primary hover:underline">
                projects documentation
              </Link>{" "}
              for details on settings, snapshots and deployment.
            </p>
          </section>
        </div>

        {related.length ? (
          <section aria-labelledby="related-heading" className="mt-14">
            <div className="flex items-end justify-between gap-4">
              <h2 id="related-heading" className="text-xl font-semibold tracking-tight">
                More {category.name.toLowerCase()} templates
              </h2>
              <Link href={`/templates/${category.id}`} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                View all
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </div>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Related templates">
              {related.map((r) => (
                <TemplateCard key={r.id} template={r} action={<UseTemplateLink templateId={r.id} signedIn={Boolean(user)} />} />
              ))}
            </ul>
          </section>
        ) : null}

        <p className="mt-10 flex items-center gap-2 text-sm text-muted-foreground">
          <FileCode2 className="size-4" aria-hidden="true" />
          Need the raw data? <code className="rounded bg-muted px-1 py-0.5 text-xs">GET /api/v1/templates/{t.id}</code> returns this template with its files.
        </p>
      </div>
      <CTABand title={`Build on ${t.name}`} description="Create a free account, start from this template, and ask the AI agent to turn it into your app." primary={{ label: "Start Building Free", href: `/signup?next=${encodeURIComponent(`/new-project?template=${t.id}`)}` }} secondary={{ label: "All templates", href: "/templates" }} />
    </>
  );
}
