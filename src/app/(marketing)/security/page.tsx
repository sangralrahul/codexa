import Link from "next/link";
import { ArrowRight, Check, FileLock2, Fingerprint, Gauge, KeyRound, ScrollText, ShieldAlert, Container } from "lucide-react";
import { routeMetadata } from "@/lib/seo";
import { TRUST_PAGES } from "@/content/marketing/trust";
import { ReviewNote } from "@/components/marketing/review-note";
import { RequestPathDiagram } from "@/components/marketing/request-path-diagram";
import { ContentSections } from "@/components/marketing/content-blocks";
import { CTABand } from "@/components/marketing/cta-band";
import { Eyebrow, GridFrame, GridRow, PageHero, RowHead } from "@/components/marketing/page-grid";

const PATH = "/security";
export const metadata = routeMetadata(PATH);

const page = TRUST_PAGES[PATH];

const IMPLEMENTED = [
  { label: "Generated code never runs in the web app", href: "#sandboxing" },
  { label: "Secrets encrypted before storage, never sent back", href: "#secrets" },
  { label: "httpOnly sessions; tokens hashed at rest", href: "#accounts" },
  { label: "Rate limits on sign-in, AI and public forms", href: "#rate-limiting" },
  { label: "Audit log of security-relevant actions", href: "#audit" },
];

/**
 * The controls, each with the place in the code that implements it (checked against the repository:
 * worker/sandbox.ts, src/lib/crypto.ts, src/lib/auth, src/lib/rate-limit.ts, the audit_logs table).
 */
const CONTROLS = [
  { icon: Container, title: "One container per project", body: "On Cloudflare each project gets its own ProjectSandbox Durable Object and Container, started on demand and stopped after 30 minutes without requests. Commands run as an unprivileged user.", source: "worker/sandbox.ts" },
  { icon: FileLock2, title: "Encrypted secrets", body: "Environment variables and integration credentials are encrypted with AES-256-GCM under an operator-held key before storage, and never returned to the browser.", source: "src/lib/crypto.ts · encryptSecret" },
  { icon: Fingerprint, title: "Hashed session tokens", body: "Sessions are httpOnly, SameSite cookies. The database stores an HMAC-SHA-256 of the token, so a database read alone cannot be replayed as a session.", source: "src/lib/auth/session.ts" },
  { icon: KeyRound, title: "Hashed passwords", body: "Passwords are hashed with scrypt and never stored or logged in plain text. Verification and reset links are single-use and expire.", source: "src/lib/auth" },
  { icon: Gauge, title: "Rate limits and quotas", body: "Sign-in, sign-up, password reset, AI runs and public forms are rate limited in D1, shared by every Worker instance. Plan limits are enforced on the server.", source: "src/lib/rate-limit.ts" },
  { icon: ScrollText, title: "Audit log", body: "Sign-ins, role changes, invitations, integrations, deployments and admin actions are recorded with the acting user, workspace and time.", source: "audit_logs table" },
];

