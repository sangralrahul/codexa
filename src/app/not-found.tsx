import "@/components/marketing/marketing.css";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { getRoute } from "@/config/routes";
import { MarketingHeader } from "@/components/marketing/header";
import { MarketingFooter } from "@/components/marketing/footer";
import { Backdrop } from "@/components/marketing/backdrop";
import { PromptBox } from "@/components/marketing/prompt-box";
import { Kicker } from "@/components/marketing/page-header";
import { getChromeData } from "@/components/marketing/chrome-data";
import { buildHeaderWells } from "@/components/marketing/header-wells";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata = pageMetadata({ title: "Page not found", description: "The page you were looking for does not exist.", path: "/404", noindex: true });

const LINKS = [
  { href: "/docs", body: "Guides and reference for every feature." },
  { href: "/templates", body: "Starters with real files and screenshots." },
  { href: "/pricing", body: "Free, Pro, Team and Enterprise." },
];

export default async function NotFound() {
  const [user, chrome] = await Promise.all([getCurrentUser(), getChromeData()]);
  const signedIn = Boolean(user);
  return (
    <div className="site-shell relative isolate flex flex-1 flex-col">
      <Backdrop variant="wash" still className="site-backdrop" />
      <MarketingHeader signedIn={signedIn} wells={buildHeaderWells(chrome)} />
      <main id="main" className="flex-1">
        <section className="relative overflow-hidden">
          <div aria-hidden="true" className="bg-blueprint pointer-events-none absolute inset-0 -z-10" />
          <div className="container-x flex flex-col items-center pb-20 pt-16 text-center sm:pt-24">
            <p aria-hidden="true" className="mk-num select-none font-display text-[clamp(6rem,4rem+10vw,12rem)] font-extrabold leading-none tracking-[-0.06em] text-foreground/[0.07] [font-stretch:120%]">
              404
            </p>
            <Kicker className="-mt-6 justify-center sm:-mt-10">Not found</Kicker>
            <h1 className="text-display-2 mt-5 max-w-[16ch]">
              This page doesn&apos;t exist <span className="mark-select">yet.</span>
            </h1>
            <p className="text-lead mx-auto mt-5">The link may be old or mistyped. Or describe the page you were hoping for, and build it.</p>
            <div className="mt-10 w-full max-w-2xl text-left">
              <PromptBox signedIn={signedIn} />
            </div>
            <nav aria-label="Popular pages" className="mt-14 w-full max-w-3xl">
              <ul className="grid gap-3 text-left sm:grid-cols-3">
                {LINKS.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="glow-card group flex h-full items-start justify-between gap-3 rounded-[16px] border border-border p-5">
                      <span>
                        <span className="block font-medium">{getRoute(l.href)?.navLabel ?? l.href}</span>
                        <span className="mt-1 block text-[13.5px] leading-snug text-muted-foreground">{l.body}</span>
                      </span>
                      <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-[translate,color] duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
