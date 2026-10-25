import Link from "next/link";
import { Logo } from "@/components/logo";
import { FOOTER, getRoute } from "@/config/routes";
import { site } from "@/config/site";

export function MarketingFooter() {
  return (
    <footer className="relative isolate overflow-hidden border-t border-border bg-surface">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-glow-2/70 to-transparent" />
      <div aria-hidden="true" className="absolute left-1/2 top-0 -z-10 h-64 w-[60rem] max-w-full -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-glow-1/20 via-glow-2/20 to-glow-3/15 blur-3xl" />
      <div className="container-x py-14">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(5,1fr)]">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">{site.tagline} Built for developers, students, founders, and teams in India and worldwide.</p>
            <p className="mt-4 text-xs text-muted-foreground">
              <Link href="/status" className="hover:text-foreground">
                Status
              </Link>{" "}
              ·{" "}
              <Link href="/changelog" className="hover:text-foreground">
                Changelog
              </Link>{" "}
              ·{" "}
              <a href={site.social.github} className="hover:text-foreground" rel="noopener noreferrer">
                GitHub
              </a>
            </p>
          </div>
          {Object.entries(FOOTER).map(([group, paths]) => (
            <nav key={group} aria-label={group}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{group}</h3>
              <ul className="mt-3 space-y-2">
                {paths.map((p) => {
                  const r = getRoute(p);
                  return (
                    <li key={p}>
                      <Link href={p} className="text-sm text-foreground/75 transition-colors hover:text-foreground">
                        {r?.title.replace(/^Codexa for /, "") ?? p}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-10 flex flex-col gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {site.company.legalName}. All rights reserved.</p>
          <p>
            Prices shown in INR and USD. Usage limits are enforced per workspace. See{" "}
            <Link href="/pricing" className="underline hover:text-foreground">
              pricing
            </Link>
            .
          </p>
        </div>
      </div>
      {/* Oversized faded wordmark. */}
      <p aria-hidden="true" className="pointer-events-none select-none bg-gradient-to-b from-foreground/[0.07] to-transparent bg-clip-text pb-2 text-center text-[22vw] font-semibold leading-[0.8] tracking-tighter text-transparent lg:text-[16rem]">
        Codexa
      </p>
    </footer>
  );
}
