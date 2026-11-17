import type { HomeData } from "./data";
import { HomeHero } from "./hero";
import { Admission, BuildChapter, Finale, LaunchChapter, LibraryChapter, PocketChapter } from "./chapters";

/**
 * The marketing home, "Cinematic Orbit": a monochrome launch film. Scene 01 is a full-height planet
 * horizon with the headline and the product rising over the curve; then chapters marked by wide
 * letter-spaced captions (the build, the pocket, the library as a filmstrip, the launch as end
 * credits), admission (pricing from PLANS) and "Roll camera." over the moon. Server components
 * throughout; the client islands are the hero's live backdrop and the QR code. page.tsx gathers the data.
 */
export function HomeView({ data, signedIn, eager }: { data: HomeData; signedIn: boolean; eager: "light" | "dark" | null }) {
  return (
    <div data-page="home" className="cx-home">
      <HomeHero signedIn={signedIn} runtimeKinds={data.runtimeKinds} eager={eager} />
      <BuildChapter templateCount={data.templateCount} publishChecks={data.publishChecks} />
      <PocketChapter pocket={data.pocket} />
      <LibraryChapter templateCount={data.templateCount} categoryCount={data.categoryCount} reels={data.reels} categories={data.categories} />
      <LaunchChapter publishChecks={data.publishChecks} checks={data.checks} roles={data.roles} />
      <Admission plans={data.plans} />
      <Finale signedIn={signedIn} />
    </div>
  );
}
