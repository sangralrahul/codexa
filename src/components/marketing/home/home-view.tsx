import type { HomeData } from "./data";
import { HomeFacts, HomeHero } from "./hero";
import { HomeStory } from "./story";
import { HomeFeatures } from "./features";
import { HomeTemplates } from "./templates";
import { HomePlatform } from "./platform";
import { HomeCta, HomeFaq, HomePricing } from "./closing-sections";

/**
 * The marketing home ("Monochrome Grid", launch edition): a full-bleed live hero with the product
 * tour, then one 1200px framed column of hairline rows with crosshair marks (facts, how it works,
 * platform bento, templates marquee, security, pricing, FAQ), and a full-bleed closing band.
 * Server components throughout; the client islands are the space backdrops, the product tour, the
 * story scroller and the <Live> regions that gate CSS loops. page.tsx gathers the data.
 */
export function HomeView({ data, signedIn }: { data: HomeData; signedIn: boolean }) {
  const facts = [
    { value: String(data.templateCount), label: "Templates", note: `${data.categoryCount} categories, all running` },
    { value: String(data.runtimes.length), label: "Runtimes", note: "React, static, Node and Expo" },
    { value: String(data.publishChecks), label: "Pre-publish checks", note: "On every publish" },
    { value: "Cloudflare", label: "Runs on", note: "Workers, Containers, D1, R2" },
    { value: "Windows", label: "Desktop app", note: "Native, x64" },
  ];
  return (
    <div data-page="home" className="relative overflow-x-clip">
      <HomeHero signedIn={signedIn} templateCount={data.templateCount} priceLine={data.priceLine} tour={data.tour} />
      <div className="mk-frame">
        <HomeFacts facts={facts} />
        <HomeStory agentTools={data.agentTools} publishChecks={data.publishChecks} templateId={data.tour.templateId} />
        <HomeFeatures files={data.tour.files} checkTitles={data.checkTitles} publishChecks={data.publishChecks} roles={data.roles} runtimes={data.runtimes} />
        <HomeTemplates total={data.templateCount} categoryCount={data.categoryCount} rows={data.marquee} categories={data.categories} />
        <HomePlatform />
        <HomePricing plans={data.plans} />
        <HomeFaq items={data.faq} />
      </div>
      <HomeCta signedIn={signedIn} />
    </div>
  );
}
