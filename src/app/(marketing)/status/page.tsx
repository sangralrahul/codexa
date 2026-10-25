import Link from "next/link";
import { routeMetadata } from "@/lib/seo";
import { site } from "@/config/site";
import { StatusDot } from "@/components/ui/misc";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { getStatus, type ComponentState } from "./health";

export const metadata = routeMetadata("/status");
export const dynamic = "force-dynamic";

const labels: Record<ComponentState, { text: string; dot: "ok" | "warn" | "error" | "idle" }> = {
  operational: { text: "Operational", dot: "ok" },
  degraded: { text: "Degraded", dot: "warn" },
  down: { text: "Down", dot: "error" },
  not_configured: { text: "Not configured", dot: "idle" },
  unknown: { text: "Configured, not probed", dot: "idle" },
};

const overallCopy: Record<ComponentState, string> = {
  operational: "All checked components are operational.",
  degraded: "Some components are degraded.",
  down: "One or more components are down.",
  not_configured: "Some components are not configured.",
  unknown: "Status is partially known.",
};

export default async function StatusPage() {
  const report = await getStatus();
  const checked = new Date(report.checkedAt);
  return (
    <article className="container-x py-10 sm:py-14">
      <Breadcrumbs items={[{ name: "Status", path: "/status" }]} />
      <header className="mt-6 max-w-3xl">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-primary">Company</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">Platform status</h1>
        <p className="mt-4 text-lg text-muted-foreground">Live checks run when this page is loaded. We do not publish uptime history or percentages yet because we do not have a long enough measured record.</p>
      </header>
      <section aria-labelledby="overall" className="mt-8 flex flex-col gap-3 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <StatusDot status={labels[report.overall].dot} />
          <h2 id="overall" className="text-base font-semibold">
            {overallCopy[report.overall]}
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Checked <time dateTime={report.checkedAt}>{checked.toUTCString()}</time>
          {report.source === "fallback" ? " · direct checks" : " · status API"}
        </p>
      </section>
      <section aria-labelledby="components" className="mt-6">
        <h2 id="components" className="sr-only">
          Components
        </h2>
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {report.components.map((c) => (
            <li key={c.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <StatusDot status={labels[c.state].dot} className="mt-1.5" />
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{c.detail}</p>
                </div>
              </div>
              <p className="shrink-0 text-sm sm:text-right">
                <span className="font-medium">{labels[c.state].text}</span>
                {typeof c.latencyMs === "number" ? <span className="block text-xs text-muted-foreground">{c.latencyMs} ms</span> : null}
              </p>
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="about-status" className="mt-10 max-w-3xl space-y-3 text-sm text-muted-foreground">
        <h2 id="about-status" className="text-base font-semibold text-foreground">
          How to read this page
        </h2>
        <p>&quot;Not configured&quot; means the operator of this instance has not enabled that provider; it is not an outage. &quot;Configured, not probed&quot; means the key exists but we do not call the external provider from this page to avoid consuming quota.</p>
        <p>
          If something is down and you need help, email <a href={`mailto:${site.company.supportEmail}`} className="font-medium text-primary underline underline-offset-4">{site.company.supportEmail}</a> or use the <Link href="/support" className="font-medium text-primary underline underline-offset-4">support form</Link>. Reload the page to re-run the checks.
        </p>
      </section>
    </article>
  );
}
