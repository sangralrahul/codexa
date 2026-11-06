import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import qrcode from "qrcode-generator";
import { BatteryFull, Check, Copy, ExternalLink, Globe, Info, Play, QrCode as QrIcon, RefreshCw, Signal, TriangleAlert, Wifi } from "lucide-react";
import { cn } from "../../lib/util";
import { EXPO_GO_STORE_LINKS, expoGoUrl, phoneReachability } from "../../lib/expo";
import { Button, Spinner, Tip } from "../../ui";
import type { RuntimeView } from "./useRuntime";

/**
 * Port of the web app's src/components/workspace/mobile-preview.tsx; keep the two in step.
 *
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

const viewKey = (projectId: string) => `codexa:ws:${projectId}:mobile-view.v1`;

/** The chosen mobile tab, remembered per project (iOS by default). Storage can be unavailable: fall back quietly. */
export function useMobileView(projectId: string): [MobileView, (v: MobileView) => void] {
  const read = (): MobileView => {
    try {
      const saved = localStorage.getItem(viewKey(projectId));
      if (saved && (MOBILE_VIEW_IDS as readonly string[]).includes(saved)) return saved as MobileView;
    } catch {
      // storage blocked
    }
    return "ios";
  };
  const [state, setState] = useState<{ id: string; view: MobileView }>(() => ({ id: projectId, view: read() }));
  // A different project in the same Preview instance: read its saved tab (render-time reset, no effect).
  const current = state.id === projectId ? state.view : read();
  if (state.id !== projectId) setState({ id: projectId, view: current });
  const set = (v: MobileView) => {
    setState({ id: projectId, view: v });
    try {
      localStorage.setItem(viewKey(projectId), v);
    } catch {
      // storage blocked
    }
  };
  return [current, set];
}

export function MobileViewSwitch({ value, onChange }: { value: MobileView; onChange: (v: MobileView) => void }) {
  return (
    <div className="ws-seg ws-seg--sm" role="group" aria-label="Mobile preview">
      {MOBILE_VIEW_IDS.map((id) => (
        <button key={id} type="button" aria-pressed={value === id} title={MOBILE_VIEWS[id].caption} onClick={() => onChange(id)} className="ws-seg__btn">
          {id === "web" ? <Globe aria-hidden="true" /> : id === "device" ? <QrIcon aria-hidden="true" /> : <PlatformGlyph platform={id} />}
          {MOBILE_VIEWS[id].label}
        </button>
      ))}
    </div>
  );
}

/** A tiny phone outline: rounded with an island for iOS, a punch-hole for Android. Theme greys only. */
function PlatformGlyph({ platform }: { platform: PhonePlatform }) {
  return (
    <svg viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="3.5" y="1" width="7" height="12" rx={platform === "ios" ? 2.2 : 1.4} stroke="currentColor" strokeWidth="1.2" />
      {platform === "ios" ? <path d="M6 2.9h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /> : <circle cx="7" cy="3" r="0.65" fill="currentColor" />}
    </svg>
  );
}

/**
 * A phone bezel scaled to fit its container. The screen keeps the phone's real CSS size (so the app
 * inside lays out exactly as on that phone) and the whole device is scaled down with a transform.
 * `tone="app"` paints the system bars white (the app's own surface); `tone="theme"` follows the app
 * theme, for honest states shown inside the frame.
 */
export function PhoneFrame({ platform, tone = "app", children, className }: { platform: PhonePlatform; tone?: "app" | "theme"; children: ReactNode; className?: string }) {
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
        <div style={{ width: W, height: H, transform: `scale(${scale})`, borderRadius: p.radius }} className="phone absolute left-0 top-0 origin-top-left">
          <SideButtons platform={platform} />
          <div className="phone__screen absolute overflow-hidden" data-tone={tone} style={{ inset: p.bezel, borderRadius: p.radius - p.bezel }}>
            <StatusBar platform={platform} height={p.statusBar} />
            <div className="absolute inset-x-0 overflow-hidden" style={{ top: p.statusBar, bottom: p.navBar }}>
              {children}
            </div>
            <div aria-hidden="true" className="absolute inset-x-0 bottom-0 flex items-center justify-center" style={{ height: p.navBar }}>
              <span className={cn("phone__home block rounded-full", platform === "ios" ? "h-[5px] w-[134px]" : "h-1 w-[108px] opacity-70")} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SideButtons({ platform }: { platform: PhonePlatform }) {
  const btn = "phone__key absolute w-[3px]";
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
      <div aria-hidden="true" className="absolute inset-x-0 top-0 flex items-center justify-between px-8 pt-1.5" style={{ height }}>
        <span className="w-14 text-center text-[15px] font-semibold tracking-tight">9:41</span>
        <span className="phone__island absolute left-1/2 top-[11px] h-[35px] w-[124px] -translate-x-1/2 rounded-full" />
        <span className="flex w-14 items-center justify-end gap-1">
          <Signal className="size-[15px]" strokeWidth={2.6} />
          <Wifi className="size-[15px]" strokeWidth={2.6} />
          <BatteryFull className="size-[22px]" strokeWidth={1.8} />
        </span>
      </div>
    );
  }
  return (
    <div aria-hidden="true" className="absolute inset-x-0 top-0 flex items-center justify-between px-5 opacity-85" style={{ height }}>
      <span className="text-[13px] font-medium">9:41</span>
      <span className="phone__island absolute left-1/2 top-[10px] size-[15px] -translate-x-1/2 rounded-full" />
      <span className="flex items-center gap-1.5">
        <Wifi className="size-[14px]" strokeWidth={2.4} />
        <Signal className="size-[14px]" strokeWidth={2.4} />
        <BatteryFull className="size-[18px]" strokeWidth={1.8} />
      </span>
    </div>
  );
}

