import Link from "next/link";
import { ArrowRight, FolderGit2 } from "lucide-react";
import { PromptBox } from "@/components/marketing/prompt-box";
import { CtaLink, EyebrowPill, Mesh } from "@/components/marketing/premium";
import { ProductDemo } from "@/components/marketing/home/product-demo";
import { HOME_HERO } from "@/content/marketing/home";

/**
 * H0 hero: the fold is the product. Two columns from 1100px: on the left the eyebrow, the one-line
 * headline, a one-line lead, the prompt card with its starter chips, two CTAs and the small links;
 * on the right the animated product demo in a browser frame, drawn slightly larger than its column
 * with a 1px highlight edge and a soft monochrome shadow. Under 1100px the demo follows the copy.
 * Every picture in the demo is a real capture of the app; the caption says so.
 */
export function HomeHero({ signedIn, announcement }: { signedIn: boolean; announcement: { title: string; href: string } | null }) {
  const links = (
    <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
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
    </span>
  );

  return (
    <section aria-labelledby="home-title" className="mk-hero relative isolate overflow-x-clip border-b border-border">
      <Mesh />
      <div className="container-x">
        <div className="mk-hero__grid">
          <div className="mk-rise mk-hero__copy">
            {announcement ? (
              <EyebrowPill tag="New" href={announcement.href}>
                {announcement.title}
              </EyebrowPill>
            ) : (
              <EyebrowPill>{HOME_HERO.eyebrow}</EyebrowPill>
            )}
            <h1 id="home-title" className="mk-hero-title mt-6 max-w-[14ch]">
              {HOME_HERO.title}
            </h1>
            <p className="mk-lead mt-4 max-w-[48ch]">{HOME_HERO.lead}</p>
            <div className="mt-8 w-full">
              <PromptBox signedIn={signedIn} variant="hero" source="home" footer={links} capabilityChip={false} align="start" className="mx-0 max-w-none" />
            </div>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
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
              <span className="hidden items-center gap-1.5 text-[12.5px] text-muted-foreground sm:inline-flex">
                <kbd className="mk-kbd">Ctrl</kbd>
                <kbd className="mk-kbd">↵</kbd>
                <span>to build</span>
              </span>
            </div>
          </div>

          <figure className="mk-hero__demo">
            <div className="mk-hero__frame">
              <ProductDemo />
            </div>
            <figcaption className="mt-4 text-[12.5px] leading-relaxed text-muted-foreground">{HOME_HERO.demoCaption}</figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
