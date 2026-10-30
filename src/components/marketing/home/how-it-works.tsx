import Link from "next/link";
import { ArrowRight, MonitorSmartphone, Rocket, Sparkles, type LucideIcon } from "lucide-react";
import { HOME_HOW, HOME_STEPS } from "@/content/marketing/home";
import { SectionHeader } from "@/components/marketing/section";
import { IconTile } from "@/components/marketing/premium";
import { TemplatePreview } from "@/components/templates/template-preview";
import { TEMPLATE_SHOTS } from "@/components/templates/shots";

const ICONS: Record<(typeof HOME_STEPS)[number]["icon"], LucideIcon> = { sparkles: Sparkles, monitor: MonitorSmartphone, rocket: Rocket };

/** The starter whose own build fronts the "preview" step. */
const PREVIEW_STARTER = { id: "vite-react-dashboard", category: "dashboards" };

/**
 * Real pictures for the three steps, captured from the product (public/marketing, from the running
 * app's workspace) or from a starter's own build (public/templates). Nothing is drawn or invented;
 * each figure's caption says what it is.
 */
const SHOTS = {
  describe: { src: "/marketing/app-composer.webp", width: 756, height: 473, caption: "The workspace composer, captured from the app." },
  ship: { src: "/marketing/app-publish-checks.webp", width: 1196, height: 748, caption: "Pre-publish checks in the Publish dialog, captured from the app." },
} as const;

function StepPicture({ id }: { id: (typeof HOME_STEPS)[number]["id"] }) {
  if (id === "preview") {
    const hasShot = TEMPLATE_SHOTS.has(PREVIEW_STARTER.id);
    return (
      <figure className="relative">
        <div className="flex aspect-[16/10] flex-col overflow-hidden rounded-[12px] border border-border bg-card">
          <div aria-hidden="true" className="flex h-8 shrink-0 items-center justify-between border-b border-border bg-surface px-2.5 text-[11px] text-muted-foreground">
            <span className="flex gap-1">
              <span className="size-2 rounded-full bg-surface-3" />
              <span className="size-2 rounded-full bg-surface-3" />
              <span className="size-2 rounded-full bg-surface-3" />
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-2 py-0.5 shadow-[inset_0_0_0_1px_var(--border)]">
              <span className="size-1.5 rounded-full bg-success" /> Preview running
            </span>
            <span className="font-medium text-foreground/70">Desktop · Tablet · Phone</span>
          </div>
          {hasShot ? (
            <TemplatePreview id={PREVIEW_STARTER.id} category={PREVIEW_STARTER.category} sizes="(min-width: 1024px) 380px, (min-width: 640px) 45vw, 90vw" className="min-h-0 flex-1 rounded-none border-0 shadow-none" imgClassName="aspect-auto h-full" />
          ) : (
            <div aria-hidden="true" className="flex-1 bg-surface" />
          )}
        </div>
        <figcaption className="sr-only">The Analytics dashboard starter as it ships, captured from its own build.</figcaption>
      </figure>
    );
  }
  const s = SHOTS[id];
  return (
    <figure className="relative overflow-hidden rounded-[12px] border border-border bg-card">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={s.src} alt="" width={s.width} height={s.height} loading="lazy" decoding="async" className="aspect-[16/10] w-full object-cover object-top" />
      <figcaption className="sr-only">{s.caption}</figcaption>
    </figure>
  );
}

/**
 * H1 "How it works": three steps (Describe → Build and preview → Ship), each with a gradient icon
 * tile and a real product picture. The six-step detail (plan, generate, validate…) lives on /how-it-works.
 */
export function HowItWorks({ maxRepairAttempts }: { maxRepairAttempts: number }) {
  void maxRepairAttempts;
  return (
    <section id="how-it-works" aria-labelledby="how-title" className="scroll-mt-16 border-b border-border py-20 lg:py-28">
      <div className="container-x">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeader id="how-title" index={HOME_HOW.index} title={HOME_HOW.title} lead={HOME_HOW.lead} className="max-w-3xl" />
          <Link href={HOME_HOW.more.href} className="group/h inline-flex shrink-0 items-center gap-1 text-[15px] font-semibold text-primary lg:pb-1">
            <span className="link-draw">{HOME_HOW.more.label}</span>
            <ArrowRight className="size-4 transition-transform group-hover/h:translate-x-0.5" aria-hidden="true" />
          </Link>
        </div>
        <ol className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {HOME_STEPS.map((s, i) => {
            const Icon = ICONS[s.icon];
            return (
              <li key={s.id} className="mk-card mk-card--hover flex flex-col p-3">
                <StepPicture id={s.id} />
                <div className="flex flex-1 flex-col px-3 pb-3 pt-5">
                  <div className="flex items-center gap-3">
                    <IconTile icon={Icon} />
                    <span className="text-[13px] font-semibold uppercase tracking-[0.08em] text-primary">
                      <span className="sr-only">Step </span>
                      {i + 1} · {s.label}
                    </span>
                  </div>
                  <h3 className="mt-4 text-[19px] font-semibold tracking-[-0.02em] text-foreground">{s.title}</h3>
                  <p className="mt-2 text-[14.5px] leading-relaxed text-muted-foreground">{s.body}</p>
                </div>
              </li>
            );
          })}
        </ol>
        <p className="mt-5 text-[13px] text-muted-foreground">Pictures captured from the Codexa workspace and from the Analytics dashboard starter&apos;s own build; the starter shown is one of the templates you can open.</p>
      </div>
    </section>
  );
}
