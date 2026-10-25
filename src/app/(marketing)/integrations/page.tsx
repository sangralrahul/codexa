import Link from "next/link";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { CTABand } from "@/components/marketing/cta-band";
import { IntegrationsDirectory, parseIntegrationSearch } from "@/components/integrations-directory";
import { INTEGRATIONS } from "@/config/integrations";
import { routeMetadata } from "@/lib/seo";

export const metadata = routeMetadata("/integrations");

type SearchParams = Promise<{ q?: string; category?: string; status?: string }>;

export default async function IntegrationsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const search = parseIntegrationSearch(sp);
  const available = INTEGRATIONS.filter((i) => i.status === "available").length;
  const planned = INTEGRATIONS.length - available;

  return (
    <>
      <div className="container-x py-10 sm:py-14">
        <Breadcrumbs items={[{ name: "Integrations", path: "/integrations" }]} />
        <header className="mt-6 max-w-3xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-primary">Integrations</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">Connect the services your app needs</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Workspace-level connections for databases, AI providers, payments, email and hosting, plus GitHub for source control. Credentials are encrypted at rest, tested before they are saved, and never sent to the
            browser.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            <strong className="font-medium text-foreground">Available</strong> means an adapter exists in Codexa today ({available} integrations).{" "}
            <strong className="font-medium text-foreground">Planned</strong> means it is on the roadmap and nothing can be connected yet ({planned}). We do not list integrations we have not built.
          </p>
        </header>
        <div className="mt-10">
          <IntegrationsDirectory search={search} />
        </div>

        <section aria-labelledby="how-heading" className="mt-16 grid gap-8 rounded-2xl border border-border bg-surface p-6 sm:p-8 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <h2 id="how-heading" className="text-xl font-semibold tracking-tight">
              How connections work
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">Three kinds of configuration, each with a clear owner.</p>
          </div>
          <dl className="grid gap-6 sm:grid-cols-2 lg:col-span-2">
            <div>
              <dt className="font-medium">Workspace connections</dt>
              <dd className="mt-1 text-sm text-muted-foreground">
                Admins add PostgreSQL, Supabase, OpenAI, Anthropic, Stripe, Razorpay, Resend and Vercel under Settings → Integrations. Every project in the workspace can use them.
              </dd>
            </div>
            <div>
              <dt className="font-medium">Account links</dt>
              <dd className="mt-1 text-sm text-muted-foreground">GitHub is linked per user through OAuth, then used to import repositories and push commits from any project you can edit.</dd>
            </div>
            <div>
              <dt className="font-medium">Operator infrastructure</dt>
              <dd className="mt-1 text-sm text-muted-foreground">
                Sandbox drivers (Linux namespaces by default; Docker and E2B drivers exist for the runner service), the GitHub OAuth app and default AI keys are configured by whoever hosts Codexa through environment
                variables, not through this directory.
              </dd>
            </div>
            <div>
              <dt className="font-medium">Project environment variables</dt>
              <dd className="mt-1 text-sm text-muted-foreground">
                Secrets a generated app needs at runtime are stored encrypted per project and injected into the sandbox. See the{" "}
                <Link href="/docs/environment-variables" className="text-primary hover:underline">
                  environment variables guide
                </Link>
                .
              </dd>
            </div>
          </dl>
        </section>

        <p className="mt-8 text-sm text-muted-foreground">
          Missing a service you rely on?{" "}
          <Link href="/request-feature" className="text-primary hover:underline">
            Request an integration
          </Link>{" "}
          or read the{" "}
          <Link href="/docs/integrations" className="text-primary hover:underline">
            integrations documentation
          </Link>
          .
        </p>
      </div>
      <CTABand title="Connect your stack" description="Create a free account, add a database or AI key to your workspace, and start building against real services." primary={{ label: "Start Building Free", href: "/signup" }} secondary={{ label: "Read the docs", href: "/docs/integrations" }} />
    </>
  );
}
