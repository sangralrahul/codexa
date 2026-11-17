import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import { SpaceBackdrop } from "@/components/space/space-backdrop";
import { RiseWords } from "@/components/motion/rise-words";
import { CAPTURES, ThemedImg } from "@/components/marketing/captures";

/**
 * Scene 01: a full-height planet horizon (the orbit scene by night, its daylight pair by day; live
 * starfield or dust and a slow drift, still under reduced motion), the gigantic two-tone headline, the
 * subline and two pill CTAs, side captions, and a real capture of the New project page rising over the
 * curve. The page's only <h1>.
 */
export function HomeHero({ signedIn, runtimeKinds, eager }: { signedIn: boolean; runtimeKinds: string[]; eager: "light" | "dark" | null }) {
  const shot = CAPTURES.demoDescribe;
  const half = Math.ceil(runtimeKinds.length / 2);
  return (
    <section aria-labelledby="home-title" className="cx-hero" data-space-hero data-space-host>
      <div className="cx-hero__scene">
        <SpaceBackdrop scene="orbit" variant="stage" />
      </div>
      <div className="cx-hero__copy">
        <p className="cx-cap cx-cap--hi">
          An AI app builder<span aria-hidden="true">&nbsp;&nbsp;·&nbsp;&nbsp;</span>
          <span className="sr-only">, </span>runs on Cloudflare
        </p>
        <h1 id="home-title" className="cx-disp cx-hero__h1">
          <RiseWords text="Say it." /> <span className="cx-mute"><RiseWords text="Ship it." start={2} /></span>
        </h1>
        <p className="cx-hero__lede">Describe an app in plain words. An agent plans it, writes real TypeScript and React, runs it in a sandbox, and puts it on the web.</p>
        <div className="cx-ctas">
          <Link href={signedIn ? "/dashboard" : "/signup"} className="cx-btn cx-btn--solid">
            {signedIn ? "Open dashboard" : "Start building free"}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <Link href="#build" className="cx-btn">
            <Play className="size-3.5 fill-current" aria-hidden="true" />
            See it work
          </Link>
        </div>
      </div>
      <p className="cx-side cx-side--l" aria-hidden="true">
        Scene 01
        <br />
        Orbit
      </p>
      <p className="cx-side cx-side--r">
        {runtimeKinds.slice(0, half).join(" · ")}
        <br />
        {runtimeKinds.slice(half).join(" · ")}
      </p>
      <figure className="cx-rise">
        <figcaption className="cx-rise__lab">
          <span className="cx-cap">Fig. 1 — New project</span>
          <span className="cx-cap max-sm:hidden">Captured from the app</span>
        </figcaption>
        <div className="cx-rise__w">
          <ThemedImg src={shot.src} alt={shot.alt} width={shot.width} height={shot.height} eager={eager} />
        </div>
      </figure>
      <div className="cx-hero__fade" aria-hidden="true" />
    </section>
  );
}
