import Link from "next/link";
import { Video } from "lucide-react";
import { routeMetadata } from "@/lib/seo";
import { LEARN_SIDEBAR } from "@/lib/content/nav";
import { ArticleShell } from "@/components/docs/article-layout";
import { Breadcrumbs } from "@/components/docs/breadcrumbs";
import { NewsletterForm } from "@/components/docs/newsletter-form";
import { EmptyState } from "@/components/ui/misc";

export const metadata = routeMetadata("/webinars");

export default function WebinarsPage() {
  return (
    <ArticleShell sidebar={LEARN_SIDEBAR}>
      <Breadcrumbs items={[{ name: "Learn", path: "/learn" }, { name: "Webinars", path: "/webinars" }]} className="mb-4" />
      <header className="max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Webinars</h1>
        <p className="mt-3 text-base text-muted-foreground sm:text-lg">Live sessions and recordings about building with Codexa.</p>
      </header>
      <div className="mt-8 max-w-3xl">
        <EmptyState
          icon={<Video className="size-6" aria-hidden="true" />}
          title="No webinars have been recorded yet"
          description="Codexa is an early-stage product built by a small team. When we schedule the first live session, subscribers to the newsletter will hear about it first. Until then, the guides and tutorials cover the same ground in writing."
          action={
            <div className="flex flex-wrap gap-3">
              <Link href="/guides" className="text-sm text-primary underline">
                Browse guides
              </Link>
              <Link href="/tutorials" className="text-sm text-primary underline">
                Browse tutorials
              </Link>
            </div>
          }
        />
        <section aria-labelledby="webinar-subscribe" className="mt-10">
          <h2 id="webinar-subscribe" className="text-lg font-semibold">
            Be notified about the first session
          </h2>
          <NewsletterForm className="mt-3" source="webinars" />
        </section>
      </div>
    </ArticleShell>
  );
}
