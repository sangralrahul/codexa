import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowRight, ExternalLink, Lock } from "lucide-react";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { CTABand } from "@/components/marketing/cta-band";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { getBySlug, serializeShowcaseItem } from "@/lib/services/showcase";
import { jsonLd, pageMetadata } from "@/lib/seo";
import { getTemplate } from "@/templates";
import { BuiltWithBadge } from "../_components/showcase-card";
import { PageTitle } from "@/components/marketing/backdrop";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const item = await getBySlug(slug);
  if (!item) return pageMetadata({ title: "Project not found", description: "This showcase entry does not exist or is not published.", path: `/showcase/${slug}`, noindex: true });
  return pageMetadata({ title: item.title, description: item.description.slice(0, 160), path: `/showcase/${item.slug}`, type: "article" });
}

export default async function ShowcaseEntryPage({ params }: { params: Params }) {
  const { slug } = await params;
  const raw = await getBySlug(slug);
  if (!raw) notFound();
  const item = serializeShowcaseItem(raw);
  const template = item.project.templateId ? getTemplate(item.project.templateId) : undefined;
  const liveHost = item.liveUrl ? safeHost(item.liveUrl) : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd({
          "@context": "https://schema.org",
          "@type": "CreativeWork",
          name: item.title,
          description: item.description,
          keywords: item.tags.join(", "),
          datePublished: item.approvedAt,
          ...(item.liveUrl ? { url: item.liveUrl } : {}),
        })}
      />
      <div className="container-x py-10 sm:py-14">
        <Breadcrumbs
          items={[
            { name: "Showcase", path: "/showcase" },
            { name: item.title, path: `/showcase/${item.slug}` },
          ]}
        />
        <article className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <BuiltWithBadge />
              <Badge variant="primary">{item.project.frameworkName}</Badge>
            </div>
            <PageTitle className="mt-3">{item.title}</PageTitle>
            <p className="mt-2 text-sm text-muted-foreground">
              {item.submittedBy ? `Submitted by ${item.submittedBy.name}` : "Community submission"}
              {item.approvedAt ? ` · Published ${new Date(item.approvedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}` : ""}
            </p>
            <div className="mt-6 whitespace-pre-line text-base leading-relaxed text-foreground">{item.description}</div>
            {item.tags.length ? (
              <ul className="mt-6 flex flex-wrap gap-1.5" aria-label="Tags">
                {item.tags.map((tag) => (
                  <li key={tag}>
                    <Link href={`/showcase?tag=${encodeURIComponent(tag)}`}>
                      <Badge variant="outline" className="hover:border-border-strong hover:text-foreground">
                        {tag}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="glow-card rounded-2xl border border-border p-5">
              <h2 className="text-sm font-semibold">Links</h2>
              {item.liveUrl ? (
                <a href={item.liveUrl} target="_blank" rel="noopener noreferrer nofollow" className={buttonClasses("primary", "md", "mt-3 w-full")}>
                  Open live site
                  <ExternalLink className="size-4" aria-hidden="true" />
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">The author did not provide a live URL.</p>
              )}
              {liveHost ? <p className="mt-2 break-all text-xs text-muted-foreground">{liveHost}</p> : null}
              <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground" role="note">
                <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                <span>
                  {item.project.visibility === "public"
                    ? "The author marked this project as public inside Codexa. Project files are available to workspace members in the editor; there is no public code view on this page."
                    : "Project files are not public. Only the description and links the author chose to share are shown here."}
                </span>
              </p>
            </div>
            <div className="glow-card rounded-2xl border border-border p-5">
              <h2 className="text-sm font-semibold">About this project</h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Framework</dt>
                  <dd>{item.project.frameworkName}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Started from</dt>
                  <dd className="text-right">
                    {template ? (
                      <Link href={`/templates/preview/${template.id}`} className="text-primary hover:underline">
                        {template.name}
                      </Link>
                    ) : (
                      "Imported or custom"
                    )}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Visibility</dt>
                  <dd className="capitalize">{item.project.visibility}</dd>
                </div>
              </dl>
              <Link href="/showcase" className={buttonClasses("ghost", "sm", "mt-4")}>
                <ArrowRight className="size-3.5 rotate-180" aria-hidden="true" />
                Back to the showcase
              </Link>
            </div>
          </aside>
        </article>
      </div>
      <CTABand title="Build your own" description="Start from a template or a prompt, iterate with the AI agent, deploy, and submit it to the showcase." primary={{ label: "Start Building Free", href: "/signup" }} secondary={{ label: "Browse templates", href: "/templates" }} />
    </>
  );
}

function safeHost(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}
