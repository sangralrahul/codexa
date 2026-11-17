import Link from "next/link";
import { ArrowRight, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import { site } from "@/config/site";
import { QrCode } from "@/components/ui/qr-code";
import { CAPTURES, ThemedImg, type CaptureId } from "@/components/marketing/captures";
import type { HomeCategory, HomeCheck, HomePlan, HomeReel } from "./data";

/* ------------------------------------------------------------------------------------------------
   Shared pieces
   ------------------------------------------------------------------------------------------------ */

/** A wide letter-spaced chapter caption with a hairline running to a small mono note on the right. */
function ChapterHead({ children, meta, className }: { children: React.ReactNode; meta?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("cx-chh", className)}>
      <p className="cx-cap cx-cap--hi">{children}</p>
      <span aria-hidden="true" className="cx-chh__rule" />
      {meta ? <p className="cx-chh__meta">{meta}</p> : null}
    </div>
  );
}

/** A still scene from /public/space in both themes (CSS shows the current theme's copy; lazy, so only that one loads). */
function SceneImg({ dark, light, className }: { dark: string; light: string; className?: string }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- generated art, served as-is */}
      <img src={dark} alt="" width={2400} height={1100} loading="lazy" decoding="async" className={cn(className, "mk-theme-dark")} />
      {/* eslint-disable-next-line @next/next/no-img-element -- generated art, served as-is */}
      <img src={light} alt="" width={2400} height={1100} loading="lazy" decoding="async" className={cn(className, "mk-theme-light")} />
    </>
  );
}

function Frame({ id, label, position, className }: { id: CaptureId; label: string; position: string; className?: string }) {
  const c = CAPTURES[id];
  return (
    <figure className={cn("cx-fr", className)}>
      <ThemedImg src={c.src} alt={c.alt} width={c.width} height={c.height} style={{ objectPosition: position }} />
      <figcaption className="cx-fr__tc">{label}</figcaption>
    </figure>
  );
}

/* ------------------------------------------------------------------------------------------------
   Chapter I — The build
   ------------------------------------------------------------------------------------------------ */

