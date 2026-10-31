import type { HomeData } from "./data";
import { HomeHero, HomeShot } from "./hero";
import { HomePlatform } from "./platform";
import { HomeTemplates } from "./template-strip";
import { HomePublish } from "./publish";
import { HomeCta, HomePricing } from "./closing-sections";

/**
 * The marketing home ("Monochrome Grid"): one 1200px framed column with hairline rows and
 * crosshair marks. A server component with no client islands; page.tsx gathers the data.
 */
export function HomeView({ data, signedIn }: { data: HomeData; signedIn: boolean }) {
  return (
    <div data-page="home" className="relative overflow-x-clip">
      <div className="mk-frame">
        <HomeHero signedIn={signedIn} templateCount={data.templateCount} priceLine={data.priceLine} />
        <HomeShot />
        <HomePlatform meter={data.meter} runtimes={data.runtimes} roles={data.roles} />
        <HomeTemplates total={data.templateCount} categoryCount={data.categoryCount} categories={data.categories} tiles={data.templates} />
        <HomePublish publishChecks={data.publishChecks} />
        <HomePricing plans={data.plans} />
        <HomeCta signedIn={signedIn} />
      </div>
    </div>
  );
}
