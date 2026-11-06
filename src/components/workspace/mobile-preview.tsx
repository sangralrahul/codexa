"use client";

import { useEffect, useRef, useState } from "react";
import { BatteryFull, Check, Copy, ExternalLink, Globe, Info, Loader2, Play, QrCode as QrIcon, Signal, TriangleAlert, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QrCode } from "@/components/ui/qr-code";
import { Segmented } from "@/components/ui/segmented";
import { EXPO_GO_STORE_LINKS, expoGoUrl, phoneReachability } from "@/lib/runtime/expo";
import { cn } from "@/lib/utils";

/**
 * Preview modes for Expo (React Native) projects. The phone frames are chrome around the WEB render
 * (react-native-web) at a phone's CSS size; they are not native emulators, and say so. "Your Device"
 * is the real native app: Expo Go on the user's phone loads it from the same dev server.
 */
export type MobileView = "web" | "ios" | "android" | "device";
export const MOBILE_VIEW_IDS: readonly MobileView[] = ["web", "ios", "android", "device"];

export const MOBILE_VIEWS: Record<MobileView, { label: string; caption: string }> = {
  web: { label: "Web", caption: "Web render at full width" },
  ios: { label: "iOS", caption: "Web render in an iOS-sized frame (390 × 844)" },
  android: { label: "Android", caption: "Web render in an Android-sized frame (412 × 915)" },
  device: { label: "Your Device", caption: "The native app on your phone, with Expo Go" },
};

export type PhonePlatform = "ios" | "android";

/** CSS-pixel screen sizes (iPhone 15/16, Pixel 8) and the system bars the app area sits between. */
export const PHONES: Record<PhonePlatform, { width: number; height: number; statusBar: number; navBar: number; bezel: number; radius: number }> = {
  ios: { width: 390, height: 844, statusBar: 54, navBar: 34, bezel: 12, radius: 58 },
  android: { width: 412, height: 915, statusBar: 36, navBar: 24, bezel: 10, radius: 40 },
};

export function MobileViewSwitch({ value, onChange }: { value: MobileView; onChange: (v: MobileView) => void }) {
  return (
    <Segmented<MobileView>
      aria-label="Mobile preview"
      size="sm"
      value={value}
      onValueChange={onChange}
      options={MOBILE_VIEW_IDS.map((id) => ({
        value: id,
        label: MOBILE_VIEWS[id].label,
        icon: id === "web" ? <Globe /> : id === "device" ? <QrIcon /> : undefined,
        title: MOBILE_VIEWS[id].caption,
      }))}
    />
  );
}

/**
 * A phone bezel scaled to fit its container. The screen keeps the phone's real CSS size (so the app
 * inside lays out exactly as on that phone) and the whole device is scaled down with a transform.
 */
