import Link from "next/link";
import { ArrowRight, ArrowUpRight, Bot, Cloud, Code2, CreditCard, Database, GitBranch, Globe, History, IndianRupee, LayoutTemplate, Mail, Plug, Rocket, Server, ShieldCheck, Sparkles } from "lucide-react";
import { routeMetadata, jsonLd } from "@/lib/seo";
import { site } from "@/config/site";
import { PLANS } from "@/config/plans";
import { getCurrentUser } from "@/lib/auth/session";
import { HOW_IT_WORKS_STEPS, PLATFORM_FEATURES, PRODUCT_FAQ } from "@/content/marketing/product";
import { buttonClasses } from "@/components/ui/button";
import { Section, SectionHeader } from "@/components/marketing/section";
import { FeatureGrid } from "@/components/marketing/feature-grid";
import { Steps } from "@/components/marketing/steps";
import { FAQ } from "@/components/marketing/faq";
import { CTABand } from "@/components/marketing/cta-band";
import { PricingTable } from "@/components/marketing/pricing-table";
import { ProductScreenshot } from "@/components/marketing/product-screenshot";
import { PromptBox } from "@/components/marketing/prompt-box";
import { Eyebrow } from "@/components/marketing/aurora";
import { cn } from "@/lib/utils";

export const metadata = routeMetadata("/");

const positioning = [
  { icon: Code2, title: "Real code, not a canvas", body: "Every project is a set of ordinary files in a Monaco editor. Generate with AI, then edit by hand. Push to GitHub whenever you like." },
  { icon: ShieldCheck, title: "Validated in a sandbox", body: "Type-check, build, and tests run in an isolated runtime before you see the result. The agent reads errors and repairs them, bounded to two attempts." },
  { icon: History, title: "Reversible by default", body: "A snapshot is taken before every AI run. Review per-file diffs and restore with one click." },
];

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

const backend = [
  { icon: Database, title: "PostgreSQL and Supabase", body: "Connect a database, browse the schema, and run SQL from the workspace. Destructive statements ask for confirmation." },
  { icon: Server, title: "Node + Express APIs", body: "Generate REST APIs as a starter template, run them in the sandbox, and read streamed logs." },
  { icon: Plug, title: "Encrypted environment variables", body: "Secrets are encrypted at rest, masked in the UI, and injected into previews and deployments." },
];

const deploySteps = [
  { title: "Build in the sandbox", description: "The same isolated runtime that previews your app produces the production build." },
  { title: "Serve at a subdomain", description: "Codexa static hosting publishes the build immediately and keeps every deployment in history." },
  { title: "Roll back in one click", description: "Any earlier deployment can be restored. Vercel is available as an adapter when a token is configured." },
  { title: "Point your domain", description: "CNAME instructions for custom domains are provided; automatic verification is planned." },
];

