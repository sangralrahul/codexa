import * as React from "react";
import type { HomeData } from "./data";
import { HomeStoreProvider } from "./home-store";
import { HomeHero } from "./hero";
import { TrustRow } from "./trust-row";
import { StatsStrip } from "./stats-strip";
import { Bento } from "./bento";
import { HowItWorks } from "./how-it-works";
import { Platform, type ChangelogEntry } from "./platform";
import { TemplateGallery } from "./template-gallery";
import { FaqSection, FinalCta, PricingTeaser } from "./closing-sections";

/**
 * The marketing home, H0–H7. Server component with small client islands (the composer and the
 * pricing toggles); it takes plain data only (page.tsx gathers it), so it can render anywhere a
 * server tree can.
 */
export function HomeView({
  data,
  signedIn,
  aiReady,
  announcement,
  changelog,
  status,
}: {
  data: Pick<HomeData, "scenarios" | "starters" | "tools" | "maxRepairAttempts" | "stats" | "categoryCount" | "publishChecks" | "commands" | "templateCount" | "frameworkSummary" | "gallery" | "nodes" | "freePlan">;
  signedIn: boolean;
  aiReady: boolean;
  announcement: { title: string; href: string } | null;
  changelog: ChangelogEntry[];
  /** The live status pill (streamed). */
  status: React.ReactNode;
}) {
  return (
    <div data-page="home" className="relative overflow-x-clip">
      <HomeStoreProvider starters={data.starters} scenarios={data.scenarios} tools={data.tools} aiReady={aiReady} maxRepairAttempts={data.maxRepairAttempts}>
        {/* H0: hero with the product in the fold, then the "Built on" row and the stats strip */}
        <HomeHero signedIn={signedIn} announcement={announcement} />
        <TrustRow />
        <StatsStrip stats={data.stats} categoryCount={data.categoryCount} />
        {/* H1: bento feature grid */}
        <Bento publishChecks={data.publishChecks} commands={data.commands} />
        {/* H2: how it works, as a timeline */}
        <HowItWorks />
        {/* H3: runs on Cloudflare */}
        <Platform status={status} nodes={data.nodes} changelog={changelog} />
        {/* H4: templates gallery */}
        <TemplateGallery tiles={data.gallery} total={data.templateCount} frameworkSummary={data.frameworkSummary} />
        {/* H5–H7 */}
        <PricingTeaser />
        <FaqSection />
        <FinalCta signedIn={signedIn} freePlan={data.freePlan} />
      </HomeStoreProvider>
    </div>
  );
}
