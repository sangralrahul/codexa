import Link from "next/link";
import { routeMetadata } from "@/lib/seo";
import { ROADMAP } from "@/lib/content/roadmap";
import { Breadcrumbs } from "@/components/docs/breadcrumbs";
import { Callout } from "@/components/content";
import { Badge } from "@/components/ui/badge";
import { PageTitle } from "@/components/marketing/backdrop";

export const metadata = routeMetadata("/roadmap");

const TONE: Record<string, string> = { now: "border-t-success", next: "border-t-info", later: "border-t-border-strong" };

export default function RoadmapPage() {
  return (
    <div className="container-x py-10 sm:py-14">
      <Breadcrumbs items={[{ name: "Roadmap", path: "/roadmap" }]} className="mb-4" />
      <header className="max-w-3xl">
        <PageTitle>Roadmap</PageTitle>
        <p className="mt-3 text-base text-muted-foreground sm:text-lg">What is shipping now, what we are building next, and what comes later. Priorities can change as we learn from real usage.</p>
      </header>
      <Callout kind="note" title="No dates committed" className="max-w-3xl">
        <p>
          We do not publish target dates. “Next” means actively being designed or built; “Later” means intended but not started. Shipped items move to the <Link href="/changelog">changelog</Link>.
        </p>
      </Callout>
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {ROADMAP.map((col) => (
          <section key={col.id} aria-labelledby={`roadmap-${col.id}`} className={`rounded-xl border border-border border-t-4 bg-card p-5 shadow-sm ${TONE[col.id]}`}>
            <div className="flex items-center gap-2">
              <h2 id={`roadmap-${col.id}`} className="text-xl font-semibold tracking-tight">
                {col.title}
              </h2>
              <Badge variant="outline">{col.items.length}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{col.summary}</p>
            <ul className="mt-4 space-y-3">
              {col.items.map((item) => (
                <li key={item.title} className="rounded-lg border border-border p-3">
                  <p className="font-medium">{item.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                  {item.href ? (
                    <Link href={item.href} className="mt-2 inline-block text-sm text-primary underline">
                      Details
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <p className="mt-10 max-w-3xl text-sm text-muted-foreground">
        Have a request? Use <Link href="/request-feature" className="text-primary underline">request a feature</Link>; we read every one.
      </p>
    </div>
  );
}