/** The honesty panel: what we do not have, stated first, then what is implemented (each item links to its section). */
function HonestyPanel() {
  return (
    <div className="overflow-hidden rounded-[12px] border border-border bg-[color-mix(in_oklab,var(--background)_84%,transparent)] backdrop-blur-md">
      <div className="relative border-b border-border p-6 sm:p-7">
        <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[2px] bg-warning" />
        <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.06em] text-warning">
          <ShieldAlert className="size-3.5" aria-hidden="true" />
          Stated first
        </p>
        <h2 className="mt-3 text-[22px] font-semibold leading-tight tracking-[-0.03em]">No third-party certifications yet</h2>
        <p className="mt-3 text-[14.5px] leading-relaxed text-muted-foreground">
          Codexa has not completed SOC 2, ISO 27001, HIPAA, PCI DSS or any other third-party audit, and has not had a third-party penetration test. This page describes the controls in the code so you can assess them yourself.
        </p>
        <Link href="/contact-sales" className="pg-link mt-4 inline-flex items-center gap-1.5 text-[14px] font-medium">
          Ask for our security questionnaire answers <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>
      <div className="p-6 sm:p-7">
        <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-(--g-dim)">What is implemented</p>
        <ul className="mt-3 space-y-0.5">
          {IMPLEMENTED.map((i) => (
            <li key={i.href}>
              <a href={i.href} className="group -mx-2 flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-(--pg-panel-2)">
                <Check className="size-3.5 shrink-0 text-success" strokeWidth={2.5} aria-hidden="true" />
                <span className="flex-1 text-[14px]">{i.label}</span>
                <ArrowRight className="size-3.5 text-muted-foreground opacity-0 transition-[opacity,translate] duration-200 group-hover:translate-x-0.5 group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function Page() {
  const detail = page.sections.filter((s) => s.id !== "request-path" && s.id !== "summary");
  return (
    <div data-tone="trust" className="relative overflow-x-clip">
      <PageHero
        crumbs={[{ name: "Security", path: PATH }]}
        eyebrow="Security"
        title="Security"
        dim="you can read."
        lede={page.intro}
        actions={page.cta ? [page.cta.primary, ...(page.cta.secondary ? [page.cta.secondary] : [])] : undefined}
        scene="aurora"
        aside={<HonestyPanel />}
      />

      <GridFrame>
        <GridRow aria-label="Review status" crosshairs={false} className="px-(--g-pad) py-6">
          <ReviewNote kind="security" className="max-w-3xl" />
        </GridRow>

        <GridRow aria-labelledby="path-title">
          <RowHead id="path-title" index="01" label="Request path" title="Where a request goes," dim="and where code runs.">
            <p>The web app, the database, storage and each project&rsquo;s sandbox are separate pieces. Generated code only ever runs in the sandbox, behind a preview proxy on its own origin.</p>
          </RowHead>
          <div className="border-t border-border bg-[radial-gradient(70%_90%_at_50%_50%,var(--pg-panel),var(--background))] px-(--g-pad) py-10">
            <RequestPathDiagram />
          </div>
        </GridRow>

        <GridRow aria-labelledby="controls-title">
          <RowHead id="controls-title" index="02" label="Controls" title="Six controls," dim="and where they live.">
            <p>Each one names the part of the codebase that implements it, so a reviewer can read the code rather than take our word.</p>
          </RowHead>
          <ul className="pg-cells pg-cells--hover">
            {CONTROLS.map((c) => (
              <li key={c.title} className="flex flex-col">
                <h3 className="pg-cell__h">
                  <c.icon className="size-4" aria-hidden="true" />
                  {c.title}
                </h3>
                <p className="pg-cell__p">{c.body}</p>
                <p className="mt-auto pt-6 font-mono text-[11px] text-(--g-dim)">{c.source}</p>
              </li>
            ))}
          </ul>
        </GridRow>

        <GridRow aria-labelledby="detail-title" className="pg-split">
          <div>
            <div className="pg-split__sticky">
              <Eyebrow index="03">In detail</Eyebrow>
              <h2 id="detail-title" className="pg-h2">
                The long version,
                <br />
                <span>section by section.</span>
              </h2>
              <nav aria-label="On this page" className="mt-8">
                <ol className="divide-y divide-dashed divide-border border-y border-dashed border-border text-[14px]">
                  {detail.map((s, i) => (
                    <li key={s.id}>
                      <a href={`#${s.id}`} className="flex items-center gap-4 py-2.5 text-muted-foreground transition-colors hover:text-foreground">
                        <span className="font-mono text-[11px] text-(--g-dim)">{String(i + 1).padStart(2, "0")}</span>
                        {s.navLabel ?? s.heading}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
              {page.updated ? (
                <p className="mt-6 font-mono text-[11.5px] text-(--g-dim)">
                  Last revised <time dateTime={page.updated}>{page.updated}</time>
                </p>
              ) : null}
            </div>
          </div>
          <article className="max-w-[68ch] space-y-12 text-[16px] leading-[1.7] [&_section]:scroll-mt-28">
            <ContentSections sections={detail} />
          </article>
        </GridRow>
      </GridFrame>

      {page.cta ? <CTABand variant="sales" title={page.cta.title} description={page.cta.description} primary={page.cta.primary} secondary={page.cta.secondary ?? null} /> : null}
    </div>
  );
}