/** A QR code drawn as one SVG path (crisp at any size), always black on white so phones can read it. */
export function QrCode({ value, size = 168, className, label }: { value: string; size?: number; className?: string; label: string }) {
  const { d, n } = useMemo(() => {
    const qr = qrcode(0, "M");
    qr.addData(value);
    qr.make();
    const count = qr.getModuleCount();
    let path = "";
    for (let r = 0; r < count; r++) for (let c = 0; c < count; c++) if (qr.isDark(r, c)) path += `M${c} ${r}h1v1h-1z`;
    return { d: path, n: count };
  }, [value]);
  const quiet = 2;
  return (
    <svg role="img" aria-label={label} width={size} height={size} viewBox={`${-quiet} ${-quiet} ${n + quiet * 2} ${n + quiet * 2}`} shapeRendering="crispEdges" className={cn("qr", className)}>
      <path d={d} fill="currentColor" />
    </svg>
  );
}

/**
 * "Preview on your phone": download Expo Go, then scan the dev server's Expo Go link. Every state is
 * real: no QR code until the dev server runs, a plain "not configured" when there is no runtime, and
 * a warning when the address cannot be reached from a phone (localhost or a private network).
 */
export function DevicePanel({ runtime, canEdit, className }: { runtime: RuntimeView; canEdit: boolean; className?: string }) {
  const previewUrl = runtime.previewUrl;
  const url = expoGoUrl(previewUrl);
  const reach = phoneReachability(previewUrl);
  const configured = runtime.state?.runnerConfigured !== false;
  const status = runtime.status;
  const starting = status === "starting" || (status === "stopped" && runtime.busy);
  const running = status === "running" && Boolean(url);
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked
    }
  };

  let qr: ReactNode;
  if (status === "unavailable" && !configured) {
    qr = <StateNote title="Not configured">Previews are not configured on this Codexa server, so there is no dev server for Expo Go to open. Your files, the editor and AI still work.</StateNote>;
  } else if (status === "loading") {
    qr = (
      <StateNote title="Checking the preview…" icon={<Spinner className="size-3.5" />}>
        Asking Codexa&apos;s servers whether the dev server is running.
      </StateNote>
    );
  } else if (starting) {
    qr = (
      <StateNote title="Starting the dev server…" icon={<Spinner className="size-3.5" />}>
        The QR code appears once Metro is running.
      </StateNote>
    );
  } else if (status === "unavailable") {
    qr = (
      <StateNote title="Preview unavailable">
        The sandbox that runs previews isn&apos;t responding right now.
        <span className="mt-3 flex justify-center">
          <Button size="xs" variant="secondary" onClick={() => void runtime.refresh()}>
            <RefreshCw className="!size-3.5" /> Try again
          </Button>
        </span>
      </StateNote>
    );
  } else if (!running) {
    const errored = status === "error";
    qr = (
      <StateNote title={errored ? "The preview stopped with an error" : "The preview is not running"}>
        {errored ? "Restart the dev server to get a QR code for Expo Go." : "Start the dev server to get a QR code for Expo Go."}
        <span className="mt-3 flex justify-center">
          <Button size="xs" variant="primary" loading={runtime.busy} disabled={!canEdit} onClick={() => void (errored ? runtime.restart() : runtime.start())}>
            {runtime.busy ? null : <Play className="!size-3" />} {errored ? "Restart preview" : "Start preview"}
          </Button>
        </span>
        {!canEdit ? <span className="mt-2 block">You have view access; an editor can start the preview.</span> : null}
      </StateNote>
    );
  } else {
    qr = (
      <div className="space-y-2.5">
        {!reach.reachable ? (
          <div role="status" className="flex gap-2 rounded-md border border-warning/35 bg-warning/[0.07] px-2.5 py-2 text-[11.5px] leading-snug text-fg">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-warning" aria-hidden="true" />
            <span className="min-w-0 [overflow-wrap:anywhere]">{reach.reason}</span>
          </div>
        ) : null}
        <div className="flex justify-center">
          <QrCode value={url!} size={136} label="QR code that opens this app in Expo Go" />
        </div>
        <div className="flex h-8 items-center gap-1 rounded-md border border-border bg-panel pl-2.5 pr-1">
          <code className="selectable mono min-w-0 flex-1 truncate text-[11.5px] text-fg" title={url!} data-testid="expo-go-url">
            {url}
          </code>
          <Tip label={copied ? "Copied" : "Copy link"} align="end">
            <button type="button" onClick={() => void copy()} aria-label="Copy the Expo Go link" className="ws-icon ws-icon--xs">
              {copied ? <Check className="text-success" aria-hidden="true" /> : <Copy aria-hidden="true" />}
            </button>
          </Tip>
        </div>
      </div>
    );
  }

  return (
    <section aria-labelledby="device-panel-title" className={cn("device-panel w-full max-w-[372px] shrink-0", className)} data-testid="device-panel">
      <div className="flex gap-2 rounded-md border border-border bg-panel px-2.5 py-2 text-[11.5px] leading-snug text-muted dark:bg-surface/50">
        <Info className="mt-0.5 size-3.5 shrink-0 text-fg" aria-hidden="true" />
        <p>
          Expo Go runs the <span className="font-medium text-fg">native app</span> from this project&apos;s dev server. The iOS and Android tabs show the web render.
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
            <p className="mt-0.5 text-[12px] text-muted">Free from the App Store and Google Play.</p>
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
            <p className="mt-0.5 text-[12px] text-muted">iPhone: use the Camera app. Android: tap “Scan QR code” in Expo Go.</p>
            <div className="mt-3">{qr}</div>
          </div>
        </li>
      </ol>
      <p className="mt-3.5 border-t border-border pt-2.5 text-[11px] leading-snug text-dim">
        Works while the preview runs; anyone with the link can open the app. Private previews (behind a sign-in or on localhost) can&apos;t be opened in Expo Go.
      </p>
    </section>
  );
}

