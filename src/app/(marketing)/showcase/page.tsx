import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { CTABand } from "@/components/marketing/cta-band";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { getCurrentUser } from "@/lib/auth/session";
import { getCurrentWorkspace } from "@/lib/services/current-workspace";
import { listApproved, listSubmittedBy, serializeShowcaseItem } from "@/lib/services/showcase";
import { routeMetadata } from "@/lib/seo";
import { ShowcaseCard } from "./_components/showcase-card";
import { ShowcaseSubmitForm } from "./_components/submit-form";

export const metadata = routeMetadata("/showcase");

type SearchParams = Promise<{ tag?: string }>;

export default async function ShowcasePage({ searchParams }: { searchParams: SearchParams }) {
  const [sp, user] = await Promise.all([searchParams, getCurrentUser()]);
  const tag = sp.tag?.trim().toLowerCase() || undefined;
  const [approved, mine, workspace] = await Promise.all([
    listApproved({ limit: 100, tag }),
    user ? listSubmittedBy(user.id) : Promise.resolve([]),
    user ? getCurrentWorkspace(user) : Promise.resolve(null),
  ]);
  const items = approved.map(serializeShowcaseItem);
  const submissions = mine.map(serializeShowcaseItem);
  const current = workspace?.current ?? null;
  const allTags = Array.from(new Set(items.flatMap((i) => i.tags))).sort();

  return (
    <>
      <div className="container-x py-10 sm:py-14">
        <Breadcrumbs items={[{ name: "Showcase", path: "/showcase" }]} />
        <header className="mt-6 max-w-3xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-primary">Community showcase</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">Projects built with Codexa</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Real projects submitted by people who built them in Codexa and approved by our team. Each entry shows what the author chose to publish: a title, a description, tags and, when there is one, a live URL.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">Codexa does not list partners, customers or invented projects here. If the gallery is empty, nobody has published yet.</p>
        </header>

        <section aria-labelledby="entries-heading" className="mt-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 id="entries-heading" className="text-xl font-semibold tracking-tight">
              Published projects
              <span className="ml-2 text-sm font-normal text-muted-foreground" role="status">
                {items.length} {items.length === 1 ? "project" : "projects"}
                {tag ? ` tagged “${tag}”` : ""}
              </span>
            </h2>
            {allTags.length || tag ? (
              <nav aria-label="Filter by tag" className="flex flex-wrap gap-1.5">
                <Link href="/showcase" className={buttonClasses(tag ? "outline" : "secondary", "sm", "rounded-full")} aria-current={!tag ? "true" : undefined}>
                  All
                </Link>
                {allTags.map((t) => (
                  <Link key={t} href={`/showcase?tag=${encodeURIComponent(t)}`} className={buttonClasses(tag === t ? "secondary" : "outline", "sm", "rounded-full")} aria-current={tag === t ? "true" : undefined}>
                    {t}
                  </Link>
                ))}
              </nav>
            ) : null}
          </div>
          {items.length === 0 ? (
            <EmptyState
              className="mt-6"
              icon={<Sparkles className="size-8" aria-hidden="true" />}
              title="No community projects have been published yet"
              description={tag ? `Nothing is tagged “${tag}”. Clear the filter or be the first to publish.` : "Be the first: submit a project you built in Codexa and our team will review it."}
              action={
                <Link href={user ? "#submit" : "/login?next=/showcase"} className={buttonClasses("primary", "md")}>
                  {user ? "Submit your project" : "Sign in to submit a project"}
                </Link>
              }
            />
          ) : (
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Showcase projects">
              {items.map((item) => (
                <ShowcaseCard key={item.id} item={item} />
              ))}
            </ul>
          )}
        </section>

        <section id="submit" aria-labelledby="submit-heading" className="mt-16 grid gap-8 rounded-2xl border border-border bg-surface p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <div>
            <h2 id="submit-heading" className="text-xl font-semibold tracking-tight">
              Submit your project
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Anyone with the editor role on a project can submit it. Entries are reviewed by the Codexa team and published with a “Built with Codexa” badge. Project files are never published — only what you write
              here and, optionally, a live URL.
            </p>
            {user && submissions.length ? (
              <div className="mt-6">
                <h3 className="text-sm font-semibold">Your submissions</h3>
                <ul className="mt-2 divide-y divide-border rounded-lg border border-border bg-card text-sm">
                  {submissions.map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-3 px-3 py-2">
                      <span className="truncate">
                        {s.status === "approved" ? (
                          <Link href={`/showcase/${s.slug}`} className="hover:text-primary">
                            {s.title}
                          </Link>
                        ) : (
                          s.title
                        )}
                      </span>
                      <Badge variant={s.status === "approved" ? "success" : "warning"}>{s.status === "approved" ? "Published" : "Pending review"}</Badge>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
          <div>
            {user ? (
              <ShowcaseSubmitForm workspaceId={current?.workspace.id ?? null} workspaceName={current?.workspace.name ?? null} />
            ) : (
              <div className="rounded-xl border border-dashed border-border-strong p-6 text-center">
                <p className="text-sm text-muted-foreground">Sign in to submit one of your projects.</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <Link href="/login?next=/showcase" className={buttonClasses("primary", "md")}>
                    Sign in
                  </Link>
                  <Link href="/signup?next=/showcase" className={buttonClasses("outline", "md")}>
                    Create an account
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
      <CTABand title="Build something worth showing" description="Start from a template or a prompt, iterate with the AI agent, deploy, and submit it here." primary={{ label: "Start Building Free", href: "/signup" }} secondary={{ label: "Browse templates", href: "/templates" }} />
    </>
  );
}
