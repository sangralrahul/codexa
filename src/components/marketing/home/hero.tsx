import Link from "next/link";
import { ArrowRight, Monitor } from "lucide-react";
import { SpaceBackdrop } from "@/components/space/space-backdrop";
import { RotatingText } from "@/components/motion/rotating-text";
import { Rise, RiseWords } from "@/components/motion/rise-words";
import { tokenize } from "@/components/vignettes/tokenize";
import { Crosshairs } from "./frame";
import { ProductTour, type TourScript } from "./product-tour";
import { TOKEN_KINDS, type CompactToken } from "./types";
import type { HomeTour } from "./data";

/** Token runs as compact [kindIndex, text] tuples, so the tour's code crosses into the client small. */
function compact(lines: string[]): CompactToken[][] {
  return tokenize(lines.join("\n"), "tsx").map((line) => line.map((tok) => [Math.max(0, TOKEN_KINDS.indexOf(tok.k)), tok.v] as CompactToken));
}

/** What the headline's first line cycles through: kinds of app the starters cover. */
const HERO_PHRASES = ["a storefront.", "a dashboard.", "a booking app.", "an internal tool.", "a REST API.", "a portfolio."] as const;

/**
 * The opening: a full-bleed live scene (the dashboard's backdrop, fixed to the orbit horizon in the
 * dark theme and its daylight pair in the light theme), the frame's rails running through it, the
 * "New" pill, the headline (the LCP: server-rendered text with the first phrase in place, rising in
 * with CSS; RotatingText takes over the cycle after hydration; screen readers get the stable sentence), two CTAs, the price line, and the product tour rising from the horizon.
 */
export function HomeHero({ signedIn, templateCount, priceLine, tour }: { signedIn: boolean; templateCount: number; priceLine: string; tour: HomeTour }) {
  const script: TourScript = { ...tour, code: compact(tour.code) };
  return (
    <section aria-labelledby="home-title" className="hm-hero" data-space-hero data-space-host>
      <SpaceBackdrop scene="orbit" variant="stage" />
      <div aria-hidden="true" className="hm-hero__rails" />
      <div className="hm-hero__copy">
        <Link href="/download" className="hm-pill">
          <b>New</b>
          <Monitor className="size-3.5 shrink-0" aria-hidden="true" />
          <span>Codexa for Windows</span>
          <ArrowRight className="size-3.5 shrink-0" aria-hidden="true" />
        </Link>
        <h1 id="home-title" className="hm-h1">
          <span className="sr-only">Describe your app. Ship real code.</span>
          <span aria-hidden="true">
            <RiseWords text="Describe" />{" "}
            <br className="hm-h1__br" />
            <Rise index={1}>
              <RotatingText phrases={HERO_PHRASES} />
            </Rise>
            <br />
            <Rise index={2}>
              <span className="hm-h1__sheen">Ship real code.</span>
            </Rise>
          </span>
        </h1>
        <p className="hm-lede">
          An agent plans the files, writes <em>real TypeScript and React</em>, runs it in an isolated sandbox with a live preview, and publishes it to your domain.
        </p>
        <div className="hm-ctas">
          <Link href={signedIn ? "/dashboard" : "/signup"} className="mkb mkb--solid mkb--lg">
            {signedIn ? "Open dashboard" : "Start building for free"}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <Link href="/templates" className="mkb mkb--lg hm-glassbtn">
            Browse {templateCount} templates
          </Link>
        </div>
        <p className="hm-cmd">{priceLine}</p>
      </div>
      <div className="hm-hero__stage">
        <ProductTour script={script} />
      </div>
    </section>
  );
}

/** The facts strip under the hero: numbers read from code, no visitor or customer counts. */
export function HomeFacts({ facts }: { facts: { value: string; label: string; note: string }[] }) {
  return (
    <section aria-label="Codexa at a glance" className="mkg-row">
      <ul className="hm-facts">
        {facts.map((f) => (
          <li key={f.label}>
            <p className="hm-facts__v">{f.value}</p>
            <p className="hm-facts__l">{f.label}</p>
            <p className="hm-facts__n">{f.note}</p>
          </li>
        ))}
      </ul>
      <Crosshairs corners={["tl", "tr"]} />
    </section>
  );
}
