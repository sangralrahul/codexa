import * as React from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Mail } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import type { IdeaSource } from "@/lib/client/pending-idea";
import { site } from "@/config/site";
import type { Tone } from "@/content/marketing/types";
import { cn } from "@/lib/utils";
import { CtaLink, Mesh } from "./premium";
import { PromptBox } from "./prompt-box";

type Link_ = { label: string; href: string };
type Variant = "prompt" | "sales" | "docs" | "links";

const DEFAULTS: Record<Variant, { title: string; description: string; primary: Link_; secondary: Link_ | null }> = {
  prompt: {
    title: "Describe it. Watch it build.",
    description: "Free plan, no card. Your idea goes with you through sign-up, straight into a real project you can edit, run and deploy.",
    primary: { label: "Start building", href: "/signup" },
    secondary: { label: "See pricing", href: "/pricing" },
  },
  sales: {
    title: "Talk to the people who build it.",
    description: "Custom limits, invoice billing in INR or USD, and straight answers for your security review. We reply by email, usually within two business days.",
    primary: { label: "Contact sales", href: "/contact-sales" },
    secondary: { label: "Compare plans", href: "/pricing/compare-plans" },
  },
  docs: {
    title: "Read the manual. It is short.",
    description: "The quickstart goes from prompt to preview in about five minutes. Every feature on this site has a docs page that says exactly what it does.",
    primary: { label: "Read the docs", href: "/docs" },
    secondary: { label: "Quickstart", href: "/docs/quickstart" },
  },
  links: {
    title: "Start building with Codexa.",
    description: "Free plan, no card required. Describe your idea and get a real project you can edit, run, and deploy.",
    primary: { label: "Start building", href: "/signup" },
    secondary: { label: "See pricing", href: "/pricing" },
  },
};

/** The compact composer: the idea passport records where it came from. The AI capability state is shown inside the app, not here. */
async function PromptSlot({ source }: { source: IdeaSource }) {
  const user = await getCurrentUser();
  return <PromptBox signedIn={Boolean(user)} variant="compact" source={source} capabilityChip={false} />;
}

/**
 * Closing call to action on a gradient-mesh band.
 * - prompt: the home PromptBox, compact variant (idea passport; `source` says which page sent it).
 * - sales / docs: two actions plus a direct line.
 * - links (default when only title/primary are given): the classic two-button band.
 */
export function CTABand({
  variant,
  title,
  description,
  primary,
  secondary,
  tone = "product",
  source = "cta",
  className,
}: {
  variant?: Variant;
  title?: string;
  description?: string;
  primary?: Link_;
  secondary?: Link_ | null;
  tone?: Tone;
  /** prompt variant: where the idea passport says the idea came from ("solution" on solution pages). */
  source?: IdeaSource;
  className?: string;
}) {
  void tone;
  const v: Variant = variant ?? "links";
  const d = DEFAULTS[v];
  const t = title ?? d.title;
  const desc = description ?? d.description;
  const p = primary ?? d.primary;
  const s = secondary === undefined ? d.secondary : secondary;
  return (
    <section className={cn("relative isolate overflow-x-clip border-t border-border py-24 lg:py-32", className)}>
      <Mesh variant="band" />
      <div className="container-x text-center">
        <h2 className="mk-h2 mx-auto max-w-[20ch]">{t}</h2>
        <p className="mk-lead mx-auto mt-5 max-w-[56ch]">{desc}</p>
        {v === "prompt" ? (
          <>
            <div className="mx-auto mt-9 max-w-2xl text-left">
              <PromptSlot source={source} />
            </div>
            <p className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[15px]">
              {[p, s].filter((x): x is Link_ => Boolean(x)).map((l) => (
                <Link key={l.href} href={l.href} className="link-draw inline-flex items-center gap-1 font-semibold text-primary">
                  {l.label} <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              ))}
            </p>
          </>
        ) : (
          <>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 xs:flex-row">
              <CtaLink href={p.href} arrow>
                {p.label}
              </CtaLink>
              {s ? (
                <CtaLink href={s.href} variant="secondary">
                  {s.label}
                </CtaLink>
              ) : null}
            </div>
            {v === "sales" ? (
              <p className="mt-6 inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="size-4" aria-hidden="true" />
                Or email{" "}
                <a href={`mailto:${site.company.salesEmail}`} className="link-draw text-foreground">
                  {site.company.salesEmail}
                </a>
              </p>
            ) : v === "docs" ? (
              <p className="mt-6 inline-flex items-center gap-2 text-sm text-muted-foreground">
                <BookOpen className="size-4" aria-hidden="true" />
                Search every page with <kbd>⌘K</kbd> or <kbd>Ctrl K</kbd>
              </p>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
