import Link from "next/link";
import { AppWindow, Download, ExternalLink, Globe, MonitorDown, MousePointerClick, RotateCcw, ShieldAlert, WifiOff } from "lucide-react";
import { routeMetadata } from "@/lib/seo";
import { DESKTOP } from "@/config/desktop";
import { ThemedImg } from "@/components/marketing/captures";
import { ClosingBand, Eyebrow, GridFrame, GridRow, PageHero, RowHead } from "@/components/marketing/page-grid";

export const metadata = routeMetadata("/download");

/**
 * The desktop app's home screen, captured from Codexa for Windows (desktop/) signed in against a
 * development server at 1440x900, in both themes (public/marketing/desktop-home[-light].webp).
 */
const CAPTURE = {
  src: "/marketing/desktop-home.webp",
  alt: "Codexa for Windows, signed in: the workspace sidebar with recent projects and usage, the animated 'Let's build' headline over the composer, the get-set-up checklist and the usage panel.",
};

const FEATURES = [
  { icon: AppWindow, title: "A native app", body: "Its own screens built for Windows: a home with the composer, projects, templates, settings and a Ctrl+K command palette. It doesn't load the website." },
  { icon: Globe, title: "The same account", body: "Sign in with email, Google or GitHub. Your projects, chats and settings are the same ones you see on the web." },
  { icon: ExternalLink, title: "Chat, code, preview, publish", body: "Talk to the AI, edit files in a built-in code editor (Ctrl+S saves), watch the live preview and publish, all in one window." },
  { icon: WifiOff, title: "Clear when offline", body: "Without a connection the app tells you so and keeps your place; AI runs, previews and publishing need Codexa's servers." },
  { icon: RotateCcw, title: "Updates itself", body: "New versions download in the background and install when you restart. Size, position, theme and layout are remembered." },
  { icon: MousePointerClick, title: "One click to remove", body: "Uninstall from Windows Settings → Apps like any other app. Nothing else is left on your computer." },
];

const STEPS = [
  { title: "Download the installer", body: `Click "Download for Windows". The file is ${DESKTOP.fileName} (about ${DESKTOP.sizeMb} MB).` },
  { title: "Run it", body: 'Open the file. Windows may show "Windows protected your PC" because the installer is not code-signed yet: click More info, then Run anyway.' },
  { title: "Choose where to install", body: "Keep the default folder or pick another one, then click Install. Codexa opens when it finishes." },
];

const SPECS = [
  { k: "Version", v: DESKTOP.version },
  { k: "System", v: DESKTOP.requirements },
  { k: "Installer", v: <code className="font-mono text-[13px]">{DESKTOP.fileName}</code> },
  { k: "Download size", v: `About ${DESKTOP.sizeMb} MB` },
  { k: "Connection", v: "Internet required: projects, AI runs, previews and deployments run on Codexa's servers" },
  { k: "Account", v: "A Codexa account (the Free plan works)" },
  { k: "Updates", v: "Automatic, in the background; installed on restart" },
  { k: "Price", v: "Free" },
];

