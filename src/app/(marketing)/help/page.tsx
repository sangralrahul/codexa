import Link from "next/link";
import { ArrowRight, ArrowUpRight, BookOpen, LifeBuoy, Mail, MessageCircleQuestion, TriangleAlert } from "lucide-react";
import { routeMetadata } from "@/lib/seo";
import { getNavigation } from "@/lib/content";
import { site } from "@/config/site";
import { Breadcrumbs } from "@/components/docs/breadcrumbs";
import { DocIcon, categoryIcon } from "@/components/docs/doc-icons";
import { SearchTrigger } from "@/components/search/search-dialog";
import { SearchExamples } from "@/components/search/search-examples";
import { buttonClasses } from "@/components/ui/button";

export const metadata = routeMetadata("/help");

/** Error codes the API really returns, linked to their troubleshooting sections. */
const ERROR_CODES = [
  { code: "quota_exceeded", status: 402, anchor: "quota_exceeded-402" },
  { code: "ai_not_configured", status: 503, anchor: "ai_not_configured-503" },
  { code: "rate_limited", status: 429, anchor: "rate_limited-429" },
  { code: "invalid_credentials", status: 401, anchor: "invalid_credentials-401" },
  { code: "confirmation_required", status: 409, anchor: "confirmation_required-409" },
  { code: "email_taken", status: 409, anchor: "email_taken-409" },
  { code: "not_found", status: 404, anchor: "not_found-404" },
];

const EXAMPLES = ["preview does not start", "change my plan", "export my data", "invite a teammate"];

/** Docs pages that go deeper on each help area (slugs that exist under content/docs). */
const RELATED_DOCS: Record<string, string[]> = {
  Account: ["/docs/authentication", "/docs/billing", "/docs/security"],
  Building: ["/docs/projects", "/docs/ai-agent", "/docs/editor", "/docs/environment-variables"],
  Shipping: ["/docs/deployment", "/docs/custom-domains", "/docs/github", "/docs/troubleshooting"],
};

