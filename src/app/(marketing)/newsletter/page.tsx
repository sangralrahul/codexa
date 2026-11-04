import Link from "next/link";
import { ArrowUpRight, BookOpen, FileText, Scale } from "lucide-react";
import { routeMetadata } from "@/lib/seo";
import { listDocs, formatDate } from "@/lib/content";
import { LEARN_SIDEBAR } from "@/lib/content/nav";
import { ArticleShell } from "@/components/docs/article-layout";
import { Breadcrumbs } from "@/components/docs/breadcrumbs";
import { NewsletterForm } from "@/components/docs/newsletter-form";
import { HubHeader } from "@/components/docs/hub-header";

export const metadata = routeMetadata("/newsletter");

const WHAT = [
  { Icon: FileText, title: "Release notes", body: "When a new version ships: the same entries as the changelog, nothing extra." },
  { Icon: BookOpen, title: "New guides and tutorials", body: "When a guide or tutorial is published, with a line on what it covers." },
  { Icon: Scale, title: "Plan and policy changes", body: "Changes to plans, limits or policies that affect your account." },
];

export default async function NewsletterPage() {
  const [changelog, guides, tutorials] = await Promise.all([listDocs("changelog"), listDocs("guides"), listDocs("tutorials")]);
  // What a recent issue would have carried: the latest releases and the newest written material, newest first.
  const releases = [...changelog].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
  const writing = [...guides, ...tutorials].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
  return (
    <ArticleShell sidebar={LEARN_SIDEBAR}>
      <Breadcrumbs items={[{ name: "Learn", path: "/learn" }, { name: "Newsletter", path: "/newsletter" }]} className="mb-8" />
      <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-end xl:gap-14">
        <HubHeader kicker="Newsletter" title="Newsletter." dim="Only when something ships." lead="Product updates, release notes and new guides, sent when there is something to say. No schedule, no marketing from third parties." />
        <div className="rounded-[14px] border border-border bg-(--pg-panel) p-5">
          <p className="text-[14px] font-semibold">Subscribe</p>
          <p className="mt-1 text-[13.5px] text-muted-foreground">One email per release at most. One-click unsubscribe in every email.</p>
          <NewsletterForm className="mt-4" source="newsletter" />
        </div>
      </div>

      <section aria-labelledby="newsletter-what" className="dx-body">
        <h2 id="newsletter-what" className="mk-eyebrow">
          <i aria-hidden="true" />
          <span>What you will receive</span>
        </h2>
        <ul className="mt-5 grid gap-px overflow-hidden rounded-[12px] border border-border bg-border sm:grid-cols-3">
          {WHAT.map(({ Icon, title, body }) => (
            <li key={title} className="bg-background p-5">
              <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
              <p className="mt-4 text-[15px] font-semibold tracking-[-0.01em]">{title}</p>
              <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">{body}</p>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[13.5px] text-muted-foreground">
          Your address is used only for this list; see the{" "}
          <Link href="/privacy" className="link-draw text-foreground">
            privacy policy
          </Link>
          .
        </p>
      </section>

      <div className="mt-14 grid gap-10 lg:grid-cols-2">
        {[
          { id: "nl-releases", label: "Latest releases", items: releases, all: { href: "/changelog", label: "Full changelog" } },
          { id: "nl-writing", label: "Latest guides and tutorials", items: writing, all: { href: "/learn", label: "Everything in Learn" } },
        ].map((col) => (
          <section key={col.id} aria-labelledby={col.id}>
            <div className="flex items-baseline justify-between gap-4">
              <h2 id={col.id} className="mk-eyebrow">
                <i aria-hidden="true" />
                <span>{col.label}</span>
              </h2>
              <Link href={col.all.href} className="link-draw text-[13px] text-muted-foreground hover:text-foreground">
                {col.all.label}
              </Link>
            </div>
            <ul className="mt-4 divide-y divide-border border-y border-border">
              {col.items.map((d) => (
                <li key={d.href}>
                  <Link href={d.href} className="group flex items-start justify-between gap-4 py-4">
                    <span className="min-w-0">
                      <span className="block font-mono text-[11px] uppercase tracking-[0.06em] text-foreground-dim">
                        {d.version ? `v${d.version} · ` : ""}
                        <time dateTime={d.date}>{formatDate(d.date)}</time>
                      </span>
                      <span className="mt-1 block text-[15px] font-medium tracking-[-0.01em]">{d.title}</span>
                      <span className="mt-1 line-clamp-2 block text-[13.5px] text-muted-foreground">{d.description}</span>
                    </span>
                    <ArrowUpRight className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform duration-(--dur-2) group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </ArticleShell>
  );
}
