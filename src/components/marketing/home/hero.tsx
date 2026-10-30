import Link from "next/link";
import { ArrowDown, ArrowRight, FolderGit2 } from "lucide-react";
import { PromptBox } from "@/components/marketing/prompt-box";
import { CtaLink, EyebrowPill, Mesh } from "@/components/marketing/premium";
import { ProductDemo } from "@/components/marketing/home/product-demo";
import { HOME_HERO } from "@/content/marketing/home";

/**
 * H0 hero, prompt first: eyebrow pill, the one-line headline in plain white, a one-line lead, the
 * large prompt card (dark panel, textarea, starter picker, Build), the starter chips, a small
 * "Import from GitHub" link, two CTAs, and under it the animated product demo in a browser frame.
 * Every picture in the demo is a real capture of the app; the caption says so.
 */
export function HomeHero({ signedIn, announcement }: { signedIn: boolean; announcement: { title: string; href: string } | null }) {
  const links = (
    <span className="inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
      <Link href={HOME_HERO.templatesLink.href} className="link-draw group/l inline-flex items-center gap-1 font-medium text-foreground/85 hover:text-foreground">
        {HOME_HERO.templatesLink.label}
        <ArrowRight className="size-3 transition-transform duration-200 group-hover/l:translate-x-0.5" aria-hidden="true" />
      </Link>
      <span aria-hidden="true" className="text-border-strong">
        ·
      </span>
      <Link href={HOME_HERO.importLink.href} className="link-draw group/g inline-flex items-center gap-1.5 font-medium text-foreground/85 hover:text-foreground">
        <FolderGit2 className="size-3.5" aria-hidden="true" />
        {HOME_HERO.importLink.label}
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
    <section aria-labelledby="home-title" className="relative isolate overflow-x-clip pb-16 pt-10 sm:pt-14 lg:pb-24 lg:pt-16">
      <Mesh />
      <div className="mk-rise container-x flex flex-col items-center text-center">
        {announcement ? (
          <EyebrowPill tag="New" href={announcement.href}>
            {announcement.title}
          </EyebrowPill>
        ) : (
          <EyebrowPill>{HOME_HERO.eyebrow}</EyebrowPill>
        )}
        <h1 id="home-title" className="mk-hero-title mx-auto mt-6 max-w-[20ch]">
          {HOME_HERO.title}
        </h1>
        <p className="mk-lead mx-auto mt-4 max-w-[56ch]">{HOME_HERO.lead}</p>
        <div className="mt-8 w-full">
          <PromptBox signedIn={signedIn} variant="hero" source="home" footer={links} capabilityChip={false} />
        </div>
        <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row">
          {signedIn ? (
            <CtaLink href={HOME_HERO.primary.signedInHref} arrow>
              {HOME_HERO.primary.signedInLabel}
            </CtaLink>
          ) : (
            <CtaLink href={HOME_HERO.primary.href} arrow>
              {HOME_HERO.primary.label}
            </CtaLink>
          )}
          <CtaLink href={HOME_HERO.secondary.href} variant="secondary">
            {HOME_HERO.secondary.label}
          </CtaLink>
        </div>

        <figure className="mk-glow mx-auto mt-12 w-full max-w-6xl text-left lg:mt-14">
          <ProductDemo />
          <figcaption className="mt-4 text-center text-[13px] text-muted-foreground">{HOME_HERO.demoCaption}</figcaption>
        </figure>
      </div>
    </section>
  );
}