function StepNumber({ n }: { n: number }) {
  return (
    <span aria-hidden="true" className="mono flex size-6 shrink-0 items-center justify-center rounded-full bg-fg text-[11px] font-medium tabular-nums text-bg">
      {n}
    </span>
  );
}

function StoreLink({ href, label, sub }: { href: string; label: string; sub: string }) {
  return (
    <button
      type="button"
      onClick={() => void window.codexa.openExternal(href)}
      className="group flex items-center justify-between gap-1 rounded-md border border-border bg-card px-2.5 py-1.5 text-left transition-colors hover:border-border-strong hover:bg-panel dark:hover:bg-surface"
    >
      <span className="min-w-0">
        <span className="block text-[12.5px] font-medium leading-tight">{label}</span>
        <span className="block text-[11px] leading-tight text-dim">{sub}</span>
      </span>
      <ExternalLink className="size-3 shrink-0 text-dim group-hover:text-fg" aria-hidden="true" />
      <span className="sr-only">(opens in your browser)</span>
    </button>
  );
}

function StateNote({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-border-strong p-3 text-center" role="status">
      <p className="flex items-center justify-center gap-1.5 text-[12.5px] font-medium">
        {icon}
        {title}
      </p>
      <div className="mt-1 text-[12px] leading-relaxed text-muted">{children}</div>
    </div>
  );
}
