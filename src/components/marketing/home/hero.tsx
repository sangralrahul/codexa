import Link from "next/link";
import { ArrowRight, FileCode2 } from "lucide-react";
import { CAPTURES } from "@/components/marketing/captures";
import { Crosshairs } from "./frame";

/** Hero row: construction grid, "New" tag, the statement headline, two CTAs and the price line read from PLANS. */
export function HomeHero({ signedIn, templateCount, priceLine }: { signedIn: boolean; templateCount: number; priceLine: string }) {
  return (
    <section aria-labelledby="home-title" className="mkg-row mkg-hero">
      <div aria-hidden="true" className="mkg-gridbg" />
      <Link href="/download" className="mkg-tag">
        <b>New</b>
        <span>Native Windows desktop app is available</span>
        <ArrowRight className="size-3.5" aria-hidden="true" />
      </Link>
      <h1 id="home-title" className="mkg-h1">
        Describe the app.
        <br />
        Ship the code.
      </h1>
      <p className="mkg-lede">
        An agent plans the files, writes <em>real TypeScript and React</em>, runs it in an isolated sandbox with a live preview, and publishes it to your domain.
      </p>
      <div className="mkg-ctas">
        <Link href={signedIn ? "/dashboard" : "/signup"} className="mkb mkb--solid mkb--lg">
          {signedIn ? "Open dashboard" : "Start building for free"}
        </Link>
        <Link href="/templates" className="mkb mkb--lg">
          Browse {templateCount} templates
        </Link>
      </div>
      <p className="mkg-cmd">{priceLine}</p>
      <Crosshairs />
    </section>
  );
}

/** The product window: a real capture of the workspace code view. */
export function HomeShot() {
  const c = CAPTURES.editor;
  return (
    <>
      <figure className="mkg-row mkg-shot">
        <div className="mkg-win">
          <div className="mkg-winbar" aria-hidden="true">
            <span className="mkg-winbar__dots">
              <i />
              <i />
              <i />
            </span>
            <span className="mkg-winbar__url">
              <FileCode2 className="size-3" />
              Candle store / src / Cart.tsx
            </span>
            <span className="mkg-winbar__end">Code</span>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element -- static capture with explicit size */}
          <img src={c.src} alt={c.alt} width={c.width} height={c.height} fetchPriority="high" decoding="async" />
        </div>
        <figcaption className="sr-only">{c.caption}</figcaption>
      </figure>
      <ul className="mkg-row mkg-shotcap" aria-label="In the workspace">
        <li>
          <b>Chat with the agent</b>Plans, writes and explains each change.
        </li>
        <li>
          <b>Code or live preview</b>Monaco editor beside a sandboxed preview.
        </li>
        <li>
          <b>Checkpoints</b>Restore any earlier version of every file.
        </li>
        <li>
          <b>Console</b>Terminal and logs from the running app.
        </li>
      </ul>
    </>
  );
}
