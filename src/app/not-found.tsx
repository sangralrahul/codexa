import Link from "next/link";
import { Search } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { getRoute } from "@/config/routes";
import { buttonClasses } from "@/components/ui/button";
import { MarketingHeader } from "@/components/marketing/header";
import { MarketingFooter } from "@/components/marketing/footer";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata = pageMetadata({ title: "Page not found", description: "The page you were looking for does not exist.", path: "/404", noindex: true });

const popular = ["/", "/product", "/pricing", "/docs", "/templates", "/how-it-works", "/support", "/status"];

export default async function NotFound() {
  const user = await getCurrentUser();
  return (
    <>
      <MarketingHeader signedIn={Boolean(user)} />
      <main id="main" className="flex-1">
        <section className="container-x flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">404</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Page not found</h1>
          <p className="mt-3 max-w-md text-muted-foreground">The page may have moved, or the link was mistyped. Try searching, or pick one of the pages below.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/docs" className={buttonClasses("primary", "md")}>
              <Search className="size-4" aria-hidden="true" />
              Search the docs
            </Link>
            <Link href="/" className={buttonClasses("outline", "md")}>
              Back to homepage
            </Link>
          </div>
          <nav aria-label="Popular pages" className="mt-10">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Popular pages</p>
            <ul className="mt-3 flex flex-wrap justify-center gap-2">
              {popular.map((p) => (
                <li key={p}>
                  <Link href={p} className="inline-flex rounded-full border border-border bg-card px-3 py-1.5 text-sm hover:bg-muted">
                    {p === "/" ? "Home" : (getRoute(p)?.title ?? p)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </section>
      </main>
      <MarketingFooter />
    </>
  );
}
