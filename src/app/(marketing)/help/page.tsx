import Link from "next/link";
import { LifeBuoy, Mail } from "lucide-react";
import { routeMetadata } from "@/lib/seo";
import { getNavigation } from "@/lib/content";
import { site } from "@/config/site";
import { Breadcrumbs } from "@/components/docs/breadcrumbs";
import { SearchTrigger } from "@/components/search/search-dialog";
import { buttonClasses } from "@/components/ui/button";
import { PageTitle } from "@/components/marketing/backdrop";

export const metadata = routeMetadata("/help");

export default async function HelpIndexPage() {
  const groups = await getNavigation("help");
  return (
    <div className="container-x py-10 sm:py-14">
      <Breadcrumbs items={[{ name: "Help center", path: "/help" }]} className="mb-4" />
      <header className="max-w-3xl">
        <PageTitle>Help center</PageTitle>
        <p className="mt-3 text-base text-muted-foreground sm:text-lg">Answers to the questions we get most often about accounts, projects, previews, deployments and billing.</p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <SearchTrigger className="sm:min-w-[16rem]" />
          <Link href="/faq" className={buttonClasses("outline", "md")}>
            FAQ
          </Link>
        </div>
      </header>
      <div className="mt-10 space-y-10">
        {groups.map((g) => (
          <section key={g.category} aria-labelledby={`help-${g.category}`}>
            <h2 id={`help-${g.category}`} className="text-lg font-semibold">
              {g.category}
            </h2>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {g.items.map((d) => (
                <li key={d.href}>
                  <Link href={d.href} className="block h-full rounded-lg border border-border p-4 transition hover:border-border-strong hover:bg-muted/40">
                    <span className="font-medium">{d.title}</span>
                    <span className="mt-1 block text-sm text-muted-foreground">{d.description}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <section aria-labelledby="help-contact" className="mt-12 rounded-xl border border-border bg-muted/30 p-6">
        <h2 id="help-contact" className="text-lg font-semibold">
          Still need help?
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">Open a support ticket with your project id and the error code you saw, or email us directly.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/support" className={buttonClasses("primary", "md")}>
            <LifeBuoy className="size-4" aria-hidden="true" /> Open a ticket
          </Link>
          <a href={`mailto:${site.company.supportEmail}`} className={buttonClasses("outline", "md")}>
            <Mail className="size-4" aria-hidden="true" /> {site.company.supportEmail}
          </a>
        </div>
      </section>
    </div>
  );
}