export function PhoneFrame({ platform, children, className }: { platform: PhonePlatform; children: React.ReactNode; className?: string }) {
  const p = PHONES[platform];
  const W = p.width + p.bezel * 2;
  const H = p.height + p.bezel * 2;
  const boxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.8);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const fit = () => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      setScale(Math.max(0.3, Math.min(1, (r.height - 8) / H, (r.width - 8) / W)));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [W, H]);

  return (
    <div ref={boxRef} className={cn("flex min-h-0 min-w-0 flex-1 items-center justify-center", className)} data-phone={platform}>
      <div style={{ width: W * scale, height: H * scale }} className="relative shrink-0">
        <div
          style={{ width: W, height: H, transform: `scale(${scale})`, borderRadius: p.radius }}
          className="absolute left-0 top-0 origin-top-left bg-code-bg shadow-[0_0_0_1px_var(--border-strong),inset_0_0_0_2px_color-mix(in_oklab,white_14%,transparent),0_24px_60px_-20px_rgb(0_0_0/0.45)]"
        >
          <SideButtons platform={platform} />
          <div className="absolute overflow-hidden bg-white" style={{ inset: p.bezel, borderRadius: p.radius - p.bezel }}>
            <StatusBar platform={platform} height={p.statusBar} />
            <div className="absolute inset-x-0 overflow-hidden" style={{ top: p.statusBar, bottom: p.navBar }}>
              {children}
            </div>
            <div aria-hidden="true" className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-white" style={{ height: p.navBar }}>
              <span className={cn("block rounded-full bg-black/85", platform === "ios" ? "h-[5px] w-[134px]" : "h-1 w-[108px] bg-black/60")} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SideButtons({ platform }: { platform: PhonePlatform }) {
  const btn = "absolute w-[3px] bg-code-bg shadow-[0_0_0_1px_var(--border-strong)]";
  return platform === "ios" ? (
    <span aria-hidden="true">
      <span className={cn(btn, "-left-[3px] top-[120px] h-8 rounded-l-sm")} />
      <span className={cn(btn, "-left-[3px] top-[178px] h-14 rounded-l-sm")} />
      <span className={cn(btn, "-left-[3px] top-[246px] h-14 rounded-l-sm")} />
      <span className={cn(btn, "-right-[3px] top-[200px] h-20 rounded-r-sm")} />
    </span>
  ) : (
    <span aria-hidden="true">
      <span className={cn(btn, "-right-[3px] top-[170px] h-14 rounded-r-sm")} />
      <span className={cn(btn, "-right-[3px] top-[250px] h-24 rounded-r-sm")} />
    </span>
  );
}

/** Decorative system bar: fixed time, signal, Wi-Fi and battery glyphs. */
function StatusBar({ platform, height }: { platform: PhonePlatform; height: number }) {
  if (platform === "ios") {
    return (
      <div aria-hidden="true" className="absolute inset-x-0 top-0 flex items-center justify-between bg-white px-8 pt-1.5 text-black" style={{ height }}>
        <span className="w-14 text-center text-[15px] font-semibold tracking-tight">9:41</span>
        <span className="absolute left-1/2 top-[11px] h-[35px] w-[124px] -translate-x-1/2 rounded-full bg-black" />
        <span className="flex w-14 items-center justify-end gap-1">
          <Signal className="size-[15px]" strokeWidth={2.6} />
          <Wifi className="size-[15px]" strokeWidth={2.6} />
          <BatteryFull className="size-[22px]" strokeWidth={1.8} />
        </span>
      </div>
    );
  }
  return (
    <div aria-hidden="true" className="absolute inset-x-0 top-0 flex items-center justify-between bg-white px-5 text-black/85" style={{ height }}>
      <span className="text-[13px] font-medium">9:41</span>
      <span className="absolute left-1/2 top-[10px] size-[15px] -translate-x-1/2 rounded-full bg-black" />
      <span className="flex items-center gap-1.5">
        <Wifi className="size-[14px]" strokeWidth={2.4} />
        <Signal className="size-[14px]" strokeWidth={2.4} />
        <BatteryFull className="size-[18px] rotate-0" strokeWidth={1.8} />
      </span>
    </div>
  );
}

/**
 * "Preview on your phone": download Expo Go, then scan the dev server's Expo Go link. Every state is
 * real: no QR code until the dev server runs, a plain "not configured" when there is no runtime, and
 * a warning when the address cannot be reached from a phone (localhost or a private network).
 */
export function DevicePanel({
  previewUrl,
  status,
  configured,
  canEdit,
  starting,
  onStart,
  className,
}: {
  previewUrl: string | null;
  status: string;
  configured: boolean;
  canEdit: boolean;
  starting: boolean;
  onStart: () => void;
  className?: string;
}) {
  const url = expoGoUrl(previewUrl);
  const reach = phoneReachability(previewUrl);
  const running = status === "running" && Boolean(url);
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };

  let qr: React.ReactNode;
  if (!configured) {
    qr = <StateNote title="Not configured">Previews are not configured on this Codexa deployment, so there is no dev server for Expo Go to open. Your files, the editor and AI still work.</StateNote>;
  } else if (status === "starting") {
    qr = (
      <StateNote title="Starting the dev server…" icon={<Loader2 className="size-4 animate-spin" aria-hidden="true" />}>
        The QR code appears once Metro is running.
      </StateNote>
    );
  } else if (!running) {
    qr = (
      <StateNote title={status === "unavailable" ? "Preview unavailable" : "The preview is not running"}>
        {status === "unavailable" ? "The sandbox that runs previews isn't responding right now." : "Start the dev server to get a QR code for Expo Go."}
        {status !== "unavailable" ? (
          <Button size="sm" appearance="app" className="mt-3" onClick={onStart} loading={starting} disabled={!canEdit || starting}>
            <Play className="size-3.5 fill-current" aria-hidden="true" /> Start preview
          </Button>
        ) : null}
        {!canEdit ? <span className="mt-2 block">You have view access; an editor can start the preview.</span> : null}
      </StateNote>
    );
  } else {
    qr = (
      <div className="space-y-3">
        {!reach.reachable ? (
          <div role="status" className="flex gap-2 rounded-lg border border-warning/35 bg-warning/[0.07] p-2.5 text-[12px] leading-relaxed text-foreground">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-warning" aria-hidden="true" />
            <span className="min-w-0 [overflow-wrap:anywhere]">{reach.reason}</span>
          </div>
        ) : null}
        <div className="flex justify-center">
          <QrCode value={url!} size={144} label="QR code that opens this app in Expo Go" className="p-1.5 shadow-[0_0_0_1px_var(--border)]" />
        </div>
        <div className="flex h-8 items-center gap-1 rounded-md bg-muted/60 pl-2.5 pr-1 shadow-[inset_0_0_0_1px_var(--border)]">
          <code className="min-w-0 flex-1 truncate font-mono text-[11.5px] text-foreground" title={url!} data-testid="expo-go-url">
            {url}
          </code>
          <button type="button" onClick={() => void copy()} aria-label="Copy the Expo Go link" className="inline-flex size-6 shrink-0 items-center justify-center rounded-[5px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
            {copied ? <Check className="size-3.5 text-success" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
          </button>
        </div>
      </div>
    );
  }

  return (
    <section aria-labelledby="device-panel-title" className={cn("w-full max-w-[360px] shrink-0 rounded-xl border border-border bg-card p-4 shadow-sm", className)} data-testid="device-panel">
      <div className="flex gap-2 rounded-lg bg-muted/60 p-2.5 text-[12px] leading-relaxed text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)]">
        <Info className="mt-0.5 size-3.5 shrink-0 text-foreground" aria-hidden="true" />
        <p>
          Expo Go runs the <span className="font-medium text-foreground">native app</span> from this project&apos;s dev server. The iOS and Android tabs show the web render.
        </p>
      </div>
      <h2 id="device-panel-title" className="mt-3.5 text-[15px] font-semibold tracking-[-0.01em]">
        Preview on your phone
      </h2>
      <ol className="mt-3 space-y-3.5">
        <li className="flex gap-3">
          <StepNumber n={1} />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium">Download Expo Go</p>
            <p className="mt-0.5 text-[12px] text-muted-foreground">Free from the App Store and Google Play.</p>
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              <StoreLink href={EXPO_GO_STORE_LINKS.ios} label="App Store" sub="iPhone, iPad" />
              <StoreLink href={EXPO_GO_STORE_LINKS.android} label="Google Play" sub="Android" />
            </div>
          </div>
        </li>
        <li className="flex gap-3">
          <StepNumber n={2} />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium">Scan the QR code</p>
            <p className="mt-0.5 text-[12px] text-muted-foreground">iPhone: use the Camera app. Android: tap “Scan QR code” in Expo Go.</p>
            <div className="mt-3">{qr}</div>
          </div>
        </li>
      </ol>
      <p className="mt-3.5 border-t border-border pt-3 text-[11.5px] leading-relaxed text-muted-foreground">
        Works while the preview runs; anyone with the link can open the app. Private previews (behind a sign-in or on localhost) can&apos;t be opened in Expo Go.
      </p>
    </section>
  );
}

function StepNumber({ n }: { n: number }) {
  return (
    <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center rounded-full bg-foreground text-[11.5px] font-semibold tabular-nums text-background">
      {n}
    </span>
  );
}

function StoreLink({ href, label, sub }: { href: string; label: string; sub: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center justify-between gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 transition-colors hover:border-border-strong hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-ring"
    >
      <span className="min-w-0">
        <span className="block text-[12.5px] font-medium leading-tight">{label}</span>
        <span className="block text-[11px] leading-tight text-muted-foreground">{sub}</span>
      </span>
      <ExternalLink className="size-3 shrink-0 text-muted-foreground group-hover:text-foreground" aria-hidden="true" />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

function StateNote({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border-strong p-3 text-center" role="status">
      <p className="flex items-center justify-center gap-1.5 text-[12.5px] font-medium">
        {icon}
        {title}
      </p>
      <div className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{children}</div>
    </div>
  );
}
