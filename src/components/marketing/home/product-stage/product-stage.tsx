"use client";

import * as React from "react";
import { Check, Globe, Play, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { isCalm } from "@/lib/client/motion";
import { AppWindow } from "@/components/frames/app-window";
import { IllustrationBadge } from "@/components/frames/illustration-badge";
import type { Token } from "@/components/vignettes/tokenize";
import { HOME_STAGE_COPY } from "@/content/marketing/home";
import type { Scenario } from "../types";
import { AgentPane } from "./agent-pane";
import { CanvasPane } from "./canvas-pane";
import { DepthCards } from "./depth-cards";
import { PhoneStage } from "./phone-stage";
import { phoneTabFor, type StageFrame } from "./script";
import { StatusPill } from "./status-pill";

/** The honesty label for the stage (PLAN §4.4). Rendered on the window (md+) and next to Pause on phones. */
export function StageBadge({ name, className }: { name: string; className?: string }) {
  return <IllustrationBadge label={HOME_STAGE_COPY.badge} detail={HOME_STAGE_COPY.detail(name)} className={className} />;
}

function PublishButton({ state, ref }: { state: StageFrame["publish"]; ref?: React.Ref<HTMLSpanElement> }) {
  const live = state === "live";
  return (
    <span
      ref={ref}
      className={cn(
        "btn-ember relative inline-flex h-7 items-center gap-1.5 rounded-[8px] px-2.5 text-[12px] transition-[scale] duration-(--dur-2)",
        state === "publishing" && "scale-[0.96]",
      )}
    >
      {state === "publishing" ? (
        <svg viewBox="0 0 16 16" className="size-3.5 -rotate-90">
          <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
          <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" pathLength={1} strokeDasharray="1" className="[animation:publish-ring_700ms_var(--ease-in-out)_both]" />
        </svg>
      ) : live ? (
        <Check className="size-3.5" />
      ) : (
        <Globe className="size-3.5" />
      )}
      {live ? "Published" : "Publish"}
    </span>
  );
}

/**
 * The replayed Codexa workspace (PLAN §5.2 H0/H1): an AppWindow mirroring the new IDE — Agent
 * column (300px) and a canvas with Preview | Code — plus floating depth cards, the URL flight
 * on Ship, and the phone layout below md. Purely presentational: the storyboard owns the
 * clock and passes the frame. Everything inside the window is aria-hidden; the honest label
 * (IllustrationBadge) stays reachable.
 */
export function ProductStage({
  frame,
  scenario,
  tokens,
  typed,
  swapKey,
  still,
  paused,
  className,
}: {
  frame: StageFrame;
  scenario: Scenario;
  tokens: Token[][];
  typed: string;
  /** Changes when the scenario switches (crossfades the window body). */
  swapKey: string;
  /** Finished frame (poster, calm, paused): entrance animations jump to their end. */
  still: boolean;
  paused: boolean;
  className?: string;
}) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const publishRef = React.useRef<HTMLSpanElement>(null);
  const urlRef = React.useRef<HTMLSpanElement>(null);
  const pillRef = React.useRef<HTMLSpanElement>(null);
  const [phoneTab, setPhoneTab] = React.useState<{ tab: "chat" | "code" | "preview"; chapter: number } | null>(null);
  const tab = phoneTab && phoneTab.chapter === frame.chapter ? phoneTab.tab : null;

  // M17 Ship: the URL pill grows out of Publish and flies into the address bar.
  const flying = frame.publish === "flying" && !still;
  React.useEffect(() => {
    if (!flying) return;
    const root = rootRef.current;
    const from = publishRef.current;
    const to = urlRef.current;
    const pill = pillRef.current;
    if (!root || !from || !to || !pill || isCalm() || !pill.animate || from.offsetParent === null) return;
    const r = root.getBoundingClientRect();
    const a = from.getBoundingClientRect();
    const b = to.getBoundingClientRect();
    const ax = a.left - r.left + a.width / 2;
    const ay = a.top - r.top + a.height / 2;
    const bx = b.left - r.left + 90;
    const by = b.top - r.top + b.height / 2;
    const anim = pill.animate(
      [
        { transform: `translate(${ax}px, ${ay}px) translate(-50%, -50%) scale(0.4)`, opacity: 0 },
        { transform: `translate(${ax}px, ${ay + 18}px) translate(-50%, -50%) scale(1)`, opacity: 1, offset: 0.22 },
        { transform: `translate(${(ax + bx) / 2}px, ${Math.min(ay, by) - 34}px) translate(-50%, -50%) scale(1.04)`, opacity: 1, offset: 0.6 },
        { transform: `translate(${bx}px, ${by + 2}px) translate(-50%, -50%) scale(1)`, opacity: 1, offset: 0.9 },
        { transform: `translate(${bx}px, ${by}px) translate(-50%, -50%) scale(1)`, opacity: 0 },
      ],
      { duration: 560, easing: "cubic-bezier(.16,1,.3,1)", fill: "both" },
    );
    return () => anim.cancel();
  }, [flying]);

  // Pointer parallax for the depth cards (±6px, fine pointers only, off when calm).
  React.useEffect(() => {
    const root = rootRef.current;
    if (!root || !window.matchMedia("(pointer: fine)").matches) return;
    let frameId = 0;
    let last: PointerEvent | null = null;
    const apply = () => {
      frameId = 0;
      if (!last || isCalm()) return;
      const r = root.getBoundingClientRect();
      const px = Math.max(-1, Math.min(1, ((last.clientX - r.left) / r.width) * 2 - 1));
      const py = Math.max(-1, Math.min(1, ((last.clientY - r.top) / r.height) * 2 - 1));
      root.style.setProperty("--px", px.toFixed(3));
      root.style.setProperty("--py", py.toFixed(3));
    };
    const onMove = (e: PointerEvent) => {
      last = e;
      if (!frameId) frameId = requestAnimationFrame(apply);
    };
    const onLeave = () => {
      root.style.setProperty("--px", "0");
      root.style.setProperty("--py", "0");
    };
    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frameId);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  const badge = <StageBadge name={scenario.name} />;

  return (
    <div ref={rootRef} data-stage="" data-stage-still={still ? "" : undefined} data-paused={paused ? "" : undefined} className={cn("relative", className)}>
      {/* Desktop and tablet: the workspace window */}
      <div className="hidden h-full md:block">
        <AppWindow
          project={scenario.slug}
          className="h-full"
          badge={badge}
          status={
            <span aria-hidden="true" className="contents">
              <StatusPill status={frame.status} />
            </span>
          }
          toolbar={
            <span aria-hidden="true" className="flex items-center gap-1.5">
              <span className={cn("inline-flex h-7 items-center gap-1.5 rounded-[8px] border px-2.5 text-[12px] font-medium transition-colors duration-(--dur-3)", frame.running ? "border-success/30 text-success" : "border-border text-foreground/85")}>
                {frame.running ? <span className="live-dot" /> : <Play className="size-3" fill="currentColor" strokeWidth={0} />}
                {frame.running ? "Running" : "Run"}
              </span>
              <span className="hidden h-7 items-center gap-1.5 rounded-[8px] px-2 text-[12px] text-muted-foreground xl:inline-flex">
                <Share2 className="size-3.5" /> Share
              </span>
              <PublishButton state={frame.publish} ref={publishRef} />
              <span className="ml-1 hidden size-7 items-center justify-center rounded-full bg-gradient-to-br from-signal/80 to-signal-2/80 text-[11px] font-semibold text-[var(--ember-ink)] shadow-[0_0_0_2px_var(--card)] lg:inline-flex">Y</span>
            </span>
          }
          bodyClassName="p-1.5"
        >
          <div aria-hidden="true" key={swapKey} className="stage-swap grid h-full min-h-0 grid-cols-[256px_minmax(0,1fr)] gap-1.5 lg:grid-cols-[300px_minmax(0,1fr)]">
            <AgentPane frame={frame} scenario={scenario} typed={typed} illustrative={HOME_STAGE_COPY.illustrativeError} />
            <CanvasPane frame={frame} scenario={scenario} tokens={tokens} illustrative={HOME_STAGE_COPY.illustrativeError} urlRef={urlRef} />
          </div>
        </AppWindow>
        <DepthCards frame={frame} scenario={scenario} />
      </div>

      {/* Phones: one pane that follows the chapter */}
      <div className="relative md:hidden">
        <PhoneStage
          frame={frame}
          scenario={scenario}
          tokens={tokens}
          typed={typed}
          illustrative={HOME_STAGE_COPY.illustrativeError}
          tab={tab}
          onTab={(t) => setPhoneTab(t === phoneTabFor(frame.chapter) ? null : { tab: t, chapter: frame.chapter })}
        />
      </div>

      {/* The flying URL pill (M17) */}
      <span
        ref={pillRef}
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 z-[6] inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full border border-success/40 bg-card px-3 font-mono text-[11.5px] text-foreground opacity-0 shadow-xl"
      >
        <span className="live-dot" />
        {scenario.slug}.example.com
      </span>
    </div>
  );
}
