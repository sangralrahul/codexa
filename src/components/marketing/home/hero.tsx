import Link from "next/link";
import { ArrowRight, Monitor } from "lucide-react";
import { SpaceBackdrop } from "@/components/space/space-backdrop";
import { tokenize } from "@/components/vignettes/tokenize";
import { Crosshairs } from "./frame";
import { ProductTour, type TourScript } from "./product-tour";
import { TOKEN_KINDS, type CompactToken } from "./types";
import type { HomeTour } from "./data";

/** Token runs as compact [kindIndex, text] tuples, so the tour's code crosses into the client small. */
function compact(lines: string[]): CompactToken[][] {
  return tokenize(lines.join("\n"), "tsx").map((line) => line.map((tok) => [Math.max(0, TOKEN_KINDS.indexOf(tok.k)), tok.v] as CompactToken));
}

/**
 * The opening: a full-bleed live scene (the dashboard's backdrop, fixed to the orbit horizon in the
 * dark theme and its daylight pair in the light theme), the frame's rails running through it, the
 * "New" pill, the headline (the LCP: plain server text; the scene fades in after mount and never
 * blocks it), two CTAs, the price line, and the product tour rising from the horizon.
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
          Describe the app.
          <br />
          <span>Ship the code.</span>
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
