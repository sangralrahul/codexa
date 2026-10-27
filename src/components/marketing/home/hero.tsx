import Link from "next/link";
import { ArrowDown, ArrowRight } from "lucide-react";
import { SplitHeading } from "@/components/motion/split-heading";
import { Eyebrow } from "@/components/marketing/backdrop";
import { Aurora, AuroraFinish, AuroraSun } from "@/components/marketing/aurora";
import { PromptBox } from "@/components/marketing/prompt-box";
import { HOME_HERO } from "@/content/marketing/home";

/**
 * H0 hero (PLAN §5.2): announcement from the latest changelog entry, the one H1 (line masks +
 * selection mark), a two-line lead and the composer. The stage itself is rendered right after,
 * by the storyboard, so its top edge shows in the first viewport.
 */
export function HomeHero({ signedIn, announcement }: { signedIn: boolean; announcement: { title: string; href: string } | null }) {
  const links = (
    <span className="inline-flex items-center gap-3">
      <Link href={HOME_HERO.templatesLink.href} className="link-draw group/l inline-flex items-center gap-1 font-medium text-foreground/85 hover:text-foreground">
        {HOME_HERO.templatesLink.label}
        <ArrowRight className="size-3 transition-transform duration-200 group-hover/l:translate-x-0.5" aria-hidden="true" />
      </Link>
      <span aria-hidden="true" className="text-border-strong">
        ·
      </span>
      <a href={HOME_HERO.storyLink.href} className="link-draw group/s inline-flex items-center gap-1 font-medium text-foreground/85 hover:text-foreground">
        {HOME_HERO.storyLink.label}
        <ArrowDown className="size-3 transition-transform duration-200 group-hover/s:translate-y-0.5" aria-hidden="true" />
      </a>
    </span>
  );

  return (
    <section aria-labelledby="home-title" className="relative isolate min-h-[calc(100svh-var(--header-h))] overflow-clip pb-28 pt-[6vh] sm:pb-36 sm:pt-[9vh]">
      <Aurora className="-z-10" />
      <div className="container-x relative pb-4 pt-6 text-center sm:pt-8 md:pb-3 lg:pt-5">
        <div className="scroll-fade">
          {announcement ? (
            <Eyebrow href={announcement.href} className="max-w-[min(100%,34rem)]">
              <span className="text-signal-ink">New</span>
              <span aria-hidden="true" className="mx-1.5 text-border-strong">
                ·
              </span>
              {announcement.title}
            </Eyebrow>
          ) : null}
          <SplitHeading as="h1" id="home-title" size="display-1" lines={[...HOME_HERO.lines]} mark={HOME_HERO.mark} className="mx-auto mt-4 max-w-[18ch]! sm:mt-5">
            {HOME_HERO.lines.join(" ")}
          </SplitHeading>
          <p className="text-lead mx-auto mt-6 max-w-[62ch]! sm:mt-5">{HOME_HERO.lead}</p>
        </div>
        <div className="relative mt-8 lg:mt-7">
          <AuroraSun />
          <PromptBox signedIn={signedIn} variant="hero" source="home" footer={links} />
        </div>
      </div>
      <AuroraFinish />
    </section>
  );
}
