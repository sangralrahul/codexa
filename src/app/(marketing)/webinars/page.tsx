import Link from "next/link";
import { Video } from "lucide-react";
import { routeMetadata } from "@/lib/seo";
import { LEARN_SIDEBAR } from "@/lib/content/nav";
import { ArticleShell } from "@/components/docs/article-layout";
import { Breadcrumbs } from "@/components/docs/breadcrumbs";
import { NewsletterForm } from "@/components/docs/newsletter-form";
import { EmptyState } from "@/components/ui/misc";
import { buttonClasses } from "@/components/ui/button";
import { HubHeader } from "@/components/docs/hub-header";
import { ArticleGrid } from "@/components/docs/article-bits";
import { listDocs } from "@/lib/content";

export const metadata = routeMetadata("/webinars");

export default async function WebinarsPage() {
  const [guides, tutorials] = await Promise.all([listDocs("guides"), listDocs("tutorials")]);
  // The written material that covers the same ground today, newest first.
  const writing = [...guides, ...tutorials].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  return (
    <ArticleShell sidebar={LEARN_SIDEBAR}>
      <Breadcrumbs items={[{ name: "Learn", path: "/learn" }, { name: "Webinars", path: "/webinars" }]} className="mb-8" />
      <HubHeader kicker="Webinars" title="Webinars." dim="None recorded yet." lead="Live sessions and recordings about building with Codexa. There are none yet; this page says so rather than listing placeholders." />
      <div className="dx-body grid gap-10 xl:grid-cols-[minmax(0,1fr)_22rem] xl:gap-14">
        <EmptyState
          icon={<Video className="size-6" aria-hidden="true" />}
          title="No webinars have been recorded yet"
          description="Codexa is an early-stage product built by a small team. When we schedule the first live session, subscribers to the newsletter will hear about it first. Until then, the guides and tutorials cover the same ground in writing."
          action={
            <div className="flex flex-wrap gap-3">
              <Link href="/guides" className={buttonClasses("secondary", "sm")}>
                Browse guides
              </Link>
              <Link href="/tutorials" className={buttonClasses("outline", "sm")}>
                Browse tutorials
              </Link>
            </div>
          }
        />
        <section aria-labelledby="webinar-subscribe" className="self-start rounded-[14px] border border-border bg-(--pg-panel) p-5">
          <h2 id="webinar-subscribe" className="text-[14px] font-semibold">
            Be notified about the first session
          </h2>
          <p className="mt-1 text-[13.5px] text-muted-foreground">Subscribers to the newsletter hear about it first.</p>
          <NewsletterForm className="mt-4" source="webinars" />
        </section>
      </div>
      {writing.length ? (
        <section aria-labelledby="webinar-writing" className="mt-14">
          <h2 id="webinar-writing" className="mk-eyebrow">
            <i aria-hidden="true" />
            <span>In writing, today</span>
          </h2>
          <div className="mt-5">
            <ArticleGrid docs={writing} showSection />
          </div>
        </section>
      ) : null}
    </ArticleShell>
  );
}
