import Link from "next/link";
import { Check, Hammer, Rocket, Send, Sparkles } from "lucide-react";
import { Breadcrumbs } from "@/components/docs/breadcrumbs";
import { HubHeader } from "@/components/docs/hub-header";
import { TemplatePreview } from "@/components/templates";
import { getTemplate } from "@/templates";
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

/** Real starter screenshots shown in the empty state; labelled as templates, never as community work. */
const FAN = ["vite-react-dashboard", "vite-react-storefront", "vite-react-saas"];

const FLOW = [
  { n: "01", title: "Build it", body: "Start from a template or a prompt and shape it with the agent. Any project you can edit counts.", Icon: Hammer },
  { n: "02", title: "Deploy it", body: "Optional: publish to Codexa hosting or Vercel so the entry can link to a live URL.", Icon: Rocket },
  { n: "03", title: "Submit it", body: "Write a title, description and tags. The team reviews it. Files are only remixable if the project is public.", Icon: Send },
];

function BeTheFirst({ signedIn }: { signedIn: boolean }) {
  const shots = FAN.map((id) => getTemplate(id)).filter((t): t is NonNullable<typeof t> => Boolean(t));
  return (
    <div className="e2 relative mt-6 overflow-hidden rounded-[26px]">
      <div aria-hidden="true" className="bg-blueprint absolute inset-0 opacity-50 [mask-image:radial-gradient(80%_80%_at_70%_40%,black,transparent)]" />
      <div className="relative grid gap-10 p-6 sm:p-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center">
        <div>
          <p className="text-label flex items-center gap-2 text-muted-foreground">
            <Sparkles className="size-3.5" aria-hidden="true" />
            Empty, for now
          </p>
          <h3 className="text-display-3 mt-4">
            Be the first <span className="text-dim">to publish.</span>
          </h3>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted-foreground">No community projects have been published yet. Build something in Codexa, submit it, and it can be the first entry here.</p>
          <ol className="mt-8 space-y-4">
            {FLOW.map(({ n, title, body, Icon }) => (
              <li key={n} className="flex gap-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-[11px] border border-border bg-card text-foreground shadow-[inset_0_1px_0_var(--hairline)]">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <span>
                  <span className="flex items-baseline gap-2 text-[15px] font-semibold">
                    <span className="font-mono text-[11.5px] font-normal text-foreground-dim">{n}</span>
                    {title}
                  </span>
                  <span className="mt-0.5 block text-[13.5px] leading-relaxed text-muted-foreground">{body}</span>
                </span>
              </li>
            ))}
          </ol>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={signedIn ? "#submit" : "/login?next=/showcase"} className={buttonClasses("primary", "md")}>
              {signedIn ? "Submit your project" : "Sign in to submit a project"}
            </Link>
            <Link href="/templates" className={buttonClasses("outline", "md")}>
              Start from a template
            </Link>
          </div>
        </div>
        <figure className="group/fan relative">
          <div className="relative mx-auto aspect-[16/12.5] w-full max-w-[560px]">
            {shots.map((t, i) => (
              <div
                key={t.id}
                className={[
                  "absolute w-[72%] overflow-hidden rounded-[14px] border border-border bg-card shadow-xl transition-[translate,rotate] duration-(--dur-5) ease-(--ease-out) calm:transition-none",
                  // A loose stack that fans out on hover (transform only; static in calm mode).
                  i === 0
                    ? "left-0 top-[16%] -rotate-[6deg] group-hover/fan:-translate-x-[6%] group-hover/fan:-rotate-[9deg] calm:group-hover/fan:translate-x-0 calm:group-hover/fan:-rotate-[6deg]"
                    : i === 1
                      ? "left-[16%] top-0 z-[1] rotate-0 group-hover/fan:-translate-y-[5%] calm:group-hover/fan:translate-y-0"
                      : "right-0 top-[27%] z-[2] rotate-[4deg] group-hover/fan:translate-x-[6%] group-hover/fan:rotate-[7deg] calm:group-hover/fan:translate-x-0 calm:group-hover/fan:rotate-[4deg]",
                ].join(" ")}
              >
                <div aria-hidden="true" className="flex h-6 items-center gap-1.5 border-b border-border bg-surface px-2.5">
                  <span className="size-1.5 rounded-full bg-border-strong" />
                  <span className="size-1.5 rounded-full bg-border-strong" />
                  <span className="size-1.5 rounded-full bg-border-strong" />
                  <span className="ml-2 truncate font-mono text-[9.5px] text-muted-foreground">{t.name}</span>
                </div>
                <TemplatePreview id={t.id} category={t.category} sizes="(min-width: 1024px) 400px, 72vw" alt={`${t.name} template screenshot`} />
              </div>
            ))}
          </div>
          <figcaption className="mt-4 text-center font-mono text-[11.5px] text-muted-foreground">Starter template screenshots · starting points, not community projects</figcaption>
        </figure>
      </div>
    </div>
  );
}

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
      <div data-tone="docs" className="container-x pb-16 pt-6 sm:pt-8 lg:pt-10">
        <Breadcrumbs items={[{ name: "Showcase", path: "/showcase" }]} className="mb-8" />
        <HubHeader
          kicker="Community showcase"
          title="Built with"
          dim="Codexa."
          lead="Real projects submitted by people who built them in Codexa and approved by our team. Each entry shows what the author chose to publish: a title, a description, tags and, when there is one, a live URL."
        >
          <p className="mt-4 max-w-2xl text-[13.5px] text-muted-foreground">Codexa does not list partners, customers or invented projects here. If the gallery is empty, nobody has published yet.</p>
        </HubHeader>

        <section aria-labelledby="entries-heading" className="mt-12">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 id="entries-heading" className="text-display-4">
              Published projects
              <span className="ml-3 font-mono text-[13px] font-normal tracking-normal text-muted-foreground" role="status">
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
          {items.length === 0 && !tag ? (
            <BeTheFirst signedIn={Boolean(user)} />
          ) : items.length === 0 ? (
            <EmptyState
              className="mt-6"
              icon={<Sparkles className="size-8" aria-hidden="true" />}
              title="No community projects have been published yet"
              description={`Nothing is tagged “${tag}”. Clear the filter or be the first to publish.`}
              action={
                <Link href={user ? "#submit" : "/login?next=/showcase"} className={buttonClasses("primary", "md")}>
                  {user ? "Submit your project" : "Sign in to submit a project"}
                </Link>
              }
            />
          ) : (
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Showcase projects">
              {items.map((item) => (
                <ShowcaseCard key={item.id} item={item} signedIn={Boolean(user)} />
              ))}
            </ul>
          )}
        </section>

        <section id="submit" aria-labelledby="submit-heading" className="mt-16 grid scroll-mt-28 gap-8 rounded-[22px] border border-border bg-surface/60 p-6 sm:p-8 lg:grid-cols-2 lg:gap-12 lg:p-10">
          <div>
            <h2 id="submit-heading" className="text-display-4">
              Submit your project
            </h2>
            <p className="mt-3 max-w-[52ch] text-pretty text-[15px] leading-relaxed text-muted-foreground">
              Anyone with the editor role on a project can submit it. The Codexa team reviews every entry before it is published.
            </p>
            <ul className="mt-5 space-y-2.5 text-sm leading-relaxed text-foreground/85">
              {[
                "Published entries carry a “Built with Codexa” badge.",
                "The page shows only what you write here and, optionally, a live URL.",
                "If the project’s visibility is public, signed-in users can remix it into their own workspace: its files are copied, never its secrets.",
              ].map((line) => (
                <li key={line} className="flex gap-2.5">
                  <Check className="mt-1 size-3.5 shrink-0 text-signal-ink" aria-hidden="true" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            {user && submissions.length ? (
              <div className="mt-6">
                <h3 className="text-sm font-semibold">Your submissions</h3>
                <ul className="mt-2 divide-y divide-border rounded-lg border border-border bg-card text-sm">
                  {submissions.map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-3 px-3 py-2">
                      <span className="truncate">
                        {s.status === "approved" ? (
                          <Link href={`/showcase/${s.slug}`} className="link-draw">
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
              <div className="flex h-full flex-col items-center justify-center rounded-[16px] border border-dashed border-border-strong p-6 text-center">
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
      <CTABand title="Build something worth showing." description="Start from a template or a prompt, iterate with the AI agent, deploy, and submit it here." primary={{ label: "Start building free", href: "/signup" }} secondary={{ label: "Browse templates", href: "/templates" }} />
    </>
  );
}
