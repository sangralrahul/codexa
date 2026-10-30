import * as React from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Mail } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import type { IdeaSource } from "@/lib/client/pending-idea";
import { site } from "@/config/site";
import type { Tone } from "@/content/marketing/types";
import { cn } from "@/lib/utils";
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
 * Closing call to action: a plain surface band with a hairline border (no island, no light, no grain).
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
    <section className={cn("border-t border-border bg-surface/60 py-16 lg:py-24", className)}>
      <div className="container-x text-center">
        <h2 className="mk-h2 mx-auto max-w-[20ch]">{t}</h2>
        <p className="text-lead mx-auto mt-4">{desc}</p>
        {v === "prompt" ? (
          <>
            <div className="mx-auto mt-8 max-w-2xl text-left">
              <PromptSlot source={source} />
            </div>
            <p className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
              {[p, s].filter((x): x is Link_ => Boolean(x)).map((l) => (
                <Link key={l.href} href={l.href} className="link-draw inline-flex items-center gap-1 font-medium text-foreground">
                  {l.label} <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              ))}
            </p>
          </>
        ) : (
          <>
            <div className="mt-8 flex flex-col justify-center gap-3 xs:flex-row">
              <Link href={p.href} className={buttonClasses("primary", "md", "group px-6")}>
                {p.label}
                <ArrowRight className="size-4 transition-transform duration-300 ease-snap group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
              {s ? (
                <Link href={s.href} className={buttonClasses("outline", "md", "px-6")}>
                  {s.label}
                </Link>
              ) : null}
            </div>
            {v === "sales" ? (
              <p className="mt-5 inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="size-4" aria-hidden="true" />
                Or email{" "}
                <a href={`mailto:${site.company.salesEmail}`} className="link-draw text-foreground">
                  {site.company.salesEmail}
                </a>
              </p>
            ) : v === "docs" ? (
              <p className="mt-5 inline-flex items-center gap-2 text-sm text-muted-foreground">
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
