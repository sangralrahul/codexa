import Link from "next/link";
import { Globe } from "lucide-react";
import { CAPTURES, ThemedImg, type CaptureId } from "@/components/marketing/captures";
import { templateShotSrc, templateShotSrcSet, SHOT_HEIGHT, SHOT_WIDTH } from "@/components/templates/shots";
import { SectionHead } from "./frame";
import { StoryScroller } from "./story-scroller";

type Step = { title: string; body: string; meta: string; media: { capture: CaptureId } | { template: string } };

/** One step's picture: a real workspace capture in the site's theme, or the starter's real screenshot in a preview frame. */
function StepMedia({ step }: { step: Step }) {
  if ("capture" in step.media) {
    const c = CAPTURES[step.media.capture];
    return (
      <div className="hm-story__frame">
        <ThemedImg src={c.src} alt={c.alt} width={c.width} height={c.height} />
      </div>
    );
  }
  const id = step.media.template;
  return (
    <div className="hm-story__frame hm-story__frame--preview">
      <p className="hm-story__url">
        <Globe className="size-3" aria-hidden="true" />
        preview · candle-store
      </p>
      {/* eslint-disable-next-line @next/next/no-img-element -- real template screenshot with srcset */}
      <img src={templateShotSrc(id)} srcSet={templateShotSrcSet(id)} sizes="(min-width: 1024px) 640px, 100vw" alt="The live preview of the Ecommerce storefront starter: a product catalog with category filters, search and a cart." width={SHOT_WIDTH} height={SHOT_HEIGHT} loading="lazy" decoding="async" />
    </div>
  );
}

/**
 * 01 How it works: four steps on the left; on wide screens the picture on the right is sticky and
 * changes as each step crosses the middle of the viewport (StoryScroller). On narrow screens, and
 * without JS, every step carries its own picture inline.
 */
export function HomeStory({ agentTools, publishChecks, templateId }: { agentTools: number; publishChecks: number; templateId: string }) {
  const steps: Step[] = [
    {
      title: "Describe",
      body: "Say what you want in a sentence, or start from a template. Paste a screenshot if you have one. Pick React, a static site or a Node API.",
      meta: "New project · composer",
      media: { capture: "demoDescribe" },
    },
    {
      title: "Plan & build",
      body: `The agent reads the project, writes a short plan, then edits real files with tools you can watch, from write_file to run_command. ${agentTools} tools in all, every run checkpointed.`,
      meta: "Agent panel · editor",
      media: { capture: "demoAgent" },
    },
    {
      title: "Preview",
      body: "The project runs in its own container with a live preview beside the code. The console streams the dev server's output; fix, ask or restore from there.",
      meta: "Split view · live preview",
      media: { template: templateId },
    },
    {
      title: "Publish",
      body: `${publishChecks} pre-publish checks run first. Then it goes live on a Codexa subdomain or your own domain, and any earlier version is one click away.`,
      meta: "Publish dialog · checks",
      media: { capture: "demoPublish" },
    },
  ];
  return (
    <section aria-labelledby="how-title" className="mkg-row">
      <SectionHead id="how-title" index="01" label="How it works" title="One sentence in." dim="A live URL out.">
        <p>
          Four steps, the same ones you see in the app. Nothing hides behind a spinner: every change is a file you can open.{" "}
          <Link href="/how-it-works" className="mkg-inline-link">
            How it works
          </Link>
        </p>
      </SectionHead>
      <StoryScroller className="hm-story">
        <ol className="hm-story__steps">
          {steps.map((s, i) => (
            <li key={s.title} data-step={i} className="hm-story__step">
              <div className="hm-story__text">
                <p className="hm-story__n">
                  <span>{String(i + 1).padStart(2, "0")}</span>
                  {s.meta}
                </p>
                <h3 className="hm-story__h">{s.title}</h3>
                <p className="hm-story__p">{s.body}</p>
              </div>
              <div className="hm-story__inline">
                <StepMedia step={s} />
              </div>
            </li>
          ))}
        </ol>
        <div className="hm-story__media" aria-hidden="true">
          <div className="hm-story__sticky">
            {steps.map((s, i) => (
              <div key={s.title} className="hm-story__slide" data-slide={i}>
                <StepMedia step={s} />
              </div>
            ))}
            <ol className="hm-story__dots">
              {steps.map((s, i) => (
                <li key={s.title} data-dot={i}>
                  {s.title}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </StoryScroller>
    </section>
  );
}
