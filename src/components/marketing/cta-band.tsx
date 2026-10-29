import * as React from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Mail } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { SplitHeading } from "@/components/motion/split-heading";
import { getCurrentUser } from "@/lib/auth/session";
import { capabilities } from "@/lib/env";
import type { IdeaSource } from "@/lib/client/pending-idea";
import { site } from "@/config/site";
import type { Tone } from "@/content/marketing/types";
import { cn } from "@/lib/utils";
import { Backdrop } from "./backdrop";
import { PromptBox } from "./prompt-box";

type Link_ = { label: string; href: string };
type Variant = "prompt" | "sales" | "docs" | "links";

/** One extra light per area, from tokens only (the island is always the dark palette). */
const TINT: Record<Tone, string> = {
  product: "var(--silk-1)",
  trust: "var(--success)",
  docs: "var(--info)",
  pricing: "var(--signal-2)",
  company: "var(--accent)",
};

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

/** The compact composer: the idea passport records where it came from, and the capability line is the real AI state. */
async function PromptSlot({ source }: { source: IdeaSource }) {
  const user = await getCurrentUser();
  return <PromptBox signedIn={Boolean(user)} variant="compact" source={source} aiReady={capabilities.ai} />;
}

/**
 * Closing call to action (PLAN §5.3): a deep ink card (the dark palette as an island, in both
 * themes) with a pointer spotlight, grain, a blueprint grid, the area's light and a still,
 * CSS-only backdrop (never a second canvas). The headline rises line by line.
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
  const v: Variant = variant ?? "links";
  const d = DEFAULTS[v];
  const t = title ?? d.title;
  const desc = description ?? d.description;
  const p = primary ?? d.primary;
  const s = secondary === undefined ? d.secondary : secondary;
  return (
    <section className={cn("py-16 sm:py-20 lg:py-28", className)}>
      <div className="container-x">
      <div
        data-reveal
        data-spotlight
        className="dark relative isolate overflow-hidden rounded-[24px] border border-border-strong bg-background text-foreground shadow-xl sm:rounded-[28px]"
        style={{ "--cta-tint": TINT[tone] } as React.CSSProperties}
      >
        <Backdrop still className="opacity-70 [&_.backdrop__canvas]:[mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />
        <div aria-hidden="true" className="bg-blueprint pointer-events-none absolute inset-0 opacity-70" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-40 left-1/2 h-80 w-[80%] -translate-x-1/2 rounded-[50%] opacity-50 blur-3xl"
          style={{ background: "radial-gradient(closest-side, var(--cta-tint), transparent)" }}
        />
        <div aria-hidden="true" className="rim pointer-events-none absolute inset-x-0 top-0 h-px" />
        <div className="relative z-[2] px-6 py-16 text-center sm:px-12 sm:py-20 lg:py-24">
          <SplitHeading as="h2" size="display-2" className="mx-auto max-w-[16ch]">
            {t}
          </SplitHeading>
          <p className="text-lead mx-auto mt-6 text-foreground/70">{desc}</p>
          {v === "prompt" ? (
            <>
              <div className="mx-auto mt-10 max-w-2xl text-left">
                <PromptSlot source={source} />
              </div>
              <p className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-foreground/60">
                {[p, s].filter((x): x is Link_ => Boolean(x)).map((l) => (
                  <Link key={l.href} href={l.href} className="link-draw inline-flex items-center gap-1 text-foreground/80 hover:text-foreground">
                    {l.label} <ArrowRight className="size-3.5" aria-hidden="true" />
                  </Link>
                ))}
              </p>
            </>
          ) : (
            <>
              <div className="mt-10 flex flex-col justify-center gap-3 xs:flex-row">
                <Link href={p.href} className={buttonClasses("secondary", "lg", "group px-7")}>
                  {p.label}
                  <ArrowRight className="size-4 transition-transform duration-300 ease-snap group-hover:translate-x-0.5" aria-hidden="true" />
                </Link>
                {s ? (
                  <Link href={s.href} className={buttonClasses("outline", "lg", "px-7")}>
                    {s.label}
                  </Link>
                ) : null}
              </div>
              {v === "sales" ? (
                <p className="mt-6 inline-flex items-center gap-2 text-sm text-foreground/60">
                  <Mail className="size-4" aria-hidden="true" />
                  Or email{" "}
                  <a href={`mailto:${site.company.salesEmail}`} className="link-draw text-foreground/85 hover:text-foreground">
                    {site.company.salesEmail}
                  </a>
                </p>
              ) : v === "docs" ? (
                <p className="mt-6 inline-flex items-center gap-2 text-sm text-foreground/60">
                  <BookOpen className="size-4" aria-hidden="true" />
                  Search every page with <kbd>⌘K</kbd> or <kbd>Ctrl K</kbd>
                </p>
              ) : null}
            </>
          )}
        </div>
        <div aria-hidden="true" className="bg-noise pointer-events-none absolute inset-0" />
      </div>
      </div>
    </section>
  );
}
