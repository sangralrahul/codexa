import Link from "next/link";
import { ArrowDown, ArrowRight } from "lucide-react";
import { BrowserFrame } from "@/components/frames/browser-frame";
import { TemplatePreview } from "@/components/templates/template-preview";
import { templatePreviewHref } from "@/components/templates/template-card";
import { TEMPLATE_SHOTS } from "@/components/templates/shots";
import { PromptBox } from "@/components/marketing/prompt-box";
import { HOME_HERO } from "@/content/marketing/home";
import { TEMPLATES } from "@/templates";

/**
 * H0 hero: a two-line sans headline, a one-sentence lead, the composer, and one straight product
 * screenshot in a browser frame right under it. The screenshot is a real starter template captured
 * from its own build (never a generated or invented image); the caption says so.
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
    <section aria-labelledby="home-title" className="relative border-b border-border bg-surface/60 pb-12 pt-12 sm:pt-16 lg:pb-16 lg:pt-20">
      <div className="container-x text-center">
        {announcement ? (
          <Link
            href={announcement.href}
            className="group inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
          >
            <span className="rounded-full bg-primary/10 px-1.5 py-px text-[11px] font-semibold text-primary">New</span>
            <span className="min-w-0 truncate">{announcement.title}</span>
            <ArrowRight className="size-3 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        ) : null}
        <h1 id="home-title" className="mk-hero-title mx-auto mt-5 max-w-[22ch]">
          <span className="block">{HOME_HERO.lines[0]}</span>
          <span className="block">{HOME_HERO.lines[1]}</span>
        </h1>
        <p className="text-lead mx-auto mt-5 max-w-[60ch]!">{HOME_HERO.lead}</p>
        <div className="mt-8">
          <PromptBox signedIn={signedIn} variant="hero" source="home" footer={links} capabilityChip={false} />
        </div>

        {shot ? (
          <figure className="mx-auto mt-12 max-w-5xl text-left lg:mt-14">
            <Link href={templatePreviewHref(shot.id)} aria-label={`Preview the ${shot.name} starter`} className="group/shot block rounded-[12px] outline-offset-4">
              <BrowserFrame url={`${shot.name} starter`} chrome="minimal" className="rounded-[12px] shadow-xl transition-[border-color] duration-(--dur-3) group-hover/shot:border-foreground/30">
                <TemplatePreview id={shot.id} category={shot.category} priority sizes="(min-width: 1088px) 1024px, 100vw" className="rounded-none border-0 shadow-none" />
              </BrowserFrame>
            </Link>
            <figcaption className="mt-3 text-center text-xs text-muted-foreground">{HOME_HERO.shotCaption(shot.name)}</figcaption>
          </figure>
        ) : null}
      </div>
    </section>
  );
}