export default async function HelpIndexPage() {
  const [groups, docGroups] = await Promise.all([getNavigation("help"), getNavigation("docs")]);
  const docTitle = new Map(docGroups.flatMap((g) => g.items.map((d) => [d.href, d.title] as const)));
  // Cards keep equal heights and end with the docs pages that go deeper on their area: the longest
  // card lists two, shorter cards list up to four, so no card is left half empty.
  const most = Math.max(0, ...groups.map((g) => g.items.length));
  const relatedFor = (category: string, count: number) =>
    (RELATED_DOCS[category] ?? [])
      .filter((href) => docTitle.has(href))
      .slice(0, count >= most ? 2 : 4)
      .map((href) => ({ href, title: docTitle.get(href)! }));
  return (
    <div data-tone="docs" className="container-x pb-20 pt-6 sm:pt-8 lg:pt-10">
      <Breadcrumbs items={[{ name: "Help center", path: "/help" }]} />

      <header className="mx-auto mt-12 max-w-3xl text-center lg:mt-16">
        <p className="text-label flex items-center justify-center gap-2.5 text-muted-foreground">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-signal shadow-[0_0_0_3px_color-mix(in_oklab,var(--signal)_18%,transparent)]" />
          Help center
        </p>
        <h1 className="text-display-2 mx-auto mt-5 max-w-[14ch]">How can we help?</h1>
        <p className="text-lead mx-auto mt-5">Answers to the questions we get most often about accounts, projects, previews, deployments and billing.</p>
        <div className="mx-auto mt-8 max-w-2xl text-left">
          <SearchTrigger variant="hero" examples={EXAMPLES} label="Search help articles…" />
          <SearchExamples examples={EXAMPLES.slice(0, 3)} className="mt-4 justify-center" />
        </div>
      </header>

      <section aria-labelledby="errors-heading" className="mx-auto mt-12 max-w-6xl rounded-[22px] border border-border bg-surface/60 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="errors-heading" className="flex items-center gap-2 text-[15px] font-semibold">
            <TriangleAlert className="size-4 text-warning" aria-hidden="true" />
            Seeing an error code?
          </h2>
          <Link href="/docs/troubleshooting" className="link-draw text-sm text-muted-foreground hover:text-foreground">
            All error codes
          </Link>
        </div>
        <ul className="mt-4 flex flex-wrap gap-2" aria-label="Error codes">
          {ERROR_CODES.map((e) => (
            <li key={e.code}>
              <Link
                href={`/docs/troubleshooting#${e.anchor}`}
                className="group inline-flex h-8 items-center gap-2 rounded-full border border-border bg-card px-3 font-mono text-[12.5px] transition-colors duration-(--dur-2) hover:border-border-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <span className="text-foreground">{e.code}</span>
                <span className="rounded-full bg-muted px-1.5 text-[11px] text-muted-foreground">{e.status}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="mx-auto mt-14 grid max-w-6xl gap-5 lg:grid-cols-3">
        {groups.map((g) => {
          const Icon = categoryIcon(g.category);
          return (
            <section key={g.category} aria-labelledby={`help-${g.category}`} className="e1 flex flex-col rounded-[20px] p-2">
              <div className="flex items-center gap-3 px-3 pb-2 pt-3">
                <span className="grid size-9 place-items-center rounded-[10px] bg-surface-2">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <h2 id={`help-${g.category}`} className="text-[17px] font-semibold tracking-[-0.01em]">
                  {g.category}
                </h2>
                <span className="text-meta ml-auto text-foreground-dim">{g.items.length}</span>
              </div>
              <ul>
                {g.items.map((d) => (
                  <li key={d.href}>
                    <Link href={d.href} className="group flex items-start gap-3 rounded-[14px] px-3 py-3 transition-colors duration-(--dur-2) hover:bg-surface focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring">
                      <DocIcon href={d.href} category={d.category} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1 text-[14.5px] font-medium">
                          {d.title}
                          <ArrowUpRight className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
                        </span>
                        <span className="mt-0.5 line-clamp-2 block text-[13px] leading-relaxed text-muted-foreground">{d.description}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              {(() => {
                const related = relatedFor(g.category, g.items.length);
                return related.length ? (
                  <div className="mt-auto border-t border-border px-3 pb-2 pt-3">
                    <p className="text-label flex items-center gap-2 text-foreground-dim">
                      <BookOpen className="size-3.5" aria-hidden="true" />
                      In the docs
                    </p>
                    <ul className="mt-1.5" aria-label={`${g.category} documentation`}>
                      {related.map((r) => (
                        <li key={r.href}>
                          <Link href={r.href} className="group flex items-center justify-between gap-2 rounded-[10px] px-2 py-1.5 -mx-2 text-[13.5px] text-muted-foreground transition-colors duration-(--dur-2) hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring">
                            {r.title}
                            <ArrowRight className="size-3.5 opacity-0 transition-[opacity,translate] duration-(--dur-2) group-hover:translate-x-0.5 group-hover:opacity-100" aria-hidden="true" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null;
              })()}
            </section>
          );
        })}
      </div>

      <section aria-labelledby="help-contact" className="relative mx-auto mt-14 max-w-6xl overflow-hidden rounded-[24px] border border-border bg-card p-6 sm:p-8">
        <div aria-hidden="true" className="bg-blueprint absolute inset-0 opacity-60" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 id="help-contact" className="text-display-4">
              Still need help?
            </h2>
            <p className="mt-2 max-w-lg text-[15px] text-muted-foreground">Open a support ticket with your project id and the error code you saw, or email us directly.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/support" className={buttonClasses("secondary", "md")}>
              <LifeBuoy className="size-4" aria-hidden="true" /> Open a ticket
            </Link>
            <a href={`mailto:${site.company.supportEmail}`} className={buttonClasses("outline", "md")}>
              <Mail className="size-4" aria-hidden="true" /> {site.company.supportEmail}
            </a>
            <Link href="/faq" className={buttonClasses("ghost", "md", "text-muted-foreground hover:text-foreground")}>
              <MessageCircleQuestion className="size-4" aria-hidden="true" /> Read the FAQ
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
