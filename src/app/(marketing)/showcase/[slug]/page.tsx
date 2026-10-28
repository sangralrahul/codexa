import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, ExternalLink, GitFork, Lock } from "lucide-react";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { CTABand } from "@/components/marketing/cta-band";
import { BlogHero } from "@/components/content/blog-cover";
import { FRAMEWORK_SHORT } from "@/components/templates/gallery-search";
import { buttonClasses } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { getCurrentWorkspace } from "@/lib/services/current-workspace";
import { getBySlug, serializeShowcaseItem } from "@/lib/services/showcase";
import { jsonLd, pageMetadata } from "@/lib/seo";
import { getTemplate } from "@/templates";
import { BuiltWithBadge, remixCountLabel } from "../_components/showcase-card";
import { RemixButton } from "../_components/remix-button";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const item = await getBySlug(slug);
  if (!item) return pageMetadata({ title: "Project not found", description: "This showcase entry does not exist or is not published.", path: `/showcase/${slug}`, noindex: true });
  return pageMetadata({ title: item.title, description: item.description.slice(0, 160), path: `/showcase/${item.slug}`, type: "article" });
}

export default async function ShowcaseEntryPage({ params }: { params: Params }) {
  const { slug } = await params;
  const [raw, user] = await Promise.all([getBySlug(slug), getCurrentUser()]);
  if (!raw) notFound();
  const item = serializeShowcaseItem(raw);
  const workspace = user && item.remixable ? (await getCurrentWorkspace(user)).current : null;
  const remixed = remixCountLabel(item.remixCount);
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
      <div data-tone="docs" className="container-x pb-16 pt-6 sm:pt-8 lg:pt-10">
        <Breadcrumbs
          items={[
            { name: "Showcase", path: "/showcase" },
            { name: item.title, path: `/showcase/${item.slug}` },
          ]}
        />
        <article className="mt-10 lg:mt-12">
          <BlogHero title={item.title} category={FRAMEWORK_SHORT[item.project.framework] ?? item.project.frameworkName} label="Showcase">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <BuiltWithBadge />
              <p className="text-meta text-foreground/70">
                {item.submittedBy ? `Submitted by ${item.submittedBy.name}` : "Community submission"}
                {item.approvedAt ? (
                  <>
                    {" · Published "}
                    <time dateTime={item.approvedAt}>{new Date(item.approvedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</time>
                  </>
                ) : null}
              </p>
            </div>
          </BlogHero>

          <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-12">
            <div className="min-w-0">
              <h2 className="text-label text-muted-foreground">About this project</h2>
              <div className="mt-4 max-w-[46rem] whitespace-pre-line text-[17px] leading-relaxed text-foreground/90">{item.description}</div>
              {item.tags.length ? (
                <ul className="mt-8 flex flex-wrap gap-1.5" aria-label="Tags">
                  {item.tags.map((tag) => (
                    <li key={tag}>
                      <Link
                        href={`/showcase?tag=${encodeURIComponent(tag)}`}
                        className="inline-flex h-7 items-center rounded-full border border-border bg-card px-3 font-mono text-[12px] text-muted-foreground transition-colors duration-(--dur-2) hover:border-border-strong hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      >
                        {tag}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <aside aria-label="Project links and details" className="min-w-0 space-y-4 lg:sticky lg:top-24 lg:self-start">
              <section aria-labelledby="remix-heading" className="e1 rounded-[18px] p-5">
                <h2 id="remix-heading" className="text-label text-muted-foreground">
                  Remix
                </h2>
                {item.remixable ? (
                  <>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {user
                        ? `Copy this project's files into ${workspace ? `“${workspace.workspace.name}”` : "your workspace"} as a new private project and open it in the editor. Environment variables and secrets are never copied.`
                        : "Create a free account to copy this project's files into your own workspace and keep building on it."}
                    </p>
                    <RemixButton slug={item.slug} title={item.title} signedIn={Boolean(user)} block className="mt-4" />
                    {!user ? (
                      <p className="mt-2 text-center text-xs text-muted-foreground">
                        Already have an account?{" "}
                        <Link href={`/login?next=${encodeURIComponent(`/showcase/${item.slug}`)}`} className="link-draw text-foreground">
                          Sign in
                        </Link>
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Remixing is off for this project. The author has not made its project public in Codexa.</p>
                )}
                {remixed ? (
                  <p className="mt-4 flex items-center gap-1.5 border-t border-border pt-4 text-xs text-muted-foreground">
                    <GitFork className="size-3.5" aria-hidden="true" />
                    {remixed}
                  </p>
                ) : null}
              </section>
              <div className="e1 rounded-[18px] p-5">
                <h2 className="text-label text-muted-foreground">Links</h2>
                {item.liveUrl ? (
                  <a href={item.liveUrl} target="_blank" rel="noopener noreferrer nofollow" className={buttonClasses("primary", "md", "mt-4 w-full")}>
                    Open live site
                    <ExternalLink className="size-4" aria-hidden="true" />
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">The author did not provide a live URL.</p>
                )}
                {liveHost ? <p className="mt-2 break-all text-center font-mono text-[11.5px] text-muted-foreground">{liveHost}</p> : null}
                <p className="mt-4 flex items-start gap-2 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground" role="note">
                  <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                  <span>
                    {item.project.visibility === "public"
                      ? "The author marked this project as public inside Codexa, so signed-in users can remix it: its files are copied into their own workspace. There is no public code view on this page, and environment variables and secrets are never shared."
                      : "Project files are not public. Only the description and links the author chose to share are shown here."}
                  </span>
                </p>
              </div>
              <div className="e1 rounded-[18px] p-5">
                <h2 className="text-label text-muted-foreground">Details</h2>
                <dl className="mt-4 divide-y divide-border text-sm">
                  <div className="flex justify-between gap-3 pb-2.5">
                    <dt className="text-muted-foreground">Framework</dt>
                    <dd>{item.project.frameworkName}</dd>
                  </div>
                  <div className="flex justify-between gap-3 py-2.5">
                    <dt className="text-muted-foreground">Started from</dt>
                    <dd className="text-right">
                      {template ? (
                        <Link href={`/templates/preview/${template.id}`} className="link-draw text-foreground">
                          {template.name}
                        </Link>
                      ) : (
                        "Imported or custom"
                      )}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3 pt-2.5">
                    <dt className="text-muted-foreground">Visibility</dt>
                    <dd className="capitalize">{item.project.visibility}</dd>
                  </div>
                </dl>
              </div>
              <Link href="/showcase" className={buttonClasses("ghost", "sm", "text-muted-foreground")}>
                <ArrowLeft className="size-3.5" aria-hidden="true" />
                Back to the showcase
              </Link>
            </aside>
          </div>
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
