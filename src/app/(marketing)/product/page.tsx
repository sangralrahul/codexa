import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, Info } from "lucide-react";
import { routeMetadata } from "@/lib/seo";
import { HOW_IT_WORKS_STEPS, PLATFORM_FEATURES, PRODUCT_FAQ, AI_KEY_LIMIT } from "@/content/marketing/product";
import type { IllustrationId } from "@/content/marketing/types";
import { FAQ } from "@/components/marketing/faq";
import { CTABand } from "@/components/marketing/cta-band";
import { Inline } from "@/components/marketing/inline";
import { TemplatePreview } from "@/components/templates/template-preview";
import { CAPTURE_FOR_ILLUSTRATION, CaptureTile, CaptureShot } from "@/components/marketing/captures";
import { Eyebrow, GridFrame, GridRow, PageHero, RowHead } from "@/components/marketing/page-grid";

export const metadata = routeMetadata("/product");

const pillars: { title: string; href: string; body: string; visual: IllustrationId; label: string }[] = [
  { title: "Generate", href: "/ai-app-builder", visual: "plan-steps", label: "AI app builder", body: "Describe an app and get a real project from a starter template, with a plan you can read before the agent edits anything." },
  { title: "Edit", href: "/code-editor", visual: "editor-peek", label: "Code editor", body: "A Monaco editor with tabs, explorer, search and replace, diagnostics, diff view, autosave, and keyboard shortcuts." },
  { title: "Run", href: "/visual-editor", visual: "terminal-stream", label: "Previews", body: "Preview in an isolated sandbox through a host-based proxy, with streamed logs and responsive viewport controls." },
  { title: "Ship", href: "/app-deployment", visual: "deploy-history", label: "Deployment", body: "Deploy to Codexa static hosting with history and rollback, or to Vercel when a token is configured." },
];

export default function ProductPage() {
  return (
    <div data-tone="product" className="relative overflow-x-clip">
      <PageHero
        crumbs={[{ name: "Product", path: "/product" }]}
        eyebrow="Product"
        title="One workspace,"
        dim="prompt to production."
        lede="Prompt-to-app generation, a real editor, isolated runtimes, databases, GitHub and deployment in one place. Built so the generated code stays yours."
        actions={[
          { label: "Start building", href: "/signup" },
          { label: "See how it works", href: "/how-it-works" },
        ]}
        scene="rings"
        aside={<CaptureShot id="agent" priority />}
        asideWide
      />

      <GridFrame>
        <GridRow aria-labelledby="loop-title">
          <RowHead id="loop-title" index="01" label="The loop" title="Four things Codexa does." dim="Enter at any point.">
            <p>Every project moves through the same loop: a prompt, a template, or an imported GitHub repository. Pictures are captured from the app; the preview tile is a starter screenshot.</p>
          </RowHead>
          <ul className="pg-cells pg-cells--2 pg-cells--hover">
            {pillars.map((p, i) => {
              const capture = CAPTURE_FOR_ILLUSTRATION[p.visual];
              return (
                <li key={p.title} className="flex flex-col gap-7">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="pg-cell__h text-[20px]">
                        <Link href={p.href} className="pg-cell__link">
                          {p.title}
                          <ArrowUpRight className="size-4" aria-hidden="true" />
                        </Link>
                      </h3>
                      <p className="pg-cell__p max-w-md">{p.body}</p>
                    </div>
                    <span className="pg-cell__n shrink-0">{String(i + 1).padStart(2, "0")}</span>
                  </div>
                  <div className="mt-auto">
                    {capture ? <CaptureTile id={capture} className="rounded-[10px]" /> : <TemplatePreview id="vite-react-ops-dashboard" category="dashboards" alt="The Ops dashboard starter, as its preview shows it" className="aspect-[16/10] rounded-[10px] shadow-none" imgClassName="h-full w-full object-cover object-top" />}
                    <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.06em] text-(--g-dim)">{capture ? "Captured from the app" : "Starter screenshot"} · {p.label}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </GridRow>

        <GridRow aria-labelledby="agent-title">
          <RowHead id="agent-title" index="02" label="How the agent works" title="Plan, generate, validate," dim="run and ship.">
            <p>Each run follows the same steps, and every tool call is shown in the agent panel as it happens.</p>
          </RowHead>
          <ol className="pg-cells pg-cells--5">
            {HOW_IT_WORKS_STEPS.map((s, i) => (
              <li key={s.title}>
                <p className="pg-cell__n">{String(i + 1).padStart(2, "0")}</p>
                <h3 className="pg-cell__h mt-6">
                  <span className="sr-only">Step {i + 1}: </span>
                  {s.title}
                </h3>
                <p className="pg-cell__p">
                  <Inline text={s.description} />
                </p>
              </li>
            ))}
          </ol>
          <p className="flex items-start gap-2.5 border-t border-border px-(--g-pad) py-5 text-[13.5px] text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0 text-foreground" aria-hidden="true" />
            <span>
              <span className="font-medium text-foreground">Requires an AI provider.</span> {AI_KEY_LIMIT}
            </span>
          </p>
        </GridRow>

        <GridRow aria-labelledby="toolbox-title">
          <RowHead id="toolbox-title" index="03" label="Everything included" title="The rest" dim="of the toolbox." />
          <ul className="pg-cells pg-cells--hover">
            {PLATFORM_FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <li key={f.title}>
                  <h3 className="pg-cell__h">
                    {Icon ? <Icon className="size-4" aria-hidden="true" /> : null}
                    {f.href ? (
                      <Link href={f.href} className="pg-cell__link">
                        {f.title}
                        <ArrowUpRight className="size-3.5" aria-hidden="true" />
                      </Link>
                    ) : (
                      f.title
                    )}
                  </h3>
                  <p className="pg-cell__p">
                    <Inline text={f.description} />
                  </p>
                </li>
              );
            })}
          </ul>
        </GridRow>

        <GridRow aria-labelledby="faq-title" className="pg-split">
          <div>
            <div className="pg-split__sticky">
              <Eyebrow index="04">FAQ</Eyebrow>
              <h2 id="faq-title" className="pg-h2">
                Questions,
                <br />
                <span>answered.</span>
              </h2>
              <p className="mt-5 max-w-md text-[15px] text-muted-foreground">Ownership, stacks, AI configuration, where code runs, and what is not shipped yet.</p>
            </div>
          </div>
          <FAQ items={PRODUCT_FAQ} className="pg-faq" />
        </GridRow>
      </GridFrame>

      <CTABand variant="prompt" />
    </div>
  );
}
