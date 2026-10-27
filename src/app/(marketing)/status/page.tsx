import Link from "next/link";
import { Bot, Database, Globe, Mail, Server, type LucideIcon } from "lucide-react";
import { routeMetadata } from "@/lib/seo";
import { site } from "@/config/site";
import { Breadcrumbs } from "@/components/docs/breadcrumbs";
import { HubHeader } from "@/components/docs/hub-header";
import { cn } from "@/lib/utils";
import { getStatus, type ComponentState } from "./health";
import { StatusControls } from "./status-live";

export const metadata = routeMetadata("/status");
export const dynamic = "force-dynamic";

const labels: Record<ComponentState, { text: string; dot: string; chip: string }> = {
  operational: { text: "Operational", dot: "bg-success", chip: "text-success bg-success/10" },
  degraded: { text: "Degraded", dot: "bg-warning", chip: "text-warning bg-warning/10" },
  down: { text: "Down", dot: "bg-danger", chip: "text-danger bg-danger/10" },
  not_configured: { text: "Not configured", dot: "bg-foreground-dim", chip: "text-muted-foreground bg-muted" },
  unknown: { text: "Configured, not probed", dot: "bg-info", chip: "text-info bg-info/10" },
};

const overallCopy: Record<ComponentState, string> = {
  operational: "All checked components are operational.",
  degraded: "Some components are degraded.",
  down: "One or more components are down.",
  not_configured: "Some components are not configured.",
  unknown: "Status is partially known.",
};

const ICONS: Record<string, LucideIcon> = { web: Globe, database: Database, runner: Server, ai: Bot, email: Mail };

/** Six-column grid so no row is left half empty: 3 per row, with a short last row stretched. */
function spanFor(i: number, n: number) {
  const lastRow = n % 3;
  const inLastRow = lastRow !== 0 && i >= n - lastRow;
  const lg = !inLastRow ? "lg:col-span-2" : lastRow === 2 ? "lg:col-span-3" : "lg:col-span-6";
  return cn(lg, n % 2 === 1 && i === n - 1 && "sm:max-lg:col-span-2");
}

export default async function StatusPage() {
  const report = await getStatus();
  const overall = labels[report.overall];
  const alerting = report.overall !== "operational";
  const counts = report.components.reduce<Partial<Record<ComponentState, number>>>((acc, c) => ({ ...acc, [c.state]: (acc[c.state] ?? 0) + 1 }), {});

  return (
    <div data-tone="docs" className="container-x pb-20 pt-6 sm:pt-8 lg:pt-10">
      <Breadcrumbs items={[{ name: "Status", path: "/status" }]} className="mb-8" />
      <HubHeader
        kicker="Status"
        title="Platform status."
        lead="Live checks run when this page loads. There is no uptime history yet: we do not publish uptime percentages until we have a long enough measured record."
      />

      <section aria-labelledby="overall" className="e2 relative mt-10 overflow-hidden rounded-[24px] p-6 sm:p-8">
        <div aria-hidden="true" className="bg-dots absolute inset-0 opacity-40 [mask-image:radial-gradient(70%_120%_at_0%_50%,black,transparent)]" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-5">
            <span aria-hidden="true" className="relative grid size-14 shrink-0 place-items-center rounded-full bg-surface ring-1 ring-border">
              {alerting ? <span className={cn("absolute inset-3 rounded-full opacity-60 motion-safe:animate-ping calm:animate-none", overall.dot)} /> : null}
              <span className={cn("relative size-6 rounded-full", overall.dot)} />
            </span>
            <div>
              <p className="text-label text-muted-foreground">Overall</p>
              <h2 id="overall" className="mt-1.5 text-[clamp(20px,2.4vw,26px)] font-semibold leading-tight tracking-[-0.02em]">
                {overallCopy[report.overall]}
              </h2>
              <p className="mt-2 font-mono text-[12px] text-muted-foreground">
                {(Object.keys(labels) as ComponentState[])
                  .filter((s) => counts[s])
                  .map((s) => `${counts[s]} ${labels[s].text.toLowerCase()}`)
                  .join(" · ")}
              </p>
            </div>
          </div>
          <StatusControls checkedAt={report.checkedAt} />
        </div>
      </section>

      <section aria-labelledby="components" className="mt-8">
        <h2 id="components" className="text-label text-muted-foreground">
          Components
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {report.components.map((c, i) => {
            const l = labels[c.state];
            const Icon = ICONS[c.id] ?? Server;
            return (
              <li key={c.id} className={cn("flex flex-col rounded-[18px] border border-border bg-card p-5 shadow-[inset_0_1px_0_var(--hairline)]", spanFor(i, report.components.length))}>
                <div className="flex items-start justify-between gap-3">
                  <p className="flex items-center gap-2.5 font-medium">
                    <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
                    {c.name}
                  </p>
                  <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[12px] font-medium", l.chip)}>
                    <span aria-hidden="true" className={cn("size-1.5 rounded-full", l.dot)} />
                    {l.text}
                  </span>
                </div>
                <p className="mt-2 flex-1 text-[13.5px] leading-relaxed text-muted-foreground">{c.detail}</p>
                <dl className="mt-4 flex items-center justify-between border-t border-border pt-3 font-mono text-[12px]">
                  {/* A down component has no response time: show how long the failed check took instead. */}
                  <dt className="text-foreground-dim">{c.state === "down" ? "Check" : "Latency"}</dt>
                  <dd className={cn("tabular-nums", c.state === "down" ? "text-muted-foreground" : "text-foreground")}>
                    {c.state === "down"
                      ? typeof c.latencyMs === "number"
                        ? `no response · failed after ${c.latencyMs} ms`
                        : "no response"
                      : typeof c.latencyMs === "number"
                        ? `${c.latencyMs} ms`
                        : c.state === "not_configured"
                          ? "n/a"
                          : "not probed"}
                  </dd>
                </dl>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="about-status" className="mt-14 grid gap-8 rounded-[22px] border border-border bg-surface/60 p-6 sm:p-8 lg:grid-cols-2">
        <div>
          <h2 id="about-status" className="text-[17px] font-semibold">
            How to read this page
          </h2>
          <p className="mt-3 text-[14.5px] leading-relaxed text-muted-foreground">
            &quot;Not configured&quot; means the operator of this instance has not enabled that provider; it is not an outage. &quot;Configured, not probed&quot; means the key exists but we do not call the external provider from this page, to avoid consuming quota. Latency is the time this server took to get an answer during this check; for a component that is down, it is how long the failed check took.
          </p>
        </div>
        <div>
          <h2 className="text-[17px] font-semibold">Need help?</h2>
          <p className="mt-3 text-[14.5px] leading-relaxed text-muted-foreground">
            If something is down, email{" "}
            <a href={`mailto:${site.company.supportEmail}`} className="link-draw text-foreground">
              {site.company.supportEmail}
            </a>{" "}
            or use the{" "}
            <Link href="/support" className="link-draw text-foreground">
              support form
            </Link>
            . Re-check runs the same checks again.
          </p>
        </div>
      </section>
    </div>
  );
}
