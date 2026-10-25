import Link from "next/link";
import { ArrowRight, ArrowUpRight, Bot, Cloud, Code2, CreditCard, Database, GitBranch, History, IndianRupee, Mail, Rocket, ShieldCheck, Sparkles } from "lucide-react";
import { routeMetadata, jsonLd } from "@/lib/seo";
import { site } from "@/config/site";
import { PLANS } from "@/config/plans";
import { getCurrentUser } from "@/lib/auth/session";
import { HOW_IT_WORKS_STEPS, PLATFORM_FEATURES, PRODUCT_FAQ } from "@/content/marketing/product";
import { buttonClasses } from "@/components/ui/button";
import { Section, SectionHeader } from "@/components/marketing/section";
import { FeatureGrid } from "@/components/marketing/feature-grid";
import { Steps } from "@/components/marketing/steps";
import { PlatformBento } from "@/components/marketing/platform-bento";
import { FAQ } from "@/components/marketing/faq";
import { CTABand } from "@/components/marketing/cta-band";
import { PricingTable } from "@/components/marketing/pricing-table";
import { LiveDemo } from "@/components/marketing/live-demo";
import { WordSwap } from "@/components/marketing/word-swap";
import { PromptBox } from "@/components/marketing/prompt-box";
import { Eyebrow } from "@/components/marketing/backdrop";
import { cn } from "@/lib/utils";

export const metadata = routeMetadata("/");

const positioning = [
  { icon: Code2, title: "Real code, not a canvas", body: "Every project is a set of ordinary files in a Monaco editor. Generate with AI, then edit by hand. Push to GitHub whenever you like." },
  { icon: ShieldCheck, title: "Validated in a sandbox", body: "Type-check, build, and tests run in an isolated runtime before you see the result. The agent reads errors and repairs them, bounded to two attempts." },
  { icon: History, title: "Reversible by default", body: "A snapshot is taken before every AI run. Review per-file diffs and restore with one click." },
];

// Covered by the bento tiles above the feature list.
const BENTO_COVERED = new Set(["AI agent", "AI app builder", "Snapshots and diffs", "Isolated runtimes", "Deployment", "Databases"]);

const integrationNames = [
  { name: "GitHub", icon: GitBranch },
  { name: "PostgreSQL", icon: Database },
  { name: "Supabase", icon: Database },
  { name: "Anthropic", icon: Sparkles },
  { name: "OpenAI", icon: Bot },
  { name: "Stripe", icon: CreditCard },
  { name: "Razorpay", icon: IndianRupee },
  { name: "Customer.io", icon: Mail },
  { name: "Resend", icon: Mail },
  { name: "Vercel", icon: Rocket },
  { name: "Cloudflare", icon: Cloud },
];


const deploySteps = [
  { title: "Build in the sandbox", description: "The same isolated runtime that previews your app produces the production build." },
  { title: "Serve at a subdomain", description: "Codexa static hosting publishes the build immediately and keeps every deployment in history." },
  { title: "Roll back in one click", description: "Any earlier deployment can be restored. Vercel is available as an adapter when a token is configured." },
  { title: "Point your domain", description: "CNAME instructions for custom domains are provided; automatic verification is planned." },
];


