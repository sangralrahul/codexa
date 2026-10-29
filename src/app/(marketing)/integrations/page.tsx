import type * as React from "react";
import Link from "next/link";
import { FlaskConical, KeyRound, LockKeyhole, Plus, type LucideIcon } from "lucide-react";
import { Breadcrumbs } from "@/components/docs/breadcrumbs";
import { HubHeader } from "@/components/docs/hub-header";
import { CTABand } from "@/components/marketing/cta-band";
import { ReviewNote } from "@/components/content";
import { IntegrationsDirectory, parseIntegrationSearch } from "@/components/integrations-directory";
import { IntegrationsConstellation } from "@/components/integrations-directory/constellation";
import { INTEGRATIONS, INTEGRATION_CATEGORIES } from "@/config/integrations";
import { routeMetadata } from "@/lib/seo";

export const metadata = routeMetadata("/integrations");

type SearchParams = Promise<{ q?: string; category?: string; status?: string }>;

/** The four steps are a description of src/lib/integrations/connections.ts and the env-var service. */
const STEPS: { n: string; title: string; body: React.ReactNode; Icon: LucideIcon }[] = [
  { n: "01", title: "Add", Icon: Plus, body: "A workspace admin picks a provider under Settings → Integrations, names the connection and pastes the credential." },
  { n: "02", title: "Encrypt", Icon: LockKeyhole, body: "Secret fields are encrypted with AES-256-GCM before they are written. The API only ever returns masked values." },
  { n: "03", title: "Test", Icon: FlaskConical, body: "Test connection runs a provider-specific, read-only request and records the real outcome, including the provider's error." },
  {
    n: "04",
    title: "Inject",
    Icon: KeyRound,
    body: (
      <>
        Nothing is injected automatically: add a value as a project{" "}
        <Link href="/docs/environment-variables" className="link-draw text-foreground">
          environment variable
        </Link>{" "}
        and it is set when the sandbox starts and during builds. Database, GitHub and Vercel connections are used by their panels.
      </>
    ),
  },
];

export default async function IntegrationsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const search = parseIntegrationSearch(sp);
  const available = INTEGRATIONS.filter((i) => i.status === "available").length;
  const planned = INTEGRATIONS.length - available;
  const categories = new Set(INTEGRATIONS.map((i) => i.category)).size;

  return (
    <>
      <div data-tone="docs" className="container-x pb-16 pt-6 sm:pt-8 lg:pt-10">
        <Breadcrumbs items={[{ name: "Integrations", path: "/integrations" }]} className="mb-8" />
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
          <HubHeader
            kicker="Integrations"
            title="Connect real services,"
            dim="encrypted and tested."
            lead="Workspace-level connections for databases, AI providers, payments, email and hosting, plus GitHub for source control. Credentials are encrypted at rest, checked with a read-only test, and never sent back to the browser."
          >
            <dl className="mt-8 grid max-w-md grid-cols-3 gap-px overflow-hidden rounded-[14px] border border-border bg-border">
              {[
                { k: "Available", v: available },
                { k: "Planned", v: planned },
                { k: "Categories", v: categories },
              ].map((s) => (
                <div key={s.k} className="bg-card px-4 py-3">
                  <dt className="text-[12px] text-muted-foreground">{s.k}</dt>
                  <dd className="mt-0.5 font-mono text-[22px] font-medium tabular-nums tracking-[-0.02em]">{s.v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 max-w-xl text-[13.5px] leading-relaxed text-muted-foreground">
              <strong className="font-medium text-foreground">Available</strong> means an adapter exists in Codexa today. <strong className="font-medium text-foreground">Planned</strong> means it is on the roadmap and nothing can be connected yet. An integration is only marked Available once its adapter ships; planned ones are listed so you can see what is next.
            </p>
          </HubHeader>
          <figure className="relative mx-auto w-full max-w-[560px]">
            <IntegrationsConstellation />
            <figcaption className="mt-3 text-center font-mono text-[11.5px] text-muted-foreground">
              Illustration · {available} available (inner ring) · {planned} planned (outer ring)
            </figcaption>
          </figure>
        </div>

        <section aria-labelledby="directory-heading" className="mt-16">
          <h2 id="directory-heading" className="sr-only">
            Directory
          </h2>
          <IntegrationsDirectory search={search} />
        </section>

        <section aria-labelledby="how-heading" className="mt-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-label text-muted-foreground">How connections work</p>
              <h2 id="how-heading" className="text-display-4 mt-3">
                Add, encrypt, test, inject.
              </h2>
            </div>
            <Link href="/docs/integrations" className="link-draw text-sm text-muted-foreground hover:text-foreground">
              Integrations documentation
            </Link>
          </div>
          <ol className="relative mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <span aria-hidden="true" className="absolute left-6 right-6 top-[38px] hidden h-px bg-[linear-gradient(90deg,var(--border-strong),var(--border-strong)_60%,transparent)] lg:block" />
            {STEPS.map(({ n, title, body, Icon }) => (
              <li key={n} className="relative rounded-[18px] border border-border bg-card p-5 shadow-[inset_0_1px_0_var(--hairline)]">
                <div className="flex items-center justify-between">
                  <span className="grid size-9 place-items-center rounded-[11px] border border-border bg-surface text-foreground">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="font-mono text-[12px] text-foreground-dim">{n}</span>
                </div>
                <h3 className="mt-4 text-[16px] font-semibold tracking-[-0.01em]">{title}</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">{body}</p>
              </li>
            ))}
          </ol>
          <p className="mt-6 max-w-3xl text-[13.5px] leading-relaxed text-muted-foreground">
            GitHub is different: it is linked per user through OAuth. Sandbox drivers, the GitHub OAuth app and default AI keys are operator infrastructure, configured by whoever hosts Codexa through environment variables rather than through this directory.
          </p>
        </section>

        <div className="mt-12 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
          <div className="text-sm text-muted-foreground">
            <p>
              Missing a service you rely on?{" "}
              <Link href="/request-feature" className="link-draw text-foreground">
                Request an integration
              </Link>
              . {INTEGRATION_CATEGORIES.length} categories are tracked, including ones with nothing available yet.
            </p>
            <p className="mt-3 text-[12.5px]">Trademarks belong to their owners; no partnership implied. Marks are shown only to identify the service an adapter connects to.</p>
          </div>
          <ReviewNote>
            <p>Brand marks on this page are used nominatively to identify third-party services. Their use, and the trademark line above, need legal review before publication.</p>
          </ReviewNote>
        </div>
      </div>
      <CTABand title="Connect your stack." description="Create a free account, add a database or AI key to your workspace, and start building against real services." primary={{ label: "Start building free", href: "/signup" }} secondary={{ label: "Read the docs", href: "/docs/integrations" }} />
    </>
  );
}
