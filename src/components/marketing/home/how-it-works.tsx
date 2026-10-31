import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { HOME_TIMELINE } from "@/content/marketing/home";
import { SectionHeader } from "@/components/marketing/section";
import { BrowserWindow } from "@/components/marketing/premium";
import { CAPTURES, CaptureImage } from "@/components/marketing/captures";
import { cn } from "@/lib/utils";

/**
 * H1 "How it works": a vertical timeline. A hairline spine runs down the centre; each step is a
 * numbered node on the spine with its copy on one side and a real capture (in a browser frame)
 * on the other, alternating. On phones the spine moves to the left and the capture follows the copy.
 */
export function HowItWorks() {
  return (
    <section id="how-it-works" aria-labelledby="how-title" className="scroll-mt-16 border-b border-border py-20 lg:py-28">
      <div className="container-x">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeader id="how-title" index={HOME_TIMELINE.index} title={HOME_TIMELINE.title} lead={HOME_TIMELINE.lead} className="max-w-3xl" />
          <Link href={HOME_TIMELINE.more.href} className="group/h inline-flex shrink-0 items-center gap-1 text-[15px] font-semibold text-primary lg:pb-1">
            <span className="link-draw">{HOME_TIMELINE.more.label}</span>
            <ArrowRight className="size-4 transition-transform group-hover/h:translate-x-0.5" aria-hidden="true" />
          </Link>
        </div>

        <ol className="mk-timeline mt-14 lg:mt-20">
          {HOME_TIMELINE.steps.map((s, i) => {
            const c = CAPTURES[s.capture];
            const flip = i % 2 === 1;
            return (
              <li key={s.id} className={cn("mk-timeline__step", flip && "mk-timeline__step--flip")}>
                <span aria-hidden="true" className="mk-timeline__node">
                  {i + 1}
                </span>
                <div className="mk-timeline__copy">
                  <p className="text-[12.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    <span className="sr-only">Step </span>
                    {String(i + 1).padStart(2, "0")} · {s.label}
                  </p>
                  <h3 className="mt-3 text-[24px] font-semibold leading-tight tracking-[-0.025em] text-foreground lg:text-[28px]">{s.title}</h3>
                  <p className="mt-3 max-w-[46ch] text-[15px] leading-relaxed text-muted-foreground">{s.body}</p>
                  <ul className="mt-5 space-y-2">
                    {s.facts.map((f) => (
                      <li key={f} className="flex items-center gap-2.5 text-[13.5px] text-foreground/85">
                        <span className="inline-grid size-5 shrink-0 place-items-center rounded-full border border-border bg-card text-primary">
                          <Check className="size-3" strokeWidth={3} aria-hidden="true" />
                        </span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <figure className="mk-timeline__shot">
                  <BrowserWindow url={c.url} glow={false} className="mk-lift rounded-[16px]">
                    <CaptureImage id={s.capture} className="aspect-[1280/732]" sizes="(min-width: 1100px) 560px, 100vw" />
                  </BrowserWindow>
                  <figcaption className="mt-2.5 text-[12px] text-muted-foreground">{c.caption}</figcaption>
                </figure>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
