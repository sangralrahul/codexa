import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowRight, Boxes, FileCode2, Gauge, Layers, Package, Route, Sparkles, Terminal } from "lucide-react";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { CTABand } from "@/components/marketing/cta-band";
import { Kicker } from "@/components/marketing/page-header";
import { PromptBox } from "@/components/marketing/prompt-box";
import { SplitHeading } from "@/components/motion/split-heading";
import { BrowserFrame } from "@/components/frames/browser-frame";
import { DeviceFrame } from "@/components/frames/device-frame";
import { FrameCaption } from "@/components/frames/illustration-badge";
import { CodeViewer, CodeWrapToggle, canWrapCode, FileGlyph, FileTree, RouteList, TemplatePreview, TemplateTile, UseTemplateLink } from "@/components/templates";
import { RunItHere } from "@/components/templates/run-it-here";
import { staticSrcDoc } from "@/components/templates/static-srcdoc";
import { FEATURED_LEAD, FRAMEWORK_SHORT } from "@/components/templates/gallery-search";
import { templatePhoneShotSrc, TEMPLATE_SHOTS } from "@/components/templates/shots";
import { TEMPLATE_API_ROUTES } from "@/components/templates/api-routes.generated";
import { buttonClasses } from "@/components/ui/button";
import { CopyButton } from "@/components/content/code-block";
import { getCurrentUser } from "@/lib/auth/session";
import { capabilities } from "@/lib/env";
import { jsonLd, pageMetadata } from "@/lib/seo";
import { FRAMEWORKS, getTemplate, searchTemplates, summarizeTemplate, TEMPLATE_CATEGORIES, type Template } from "@/templates";
import { cn } from "@/lib/utils";

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
  const signedIn = Boolean(user);
  const paths = Object.keys(t.files);
  const selected = sp.file && sp.file in t.files ? sp.file : defaultFile(t);
  const category = TEMPLATE_CATEGORIES.find((c) => c.id === t.category)!;
  const framework = FRAMEWORKS[t.framework];
  const deps = Object.entries(t.dependencies);
  const related = searchTemplates({ category: t.category })
    .filter((r) => r.id !== t.id)
    .concat(searchTemplates({ framework: t.framework }).filter((r) => r.id !== t.id && r.category !== t.category))
    .slice(0, 3)
    .map(summarizeTemplate);
  const hrefFor = (path: string) => `/templates/preview/${t.id}?file=${encodeURIComponent(path)}#code`;
  const routes = TEMPLATE_API_ROUTES[t.id];
  const hasShot = TEMPLATE_SHOTS.has(t.id);
  const phoneShot = templatePhoneShotSrc(t.id);
  const srcDoc = hasShot ? staticSrcDoc(t) : null;
  const port = t.settings.port ?? framework.port;
  const entryRoute = t.previewPath ?? "/";
  // The address bar names what the picture is (a starter screenshot), never a dev-server URL.
  const frameLabel = `Starter screenshot · ${t.id}${entryRoute !== "/" ? entryRoute : ""}`;
  const featured = (FEATURED_LEAD as readonly string[]).includes(t.id);
  const lines = t.files[selected].replace(/\n$/, "").split("\n").length;

  const meta = [
    { icon: Layers, label: "Framework", value: framework.name },
    { icon: Gauge, label: "Difficulty", value: t.difficulty.charAt(0).toUpperCase() + t.difficulty.slice(1) },
    { icon: FileCode2, label: "Files", value: String(paths.length) },
    { icon: Package, label: "Dependencies", value: deps.length ? String(deps.length) : "None" },
    { icon: Terminal, label: "Dev command", value: t.settings.devCommand || framework.devCommand, mono: true },
    { icon: Route, label: "Entry route", value: entryRoute, mono: true },
  ];

  const shot = <TemplatePreview id={t.id} category={t.category} priority pan sizes="(min-width: 1280px) 900px, (min-width: 1024px) 70vw, 100vw" alt={`${t.name} starter, as built from its own files`} className="rounded-none border-0 shadow-none" />;

  return (
    <div data-tone="product" className="overflow-x-clip">
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

      {/* Header */}
      <header className="container-x relative pt-6 sm:pt-8 lg:pt-10">
        <Breadcrumbs
          items={[
            { name: "Templates", path: "/templates" },
            { name: category.name, path: `/templates/${category.id}` },
            { name: t.name, path: `/templates/preview/${t.id}` },
          ]}
        />
        <div className="mt-10 grid gap-8 lg:mt-12 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <Kicker className="mb-5">
              {category.name} · {FRAMEWORK_SHORT[t.framework]}
              {featured ? " · Featured" : ""}
            </Kicker>
            <SplitHeading as="h1" size="display-2" className="max-w-[16ch]">
              {t.name}
            </SplitHeading>
            <p data-reveal style={{ "--reveal-delay": "200ms" } as React.CSSProperties} className="text-lead mt-5">
              {t.description}
            </p>
          </div>
          <div data-reveal style={{ "--reveal-delay": "260ms" } as React.CSSProperties} className="flex flex-col gap-3 xs:flex-row lg:col-span-4 lg:hidden">
            <UseTemplateLink templateId={t.id} signedIn={signedIn} size="lg" label="Use this template" />
            <a href="#remix" className={buttonClasses("outline", "lg")}>
              <Sparkles className="size-4" aria-hidden="true" />
              Remix
            </a>
          </div>
        </div>
      </header>

      {/* Hero: the real screenshot, framed */}
      <section aria-label={`${t.name} screenshot`} className="container-x relative mt-10 lg:mt-14">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_17.5rem] lg:gap-8">
          <figure className="relative min-w-0">
            <div aria-hidden="true" className="pointer-events-none absolute -inset-x-10 -bottom-10 top-16 -z-10 rounded-[48px] bg-[radial-gradient(60%_60%_at_50%_40%,color-mix(in_oklab,var(--signal)_16%,transparent),transparent_70%)] blur-2xl" />
            {routes && !hasShot ? (
              <div className="e4 overflow-hidden">
                <RouteList routes={routes} variant="hero" command={t.settings.devCommand || framework.devCommand} className="rounded-none border-0 shadow-none" />
              </div>
            ) : (
              <BrowserFrame url={frameLabel} className={cn("e4 rounded-[18px] shadow-stage", phoneShot && "hidden lg:mr-24 lg:block")} bodyClassName="bg-white">
                {srcDoc ? (
                  <RunItHere srcDoc={srcDoc} name={t.name}>
                    {shot}
                  </RunItHere>
                ) : (
                  shot
                )}
              </BrowserFrame>
            )}
            {phoneShot ? (
              <div className="mx-auto w-[min(260px,72vw)] lg:pointer-events-none lg:absolute lg:-bottom-8 lg:right-0 lg:mx-0 lg:w-[200px]">
                <DeviceFrame device="phone" className="!w-full drop-shadow-2xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={phoneShot} alt="" width={390} height={844} loading="lazy" decoding="async" data-develop="" className="size-full object-cover object-top" />
                </DeviceFrame>
              </div>
            ) : null}
            <FrameCaption className={cn("mx-0 max-w-none text-left", phoneShot && "lg:mr-24")}>
              {routes && !hasShot
                ? `These routes are read from this template's own source files. It is an API, so there is no screen to capture.`
                : `Starter screenshot captured from this template's own build at 1440×900${phoneShot ? ", plus a 390px phone capture" : ""}. It shows the template as it ships, not output generated from a prompt.`}
            </FrameCaption>
          </figure>

          {/* Meta rail */}
          <aside aria-label="Template details" className="e1 h-fit rounded-[18px] p-5 lg:sticky lg:top-24">
            <p className="text-label text-muted-foreground">Template</p>
            <dl className="mt-3 divide-y divide-border">
              {meta.map(({ icon: Icon, label, value, mono }) => (
                <div key={label} className="flex min-w-0 items-center justify-between gap-4 py-2.5 first:pt-0">
                  <dt className="flex shrink-0 items-center gap-2 text-[13px] text-muted-foreground">
                    <Icon className="size-3.5" aria-hidden="true" />
                    {label}
                  </dt>
                  <dd className={cn("min-w-0 text-balance text-right text-[13.5px] font-medium", mono && "font-mono text-[12.5px]")}>{value}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-6 flex flex-col gap-2">
              <UseTemplateLink templateId={t.id} signedIn={signedIn} size="md" label="Use this template" className="w-full" />
              <Link href={`/templates/${category.id}`} className={buttonClasses("ghost", "md", "w-full text-muted-foreground")}>
                More in {category.name}
              </Link>
            </div>
            {t.tags.length ? (
              <ul className="mt-5 flex flex-wrap gap-1.5 border-t border-border pt-4" aria-label="Tags">
                {t.tags.map((tag) => (
                  <li key={tag} className="rounded-md bg-muted px-2 py-0.5 font-mono text-[11.5px] text-muted-foreground">
                    {tag}
                  </li>
                ))}
              </ul>
            ) : null}
          </aside>
        </div>
      </section>

      {/* About */}
      {t.longDescription ? (
        <section aria-labelledby="about-heading" className="container-x mt-20 lg:mt-24">
          <div className="grid gap-6 lg:grid-cols-12">
            <h2 id="about-heading" className="text-label text-muted-foreground lg:col-span-3 lg:pt-2">
              What you get
            </h2>
            <p className="max-w-[62ch] text-pretty text-[1.0625rem] leading-relaxed text-foreground/90 sm:text-[1.25rem] lg:col-span-9">{t.longDescription}</p>
          </div>
        </section>
      ) : null}

      {/* Files: IDE-like split */}
      <section aria-labelledby="files-heading" className="container-x mt-20 scroll-mt-24 lg:mt-24" id="code">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="files-heading" className="text-display-4">
              Files
            </h2>
            <p className="mt-2 text-[15px] text-muted-foreground">Exactly what is copied into a new project: {paths.length} files, nothing generated.</p>
          </div>
          <p className="text-meta flex items-center gap-1.5 text-muted-foreground">
            <Boxes className="size-3.5" aria-hidden="true" />
            Raw data: <code className="font-mono">GET /api/v1/templates/{t.id}</code>
          </p>
        </div>
        <div className="e4 mt-6 overflow-hidden !bg-code-bg text-code-fg">
          <div className="grid lg:grid-cols-[16rem_minmax(0,1fr)]">
            <div className="border-b border-code-border lg:border-b-0 lg:border-r">
              <p className="flex h-10 items-center justify-between border-b border-code-border px-4 font-mono text-[10.5px] uppercase tracking-[0.12em] text-code-muted">
                Explorer <span className="tabular-nums">{paths.length}</span>
              </p>
              <FileTree paths={paths} selected={selected} hrefFor={hrefFor} tone="code" className="scrollbar-thin max-h-56 overflow-auto p-2 lg:max-h-[38rem]" />
            </div>
            <div className="group/code min-w-0" aria-live="polite">
              <div className="flex h-10 items-stretch justify-between border-b border-code-border">
                <span className="relative flex min-w-0 items-center gap-2 border-r border-code-border bg-white/[0.04] px-4 font-mono text-[12px] text-code-fg">
                  <span aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-signal" />
                  <FileGlyph name={selected.split("/").pop() ?? selected} />
                  <span className="truncate">{selected}</span>
                </span>
                <span className="flex items-center gap-2 pl-4 pr-1.5">
                  <span className="text-meta hidden text-code-muted xs:inline">
                    {lines} line{lines === 1 ? "" : "s"}
                  </span>
                  {canWrapCode(selected) ? <CodeWrapToggle /> : null}
                  <CopyButton text={t.files[selected]} label={`Copy ${selected.split("/").pop() ?? selected}`} />
                </span>
              </div>
              <CodeViewer path={selected} code={t.files[selected]} bare maxHeight="38rem" />
            </div>
          </div>
        </div>
      </section>

      {/* Remix */}
      <section id="remix" aria-labelledby="remix-heading" className="container-x mt-20 scroll-mt-24 lg:mt-28">
        <div className="relative overflow-hidden rounded-[24px] border border-border bg-surface/60 px-5 py-10 sm:px-10 lg:py-14">
          <div aria-hidden="true" className="bg-blueprint absolute inset-0 opacity-70" />
          <div className="relative grid gap-10 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-5">
              <p className="text-label text-muted-foreground">Remix</p>
              <h2 id="remix-heading" className="text-display-4 mt-3">
                Remix this template
              </h2>
              <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted-foreground">
                Describe what to change and the agent starts from {t.name}&apos;s files. The box is already started for you: finish <span className="text-foreground">“Start from {t.name} and …”</span>
              </p>
            </div>
            <div className="min-w-0 lg:col-span-7">
              <PromptBox signedIn={signedIn} variant="compact" defaultTemplateId={t.id} defaultValue={`Start from ${t.name} and `} source="cta" aiReady={capabilities.ai} className="max-w-none" />
            </div>
          </div>
        </div>
      </section>

      {/* Dependencies + how it runs */}
      <section aria-label="Runtime details" className="container-x mt-20 grid gap-6 lg:mt-24 lg:grid-cols-2">
        <div className="e1 rounded-[18px] p-6">
          <h2 id="deps-heading" className="text-[17px] font-semibold tracking-tight">
            Dependencies
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {deps.length ? `Documented from the template's package.json. The runtime has a prebuilt dependency set for ${framework.name}, so installs are fast.` : "This template has no dependencies and no build step; files are served as-is."}
          </p>
          {deps.length ? (
            <ul className="mt-5 divide-y divide-border rounded-xl border border-border" aria-labelledby="deps-heading">
              {deps.map(([name, version]) => (
                <li key={name} className="flex items-center justify-between gap-4 px-3.5 py-2.5 font-mono text-[12.5px]">
                  <span>{name}</span>
                  <span className="text-muted-foreground">{version}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="e1 rounded-[18px] p-6">
          <h2 id="run-heading" className="text-[17px] font-semibold tracking-tight">
            How it runs
          </h2>
          <dl className="mt-5 grid grid-cols-[max-content_minmax(0,1fr)] gap-x-6 gap-y-3 text-sm">
            <dt className="text-muted-foreground">Framework</dt>
            <dd>{framework.name}</dd>
            <dt className="text-muted-foreground">Dev command</dt>
            <dd className="font-mono text-[12.5px]">{t.settings.devCommand || framework.devCommand}</dd>
            <dt className="text-muted-foreground">Build command</dt>
            <dd className="font-mono text-[12.5px]">{t.settings.buildCommand || framework.buildCommand || "none (static files)"}</dd>
            <dt className="text-muted-foreground">Output directory</dt>
            <dd className="font-mono text-[12.5px]">{t.settings.outputDir || framework.outputDir}</dd>
            <dt className="text-muted-foreground">Port</dt>
            <dd className="font-mono text-[12.5px]">{port}</dd>
            <dt className="text-muted-foreground">Entry route</dt>
            <dd className="font-mono text-[12.5px]">{entryRoute}</dd>
          </dl>
          <p className="mt-6 text-sm text-muted-foreground">
            Projects run in an isolated sandbox with a live preview. Read the{" "}
            <Link href="/docs/projects" className="link-draw text-foreground">
              projects documentation
            </Link>{" "}
            for settings, snapshots and deployment.
          </p>
        </div>
      </section>

      {/* Related */}
      {related.length ? (
        <section aria-labelledby="related-heading" className="container-x mt-20 lg:mt-24">
          <div className="flex items-end justify-between gap-4">
            <h2 id="related-heading" className="text-display-4">
              Keep browsing
            </h2>
            <Link href="/templates" className="link-draw inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              All templates
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
          <ul data-spotlight="grid" className="mt-6 grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3" aria-label="Related templates">
            {related.map((r) => (
              <TemplateTile key={r.id} template={r} action={<UseTemplateLink templateId={r.id} signedIn={signedIn} />} />
            ))}
          </ul>
        </section>
      ) : null}

      <CTABand
        className="mt-10"
        title={`Build on ${t.name}`}
        description="Create a free account, start from this template, and ask the AI agent to turn it into your app."
        primary={{ label: "Use this template", href: signedIn ? `/new-project?template=${t.id}` : `/signup?next=${encodeURIComponent(`/new-project?template=${t.id}`)}` }}
        secondary={{ label: "All templates", href: "/templates" }}
      />
    </div>
  );
}
