import Link from "next/link";
import * as React from "react";
import { ArrowRight } from "lucide-react";
import { SectionHeader } from "@/components/marketing/section";
import { HOME_INTEGRATIONS, HOME_PROOF, HOME_WALL } from "@/content/marketing/home";
import type { HomeData } from "./data";
import type { TickerEntry } from "./changelog-ticker";
import { HomeStoreProvider } from "./home-store";
import { HomeHero, type HeroStyle } from "./hero";
import { Storyboard } from "./storyboard";
import { ProofStrip } from "./proof-strip";
import { TemplateWall } from "./template-wall";
import { Principles } from "./principles";
import { PlatformGrid } from "./platform-grid";
import { Constellation } from "./constellation";
import { FaqSection, FinalCta, PricingTeaser } from "./closing-sections";

/**
 * The marketing home, H0–H9 (PLAN §5.2). Server component with small client islands; it takes
 * plain data only (page.tsx gathers it), so it can render anywhere a server tree can.
 */
export function HomeView({
  data,
  signedIn,
  aiReady,
  announcement,
  changelog,
  status,
  heroStyle,
}: {
  data: Pick<HomeData, "scenarios" | "starters" | "tools" | "maxRepairAttempts" | "proof" | "templateCount" | "frameworkSummary" | "wall" | "nodes" | "freePlan">;
  signedIn: boolean;
  aiReady: boolean;
  announcement: { title: string; href: string } | null;
  changelog: TickerEntry[];
  /** The live status pill (streamed). */
  status: React.ReactNode;
  heroStyle?: HeroStyle;
}) {
  const scenario = data.scenarios[0];
  return (
    <div data-page="home" className="relative overflow-x-clip">
      <HomeStoreProvider starters={data.starters} scenarios={data.scenarios} tools={data.tools} aiReady={aiReady} maxRepairAttempts={data.maxRepairAttempts}>
        {/* H0 + H1 */}
        <HomeHero signedIn={signedIn} announcement={announcement} heroStyle={heroStyle} />
        <Storyboard />

        {/* H2 */}
        <ProofStrip facts={data.proof} changelog={changelog} status={status} />

        {/* H3 */}
        <section className="relative py-16 sm:py-24 lg:py-28">
          <div className="container-x">
            <SectionHeader
              index={HOME_WALL.index}
              title={HOME_WALL.title}
              size="display-2"
              lead={`${data.templateCount} starter templates: ${data.frameworkSummary}. Open one to read its files, then remix it with a sentence.`}
            />
          </div>
          <TemplateWall tiles={data.wall}>
            <p className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
              <span>{HOME_WALL.caption}</span>
              <Link href={HOME_WALL.browse.href} className="group/b inline-flex items-center gap-1 font-medium text-foreground">
                <span className="link-draw">{HOME_WALL.browse.label}</span>
                <ArrowRight className="size-3.5 transition-transform group-hover/b:translate-x-0.5" aria-hidden="true" />
              </Link>
            </p>
          </TemplateWall>
        </section>

        {/* H4 */}
        <Principles scenario={scenario} maxRepairAttempts={data.maxRepairAttempts} />

        {/* H5 */}
        <PlatformGrid scenario={scenario} />

        {/* H6: stacked and centred up to xl; from xl the copy sits beside the orbit, so the 600px constellation does not float in empty space. */}
        <section aria-labelledby="integrations-title" className="relative overflow-hidden py-16 sm:py-24 lg:py-28">
          <div className="container-x">
            <div className="grid items-center xl:grid-cols-[minmax(0,1fr)_600px] xl:gap-x-16">
              <div data-reveal className="mx-auto max-w-4xl md:text-center xl:mx-0 xl:text-left">
                <p className="text-label mb-5 text-signal-ink">{HOME_INTEGRATIONS.index}</p>
                <h2 id="integrations-title" className="text-display-2">
                  {HOME_INTEGRATIONS.title.replace(HOME_INTEGRATIONS.highlight, "")}
                  <span className="text-dim">{HOME_INTEGRATIONS.highlight}</span>
                </h2>
                <p className="text-lead mt-5 md:mx-auto xl:mx-0">{HOME_INTEGRATIONS.lead}</p>
                <p className="mt-6 hidden text-xs text-muted-foreground xl:block">
                  {HOME_PROOF.platformLine} {HOME_INTEGRATIONS.trademark}
                </p>
              </div>
              <div className="mt-12 md:mt-6 xl:mt-0">
                <Constellation
                  nodes={data.nodes}
                  footer={
                    <Link href="/integrations" className="group/i inline-flex items-center gap-1 text-sm font-medium text-foreground">
                      <span className="link-draw">Browse integrations</span>
                      <ArrowRight className="size-3.5 transition-transform group-hover/i:translate-x-0.5" aria-hidden="true" />
                    </Link>
                  }
                />
              </div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground md:text-center xl:hidden">
              {HOME_PROOF.platformLine} {HOME_INTEGRATIONS.trademark}
            </p>
          </div>
        </section>

        {/* H7–H9 */}
        <PricingTeaser />
        <FaqSection />
        <FinalCta signedIn={signedIn} freePlan={data.freePlan} />
      </HomeStoreProvider>
    </div>
  );
}
