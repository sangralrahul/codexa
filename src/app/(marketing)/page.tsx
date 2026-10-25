import Link from "next/link";
import { ArrowRight, ArrowUpRight, Database, Globe, IndianRupee, LayoutTemplate, Plug, Rocket, Server } from "lucide-react";
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

export const metadata = routeMetadata("/");

const positioning = [
  { title: "Real code, not a canvas", body: "Every project is a set of ordinary files in a Monaco editor. Generate with AI, then edit by hand. Push to GitHub whenever you like." },
  { title: "Validated in a sandbox", body: "Type-check, build, and tests run in an isolated runtime before you see the result. The agent reads errors and repairs them, bounded to two attempts." },
  { title: "Reversible by default", body: "A snapshot is taken before every AI run. Review per-file diffs and restore with one click." },
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

      <section className="relative overflow-hidden border-b border-border bg-surface">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,color-mix(in_oklab,var(--primary)_14%,transparent),transparent)]" />
        <div className="container-x relative py-16 text-center sm:py-20 lg:py-24">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-primary">AI-native software development</p>
          <h1 className="mx-auto max-w-4xl text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">Build software at the speed of thought.</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground sm:text-xl">Describe your idea. Codexa helps you create, refine, test, and deploy real applications.</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/signup" className={buttonClasses("primary", "lg")}>
              Start Building Free
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link href="/product" className={buttonClasses("outline", "lg")}>
              Explore the Platform
            </Link>
          </div>
          <div className="mt-12">
            <PromptBox signedIn={signedIn} />
          </div>
          <p className="mt-6 text-xs text-muted-foreground">Free plan, no card required. AI generation requires an API key configured by your operator; the editor, runtime, and deployment work without one.</p>
        </div>
      </section>

      <Section className="py-12 sm:py-16">
        <SectionHeader eyebrow="Why Codexa" title="An AI builder that behaves like a development platform" description="Codexa is for people who want the speed of generation without giving up the code, the tooling, or the ability to undo." />
        <ul className="mt-8 grid gap-4 md:grid-cols-3">
          {positioning.map((p) => (
            <li key={p.title} className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-base font-semibold tracking-tight">{p.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section tone="surface">
        <SectionHeader eyebrow="Platform" title="Everything from the first prompt to the live URL" description="Each feature below is implemented in the product today. Where something depends on operator configuration, the page says so." />
        <FeatureGrid features={PLATFORM_FEATURES} columns={4} className="mt-8" />
        <p className="mt-6 text-sm">
          <Link href="/features" className="inline-flex items-center gap-1 font-medium text-primary underline underline-offset-4">
            See the full feature list <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </Link>
        </p>
      </Section>

      <Section>
        <SectionHeader eyebrow="How it works" title="Plan, generate, validate, run, ship" description="The agent works in bounded, observable steps. You can watch every tool call, cancel a run, and revert the result." />
        <Steps steps={HOW_IT_WORKS_STEPS} className="mt-8" />
        <p className="mt-6 text-sm">
          <Link href="/how-it-works" className="inline-flex items-center gap-1 font-medium text-primary underline underline-offset-4">
            Read the detailed walkthrough <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </Link>
        </p>
      </Section>

      <Section tone="surface">
        <SectionHeader eyebrow="Editor and preview" title="A real editor next to a running preview" description="Monaco with tabs, file explorer, search and replace, diagnostics, and diff view on one side; your app running in an isolated sandbox on the other." align="center" />
        <ProductScreenshot className="mt-10" />
        <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm">
          <Link href="/code-editor" className={buttonClasses("outline", "sm")}>
            Code editor
          </Link>
          <Link href="/visual-editor" className={buttonClasses("outline", "sm")}>
            Preview and visual editor
          </Link>
        </div>
      </Section>

      <Section>
        <SectionHeader eyebrow="Backend and data" title="Not just a frontend generator" />
        <ul className="mt-8 grid gap-4 md:grid-cols-3">
          {backend.map((b) => (
            <li key={b.title} className="rounded-xl border border-border bg-card p-5">
              <b.icon className="size-5 text-primary" aria-hidden="true" />
              <h3 className="mt-3 text-base font-semibold tracking-tight">{b.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{b.body}</p>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm">
          <Link href="/full-stack-development" className="inline-flex items-center gap-1 font-medium text-primary underline underline-offset-4">
            Full-stack development in Codexa <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </Link>
        </p>
      </Section>

      <Section tone="surface">
        <SectionHeader eyebrow="Deployment" title="From preview to production without leaving the workspace" />
        <Steps steps={deploySteps} className="mt-8" />
        <p className="mt-6 text-sm">
          <Link href="/app-deployment" className="inline-flex items-center gap-1 font-medium text-primary underline underline-offset-4">
            How deployment works <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </Link>
        </p>
      </Section>

      <Section>
        <div className="grid gap-6 md:grid-cols-2">
          <Link href="/templates" className="group rounded-xl border border-border bg-card p-6 transition hover:border-border-strong">
            <LayoutTemplate className="size-6 text-primary" aria-hidden="true" />
            <h2 className="mt-4 text-xl font-semibold tracking-tight">Starter templates</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">React + Vite + TypeScript + Tailwind single-page apps, static HTML/CSS/JS sites, and Node + Express REST APIs. Real files with documented dependencies.</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
              Browse templates <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </span>
          </Link>
          <Link href="/integrations" className="group rounded-xl border border-border bg-card p-6 transition hover:border-border-strong">
            <Plug className="size-6 text-primary" aria-hidden="true" />
            <h2 className="mt-4 text-xl font-semibold tracking-tight">Integrations</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">GitHub, PostgreSQL and Supabase, Anthropic and OpenAI, Stripe, Razorpay, Resend, and Vercel. Workspace-level connections with connection tests; each is active only when configured.</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
              See integrations <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </span>
          </Link>
        </div>
      </Section>

      <Section tone="surface">
        <SectionHeader eyebrow="India and worldwide" title="Priced and billed for where you are" description="Codexa is built by a small team in India for builders everywhere." />
        <ul className="mt-8 grid gap-4 md:grid-cols-3">
          {india.map((b) => (
            <li key={b.title} className="rounded-xl border border-border bg-card p-5">
              <b.icon className="size-5 text-primary" aria-hidden="true" />
              <h3 className="mt-3 text-base font-semibold tracking-tight">{b.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{b.body}</p>
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
          <Link href="/pricing" className="inline-flex items-center gap-1 font-medium text-primary underline underline-offset-4">
            Full pricing, including Enterprise <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </Link>
        </p>
      </Section>

      <Section tone="surface">
        <SectionHeader title="Frequently asked questions" />
        <FAQ items={PRODUCT_FAQ} withJsonLd className="mt-8 max-w-3xl" />
      </Section>

      <CTABand />
    </>
  );
}
