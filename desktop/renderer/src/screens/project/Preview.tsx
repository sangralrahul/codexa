import { useState, type ReactNode } from "react";
import { ExternalLink, Lock, Monitor, Play, RefreshCw, RotateCw, Smartphone, Tablet, Terminal } from "lucide-react";
import { cn } from "../../lib/util";
import { Button, Spinner, Tip } from "../../ui";
import type { RuntimeView } from "./useRuntime";
import { DevicePanel, MOBILE_VIEWS, MobileViewSwitch, PhoneFrame, useMobileView } from "./Mobile";

const DEVICES = [
  { id: "desktop", label: "Desktop", icon: Monitor, width: null },
  { id: "tablet", label: "Tablet", icon: Tablet, width: 820 },
  { id: "phone", label: "Phone", icon: Smartphone, width: 390 },
] as const;

export function Preview({
  projectId,
  framework,
  canEdit = true,
  runtime,
  reloadKey,
  onOpenConsole,
}: {
  projectId: string;
  /** Project framework id. "expo" switches to the mobile preview (phone frames + Your Device). */
  framework?: string;
  canEdit?: boolean;
  runtime: RuntimeView;
  reloadKey: number;
  onOpenConsole?: () => void;
}) {
  const [device, setDevice] = useState<(typeof DEVICES)[number]["id"]>("desktop");
  const [nonce, setNonce] = useState(0);
  // Expo (React Native) projects: Web | iOS | Android | Your Device, remembered per project.
  const isExpo = framework === "expo";
  const [mobileView, setMobileView] = useMobileView(projectId);
  const phone = isExpo && mobileView !== "web";
  const current = DEVICES.find((d) => d.id === device)!;
  // Expo projects use the phone frames below instead of the desktop/tablet/phone widths.
  const width = isExpo ? null : current.width;
  const url = runtime.previewUrl;
  const starting = runtime.status === "starting" || (runtime.status === "stopped" && runtime.busy);
  const dot = url ? "bg-success" : starting ? "pulse bg-warning" : runtime.status === "error" ? "bg-danger" : "bg-dim";
  const host = url ? url.replace(/^https?:\/\//, "").replace(/\/$/, "") : null;
  const label = host ?? (starting ? "Starting your app…" : runtime.status === "error" ? "Stopped with an error" : runtime.status === "unavailable" ? "Previews unavailable" : runtime.status === "loading" ? "Checking the preview…" : "Not running");

  return (
    <div className="flex h-full flex-col bg-bg">
      {/* Browser chrome: reload, the address, device widths, open outside. */}
      <div className="ws-bar gap-1.5 px-2">
        <Tip label="Reload preview">
          <button type="button" className="ws-icon ws-icon--sm" aria-label="Reload preview" disabled={!url} onClick={() => setNonce((n) => n + 1)}>
            <RotateCw />
          </button>
        </Tip>
        <div className="flex h-7 min-w-0 flex-1 items-center gap-2 rounded-md border border-border bg-panel px-2.5 text-[12px]">
          {url ? <Lock className="size-3 shrink-0 text-dim" aria-hidden="true" /> : <span className={cn("ws-dot", dot)} aria-hidden="true" />}
          <span className={cn("selectable min-w-0 truncate", url ? "mono text-fg" : "text-muted")} aria-label="Preview address">
            {label}
          </span>
          {url ? (
            <span className="ml-auto hidden shrink-0 items-center gap-1.5 text-[11px] text-dim lg:flex">
              <span className={cn("ws-dot", dot)} /> Updates as you save
            </span>
          ) : null}
        </div>
        {!url && !starting && runtime.status !== "unavailable" && runtime.status !== "loading" ? (
          <Button size="xs" variant="primary" loading={runtime.busy} onClick={() => void (runtime.status === "error" ? runtime.restart() : runtime.start())}>
            {runtime.busy ? null : <Play className="!size-3.5" />} {runtime.status === "error" ? "Restart" : "Run"}
          </Button>
        ) : null}
        {isExpo ? null : (
          <div className="ws-seg ws-seg--sm ws-seg--icons" role="group" aria-label="Device size">
            {DEVICES.map((d) => (
              <Tip key={d.id} label={d.width ? `${d.label} · ${d.width}px` : `${d.label} · full width`}>
                <button type="button" aria-label={d.label} aria-pressed={device === d.id} onClick={() => setDevice(d.id)} className="ws-seg__btn">
                  <d.icon />
                </button>
              </Tip>
            ))}
          </div>
        )}
        <Tip label="Open in browser" align="end">
          <button type="button" className="ws-icon ws-icon--sm" aria-label="Open preview in browser" disabled={!url} onClick={() => url && void window.codexa.openExternal(url)}>
            <ExternalLink />
          </button>
        </Tip>
      </div>

      {isExpo ? (
        <div className="ws-bar gap-3 px-2" data-testid="mobile-preview-bar">
          <MobileViewSwitch value={mobileView} onChange={setMobileView} />
          <p className="min-w-0 truncate text-[11.5px] text-dim" aria-live="polite">
            {MOBILE_VIEWS[mobileView].caption}
          </p>
        </div>
      ) : null}

      {phone ? (
        <div className="ws-canvas @container/preview relative flex min-h-0 flex-1 items-stretch justify-center gap-10 overflow-hidden px-5 py-4">
          <PhoneFrame platform={mobileView === "android" ? "android" : "ios"} tone={url ? "app" : "theme"} className={mobileView === "device" ? "hidden @[760px]/preview:flex" : undefined}>
            {url ? (
              <iframe key={`${url}#${nonce}#${reloadKey}`} src={url} title="App preview" className="h-full w-full border-0 bg-white" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads" />
            ) : (
              <div className="flex h-full items-center justify-center px-6">
                <PreviewState runtime={runtime} onOpenConsole={onOpenConsole} compact />
              </div>
            )}
          </PhoneFrame>
          {mobileView === "device" ? (
            // my-auto centres the panel when it fits and lets it scroll from the top when it does not.
            <div className="scroll flex min-h-0 flex-1 flex-col items-center overflow-y-auto @[760px]/preview:flex-none">
              <DevicePanel className="my-auto" runtime={runtime} canEdit={canEdit} />
            </div>
          ) : null}
        </div>
      ) : (
      <div className={cn("ws-canvas relative min-h-0 flex-1 overflow-auto", url ? (width ? "px-6 pb-4 pt-5" : "p-3") : "p-6")}>
        {url ? (
          <div className="mx-auto flex h-full flex-col" style={width ? { width, maxWidth: "100%" } : undefined}>
            {width ? (
              <p className="mb-2 flex items-center justify-center gap-2 text-[11px] text-dim">
                <current.icon className="size-3" aria-hidden="true" />
                <span className="mono">{width}px</span>
              </p>
            ) : null}
            <div className={cn("ws-frame min-h-0 flex-1", width && "rounded-[14px]")}>
              <iframe key={`${url}#${nonce}#${reloadKey}`} src={url} title="App preview" className="h-full w-full border-0 bg-white" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads" />
            </div>
          </div>
        ) : (
          <div className="flex min-h-full items-center justify-center">
            <PreviewState runtime={runtime} onOpenConsole={onOpenConsole} />
          </div>
        )}
      </div>
      )}
    </div>
  );
}

type Tone = "idle" | "starting" | "error" | "offline";

function PreviewState({ runtime, onOpenConsole, compact }: { runtime: RuntimeView; onOpenConsole?: () => void; compact?: boolean }) {
  const { status, error } = runtime;
  const consoleBtn = onOpenConsole ? (
    <Button variant="secondary" onClick={onOpenConsole}>
      <Terminal /> Open console
    </Button>
  ) : null;
  if (status === "loading" || status === "starting" || (status === "stopped" && runtime.busy)) {
    return (
      <StateCardView
        compact={compact}
        tone="starting"
        eyebrow={status === "loading" ? "Checking" : "Starting"}
        title={status === "loading" ? "Checking the preview…" : "Starting your app…"}
        body={status === "loading" ? "Asking Codexa's servers whether this project's preview is running." : "Installing packages and starting the dev server. The first start takes a little longer; the console shows the output as it happens."}
        actions={status === "loading" ? null : consoleBtn}
      />
    );
  }
  if (status === "unavailable") {
    return (
      <StateCardView
        compact={compact}
        tone="offline"
        eyebrow="Not available"
        title="Live preview isn't available right now"
        body="Codexa couldn't reach the preview service for this project. Files, chat, history and publishing still work."
        detail={error}
        actions={
          <Button variant="primary" onClick={() => void runtime.refresh()}>
            <RefreshCw /> Try again
          </Button>
        }
      />
    );
  }
  if (status === "error") {
    return (
      <StateCardView
        compact={compact}
        tone="error"
        eyebrow="Stopped"
        title="The preview stopped with an error"
        body="The dev server exited. Check the console for the cause, or ask the AI to fix it, then restart."
        detail={error}
        actions={
          <>
            <Button variant="primary" onClick={() => void runtime.restart()} loading={runtime.busy}>
              {runtime.busy ? null : <Play />} Restart
            </Button>
            {consoleBtn}
          </>
        }
      />
    );
  }
  return (
    <StateCardView
      compact={compact}
      tone="idle"
      eyebrow="Stopped"
      title="The preview isn't running"
      body="Run starts your app on Codexa's servers. It reloads every time you or the AI save a file."
      detail={error}
      actions={
        <>
          <Button variant="primary" onClick={() => void runtime.start()} loading={runtime.busy}>
            {runtime.busy ? null : <Play />} Run preview
          </Button>
          {consoleBtn}
        </>
      }
    />
  );
}

type StateCardProps = { tone: Tone; eyebrow: string; title: string; body: string; detail?: string | null; actions?: ReactNode };

/** `compact`: inside a phone frame, with the phone glyph instead of the browser window illustration. */
function StateCardView({ tone, eyebrow, title, body, detail, actions, compact }: StateCardProps & { compact?: boolean }) {
  return (
    <div className="fade-in flex w-[420px] max-w-full flex-col items-center text-center">
      {compact ? <PhoneIllustration tone={tone} /> : <Illustration tone={tone} />}
      <p className={cn("ws-label flex items-center gap-2", compact ? "mt-5" : "mt-6")}>
        <span className={cn("ws-dot", tone === "error" ? "bg-danger" : tone === "starting" ? "pulse bg-warning" : "bg-dim")} aria-hidden="true" />
        {eyebrow}
      </p>
      <h2 className="mt-2 text-[17px] font-semibold tracking-[-0.02em]">{title}</h2>
      <p className="mt-1.5 max-w-[360px] text-[13px] leading-relaxed text-muted">{body}</p>
      {detail ? (
        <p className="selectable mt-4 w-full max-w-[380px] truncate rounded-md border border-border bg-card px-3 py-2 text-left font-mono text-[11.5px] text-muted" title={detail}>
          {detail}
        </p>
      ) : null}
      {actions ? <div className="mt-5 flex flex-wrap justify-center gap-2">{actions}</div> : null}
    </div>
  );
}

/** A browser window drawn in hairlines, with a badge for the state. Theme greys only, no hue. */
function Illustration({ tone }: { tone: Tone }) {
  return (
    <svg width="232" height="148" viewBox="0 0 232 148" fill="none" aria-hidden="true" className="ws-illo">
      {/* back window */}
      <rect x="32.5" y="8.5" width="180" height="112" rx="9" className="fill-panel stroke-soft" />
      {/* front window */}
      <rect x="16.5" y="22.5" width="184" height="118" rx="9" className="fill-card stroke-line" />
      <path d="M17 44.5h183" className="stroke-line" />
      <circle cx="30" cy="33.5" r="2.5" className="fill-surface stroke-line" />
      <circle cx="39" cy="33.5" r="2.5" className="fill-surface stroke-line" />
      <circle cx="48" cy="33.5" r="2.5" className="fill-surface stroke-line" />
      <rect x="62.5" y="28.5" width="110" height="10" rx="5" className="fill-panel stroke-soft" />
      {/* page skeleton */}
      <rect x="30" y="56" width="68" height="7" rx="3.5" className="fill-surface" />
      <rect x="30" y="69" width="104" height="5" rx="2.5" className="fill-surface" />
      <rect x="30" y="79" width="88" height="5" rx="2.5" className="fill-surface" />
      <rect x="30.5" y="94.5" width="46" height="32" rx="4" className="fill-panel stroke-soft" />
      <rect x="84.5" y="94.5" width="46" height="32" rx="4" className="fill-panel stroke-soft" />
      <rect x="138.5" y="94.5" width="48" height="32" rx="4" className="fill-panel stroke-soft" />
      <StateBadge tone={tone} x={164} y={62} />
    </svg>
  );
}

/** A phone drawn in hairlines (for honest states inside the phone frame), with the same state badge. */
function PhoneIllustration({ tone }: { tone: Tone }) {
  return (
    <svg width="168" height="132" viewBox="0 0 168 132" fill="none" aria-hidden="true" className="ws-illo">
      {/* back phone */}
      <rect x="70.5" y="4.5" width="62" height="112" rx="13" className="fill-panel stroke-soft" />
      {/* front phone */}
      <rect x="44.5" y="14.5" width="64" height="116" rx="13" className="fill-card stroke-line" />
      <rect x="66.5" y="20.5" width="20" height="5" rx="2.5" className="fill-surface stroke-line" />
      {/* app skeleton */}
      <rect x="53" y="36" width="34" height="6" rx="3" className="fill-surface" />
      <rect x="53" y="47" width="46" height="4" rx="2" className="fill-surface" />
      <rect x="53.5" y="58.5" width="45" height="22" rx="4" className="fill-panel stroke-soft" />
      <rect x="53.5" y="86.5" width="45" height="22" rx="4" className="fill-panel stroke-soft" />
      <path d="M66 123.5h21" className="stroke-line" strokeLinecap="round" />
      <StateBadge tone={tone} x={100} y={64} />
    </svg>
  );
}

/** The round state badge both illustrations carry (play, spinner, warning, offline). */
function StateBadge({ tone, x, y }: { tone: Tone; x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle cx="16" cy="16" r="19.5" className="fill-card stroke-line" />
      {tone === "idle" ? <path d="M12.5 9.5v13l11-6.5-11-6.5Z" className="fill-fg" /> : null}
      {tone === "starting" ? (
        <g className="spin" style={{ transformOrigin: "16px 16px" }}>
          <path d="M16 6.5a9.5 9.5 0 1 1-9.5 9.5" className="stroke-fg" strokeWidth="2" strokeLinecap="round" />
        </g>
      ) : null}
      {tone === "error" ? (
        <>
          <path d="M16 7.5 25.5 24h-19L16 7.5Z" className="stroke-fg" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M16 13.5v5" className="stroke-fg" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="16" cy="21.25" r="1" className="fill-fg" />
        </>
      ) : null}
      {tone === "offline" ? (
        <>
          <path d="M10.5 21.5h11a4.5 4.5 0 0 0 .6-8.96A6.5 6.5 0 0 0 9.6 14.6 3.5 3.5 0 0 0 10.5 21.5Z" className="stroke-fg" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M8 8l16 16" className="stroke-fg" strokeWidth="1.6" strokeLinecap="round" />
        </>
      ) : null}
    </g>
  );
}