export default async function HomePage() {
  const user = await getCurrentUser();
  const signedIn = Boolean(user);
  const previewPlans = [PLANS.free, PLANS.pro, PLANS.team].map((p) => p.id);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd({
          "@graph": [
            { "@type": "Organization", name: site.name, url: site.url, logo: new URL("/icon", site.url).toString(), sameAs: [site.social.github], contactPoint: [{ "@type": "ContactPoint", email: site.company.supportEmail, contactType: "customer support" }] },
            { "@type": "WebSite", name: site.name, url: site.url },
            {
              "@type": "SoftwareApplication",
              name: site.name,
              applicationCategory: "DeveloperApplication",
              operatingSystem: "Web",
              url: site.url,
              description: site.description,
              offers: { "@type": "Offer", price: "0", priceCurrency: "USD", description: "Free plan" },
            },
          ],
        })}
      />

      <section className="relative">
        <div className="container-x relative pb-16 pt-14 text-center sm:pb-20 sm:pt-20 lg:pt-24">
          <div data-reveal>
            <Eyebrow>AI-native software development</Eyebrow>
          </div>
          <h1 data-reveal style={{ "--reveal-delay": "80ms" } as React.CSSProperties} className="mx-auto mt-7 max-w-5xl text-5xl font-semibold leading-[1.02] tracking-[-0.035em] sm:text-6xl lg:text-[5.5rem]">
            Turn ideas into
            <br />
            <WordSwap label="working software." words={["working software.", "SaaS products.", "internal tools.", "REST APIs.", "landing pages."]} />
          </h1>
          <p data-reveal style={{ "--reveal-delay": "160ms" } as React.CSSProperties} className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground sm:text-xl">
            Build software at the speed of thought. Describe your idea; Codexa helps you create, refine, test, and deploy a real application you own.
          </p>
          <div data-reveal style={{ "--reveal-delay": "240ms" } as React.CSSProperties} className="mt-10">
            <PromptBox signedIn={signedIn} />
          </div>
          <div data-reveal style={{ "--reveal-delay": "320ms" } as React.CSSProperties} className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/signup" className={cn(buttonClasses("secondary", "lg"), "btn-solid rounded-full px-6")}>
              Start Building Free
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link href="/product" className={cn(buttonClasses("ghost", "lg"), "glass rounded-full border border-border-strong px-6")}>
              Explore the Platform
            </Link>
          </div>
          <p data-reveal style={{ "--reveal-delay": "380ms" } as React.CSSProperties} className="mt-6 text-xs text-muted-foreground">
            Free plan, no card required. AI generation requires an API key configured by your operator; the editor, runtime, and deployment work without one.
          </p>

          <div data-reveal className="tilt-in relative mt-16 sm:mt-24">
            <LiveDemo />
          </div>
        </div>
      </section>

      <section aria-labelledby="integrations-strip" className="relative border-y border-border/60 py-10">
        <h2 id="integrations-strip" className="text-center font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Integrates with the tools you already use
        </h2>
        <div className="marquee mt-6 overflow-hidden">
          <ul className="marquee__track">
            {[...integrationNames, ...integrationNames].map((n, i) => (
              <li key={i} aria-hidden={i >= integrationNames.length || undefined} className="flex shrink-0 items-center gap-2.5 px-6 text-lg font-semibold tracking-tight text-muted-foreground/80 transition-colors hover:text-foreground">
                <n.icon className="size-5" aria-hidden="true" />
                {n.name}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Section>
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20">
          <SectionHeader
            eyebrow="Why Codexa"
            title="An AI builder that behaves like a development platform"
            highlight="a development platform"
            description="For people who want the speed of generation without giving up the code, the tooling, or the ability to undo."
            className="lg:sticky lg:top-28 lg:self-start"
          />
          <ol className="divide-y divide-border border-y border-border">
            {positioning.map((p, i) => (
              <li key={p.title} data-reveal style={{ "--reveal-delay": `${i * 90}ms` } as React.CSSProperties} className="group grid grid-cols-[3.5rem_minmax(0,1fr)] gap-4 py-8">
                <span className="serif-accent text-4xl leading-none text-muted-foreground transition-colors group-hover:text-signal">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3 className="text-xl font-semibold tracking-tight">{p.title}</h3>
                  <p className="mt-2 leading-relaxed text-muted-foreground">{p.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      <Section>
        <SectionHeader
          eyebrow="Platform"
          title="Everything from the first prompt to the live URL"
          highlight="the live URL"
          description="Each part below is implemented in the product today. Where something depends on operator configuration, the page says so."
        />
        <div className="mt-12">
          <PlatformBento />
        </div>
        <FeatureGrid features={PLATFORM_FEATURES.filter((f) => !BENTO_COVERED.has(f.title))} columns={3} className="mt-14" />
        <p className="mt-8 text-sm">
          <Link href="/features" className="group inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline">
            See the full feature list <ArrowUpRight className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </p>
      </Section>

      <Section tone="surface">
        <SectionHeader eyebrow="How it works" title="Plan, generate, validate, run, ship" highlight="ship" description="The agent works in bounded, observable steps. You can watch every tool call, cancel a run, and revert the result." />
        <Steps steps={HOW_IT_WORKS_STEPS} className="mt-12" />
        <p className="mt-10 text-sm">
          <Link href="/how-it-works" className="group inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline">
            Read the detailed walkthrough <ArrowUpRight className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </p>
      </Section>

      <Section>
        <SectionHeader eyebrow="Deployment" title="From preview to production without leaving the workspace" highlight="without leaving the workspace" />
        <Steps steps={deploySteps} className="mt-12" />
      </Section>

      <Section className="pt-0 sm:pt-0 lg:pt-0">
        <div className="grid gap-px overflow-hidden rounded-3xl border border-border bg-border md:grid-cols-2">
          {[
            { href: "/templates", kicker: "Templates", title: "Start from a", accent: "real project.", body: "React + Vite + TypeScript + Tailwind apps, static sites and Node + Express APIs. Real files with documented dependencies." },
            { href: "/integrations", kicker: "Integrations", title: "Connect what your", accent: "app needs.", body: "GitHub, PostgreSQL and Supabase, Anthropic and OpenAI, Stripe, Razorpay and more, each tested before it is saved." },
          ].map((c, i) => (
            <Link key={c.href} href={c.href} data-reveal style={{ "--reveal-delay": `${i * 90}ms` } as React.CSSProperties} className="group bg-background p-8 transition-colors duration-300 hover:bg-surface sm:p-12">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{c.kicker}</p>
              <h2 className="mt-6 text-3xl font-semibold tracking-[-0.025em] sm:text-4xl">
                {c.title} <span className="serif-accent">{c.accent}</span>
              </h2>
              <p className="mt-4 max-w-md leading-relaxed text-muted-foreground">{c.body}</p>
              <span className="mt-8 inline-flex size-11 items-center justify-center rounded-full border border-border-strong transition-all duration-300 group-hover:border-foreground group-hover:bg-foreground group-hover:text-background">
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </span>
            </Link>
          ))}
        </div>
      </Section>

      <Section className="py-10 sm:py-12 lg:py-14">
        <div data-reveal className="flex flex-col gap-6 border-y border-border py-8 md:flex-row md:items-center md:justify-between">
          <p className="text-2xl font-semibold tracking-tight">
            Priced and billed <span className="serif-accent">for where you are.</span>
          </p>
          <ul className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-muted-foreground">
            <li>INR and USD plans, monthly or annual</li>
            <li>Razorpay: UPI, cards, net banking</li>
            <li>Stripe internationally</li>
          </ul>
        </div>
      </Section>

      <Section>
        <SectionHeader eyebrow="Pricing" title="Start free, upgrade when you need more" highlight="when you need more" description="Limits are enforced on the server for AI requests and tokens, runtime minutes, deployments, storage, projects, and members." align="center" />
        <div className="mt-8">
          <PricingTable compact planIds={previewPlans} />
        </div>
        <p className="mt-6 text-center text-sm">
          <Link href="/pricing" className="group inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline">
            Full pricing, including Enterprise <ArrowUpRight className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </p>
      </Section>

      <Section tone="surface">
        <SectionHeader eyebrow="FAQ" title="Frequently asked questions" align="center" />
        <FAQ items={PRODUCT_FAQ} withJsonLd className="mx-auto mt-10 max-w-3xl" />
      </Section>

      <CTABand />
    </>
  );
}
