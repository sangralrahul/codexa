import Link from "next/link";
import { Suspense } from "react";
import { ArrowUpRight } from "lucide-react";
import { LogoMark } from "@/components/logo";
import { FOOTER, FOOTER_MORE, navLabel } from "@/config/routes";
import { site } from "@/config/site";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { MotionToggle } from "@/components/motion/motion-toggle";
import { FooterStatus, FooterStatusFallback } from "./footer-status";

const GROUPS = Object.entries(FOOTER) as [keyof typeof FOOTER, readonly string[]][];

/**
 * Site footer (Monochrome Grid): inside the 1200px frame, the brand column with the tagline and the
 * live status pill, then one link column per route-manifest group (plus its "All …" link), and a
 * hairline bottom bar with the legal line and the theme and motion settings.
 */
export function MarketingFooter() {
  return (
    <footer className="mk-foot">
      <div className="mk-frame">
        <div className="mk-foot__grid">
          <div>
            <Link href="/" className="mk-brand" aria-label="Codexa home">
              <LogoMark size={22} />
              <span aria-hidden="true">Codexa</span>
            </Link>
            <p className="mt-3 max-w-[260px]">Describe it, build it, run it, publish it.</p>
            <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
              <li>
                <a href={site.social.github} rel="noopener noreferrer" className="inline-flex items-center gap-1 transition-colors hover:text-foreground">
                  GitHub <ArrowUpRight className="size-3" aria-hidden="true" />
                </a>
              </li>
              <li>
                <Link href="/support" className="transition-colors hover:text-foreground">
                  Support
                </Link>
              </li>
            </ul>
            <div className="mt-4">
              <Suspense fallback={<FooterStatusFallback />}>
                <FooterStatus />
              </Suspense>
            </div>
          </div>
          {GROUPS.map(([group, paths]) => (
            <nav key={group} aria-label={group}>
              <h2 className="mk-foot__h">{group}</h2>
              <ul className="mk-foot__links">
                {paths.map((p) => (
                  <li key={p}>
                    <Link href={p}>{navLabel(p)}</Link>
                  </li>
                ))}
                <li>
                  <Link href={FOOTER_MORE[group].href} className="text-foreground">
                    {FOOTER_MORE[group].label}
                  </Link>
                </li>
              </ul>
            </nav>
          ))}
        </div>
        <div className="mk-foot__bar">
          <p>
            © {new Date().getFullYear()} {site.company.legalName}
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
