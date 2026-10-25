import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowRight, BookOpen, Settings2 } from "lucide-react";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { CTABand } from "@/components/marketing/cta-band";
import { IntegrationCard, StatusBadge, capabilityLabel, categoryName, getIntegrationDetail, searchIntegrations } from "@/components/integrations-directory";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Alert } from "@/components/ui/misc";
import { INTEGRATION_IDS, getIntegration } from "@/config/integrations";
import { getCurrentUser } from "@/lib/auth/session";
import { pageMetadata } from "@/lib/seo";

type Params = Promise<{ id: string }>;

export const dynamicParams = false;

export function generateStaticParams() {
  return INTEGRATION_IDS.map((id) => ({ id }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const i = getIntegration(id);
  if (!i) return pageMetadata({ title: "Integration not found", description: "This integration does not exist.", path: `/integrations/${id}`, noindex: true });
  return pageMetadata({ title: `${i.name} integration`, description: i.description, path: `/integrations/${i.id}` });
}

export default async function IntegrationDetailPage({ params }: { params: Params }) {
  const [{ id }, user] = await Promise.all([params, getCurrentUser()]);
  const i = getIntegration(id);
  if (!i) notFound();
  const detail = getIntegrationDetail(i.id);
  const related = searchIntegrations({ category: i.category }).filter((r) => r.id !== i.id).slice(0, 3);
  const settingsHref = "/settings/integrations";
  const planned = i.status === "planned";

  return (
    <>
      <div className="container-x py-10 sm:py-14">
        <Breadcrumbs
          items={[
            { name: "Integrations", path: "/integrations" },
            { name: i.name, path: `/integrations/${i.id}` },
          ]}
        />

        <header className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="primary">{categoryName(i.category)}</Badge>
              <StatusBadge status={i.status} />
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{i.name}</h1>
            <p className="mt-3 text-lg text-muted-foreground">{i.description}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
            {planned ? (
              <Link href="/request-feature" className={buttonClasses("primary", "md")}>
                Request this integration
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            ) : user ? (
              <Link href={settingsHref} className={buttonClasses("primary", "md")}>
                <Settings2 className="size-4" aria-hidden="true" />
                Open workspace integrations
              </Link>
            ) : (
              <Link href={`/login?next=${encodeURIComponent(settingsHref)}`} className={buttonClasses("primary", "md")}>
                Sign in to connect
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            )}
            <Link href={i.docsPath} className={buttonClasses("outline", "md")}>
              <BookOpen className="size-4" aria-hidden="true" />
              Documentation
            </Link>
          </div>
        </header>

        {planned ? (
          <Alert variant="info" title="Planned — not available yet" className="mt-8">
            {i.name} is on the Codexa roadmap. There is no adapter in the product today, so it cannot be connected, tested or used by projects. We do not publish release dates; tell us it matters to you through{" "}
            <Link href="/request-feature" className="text-primary hover:underline">
              the feature request form
            </Link>
            .
          </Alert>
        ) : null}

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="min-w-0 space-y-10">
            <section aria-labelledby="enables-heading">
              <h2 id="enables-heading" className="text-xl font-semibold tracking-tight">
                What it enables in Codexa
              </h2>
              {detail.enables.length ? (
                <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
                  {detail.enables.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">Nothing yet. Once built, this page will describe exactly what the integration can do.</p>
              )}
              {i.capabilities.length ? (
                <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Capabilities">
                  {i.capabilities.map((c) => (
                    <li key={c}>
                      <Badge variant="outline" title={capabilityLabel(c)}>
                        {c}
                      </Badge>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>

            <section aria-labelledby="setup-heading">
              <h2 id="setup-heading" className="text-xl font-semibold tracking-tight">
                Setup
              </h2>
              {i.configFields.length ? (
                <>
                  <p className="mt-2 text-sm text-muted-foreground">Fields on the workspace connection form. Password-type fields are encrypted before storage and never shown again.</p>
                  <div className="mt-3 overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <tr>
                          <th scope="col" className="px-3 py-2 font-medium">
                            Field
                          </th>
                          <th scope="col" className="px-3 py-2 font-medium">
                            Type
                          </th>
                          <th scope="col" className="px-3 py-2 font-medium">
                            Required
                          </th>
                          <th scope="col" className="px-3 py-2 font-medium">
                            Example
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {i.configFields.map((f) => (
                          <tr key={f.key} className="border-t border-border">
                            <td className="px-3 py-2">
                              {f.label} <code className="ml-1 rounded bg-muted px-1 text-xs">{f.key}</code>
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">{f.type === "password" ? "secret" : f.type}</td>
                            <td className="px-3 py-2 text-muted-foreground">{f.required ? "Yes" : "No"}</td>
                            <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{f.placeholder || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : detail.operatorConfigured ? (
                <p className="mt-2 text-sm text-muted-foreground">This integration is configured by the Codexa operator through environment variables and linked per user; there is no workspace connection form.</p>
              ) : null}
              {detail.setup.length ? (
                <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
                  {detail.setup.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">No setup steps — the integration is not implemented.</p>
              )}
            </section>

            <section aria-labelledby="permissions-heading">
              <h2 id="permissions-heading" className="text-xl font-semibold tracking-tight">
                Required permissions and scopes
              </h2>
              {detail.permissions.length ? (
                <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
                  {detail.permissions.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">To be documented when the adapter is built.</p>
              )}
            </section>

            <section aria-labelledby="limits-heading">
              <h2 id="limits-heading" className="text-xl font-semibold tracking-tight">
                Limitations
              </h2>
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
                {detail.limitations.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </section>
          </div>

          <aside className="min-w-0 space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-sm font-semibold">At a glance</h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Category</dt>
                  <dd>{categoryName(i.category)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Status</dt>
                  <dd>{planned ? "Planned" : "Available"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Configured by</dt>
                  <dd>{planned ? "—" : detail.operatorConfigured ? "Operator + user link" : "Workspace admin"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Secret fields</dt>
                  <dd>{i.configFields.filter((f) => f.type === "password").length}</dd>
                </div>
              </dl>
              <div className="mt-4 flex flex-col gap-2">
                <Link href={i.docsPath} className={buttonClasses("outline", "sm")}>
                  Read the docs
                </Link>
                {!planned ? (
                  <Link href={user ? settingsHref : `/login?next=${encodeURIComponent(settingsHref)}`} className={buttonClasses("ghost", "sm")}>
                    {user ? "Manage connections" : "Sign in to manage connections"}
                  </Link>
                ) : null}
              </div>
            </div>
            {i.tags?.length ? (
              <ul className="flex flex-wrap gap-1.5" aria-label="Tags">
                {i.tags.map((t) => (
                  <li key={t}>
                    <Badge variant="outline">{t}</Badge>
                  </li>
                ))}
              </ul>
            ) : null}
          </aside>
        </div>

        {related.length ? (
          <section aria-labelledby="related-heading" className="mt-16">
            <div className="flex items-end justify-between gap-4">
              <h2 id="related-heading" className="text-xl font-semibold tracking-tight">
                More in {categoryName(i.category).toLowerCase()}
              </h2>
              <Link href={`/integrations?category=${i.category}`} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                View all
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </div>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Related integrations">
              {related.map((r) => (
                <IntegrationCard key={r.id} integration={r} />
              ))}
            </ul>
          </section>
        ) : null}
      </div>
      <CTABand title={planned ? "Build with what is available today" : `Connect ${i.name} to your workspace`} description="Create a free account, add the connections your project needs, and let the AI agent build against them." primary={{ label: "Start Building Free", href: "/signup" }} secondary={{ label: "All integrations", href: "/integrations" }} />
    </>
  );
}
