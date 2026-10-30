import * as React from "react";
import type { HomeData } from "./data";
import { HomeStoreProvider } from "./home-store";
import { HomeHero } from "./hero";
import { HowItWorks } from "./how-it-works";
import { HomeFeatureGrid } from "./feature-grid";
import { TemplateStrip } from "./template-strip";
import { PlatformFacts, type ChangelogEntry } from "./platform-facts";
import { FaqSection, FinalCta, PricingTeaser } from "./closing-sections";

/**
 * The marketing home, H0–H8. Server component with small client islands (the composer and the
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
  data: Pick<HomeData, "scenarios" | "starters" | "tools" | "maxRepairAttempts" | "proof" | "templateCount" | "frameworkSummary" | "wall" | "nodes" | "freePlan">;
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
        {/* H0 */}
        <HomeHero signedIn={signedIn} announcement={announcement} />
        {/* H1 */}
        <HowItWorks maxRepairAttempts={data.maxRepairAttempts} />
        {/* H2 */}
        <HomeFeatureGrid />
        {/* H3 */}
        <TemplateStrip tiles={data.wall} total={data.templateCount} frameworkSummary={data.frameworkSummary} />
        {/* H4 + H5 */}
        <PlatformFacts facts={data.proof} changelog={changelog} status={status} nodes={data.nodes} />
        {/* H6–H8 */}
        <PricingTeaser />
        <FaqSection />
        <FinalCta signedIn={signedIn} freePlan={data.freePlan} />
      </HomeStoreProvider>
    </div>
  );
}
