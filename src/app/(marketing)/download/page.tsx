import Link from "next/link";
import { AppWindow, Download, ExternalLink, Globe, MonitorDown, MousePointerClick, RotateCcw, ShieldAlert, WifiOff } from "lucide-react";
import { routeMetadata } from "@/lib/seo";
import { DESKTOP } from "@/config/desktop";
import { PageHeader } from "@/components/marketing/page-header";
import { Section, SectionHeader } from "@/components/marketing/section";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = routeMetadata("/download");

const FEATURES = [
  { icon: AppWindow, title: "Its own window", body: "Codexa opens in its own window with a taskbar icon, a Start menu entry and a desktop shortcut, away from your browser tabs." },
  { icon: Globe, title: "The same Codexa", body: "Your account, projects and settings are the ones you use on the web. Sign in once and pick up where you left off." },
  { icon: ExternalLink, title: "Links open in your browser", body: "GitHub, payments, docs and app previews open in your default browser, so the app window stays on Codexa." },
  { icon: WifiOff, title: "Clear when offline", body: "Without a connection you get an offline screen that retries on its own, instead of an error page." },
  { icon: RotateCcw, title: "Updates itself", body: "New versions download in the background and install when you restart. Size, position and maximised state are remembered too." },
  { icon: MousePointerClick, title: "One click to remove", body: "Uninstall from Windows Settings → Apps like any other app. Nothing else is left on your computer." },
];

const STEPS = [
  { title: "Download the installer", body: `Click "Download for Windows". The file is ${DESKTOP.fileName} (about ${DESKTOP.sizeMb} MB).` },
  {
    title: "Run it",
    body: "Open the file. Windows may show \"Windows protected your PC\" because the installer is not code-signed yet: click More info, then Run anyway.",
  },
  { title: "Choose where to install", body: "Keep the default folder or pick another one, then click Install. Codexa opens when it finishes." },
];

export default function DownloadPage() {
  return (
    <div data-tone="product">
      <PageHeader
        variant="product"
        crumbs={[{ name: "Download", path: "/download" }]}
        kicker="Desktop app"
        headline="Codexa for Windows."
        highlight="for Windows."
        lede="Build from a sentence in its own window. The desktop app is the full Codexa workspace, with a Start menu entry, a taskbar icon and links that open in your browser."
        visual={
          <figure className="e3 relative mx-auto flex aspect-[16/10] w-full max-w-[640px] flex-col overflow-hidden rounded-[22px]">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- small static icon */}
              <img src="/desktop/codexa-app-icon.png" alt="" width={20} height={20} className="rounded-[5px]" />
              <span className="text-sm font-medium">Codexa</span>
              <span aria-hidden="true" className="ml-auto flex gap-4 text-muted-foreground">
                <span className="h-px w-3 translate-y-2 bg-current" />
                <span className="size-3 border border-current" />
                <span className="relative size-3 before:absolute before:inset-x-0 before:top-1/2 before:h-px before:-rotate-45 before:bg-current after:absolute after:inset-x-0 after:top-1/2 after:h-px after:rotate-45 after:bg-current" />
              </span>
            </div>
            <div className="grid flex-1 place-items-center bg-[radial-gradient(60%_70%_at_50%_30%,color-mix(in_oklab,var(--glow)_16%,transparent),transparent_70%)] p-8">
              <div className="flex flex-col items-center text-center">
                {/* eslint-disable-next-line @next/next/no-img-element -- static app icon */}
                <img src="/desktop/codexa-app-icon.png" alt="The Codexa app icon" width={112} height={112} className="rounded-[26px] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.5)]" />
                <p className="mt-6 font-display text-2xl font-bold tracking-[-0.03em]">codexa</p>
                <p className="mt-1 text-sm text-muted-foreground">Version {DESKTOP.version} · Windows x64</p>
              </div>
            </div>
            <figcaption className="sr-only">Illustration of the Codexa desktop window</figcaption>
          </figure>
        }
      >
        <div data-reveal style={{ "--reveal-delay": "260ms" } as React.CSSProperties} className="mt-8 flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <a href={DESKTOP.downloadUrl} download className={cn(buttonClasses("primary", "lg", "group"), "btn-ember gap-2")}>
              <Download className="size-4" aria-hidden="true" />
              Download for Windows
            </a>
            <a href={DESKTOP.releasesUrl} className={buttonClasses("outline", "lg")} rel="noopener">
              All versions
            </a>
          </div>
          <p className="text-sm text-muted-foreground">
            Version {DESKTOP.version} · {DESKTOP.requirements} · about {DESKTOP.sizeMb} MB · Free
          </p>
        </div>
      </PageHeader>

      <Section size="sm">
        <SectionHeader eyebrow="What you get" title="Codexa, at home on your desktop." />
        <ul className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <li key={f.title} className="e1 rounded-[18px] p-6">
              <f.icon className="size-5 text-signal-ink" aria-hidden="true" />
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section size="sm" className="border-t border-border/60">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
          <SectionHeader eyebrow="Install" title="Three steps, about a minute." />
          <ol className="grid gap-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="e1 flex gap-4 rounded-[18px] p-5">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-foreground text-sm font-semibold text-background">{i + 1}</span>
                <div>
                  <h3 className="font-semibold">{s.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div className="mt-10 grid gap-3 md:grid-cols-2">
          <div className="e1 flex gap-3 rounded-[18px] p-5 text-sm">
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
            <p className="leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">About the Windows warning.</span> The installer is not code-signed yet, so Windows SmartScreen asks before running it. It is
              built from the open source code in our{" "}
              <a href="https://github.com/sangralrahul/codexa/tree/main/desktop" className="link-draw text-foreground" rel="noopener">
                GitHub repository
              </a>
              , and each release lists the file&apos;s checksum.
            </p>
          </div>
          <div className="e1 flex gap-3 rounded-[18px] p-5 text-sm">
            <MonitorDown className="mt-0.5 size-4 shrink-0 text-signal-ink" aria-hidden="true" />
            <p className="leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">Needs an internet connection.</span> The app is a window onto Codexa&apos;s servers: projects, AI runs, previews and
              deployments all happen there, as on the web. Not on Windows?{" "}
              <Link href="/signup" className="link-draw text-foreground">
                Use Codexa in your browser
              </Link>
              .
            </p>
          </div>
        </div>
      </Section>
    </div>
  );
}
