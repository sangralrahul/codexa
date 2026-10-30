import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HOME_CHAPTERS, HOME_HOW, timesWord } from "@/content/marketing/home";
import { SectionHeader } from "@/components/marketing/section";

/**
 * H1 "How it works": the six steps of a run (Describe → Ship) as one dense row. The repair limit
 * in the Validate step is read from the agent's configuration, never typed into copy.
 */
export function HowItWorks({ maxRepairAttempts }: { maxRepairAttempts: number }) {
  const repairWord = timesWord(maxRepairAttempts);
  return (
    <section id="how-it-works" aria-labelledby="how-title" className="scroll-mt-16 border-b border-border py-14 lg:py-20">
      <div className="container-x">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeader index={HOME_HOW.index} title={HOME_HOW.title} lead={HOME_HOW.lead} className="max-w-3xl" />
          <Link href={HOME_HOW.more.href} className="group/h inline-flex shrink-0 items-center gap-1 text-sm font-medium text-foreground lg:pb-1">
            <span className="link-draw">{HOME_HOW.more.label}</span>
            <ArrowRight className="size-3.5 transition-transform group-hover/h:translate-x-0.5" aria-hidden="true" />
          </Link>
        </div>
        <ol className="mt-10 grid grid-cols-1 gap-px overflow-hidden rounded-[12px] border border-border bg-border sm:grid-cols-2 lg:grid-cols-6">
          {HOME_CHAPTERS.map((c, i) => (
            <li key={c.id} className="flex flex-col gap-3 bg-card p-5">
              <span className="flex items-center gap-2.5">
                <span className="inline-flex size-6 items-center justify-center rounded-md bg-primary/10 font-mono text-[11px] font-semibold text-primary">{i + 1}</span>
                <span className="text-[14px] font-semibold text-foreground">
                  <span className="sr-only">Step {i + 1}: </span>
                  {c.label}
                </span>
              </span>
              <p className="text-[13px] leading-relaxed text-muted-foreground">{c.caption({ repairWord })}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
