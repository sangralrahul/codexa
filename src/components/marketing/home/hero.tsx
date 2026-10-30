import Link from "next/link";
import { ArrowDown, ArrowRight } from "lucide-react";
import { TemplatePreview } from "@/components/templates/template-preview";
import { templatePreviewHref } from "@/components/templates/template-card";
import { TEMPLATE_SHOTS } from "@/components/templates/shots";
import { PromptBox } from "@/components/marketing/prompt-box";
import { BrowserWindow, CtaLink, EyebrowPill, GradientText, Mesh } from "@/components/marketing/premium";
import { HOME_HERO } from "@/content/marketing/home";
import { TEMPLATES } from "@/templates";

/**
 * H0 hero on a gradient mesh: eyebrow pill, a two-line headline with one gradient phrase, a 20px
 * lead, the composer as a premium card, two CTAs, and one real starter screenshot in a browser
 * window with a gradient glow behind it. The screenshot is captured from the starter's own build
 * (never generated or invented); the caption says so.
 */
export function HomeHero({ signedIn, announcement }: { signedIn: boolean; announcement: { title: string; href: string } | null }) {
  const shot = TEMPLATES.find((t) => t.id === HOME_HERO.shotTemplateId && TEMPLATE_SHOTS.has(t.id)) ?? TEMPLATES.find((t) => TEMPLATE_SHOTS.has(t.id)) ?? null;
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
    <section aria-labelledby="home-title" className="relative isolate overflow-x-clip pb-16 pt-12 sm:pt-16 lg:pb-24 lg:pt-20">
      <Mesh />
      <div className="mk-rise container-x flex flex-col items-center text-center">
        {announcement ? (
          <EyebrowPill tag="New" href={announcement.href}>
            {announcement.title}
          </EyebrowPill>
        ) : (
          <EyebrowPill>{HOME_HERO.eyebrow}</EyebrowPill>
        )}
        <h1 id="home-title" className="mk-hero-title mx-auto mt-6 max-w-[24ch]">
          <span className="block">{HOME_HERO.lines[0]}</span>
          <span className="block">
            <GradientText text={HOME_HERO.lines[1]} phrase={HOME_HERO.phrase} />
          </span>
        </h1>
        <p className="mk-lead mx-auto mt-6 max-w-[58ch]">{HOME_HERO.lead}</p>
        <div className="mt-9 w-full">
          <PromptBox signedIn={signedIn} variant="hero" source="home" footer={links} capabilityChip={false} />
        </div>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
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

        {shot ? (
          <figure className="mx-auto mt-16 w-full max-w-6xl text-left lg:mt-20">
            <Link href={templatePreviewHref(shot.id)} aria-label={`Preview the ${shot.name} starter`} className="mk-hero-shot block rounded-[16px] outline-offset-8">
              <BrowserWindow url={HOME_HERO.shotUrl(shot.name)}>
                <TemplatePreview id={shot.id} category={shot.category} priority sizes="(min-width: 1216px) 1152px, 100vw" className="rounded-none border-0 shadow-none" />
              </BrowserWindow>
            </Link>
            <figcaption className="mt-4 text-center text-[13px] text-muted-foreground">{HOME_HERO.shotCaption(shot.name)}</figcaption>
          </figure>
        ) : null}
      </div>
    </section>
  );
}
