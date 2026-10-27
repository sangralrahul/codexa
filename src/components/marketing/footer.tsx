import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Logo } from "@/components/logo";
import { FOOTER, FOOTER_MORE, navLabel } from "@/config/routes";
import { site } from "@/config/site";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { MotionToggle } from "@/components/motion/motion-toggle";
import { FooterStatus, FooterStatusFallback } from "./footer-status";

const GROUPS = Object.entries(FOOTER) as [keyof typeof FOOTER, readonly string[]][];
const WORD = "codexa";

function Column({ group, paths }: { group: keyof typeof FOOTER; paths: readonly string[] }) {
  const more = FOOTER_MORE[group];
  return (
    <ul className="space-y-2.5">
      {paths.map((p) => (
        <li key={p}>
          <Link href={p} className="link-draw text-[13.5px] text-foreground/70 transition-colors hover:text-foreground">
            {navLabel(p)}
          </Link>
        </li>
      ))}
      <li className="pt-1">
        <Link href={more.href} className="group inline-flex items-center gap-1 text-[13px] font-medium text-foreground transition-colors">
          {more.label}
          <ArrowRight className="size-3.5 transition-transform duration-300 ease-snap group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      </li>
    </ul>
  );
}

/**
 * Site footer (PLAN §5.1): capitalised labels from the route manifest, seven links a column plus
 * an "All …" link, <details> accordions on phones, the live status pill, theme and motion settings,
 * and the giant wordmark that rises letter by letter once it scrolls into view (decorative).
 */
export function MarketingFooter() {
  return (
    <footer className="relative isolate overflow-hidden border-t border-border bg-surface">
      <div aria-hidden="true" className="horizon-line pointer-events-none absolute inset-x-0 top-0 opacity-50" />
      <div className="container-x pb-6 pt-14 lg:pt-20">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.35fr)_repeat(5,minmax(0,1fr))] lg:gap-8">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-4 text-pretty text-sm leading-relaxed text-muted-foreground">
              {site.tagline} Describe it, read the code, run it in a sandbox and ship it, all in one workspace.
            </p>
            <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-[13px]">
              <li>
                <a href={site.social.github} rel="noopener noreferrer" className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground">
                  GitHub <ArrowUpRight className="size-3" aria-hidden="true" />
                </a>
              </li>
              <li>
                <Link href="/changelog" className="text-muted-foreground transition-colors hover:text-foreground">
                  Changelog
                </Link>
              </li>
              <li>
                <Link href="/support" className="text-muted-foreground transition-colors hover:text-foreground">
                  Support
                </Link>
              </li>
            </ul>
          </div>

          {/* Desktop: five columns. */}
          {GROUPS.map(([group, paths]) => (
            <nav key={group} aria-label={group} className="hidden lg:block">
              <h2 className="text-label mb-4 text-muted-foreground">{group}</h2>
              <Column group={group} paths={paths} />
            </nav>
          ))}

          {/* Phones and tablets: a two-column grid of accordions. */}
          <div className="grid grid-cols-2 gap-x-5 border-t border-border lg:hidden">
            {GROUPS.map(([group, paths]) => (
              <details key={group} className="group border-b border-border [&:last-child:nth-child(odd)]:col-span-2">
                <summary className="flex cursor-pointer list-none items-center justify-between py-3.5 text-[14px] font-medium [&::-webkit-details-marker]:hidden">
                  {group}
                  <span aria-hidden="true" className="relative inline-flex size-4 items-center justify-center text-muted-foreground">
                    <span className="absolute h-px w-2.5 bg-current" />
                    <span className="absolute h-2.5 w-px bg-current transition-transform duration-300 ease-snap group-open:scale-y-0" />
                  </span>
                </summary>
                <nav aria-label={group} className="pb-4">
                  <Column group={group} paths={paths} />
                </nav>
              </details>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between lg:mt-16">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <Suspense fallback={<FooterStatusFallback />}>
              <FooterStatus />
            </Suspense>
            <span>
              © {new Date().getFullYear()} {site.company.legalName}
            </span>
            <span className="hidden sm:inline">Prices in INR and USD, limits enforced per workspace.</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <MotionToggle />
            <ThemeToggle />
          </div>
        </div>
      </div>
      <div aria-hidden="true" className="mk-wordmark" data-split="" data-play="view">
        {Array.from(WORD).map((c, i) => (
          <span key={i} className="mk-wordmark__l" style={{ "--i": i, "--n": WORD.length } as React.CSSProperties}>
            {c}
          </span>
        ))}
      </div>
    </footer>
  );
}
