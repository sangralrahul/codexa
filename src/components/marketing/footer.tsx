import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { CtaLink } from "./premium";
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
    <ul className="space-y-2.5">
      {paths.map((p) => (
        <li key={p}>
          <Link href={p} className="text-[13.5px] text-muted-foreground transition-colors hover:text-foreground">
            {navLabel(p)}
          </Link>
        </li>
      ))}
      <li>
        <Link href={more.href} className="inline-flex items-center gap-1 text-[13.5px] font-medium text-primary transition-colors hover:text-primary-hover">
          {more.label}
        </Link>
      </li>
    </ul>
  );
}

/**
 * Site footer: a top row with the logo, tagline and the two main actions, then five dense link
 * columns from the route manifest (capitalised labels, seven links each plus the "All …" link),
 * <details> accordions on phones, the live status pill, theme and motion settings.
 */
export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="container-x pt-14 lg:pt-20">
        <div className="flex flex-col gap-6 border-b border-border pb-10 lg:flex-row lg:items-end lg:justify-between lg:pb-12">
          <div className="max-w-xl">
            <Logo />
            <p className="mt-5 text-pretty text-[15.5px] leading-relaxed text-muted-foreground">
              {site.tagline} Describe it, read the code, run it in a sandbox and ship it, all in one workspace.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <CtaLink href="/signup" arrow>
              Start building
            </CtaLink>
            <CtaLink href="/docs" variant="secondary">
              Read the docs
            </CtaLink>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-10 pt-12 lg:grid-cols-[minmax(0,1.4fr)_repeat(5,minmax(0,1fr))] lg:gap-8">
          <div className="max-w-xs">
            <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-foreground">Codexa</p>
            <p className="mt-4 text-[13.5px] leading-relaxed text-muted-foreground">
              Prompt, edit, run and deploy. Starters, an agent that shows its work, a sandbox per project and hosting with history.
            </p>
            <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[13.5px]">
              <li>
                <a href={site.social.github} rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-foreground/80 transition-colors hover:text-foreground">
                  GitHub <ArrowUpRight className="size-3" aria-hidden="true" />
                </a>
              </li>
              <li>
                <Link href="/changelog" className="font-medium text-foreground/80 transition-colors hover:text-foreground">
                  Changelog
                </Link>
              </li>
              <li>
                <Link href="/support" className="font-medium text-foreground/80 transition-colors hover:text-foreground">
                  Support
                </Link>
              </li>
              <li>
                <Link href="/status" className="inline-flex items-center gap-1 font-medium text-foreground/80 transition-colors hover:text-foreground">
                  Status <ArrowRight className="size-3" aria-hidden="true" />
                </Link>
              </li>
            </ul>
            <div className="mt-6 text-xs text-muted-foreground">
              <Suspense fallback={<FooterStatusFallback />}>
                <FooterStatus />
              </Suspense>
            </div>
          </div>

          {/* Desktop: five columns. */}
          {GROUPS.map(([group, paths]) => (
            <nav key={group} aria-label={group} className="hidden lg:block">
              <h2 className="mb-4 text-[13px] font-semibold uppercase tracking-[0.08em] text-foreground">{group}</h2>
              <Column group={group} paths={paths} />
            </nav>
          ))}

          {/* Phones and tablets: a two-column grid of accordions. */}
          <div className="grid grid-cols-2 gap-x-5 border-t border-border lg:hidden">
            {GROUPS.map(([group, paths]) => (
              <details key={group} className="group border-b border-border [&:last-child:nth-child(odd)]:col-span-2">
                <summary className="flex cursor-pointer list-none items-center justify-between py-3 text-[14px] font-semibold [&::-webkit-details-marker]:hidden">
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

        <div className="mt-12 flex flex-col gap-4 border-t border-border py-6 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between lg:mt-14">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} {site.company.legalName}. Built on React, Vite, TypeScript, Node.js and Cloudflare.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <MotionToggle />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </footer>
  );
}