export default function DownloadPage() {
  return (
    <div data-tone="product" className="relative overflow-x-clip">
      <PageHero
        crumbs={[{ name: "Download", path: "/download" }]}
        eyebrow="Desktop app · Windows"
        title="Codexa"
        dim="for Windows."
        lede="A native Windows app for building with AI: describe an app, chat with the agent, edit code, watch the live preview and publish, all in one window."
        align="center"
      >
        <div className="pg-ctas justify-center">
          <a href={DESKTOP.downloadUrl} download className="mkb mkb--solid mkb--lg pg-cta">
            <Download className="size-4" aria-hidden="true" />
            Download for Windows
          </a>
          <a href={DESKTOP.releasesUrl} className="mkb mkb--lg pg-glass" rel="noopener">
            All versions
          </a>
        </div>
        <p className="mt-5 font-mono text-[12px] text-(--g-dim)">
          v{DESKTOP.version} · {DESKTOP.requirements} · about {DESKTOP.sizeMb} MB · Free
        </p>
      </PageHero>

      <GridFrame>
        <GridRow aria-label="The app, captured" className="px-(--g-pad) pb-10 pt-12 lg:pb-12 lg:pt-14">
          <figure className="mx-auto max-w-[1040px]">
            <div className="pg-shot">
              <ThemedImg src={CAPTURE.src} alt={CAPTURE.alt} width={1440} height={900} sizes="(min-width: 1100px) 1040px, 100vw" eager={null} className="block h-auto w-full bg-card" />
            </div>
            <figcaption className="pg-cap">
              <span className="pg-cap__tag">Captured</span>
              The home screen of Codexa for Windows {DESKTOP.version}, captured from the desktop app.
            </figcaption>
          </figure>
        </GridRow>

        <GridRow aria-labelledby="included-title">
          <RowHead id="included-title" index="01" label="What's included" title="Codexa," dim="at home on your desktop.">
            <p>The same workspace as the web, in its own window: the composer, your projects, the agent, the editor, previews and publishing.</p>
          </RowHead>
          <ul className="pg-cells pg-cells--hover">
            {FEATURES.map((f) => (
              <li key={f.title}>
                <h3 className="pg-cell__h">
                  <f.icon className="size-4" aria-hidden="true" />
                  {f.title}
                </h3>
                <p className="pg-cell__p">{f.body}</p>
              </li>
            ))}
          </ul>
        </GridRow>

        <GridRow aria-labelledby="install-title" className="pg-split">
          <div>
            <div className="pg-split__sticky">
              <Eyebrow index="02">Install</Eyebrow>
              <h2 id="install-title" className="pg-h2">
                Three steps,
                <br />
                <span>about a minute.</span>
              </h2>
            </div>
          </div>
          <div>
            <ol className="divide-y divide-dashed divide-border border-y border-dashed border-border">
              {STEPS.map((s, i) => (
                <li key={s.title} className="grid grid-cols-[3rem_minmax(0,1fr)] gap-4 py-6">
                  <span className="font-mono text-[12px] text-(--g-dim)">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <h3 className="text-[16px] font-semibold tracking-[-0.015em]">{s.title}</h3>
                    <p className="mt-1.5 text-[14.5px] leading-relaxed text-muted-foreground">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-8 grid gap-px overflow-hidden rounded-[12px] border border-border bg-border md:grid-cols-2">
              <div className="flex gap-3 bg-background p-5 text-[14px]">
                <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
                <p className="leading-relaxed text-muted-foreground">
                  <span className="font-medium text-foreground">About the Windows warning.</span> The installer is not code-signed yet, so Windows SmartScreen asks before running it. It is built from the open source code in our{" "}
                  <a href="https://github.com/sangralrahul/codexa/tree/main/desktop" className="pg-link" rel="noopener">
                    GitHub repository
                  </a>
                  , and each release lists the file&apos;s checksum.
                </p>
              </div>
              <div className="flex gap-3 bg-background p-5 text-[14px]">
                <MonitorDown className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <p className="leading-relaxed text-muted-foreground">
                  <span className="font-medium text-foreground">Needs an internet connection.</span> The app&apos;s screens run on your computer; projects, AI runs, previews and deployments happen on Codexa&apos;s servers, as on the web. Not on Windows?{" "}
                  <Link href="/signup" className="pg-link">
                    Use Codexa in your browser
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>
        </GridRow>

        <GridRow aria-labelledby="req-title" className="pg-split">
          <div>
            <div className="pg-split__sticky">
              <Eyebrow index="03">System requirements</Eyebrow>
              <h2 id="req-title" className="pg-h2">
                What you need,
                <br />
                <span>and nothing else.</span>
              </h2>
              <p className="mt-5 max-w-md text-[15px] text-muted-foreground">
                Browser requirements for the web app are on{" "}
                <Link href="/system-requirements" className="pg-link">
                  system requirements
                </Link>
                .
              </p>
            </div>
          </div>
          <dl className="divide-y divide-border border-y border-border">
            {SPECS.map((r) => (
              <div key={r.k} className="grid grid-cols-1 gap-1 py-4 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-6">
                <dt className="font-mono text-[11.5px] uppercase tracking-[0.06em] text-(--g-dim) sm:pt-0.5">{r.k}</dt>
                <dd className="text-[15px] text-foreground">{r.v}</dd>
              </div>
            ))}
          </dl>
        </GridRow>
      </GridFrame>

      <ClosingBand title="Build on your desktop." dim="Or right here in the browser." lede={`Codexa for Windows ${DESKTOP.version} is free with any Codexa account.`}>
        <div className="pg-ctas justify-center">
          <a href={DESKTOP.downloadUrl} download className="mkb mkb--solid mkb--lg pg-cta">
            <Download className="size-4" aria-hidden="true" />
            Download for Windows
          </a>
          <Link href="/signup" className="mkb mkb--lg pg-glass">
            Start in the browser
          </Link>
        </div>
      </ClosingBand>
    </div>
  );
}
