import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowRight, BookOpen, Check, CircleSlash, FlaskConical, Info, KeyRound, LockKeyhole, Plus, Settings2, ShieldCheck } from "lucide-react";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { CTABand } from "@/components/marketing/cta-band";
import { IntegrationCard, StatusBadge, capabilityLabel, categoryName, getIntegrationDetail, searchIntegrations } from "@/components/integrations-directory";
import { IntegrationMark } from "@/components/integrations-directory/integration-mark";
import { hasBrandMark } from "@/components/brand";
import { buttonClasses } from "@/components/ui/button";
import { Alert } from "@/components/ui/misc";
import { INTEGRATION_IDS, getIntegration } from "@/config/integrations";
import { getCurrentUser } from "@/lib/auth/session";
import { pageMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";

type Params = Promise<{ id: string }>;

export const dynamicParams = false;

export function generateStaticParams() {
  return INTEGRATION_IDS.map((id) => ({ id }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const i = getIntegration(id);
  if (!i)
    return pageMetadata({
      title: "Integration not found",
      description: "This integration does not exist.",
      path: `/integrations/${id}`,
      noindex: true,
    });
  return pageMetadata({
    title: `${i.name} integration`,
    description: i.description,
    path: `/integrations/${i.id}`,
  });
}

/** The same four steps as /integrations ("How connections work"), condensed for the side rail. */
const FLOW = [
  {
    title: "Add",
    body: "An admin adds the connection in workspace settings.",
    Icon: Plus,
  },
  {
    title: "Encrypt",
    body: "Secret fields are encrypted before they are stored.",
    Icon: LockKeyhole,
  },
  {
    title: "Test",
    body: "A read-only request records the real outcome.",
    Icon: FlaskConical,
  },
  {
    title: "Use",
    body: "Codexa features that need it use it; your app reads values you add as environment variables.",
    Icon: KeyRound,
  },
];

function SectionTitle({ id, children, count }: { id: string; children: React.ReactNode; count?: number }) {
  return (
    <h2 id={id} className="flex items-baseline gap-2.5 text-[19px] font-semibold tracking-[-0.015em]">
      {children}
      {typeof count === "number" ? <span className="text-meta font-normal text-foreground-dim">{count}</span> : null}
    </h2>
  );
}

export default async function IntegrationDetailPage({ params }: { params: Params }) {
  const [{ id }, user] = await Promise.all([params, getCurrentUser()]);
  const i = getIntegration(id);
  if (!i) notFound();
  const detail = getIntegrationDetail(i.id);
  // Same category first, then others with the same status, so the row is never left half empty.
  const sameCategory = searchIntegrations({ category: i.category }).filter((r) => r.id !== i.id);
  const related = [...sameCategory, ...searchIntegrations({}).filter((r) => r.id !== i.id && r.category !== i.category && r.status === i.status)].slice(0, 3);
  const settingsHref = "/settings/integrations";
  const planned = i.status === "planned";
  const secretFields = i.configFields.filter((f) => f.type === "password").length;
  const showsMark = !planned && hasBrandMark(i.id);

  return (
    <>
      <div data-tone="docs" className="container-x pb-16 pt-6 sm:pt-8 lg:pt-10">
        <Breadcrumbs
          items={[
            { name: "Integrations", path: "/integrations" },
            { name: i.name, path: `/integrations/${i.id}` },
          ]}
        />

        {/* Header */}
        <header className="relative mt-10 grid gap-8 lg:mt-12 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <span aria-hidden="true" className={cn("relative grid size-[72px] shrink-0 place-items-center rounded-[20px] border", planned ? "border-dashed border-border-strong text-muted-foreground" : "e2 rim text-foreground")}>
              {!planned ? <span className="absolute inset-0 rounded-[20px] bg-[radial-gradient(circle_at_50%_30%,color-mix(in_oklab,var(--signal)_14%,transparent),transparent_70%)]" /> : null}
              <IntegrationMark id={i.id} name={i.name} planned={planned} className="relative size-8" />
            </span>
            <div className="min-w-0 max-w-3xl">
              <p className="text-label flex flex-wrap items-center gap-x-2.5 gap-y-1 text-muted-foreground">
                <span aria-hidden="true" className={cn("size-1.5 rounded-full", planned ? "bg-foreground-dim" : "bg-success")} />
                {categoryName(i.category)}
                <span aria-hidden="true" className="text-foreground-dim">
                  ·
                </span>
                {planned ? "Planned" : "Available"}
              </p>
              <h1 className="text-display-2 mt-4">{i.name}</h1>
              <p className="text-lead mt-4">{i.description}</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 xs:flex-row lg:flex-col">
            {planned ? (
              <Link href="/request-feature" className={buttonClasses("primary", "lg")}>
                Request this integration
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            ) : user ? (
              <Link href={settingsHref} className={buttonClasses("primary", "lg")}>
                <Settings2 className="size-4" aria-hidden="true" />
                Open workspace integrations
              </Link>
            ) : (
              <Link href={`/login?next=${encodeURIComponent(settingsHref)}`} className={buttonClasses("primary", "lg")}>
                Sign in to connect
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            )}
            <Link href={i.docsPath} className={buttonClasses("outline", "lg")}>
              <BookOpen className="size-4" aria-hidden="true" />
              Documentation
            </Link>
          </div>
        </header>

        {planned ? (
          <Alert variant="info" live={false} title="Planned — not available yet" className="mt-10">
            {i.name} is on the Codexa roadmap. There is no adapter in the product today, so it cannot be connected, tested or used by projects. We do not publish release dates; tell us it matters to you through{" "}
            <Link href="/request-feature" className="link-draw text-foreground">
              the feature request form
            </Link>
            .
          </Alert>
        ) : null}

        <div className="mt-12 grid gap-10 lg:mt-14 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-12">
          <div className="min-w-0 space-y-12">
            {/* What it enables */}
            <section aria-labelledby="enables-heading">
              <SectionTitle id="enables-heading">What it enables in Codexa</SectionTitle>
              {detail.enables.length ? (
                <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
                  {detail.enables.map((line) => (
                    <li key={line} className="e1 flex gap-3 rounded-[16px] p-4 text-[14px] leading-relaxed text-muted-foreground">
                      <span aria-hidden="true" className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-success/12 text-success">
                        <Check className="size-3" strokeWidth={2.5} />
                      </span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 flex items-start gap-2.5 rounded-[16px] border border-dashed border-border-strong p-4 text-sm text-muted-foreground">
                  <CircleSlash className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  Nothing yet. Once built, this page will describe exactly what the integration can do.
                </p>
              )}
              {i.capabilities.length ? (
                <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Capabilities">
                  {i.capabilities.map((c) => (
                    <li key={c} title={capabilityLabel(c)} className="rounded-full border border-border bg-card px-2.5 py-0.5 font-mono text-[11.5px] text-muted-foreground">
                      {c}
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>

            {/* Setup (a planned integration has none: the notice above says so) */}
            {planned && !i.configFields.length && !detail.setup.length ? null : (
              <section aria-labelledby="setup-heading">
                <SectionTitle id="setup-heading">Setup</SectionTitle>
                {i.configFields.length ? (
                  <>
                    <p className="mt-2 text-sm text-muted-foreground">Fields on the workspace connection form. Secret fields are encrypted before storage and never shown again.</p>
                    <div className="scrollbar-thin mt-4 overflow-x-auto rounded-[16px] border border-border bg-card shadow-[inset_0_1px_0_var(--hairline)]">
                      <table className="w-full min-w-[34rem] text-sm">
                        <thead className="border-b border-border bg-surface text-left">
                          <tr className="text-label text-muted-foreground">
                            <th scope="col" className="px-4 py-2.5 font-normal">
                              Field
                            </th>
                            <th scope="col" className="px-4 py-2.5 font-normal">
                              Type
                            </th>
                            <th scope="col" className="px-4 py-2.5 font-normal">
                              Required
                            </th>
                            <th scope="col" className="px-4 py-2.5 font-normal">
                              Example
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {i.configFields.map((f) => (
                            <tr key={f.key}>
                              <td className="px-4 py-3">
                                <span className="font-medium">{f.label}</span>
                                <code className="ml-2 rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11.5px] text-muted-foreground">{f.key}</code>
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">
                                {f.type === "password" ? (
                                  <span className="inline-flex items-center gap-1.5">
                                    <LockKeyhole className="size-3.5 text-foreground" aria-hidden="true" />
                                    secret
                                  </span>
                                ) : (
                                  f.type
                                )}
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">{f.required ? "Yes" : "No"}</td>
                              <td className="max-w-[16rem] truncate px-4 py-3 font-mono text-[12px] text-muted-foreground">{f.placeholder || "—"}</td>
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
                  <ol className="mt-6 space-y-0">
                    {detail.setup.map((step, n) => (
                      <li key={step} className="relative flex gap-4 pb-5 last:pb-0">
                        {n < detail.setup.length - 1 ? <span aria-hidden="true" className="absolute bottom-0 left-[13px] top-8 w-px bg-border" /> : null}
                        <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-full border border-border bg-card font-mono text-[11.5px] text-muted-foreground shadow-[inset_0_1px_0_var(--hairline)]">
                          {n + 1}
                        </span>
                        <span className="pt-0.5 text-[14.5px] leading-relaxed text-muted-foreground">{step}</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="mt-4 text-sm text-muted-foreground">No setup steps — the integration is not implemented.</p>
                )}
              </section>
            )}

            {/* Permissions */}
            {planned && !detail.permissions.length ? null : (
              <section aria-labelledby="permissions-heading">
                <SectionTitle id="permissions-heading">Required permissions and scopes</SectionTitle>
                {detail.permissions.length ? (
                  <ul className="mt-4 divide-y divide-border rounded-[16px] border border-border">
                    {detail.permissions.map((line) => (
                      <li key={line} className="flex gap-3 px-4 py-3 text-[14px] leading-relaxed text-muted-foreground">
                        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-foreground" aria-hidden="true" />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-sm text-muted-foreground">To be documented when the adapter is built.</p>
                )}
              </section>
            )}

            {/* Limitations */}
            <section aria-labelledby="limits-heading">
              <SectionTitle id="limits-heading">Limitations</SectionTitle>
              <ul className="mt-4 space-y-2.5">
                {detail.limitations.map((line) => (
                  <li key={line} className="flex gap-3 text-[14px] leading-relaxed text-muted-foreground">
                    <Info className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* Side rail */}
          <aside aria-label={`${i.name} at a glance`} className="min-w-0 space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="e1 rounded-[18px] p-5">
              <h2 className="text-label text-muted-foreground">At a glance</h2>
              <dl className="mt-4 divide-y divide-border text-sm">
                {[
                  { k: "Category", v: categoryName(i.category) },
                  { k: "Status", v: <StatusBadge status={i.status} /> },
                  {
                    k: "Configured by",
                    v: planned ? "—" : detail.operatorConfigured ? "Operator + user link" : "Workspace admin",
                  },
                  {
                    k: "Secret fields",
                    v: <span className="font-mono tabular-nums">{secretFields}</span>,
                  },
                ].map((row) => (
                  <div key={row.k} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                    <dt className="text-muted-foreground">{row.k}</dt>
                    <dd className="text-right">{row.v}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-5 flex flex-col gap-2">
                <Link href={i.docsPath} className={buttonClasses("outline", "sm", "w-full")}>
                  Read the docs
                </Link>
                {!planned ? (
                  <Link href={user ? settingsHref : `/login?next=${encodeURIComponent(settingsHref)}`} className={buttonClasses("ghost", "sm", "w-full text-muted-foreground")}>
                    {user ? "Manage connections" : "Sign in to manage connections"}
                  </Link>
                ) : null}
              </div>
            </div>

            {!planned && !detail.operatorConfigured ? (
              <div className="rounded-[18px] border border-border bg-surface/60 p-5">
                <h2 className="text-label text-muted-foreground">How connections work</h2>
                <ol className="mt-4 space-y-3.5">
                  {FLOW.map(({ title, body, Icon }) => (
                    <li key={title} className="flex gap-3">
                      <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-[9px] border border-border bg-card">
                        <Icon className="size-3.5" />
                      </span>
                      <span className="text-[13px] leading-snug">
                        <span className="font-medium text-foreground">{title}.</span> <span className="text-muted-foreground">{body}</span>
                      </span>
                    </li>
                  ))}
                </ol>
                <Link href="/integrations#how-heading" className="link-draw mt-4 inline-block text-[13px] text-muted-foreground hover:text-foreground">
                  The full flow
                </Link>
              </div>
            ) : null}

            {i.tags?.length ? (
              <ul className="flex flex-wrap gap-1.5" aria-label="Tags">
                {i.tags.map((t) => (
                  <li key={t} className="rounded-md bg-muted px-2 py-0.5 font-mono text-[11.5px] text-muted-foreground">
                    {t}
                  </li>
                ))}
              </ul>
            ) : null}
          </aside>
        </div>

        {related.length ? (
          <section aria-labelledby="related-heading" className="mt-20">
            <div className="flex items-end justify-between gap-4">
              <h2 id="related-heading" className="text-display-4">
                {sameCategory.length >= 3 ? `More in ${categoryName(i.category).toLowerCase()}` : "Keep exploring"}
              </h2>
              <Link href={sameCategory.length >= 3 ? `/integrations?category=${i.category}` : "/integrations"} className="link-draw inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                View all
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </div>
            <ul data-spotlight="grid" className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Related integrations">
              {related.map((r) => (
                <IntegrationCard key={r.id} integration={r} />
              ))}
            </ul>
          </section>
        ) : null}

        {showsMark ? <p className="mt-12 text-[12.5px] text-muted-foreground">Trademarks belong to their owners; no partnership implied. The mark identifies the service this adapter connects to.</p> : null}
      </div>
      <CTABand
        title={planned ? "Build with what is available today" : `Connect ${i.name} to your workspace`}
        description="Create a free account, add the connections your project needs, and let the AI agent build against them."
        primary={{ label: "Start Building Free", href: "/signup" }}
        secondary={{ label: "All integrations", href: "/integrations" }}
      />
    </>
  );
}