export function BuildChapter({ templateCount, publishChecks }: { templateCount: number; publishChecks: number }) {
  const beats = [
    { t: "Describe", p: `Plain words, an image, or one of ${templateCount} starters.` },
    { t: "Plan & write", p: "The agent lists the files, writes them and runs a typecheck." },
    { t: "Edit", p: "Chat beside the Monaco editor or the live preview." },
    { t: "Publish", p: `${publishChecks} pre-publish checks, then one-click rollback.` },
  ];
  return (
    <section id="build" aria-labelledby="build-title" className="cx-ch cx-build">
      <ChapterHead meta="Agent · Editor · History">Chapter I&nbsp;&nbsp;—&nbsp;&nbsp;The build</ChapterHead>
      <div className="cx-build__head">
        <h2 id="build-title" className="cx-disp cx-h2">
          One sentence in.
          <br />
          <span className="cx-mute">A real codebase out.</span>
        </h2>
        <p className="cx-lede">Not a mock-up. Files you can read, a preview you can click, history you can rewind. Download it as a ZIP or push it to GitHub whenever you like.</p>
      </div>
      <div className="cx-scope">
        <Frame id="demoAgent" label="A — Agent writes files" position="0 0" />
        <Frame id="demoHistory" label="B — Checkpoints" position="62% 0" />
      </div>
      <ol className="cx-beats">
        {beats.map((b, i) => (
          <li key={b.t}>
            <span className="cx-cap">{String(i + 1).padStart(2, "0")}</span>
            <h3>{b.t}</h3>
            <p>{b.p}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ------------------------------------------------------------------------------------------------
   Chapter II — The pocket
   ------------------------------------------------------------------------------------------------ */

export function PocketChapter({ pocket }: { pocket: { name: string; src: string; href: string } | null }) {
  return (
    <section id="mobile" aria-labelledby="pocket-title" className="cx-pocket">
      <div className="cx-pocket__bg" aria-hidden="true">
        <SceneImg dark="/space/home-eclipse.webp" light="/space/home-light-dawn.webp" />
      </div>
      <p className="cx-cap cx-cap--hi cx-pocket__v" aria-hidden="true">
        Chapter II&nbsp;&nbsp;—&nbsp;&nbsp;The pocket
      </p>
      <div className="cx-pocket__stage">
        {pocket ? (
          <figure className="cx-pocket__ph">
            <Link href={pocket.href} className="cx-phone" aria-label={`${pocket.name} starter: open the preview`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- real capture of the starter's phone build */}
              <img src={pocket.src} alt={`The ${pocket.name} starter running at phone size`} width={780} height={1688} loading="lazy" decoding="async" />
            </Link>
            <figcaption className="sr-only">The {pocket.name} starter, captured at phone size.</figcaption>
            <span className="cx-ann cx-ann--a" aria-hidden="true">
              React Native · Expo
            </span>
            <span className="cx-ann cx-ann--b" aria-hidden="true">
              {pocket.name}
            </span>
          </figure>
        ) : null}
        <div className="cx-pocket__tx">
          <p className="cx-cap">
            <span className="sr-only">Chapter II, the pocket: </span>Mobile apps
          </p>
          <h2 id="pocket-title" className="cx-disp cx-h2">
            Now it fits in your pocket.
          </h2>
          <p className="cx-pocket__p">Pick Mobile app and Codexa writes React Native with Expo. Watch it in a phone frame as the agent works, then scan the code and hold it in your hand.</p>
          <div className="cx-scan">
            <QrCode value={new URL("/docs/mobile-apps", site.url).toString()} size={104} label="QR code linking to the mobile apps documentation" className="cx-qr" />
            <div>
              <p className="cx-scan__t">Scan in Expo Go.</p>
              <p className="cx-scan__p">
                In the editor, the code in the phone preview opens your app in Expo Go. This one opens the{" "}
                <Link href="/docs/mobile-apps" className="cx-link">
                  mobile docs
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------------------------------------
   Chapter III — The library
   ------------------------------------------------------------------------------------------------ */

function Reel({ r, i, hidden }: { r: HomeReel; i: number; hidden?: boolean }) {
  return (
    <li className="cx-reel" aria-hidden={hidden || undefined}>
      <Link href={r.href} tabIndex={hidden ? -1 : undefined} className="cx-reel__a">
        <span className="cx-reel__im">
          {/* eslint-disable-next-line @next/next/no-img-element -- real capture of the starter */}
          <img src={r.src} alt="" width={720} height={450} loading="lazy" decoding="async" />
        </span>
        <span className="cx-reel__l">
          <span>
            {String(i + 1).padStart(2, "0")} · {r.name}
          </span>
          <span>{r.runtime}</span>
        </span>
      </Link>
    </li>
  );
}

export function LibraryChapter({ templateCount, categoryCount, reels, categories }: { templateCount: number; categoryCount: number; reels: HomeReel[]; categories: HomeCategory[] }) {
  const shown = categories.slice(0, 7);
  return (
    <section aria-labelledby="library-title" className="cx-library">
      <div className="cx-ch">
        <ChapterHead meta={`${templateCount} reels`} className="cx-chh--tight">
          Chapter III&nbsp;&nbsp;—&nbsp;&nbsp;The library
        </ChapterHead>
        <h2 id="library-title" className="cx-disp cx-h2">
          {templateCount} starters.
          <br />
          <span className="cx-mute">Every one of them runs.</span>
        </h2>
      </div>
      <div className="cx-strip">
        <div className="cx-strip__track">
          <ul className="cx-strip__row" aria-label="Starter templates">
            {reels.map((r, i) => (
              <Reel key={r.id} r={r} i={i} />
            ))}
          </ul>
          <ul className="cx-strip__row" aria-hidden="true">
            {reels.map((r, i) => (
              <Reel key={r.id} r={r} i={i} hidden />
            ))}
          </ul>
        </div>
      </div>
      <nav aria-label="Template categories" className="cx-ch">
        <ul className="cx-cats">
          <li>
            <Link href="/templates" className="cx-cats__all">
              {categoryCount} categories
            </Link>
          </li>
          {shown.map((c) => (
            <li key={c.id}>
              <Link href={c.href}>{c.name}</Link>
            </li>
          ))}
          {categories.length > shown.length ? (
            <li>
              <Link href="/templates">+ {categories.length - shown.length} more</Link>
            </li>
          ) : null}
        </ul>
      </nav>
    </section>
  );
}

/* ------------------------------------------------------------------------------------------------
   Chapter IV — The launch
   ------------------------------------------------------------------------------------------------ */

const CATEGORY_LABEL: Record<HomeCheck["category"], string> = { security: "Security", seo: "SEO", performance: "Speed", quality: "Quality" };

export function LaunchChapter({ publishChecks, checks, roles }: { publishChecks: number; checks: HomeCheck[]; roles: string[] }) {
  const rest = publishChecks - checks.length;
  const facts = [
    { t: "Domain", d: "Your project's own subdomain. Point a custom domain at it with a CNAME." },
    { t: "Rollback", d: "Every deployment is kept. Serve an earlier one in a click." },
    { t: "Sandbox", d: "One isolated container per project, on Cloudflare." },
    { t: "Storage", d: "Files on R2 and project data on D1, served from Workers." },
    { t: "Team", d: `${roles.slice(0, -1).join(", ")} and ${roles[roles.length - 1]} roles.` },
  ];
  return (
    <section aria-labelledby="launch-title" className="cx-ch">
      <ChapterHead meta={`${publishChecks} checks`}>Chapter IV&nbsp;&nbsp;—&nbsp;&nbsp;The launch</ChapterHead>
      <h2 id="launch-title" className="cx-disp cx-h2">
        Nothing leaves
        <br />
        <span className="cx-mute">without its checks.</span>
      </h2>
      <ul className="cx-credits" aria-label="Pre-publish checks">
        {checks.map((c) => (
          <li key={c.title}>
            <span>{c.title}</span>
            <i>{CATEGORY_LABEL[c.category]}</i>
          </li>
        ))}
        {rest > 0 ? (
          <li>
            <span>{rest} more, on every publish</span>
            <i>All</i>
          </li>
        ) : null}
      </ul>
      <p className="cx-note">
        The checks the publish scanner reports on a clean project. The others speak up only when they find something.{" "}
        <Link href="/docs/deployment" className="cx-link">
          How publishing works
        </Link>
      </p>
      <dl className="cx-plat">
        {facts.map((f) => (
          <div key={f.t}>
            <dt>{f.t}</dt>
            <dd>{f.d}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/* ------------------------------------------------------------------------------------------------
   Admission — pricing from PLANS
   ------------------------------------------------------------------------------------------------ */

export function Admission({ plans }: { plans: HomePlan[] }) {
  return (
    <section aria-labelledby="admission-title" className="cx-ch">
      <h2 id="admission-title" className="sr-only">
        Pricing
      </h2>
      <ChapterHead meta="USD / INR">Admission</ChapterHead>
      <ul className="cx-tix">
        {plans.map((p) => (
          <li key={p.id} data-hl={p.highlight || undefined}>
            <h3 className="cx-tix__nm">
              {p.name}
              {p.highlight ? <span className="cx-tix__badge">Recommended</span> : null}
            </h3>
            <p className={cn("cx-disp cx-tix__amt", !p.per && p.price === "Custom" && "cx-tix__amt--word")}>
              {p.price}
              {p.per ? <small>{p.per}</small> : null}
            </p>
            <p className="cx-tix__inr">{p.inr}</p>
            <p className="cx-tix__tag">{p.tagline}</p>
            <ul className="cx-tix__f">
              {p.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <Link href={p.cta.href} className={cn("cx-btn cx-btn--sm", p.highlight && "cx-btn--solid")} aria-label={`${p.cta.label}: ${p.name} plan`}>
              {p.cta.label}
            </Link>
          </li>
        ))}
      </ul>
      <p className="cx-note">
        Prices exclude applicable taxes.{" "}
        <Link href="/pricing" className="cx-link">
          Compare every plan
        </Link>
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------------------------------------
   Finale — "Roll camera." over the moon
   ------------------------------------------------------------------------------------------------ */

export function Finale({ signedIn }: { signedIn: boolean }) {
  return (
    <section aria-labelledby="finale-title" className="cx-fin">
      <div className="cx-fin__bg" aria-hidden="true">
        <SceneImg dark="/space/moon.webp" light="/space/light-lunar.webp" />
      </div>
      <div className="cx-fin__in">
        <p className="cx-cap cx-cap--hi">Your turn</p>
        <h2 id="finale-title" className="cx-disp cx-fin__h">
          Roll camera.
        </h2>
        <div className="cx-ctas">
          <Link href={signedIn ? "/dashboard" : "/signup"} className="cx-btn cx-btn--solid">
            {signedIn ? "Open dashboard" : "Start building free"}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <Link href="/download" className="cx-btn">
            <Monitor className="size-4" aria-hidden="true" />
            Download for Windows
          </Link>
        </div>
      </div>
    </section>
  );
}
