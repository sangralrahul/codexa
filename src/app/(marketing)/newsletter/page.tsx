import { routeMetadata } from "@/lib/seo";
import { LEARN_SIDEBAR } from "@/lib/content/nav";
import { ArticleShell } from "@/components/docs/article-layout";
import { Breadcrumbs } from "@/components/docs/breadcrumbs";
import { NewsletterForm } from "@/components/docs/newsletter-form";
import { PageTitle } from "@/components/marketing/backdrop";

export const metadata = routeMetadata("/newsletter");

export default function NewsletterPage() {
  return (
    <div data-tone="docs">
    <ArticleShell sidebar={LEARN_SIDEBAR}>
      <Breadcrumbs items={[{ name: "Learn", path: "/learn" }, { name: "Newsletter", path: "/newsletter" }]} className="mb-4" />
      <header className="max-w-3xl">
        <PageTitle>Newsletter</PageTitle>
        <p className="mt-3 text-base text-muted-foreground sm:text-lg">Product updates, release notes and new guides, sent when there is something to say. No schedule, no marketing from third parties.</p>
      </header>
      <div className="mt-8 max-w-xl">
        <NewsletterForm source="newsletter" />
      </div>
      <section aria-labelledby="newsletter-what" className="mt-10 max-w-3xl">
        <h2 id="newsletter-what" className="text-lg font-semibold">
          What you will receive
        </h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Release notes when a new version ships (the same content as the changelog).</li>
          <li>New guides and tutorials.</li>
          <li>Changes to plans, limits or policies that affect your account.</li>
        </ul>
        <p className="mt-4 text-sm text-muted-foreground">Every email has a one-click unsubscribe link. Your address is used only for this list; see the privacy policy for details.</p>
      </section>
    </ArticleShell>
    </div>
  );
}
