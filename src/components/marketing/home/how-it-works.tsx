import Link from "next/link";
import { ArrowRight, MonitorSmartphone, Rocket, Sparkles, type LucideIcon } from "lucide-react";
import { HOME_HOW, HOME_STEPS } from "@/content/marketing/home";
import { SectionHeader } from "@/components/marketing/section";
import { IconTile } from "@/components/marketing/premium";
import { CaptureTile, type CaptureId } from "@/components/marketing/captures";

const ICONS: Record<(typeof HOME_STEPS)[number]["icon"], LucideIcon> = { sparkles: Sparkles, monitor: MonitorSmartphone, rocket: Rocket };

/** The real capture that fronts each step (src/components/marketing/captures.tsx says what each one is). */
const STEP_CAPTURE: Record<(typeof HOME_STEPS)[number]["id"], CaptureId> = { describe: "composer", preview: "agent", ship: "publish" };

/**
 * H1 "How it works": three steps (Describe → Build and preview → Ship), each a dark card with a
 * real capture of the product on top, a neutral icon tile, title and two lines. The six-step
 * detail (plan, generate, validate…) lives on /how-it-works.
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
                <CaptureTile id={STEP_CAPTURE[s.id]} />
                <div className="flex flex-1 flex-col px-3 pb-3 pt-5">
                  <div className="flex items-center gap-3">
                    <IconTile icon={Icon} />
                    <span className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
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
        <p className="mt-5 text-[13px] text-muted-foreground">Pictures captured from the Codexa app on a development server: the New project composer, an agent run in the workspace, and the Publish dialog.</p>
      </div>
    </section>
  );
}
