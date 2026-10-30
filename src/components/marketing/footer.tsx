import Link from "next/link";
import { Suspense } from "react";
import { ArrowUpRight } from "lucide-react";
import { Logo } from "@/components/logo";
import { FOOTER, FOOTER_MORE, navLabel } from "@/config/routes";
import { site } from "@/config/site";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { MotionToggle } from "@/components/motion/motion-toggle";
import { FooterStatus, FooterStatusFallback } from "./footer-status";

const GROUPS = Object.entries(FOOTER) as [keyof typeof FOOTER, readonly string[]][];

function Column({ group, paths }: { group: keyof typeof FOOTER; paths: readonly string[] }) {
  const more = FOOTER_MORE[group];
  return (
    <ul className="space-y-2">
      {paths.map((p) => (
        <li key={p}>
          <Link href={p} className="text-[13px] text-muted-foreground transition-colors hover:text-foreground">
            {navLabel(p)}
          </Link>
        </li>
      ))}
      <li>
        <Link href={more.href} className="text-[13px] text-muted-foreground transition-colors hover:text-foreground">
          {more.label}
        </Link>
      </li>
    </ul>
  );
}

/**
 * Site footer: five link columns from the route manifest (capitalised labels, eight links each with
 * the "All …" link), <details> accordions on phones, the live status pill, theme and motion settings.
 */
export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="container-x pt-12 lg:pt-14">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1.5fr)_repeat(5,minmax(0,1fr))] lg:gap-6">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-4 text-pretty text-[13px] leading-relaxed text-muted-foreground">
              {site.tagline} Describe it, read the code, run it in a sandbox and ship it, all in one workspace.
            </p>
            <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[13px]">
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
              <h2 className="mb-3 text-[13px] font-semibold text-foreground">{group}</h2>
              <Column group={group} paths={paths} />
            </nav>
          ))}

          {/* Phones and tablets: a two-column grid of accordions. */}
          <div className="grid grid-cols-2 gap-x-5 border-t border-border lg:hidden">
            {GROUPS.map(([group, paths]) => (
              <details key={group} className="group border-b border-border [&:last-child:nth-child(odd)]:col-span-2">
                <summary className="flex cursor-pointer list-none items-center justify-between py-3 text-[14px] font-medium [&::-webkit-details-marker]:hidden">
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

        <div className="mt-10 flex flex-col gap-4 border-t border-border py-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between lg:mt-12">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <Suspense fallback={<FooterStatusFallback />}>
              <FooterStatus />
            </Suspense>
            <span>
              © {new Date().getFullYear()} {site.company.legalName}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <MotionToggle />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </footer>
  );
}