const india = [
  { icon: IndianRupee, title: "INR and USD pricing", body: "Plans are listed in both currencies with monthly and annual billing. Taxes are added at checkout." },
  { icon: Globe, title: "Razorpay and Stripe", body: "Indian customers pay through Razorpay (UPI, cards, net banking); international customers through Stripe." },
  { icon: Rocket, title: "Built for distributed teams", body: "Timestamps are shown in your timezone, activity history is shared, and roles keep client work separated." },
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
          <h1 data-reveal style={{ "--reveal-delay": "80ms" } as React.CSSProperties} className="mx-auto mt-7 max-w-5xl text-balance text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
            Build software at the <span className="text-gradient">speed of thought.</span>
          </h1>
          <p data-reveal style={{ "--reveal-delay": "160ms" } as React.CSSProperties} className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground sm:text-xl">
            Describe your idea. Codexa helps you create, refine, test, and deploy real applications.
          </p>
          <div data-reveal style={{ "--reveal-delay": "240ms" } as React.CSSProperties} className="mt-10">
            <PromptBox signedIn={signedIn} />
          </div>
          <div data-reveal style={{ "--reveal-delay": "320ms" } as React.CSSProperties} className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/signup" className={cn(buttonClasses("primary", "lg"), "btn-glow rounded-xl")}>
              Start Building Free
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link href="/product" className={cn(buttonClasses("ghost", "lg"), "glass rounded-xl border border-border-strong")}>
              Explore the Platform
            </Link>
          </div>
          <p data-reveal style={{ "--reveal-delay": "380ms" } as React.CSSProperties} className="mt-6 text-xs text-muted-foreground">
            Free plan, no card required. AI generation requires an API key configured by your operator; the editor, runtime, and deployment work without one.
          </p>

          <div className="relative mt-16 sm:mt-20">
            {/* Glow pooled under the product preview. */}
            <div aria-hidden="true" className="absolute inset-x-[10%] top-[8%] -z-10 h-[70%] rounded-full bg-gradient-to-r from-glow-1/40 via-glow-2/40 to-glow-3/30 blur-3xl" />
            <div data-reveal className="tilt-in">
              <ProductScreenshot animated />
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="integrations-strip" className="relative border-y border-border/60 py-10">
        <h2 id="integrations-strip" className="text-center text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Integrates with the tools you already use
        </h2>
        <div className="marquee mt-6 overflow-hidden">
          <ul className="marquee__track gap-3 pr-3">
            {[...integrationNames, ...integrationNames].map((n, i) => (
              <li key={i} aria-hidden={i >= integrationNames.length || undefined} className="glass flex shrink-0 items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground/80">
                <n.icon className="size-4 text-primary" aria-hidden="true" />
                {n.name}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Section className="bg-transparent">
        <SectionHeader eyebrow="Why Codexa" title="An AI builder that behaves like a development platform" description="Codexa is for people who want the speed of generation without giving up the code, the tooling, or the ability to undo." align="center" />
        <ul className="mt-12 grid gap-4 md:grid-cols-3">
          {positioning.map((p, i) => (
            <li key={p.title} data-reveal style={{ "--reveal-delay": `${i * 90}ms` } as React.CSSProperties} className="glow-card group rounded-2xl border border-border p-7">
              <span className="icon-tile inline-flex size-11 items-center justify-center rounded-xl text-primary transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3">
                <p.icon className="size-5" aria-hidden="true" />
              </span>
              <h3 className="mt-5 text-lg font-semibold tracking-tight">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section tone="surface">
        <SectionHeader eyebrow="Platform" title="Everything from the first prompt to the live URL" description="Each feature below is implemented in the product today. Where something depends on operator configuration, the page says so." />
        <FeatureGrid features={PLATFORM_FEATURES} columns={4} className="mt-8" />
        <p className="mt-6 text-sm">
          <Link href="/features" className="group inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline">
            See the full feature list <ArrowUpRight className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </p>
      </Section>

      <Section>
        <SectionHeader eyebrow="How it works" title="Plan, generate, validate, run, ship" description="The agent works in bounded, observable steps. You can watch every tool call, cancel a run, and revert the result." />
        <Steps steps={HOW_IT_WORKS_STEPS} className="mt-8" />
        <p className="mt-6 text-sm">
          <Link href="/how-it-works" className="group inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline">
            Read the detailed walkthrough <ArrowUpRight className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </p>
      </Section>

      <Section tone="surface">
        <SectionHeader eyebrow="Editor and preview" title="A real editor next to a running preview" description="Monaco with tabs, file explorer, search and replace, diagnostics, and diff view on one side; your app running in an isolated sandbox on the other." align="center" />
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <Link href="/code-editor" data-reveal className="glow-card group rounded-2xl border border-border p-7">
            <span className="icon-tile inline-flex size-11 items-center justify-center rounded-xl text-primary">
              <Code2 className="size-5" aria-hidden="true" />
            </span>
            <h3 className="mt-5 text-lg font-semibold tracking-tight">Code editor</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Edit generated code by hand with the same editor that powers VS Code. Every AI change shows up as a reviewable diff.</p>
            <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-primary">
              Explore the editor <ArrowUpRight className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
            </span>
          </Link>
          <Link href="/visual-editor" data-reveal style={{ "--reveal-delay": "90ms" } as React.CSSProperties} className="glow-card group rounded-2xl border border-border p-7">
            <span className="icon-tile inline-flex size-11 items-center justify-center rounded-xl text-primary">
              <Globe className="size-5" aria-hidden="true" />
            </span>
            <h3 className="mt-5 text-lg font-semibold tracking-tight">Live preview</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Your app runs in its own isolated sandbox with hot reload, device sizes, and streamed logs while you work.</p>
            <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-primary">
              Preview and visual editor <ArrowUpRight className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
            </span>
          </Link>
        </div>
      </Section>

      <Section>
        <SectionHeader eyebrow="Backend and data" title="Not just a frontend generator" />
        <ul className="mt-8 grid gap-4 md:grid-cols-3">
          {backend.map((b, i) => (
            <li key={b.title} data-reveal style={{ "--reveal-delay": `${i * 90}ms` } as React.CSSProperties} className="glow-card group rounded-2xl border border-border p-7">
              <span className="icon-tile inline-flex size-11 items-center justify-center rounded-xl text-primary transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3">
                <b.icon className="size-5" aria-hidden="true" />
              </span>
              <h3 className="mt-5 text-lg font-semibold tracking-tight">{b.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{b.body}</p>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm">
          <Link href="/full-stack-development" className="group inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline">
            Full-stack development in Codexa <ArrowUpRight className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </p>
      </Section>

      <Section tone="surface">
        <SectionHeader eyebrow="Deployment" title="From preview to production without leaving the workspace" />
        <Steps steps={deploySteps} className="mt-8" />
        <p className="mt-6 text-sm">
          <Link href="/app-deployment" className="group inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline">
            How deployment works <ArrowUpRight className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </p>
      </Section>

      <Section>
        <div className="grid gap-6 md:grid-cols-2">
          <Link href="/templates" data-reveal className="glow-card group rounded-2xl border border-border p-8">
            <span className="icon-tile inline-flex size-12 items-center justify-center rounded-xl text-primary"><LayoutTemplate className="size-6" aria-hidden="true" /></span>
            <h2 className="mt-5 text-2xl font-semibold tracking-tight">Starter templates</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">React + Vite + TypeScript + Tailwind single-page apps, static HTML/CSS/JS sites, and Node + Express REST APIs. Real files with documented dependencies.</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
              Browse templates <ArrowUpRight className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
            </span>
          </Link>
          <Link href="/integrations" data-reveal style={{ "--reveal-delay": "90ms" } as React.CSSProperties} className="glow-card group rounded-2xl border border-border p-8">
            <span className="icon-tile inline-flex size-12 items-center justify-center rounded-xl text-primary"><Plug className="size-6" aria-hidden="true" /></span>
            <h2 className="mt-5 text-2xl font-semibold tracking-tight">Integrations</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">GitHub, PostgreSQL and Supabase, Anthropic and OpenAI, Stripe, Razorpay, Resend, and Vercel. Workspace-level connections with connection tests; each is active only when configured.</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
              See integrations <ArrowUpRight className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
            </span>
          </Link>
        </div>
      </Section>

      <Section tone="surface">
        <SectionHeader eyebrow="India and worldwide" title="Priced and billed for where you are" description="Codexa is built by a small team in India for builders everywhere." />
        <ul className="mt-8 grid gap-4 md:grid-cols-3">
          {india.map((b, i) => (
            <li key={b.title} data-reveal style={{ "--reveal-delay": `${i * 90}ms` } as React.CSSProperties} className="glow-card group rounded-2xl border border-border p-7">
              <span className="icon-tile inline-flex size-11 items-center justify-center rounded-xl text-primary transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3">
                <b.icon className="size-5" aria-hidden="true" />
              </span>
              <h3 className="mt-5 text-lg font-semibold tracking-tight">{b.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{b.body}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section>
        <SectionHeader eyebrow="Pricing" title="Start free, upgrade when you need more" description="Limits are enforced on the server for AI requests and tokens, runtime minutes, deployments, storage, projects, and members." align="center" />
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
