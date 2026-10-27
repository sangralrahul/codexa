"use client";

import * as React from "react";
import { ArrowRight, ArrowUp, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollScene, useScene } from "@/components/motion/scroll-scene";
import { PauseButton, useAutoplay } from "@/components/motion/autoplay";
import { useTypewriter } from "@/components/motion/timeline";
import { Horizon } from "@/components/marketing/backdrop";
import { HOME_CHAPTERS, HOME_STAGE_COPY, timesWord } from "@/content/marketing/home";
import { useHomeStore } from "./home-store";
import { expandTokens } from "./types";
import { ProductStage, StageBadge } from "./product-stage/product-stage";
import { CHAPTERS, cue, frameAt } from "./product-stage/script";
import { useStoryClock } from "./product-stage/use-story-clock";

const STICKY_TOP = 76;
/** How much of the figure must be on screen before the replay leaves the finished poster. */
const ARM_RATIO = 0.4;

/**
 * True once the figure has been at least ARM_RATIO visible. Until then the replay keeps the poster
 * (the finished preview), so the peek under the hero shows the result, not an empty first frame.
 */
function useArmed(ref: React.RefObject<HTMLElement | null>) {
  const [armed, setArmed] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (armed || !el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= ARM_RATIO) setArmed(true);
      },
      { threshold: [0, ARM_RATIO] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, armed]);
  return armed;
}

function StoryboardBody() {
  const store = useHomeStore();
  const scene = useScene();
  const figureRef = React.useRef<HTMLElement>(null);
  const tabsRef = React.useRef<HTMLDivElement>(null);
  const horizonRef = React.useRef<HTMLDivElement>(null);
  const auto = useAutoplay(figureRef, { threshold: 0.1 });
  const armed = useArmed(figureRef);
  const id = React.useId();

  const scenario = store!.scenario;
  const tools = store!.tools;
  const maxRepair = store!.maxRepairAttempts;
  const replaySignal = store?.lastSwitch?.how === "chip" ? store.lastSwitch.at : 0;

  const clock = useStoryClock({ step: scene.step, pinned: scene.pinned, live: auto.playing && armed, calm: auto.calm, setStep: scene.setStep, replaySignal });
  const frame = React.useMemo(() => frameAt(clock.index, scenario, tools, maxRepair), [clock.index, scenario, tools, maxRepair]);
  const tokens = React.useMemo(() => expandTokens(scenario.code), [scenario]);
  const still = clock.poster || !clock.playing;
  const typedDone = clock.index >= cue("dTyped");
  const typed = useTypewriter(scenario.prompt, { playing: clock.playing && !typedDone, cps: 70, complete: typedDone || clock.poster, restartKey: `${clock.runKey}:${scenario.id}` });

  // The Horizon warms while the illustrative error is on screen (the Repair Beat).
  const warm = frame.errorLine !== null || frame.repairing;
  React.useEffect(() => {
    store?.horizon.warm(warm);
  }, [store, warm]);

  React.useEffect(() => {
    store?.horizon.register(horizonRef.current);
    return () => store?.horizon.register(null);
  }, [store]);

  const shown = clock.shownStep;
  const repairWord = timesWord(maxRepair);
  const atEnd = !clock.poster && shown === CHAPTERS - 1 && clock.segmentDone;

  // While the pinned scene is still scrolling to a chapter, further arrow presses continue from that target.
  const keyTarget = React.useRef<{ step: number; at: number } | null>(null);
  const onTabKey = (e: React.KeyboardEvent) => {
    const keys: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1 };
    const pending = keyTarget.current;
    const base = pending && pending.step !== shown && e.timeStamp - pending.at < 1200 ? pending.step : shown;
    let next = -1;
    if (e.key in keys) next = (base + keys[e.key] + CHAPTERS) % CHAPTERS;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = CHAPTERS - 1;
    if (next < 0) return;
    e.preventDefault();
    keyTarget.current = { step: next, at: e.timeStamp };
    scene.setStep(next);
    tabsRef.current?.querySelector<HTMLElement>(`[data-step="${next}"]`)?.focus({ preventScroll: true });
  };

  return (
    <div className="relative mx-auto w-full max-w-[1360px] px-4 sm:px-6 md:w-[min(1360px,calc(100vw-48px))] md:px-0">
      {/* Horizon: the page's one live canvas, rising behind the stage's top edge. */}
      <div
        ref={horizonRef}
        aria-hidden="true"
        className="home-horizon pointer-events-none absolute left-1/2 top-[-400px] -z-10 h-[560px] w-[min(1600px,170vw)] -translate-x-1/2 [mask-image:linear-gradient(to_bottom,black_55%,transparent_96%)]"
      >
        <Horizon reactive className="bottom-0" />
      </div>

      <figure ref={figureRef} aria-labelledby={`${id}-cap`} className="relative">
        <div className="scroll-tilt md:[.js_&]:-mt-10 calm:mt-0!">
          <ProductStage
            frame={frame}
            scenario={scenario}
            tokens={tokens}
            typed={typed}
            swapKey={scenario.id}
            phaseKey={clock.poster ? "poster" : "replay"}
            still={still}
            paused={auto.paused}
            className="md:h-[clamp(500px,calc(100svh-260px),740px)]"
          />
        </div>

        {/* Chapter rail: a real tablist (arrow keys, Home/End); in the pinned scene a tab scrolls to its chapter. */}
        <div ref={tabsRef} role="tablist" aria-label="Chapters" onKeyDown={onTabKey} className="mt-5 grid grid-cols-6 gap-1.5 sm:gap-2">
          {HOME_CHAPTERS.map((c, i) => {
            const selected = i === shown;
            const fill = i < shown || (selected && (still || clock.segmentDone)) ? "full" : selected ? "run" : "empty";
            return (
              <button
                key={c.id}
                type="button"
                role="tab"
                id={`${id}-tab-${i}`}
                data-step={i}
                aria-selected={selected}
                aria-controls={`${id}-panel`}
                tabIndex={selected ? 0 : -1}
                onClick={() => scene.setStep(i)}
                data-no-ripple
                className="group/tab flex min-w-0 flex-col gap-2 rounded-md pb-1 pt-1.5 text-left outline-offset-4"
              >
                {/* Chapters are numbered as steps (1–6), so they never read as the page's "01 —" section kickers. */}
                <span className={`text-label ${cn("flex items-baseline gap-1.5 truncate transition-colors duration-(--dur-3)", selected ? "text-foreground" : "text-muted-foreground group-hover/tab:text-foreground")}`}>
                  <span className={cn(selected && "text-signal-ink")}>
                    <span className="sr-only">Step </span>
                    {i + 1}
                  </span>
                  <span className="hidden truncate sm:inline">{c.label}</span>
                </span>
                <span className="relative block h-[2px] overflow-hidden rounded-full bg-border">
                  <span
                    key={fill === "run" ? `run-${clock.runKey}` : fill}
                    data-fill={fill}
                    className={cn("story-rail-fill absolute inset-0 origin-left rounded-full bg-signal", fill === "empty" && "scale-x-0")}
                    style={fill === "run" ? ({ animationDuration: `${c.durationMs}ms`, animationPlayState: clock.playing ? "running" : "paused" } as React.CSSProperties) : undefined}
                  />
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 grid gap-x-10 gap-y-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
          <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${shown}`} className="min-w-0">
            <ol className="grid">
              {HOME_CHAPTERS.map((c, i) => (
                <li key={c.id} className={i === shown ? "col-start-1 row-start-1 min-w-0" : "sr-only"}>
                  <div key={i === shown ? `on-${shown}` : "off"} className={cn(i === shown && !clock.poster && "stage-swap")}>
                    <h3 className="text-label text-signal-ink">
                      Step {i + 1} of {CHAPTERS} · {c.label}
                    </h3>
                    <p className="text-display-4 mt-2 max-w-[44ch] text-foreground">{c.caption({ repairWord })}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="flex min-w-0 flex-col gap-3 lg:items-end lg:text-right">
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <PauseButton paused={auto.paused} onToggle={() => auto.setPaused((p) => !p)} label="Pause the build replay" showLabel />
              <span className="lg:hidden">
                <StageBadge name={scenario.name} />
              </span>
              {atEnd ? (
                <>
                  <button
                    type="button"
                    onClick={clock.replay}
                    className="glass inline-flex h-8 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-medium text-muted-foreground shadow-sm transition-colors hover:border-border-strong hover:text-foreground [animation:pop-in_var(--dur-4)_var(--ease-out)_both]"
                  >
                    <RotateCcw className="size-3.5" aria-hidden="true" /> Replay
                  </button>
                  <button
                    type="button"
                    onClick={() => store?.prompt.focus()}
                    className="inline-flex h-8 items-center gap-1.5 rounded-full bg-foreground px-3.5 text-xs font-medium text-background shadow-sm transition-[opacity,translate] hover:-translate-y-px [animation:pop-in_var(--dur-4)_var(--ease-out)_both]"
                  >
                    Build your own <ArrowUp className="size-3.5" aria-hidden="true" />
                  </button>
                </>
              ) : null}
            </div>
            <figcaption id={`${id}-cap`} className="max-w-[24rem] text-pretty text-xs leading-relaxed text-muted-foreground">
              {HOME_STAGE_COPY.caption(scenario.name)}
            </figcaption>
          </div>
        </div>
      </figure>
    </div>
  );
}

/**
 * H0/H1: the stage under the hero, and the "Watch it build" storyboard around it (PLAN §5.2).
 * At ≥1024px (and not calm) the scene pins for six chapters × 55svh; below that, or calm,
 * it is a tablist of chapters (calm: finished frames). A skip link jumps past it.
 */
export function Storyboard() {
  return (
    <section id="watch-it-build" aria-labelledby="watch-it-build-title" className="relative isolate scroll-mt-[76px]">
      <h2 id="watch-it-build-title" className="sr-only">
        Watch Codexa build an app, chapter by chapter
      </h2>
      <a
        href="#after-storyboard"
        className="sr-only focus:not-sr-only focus:absolute focus:left-1/2 focus:top-2 focus:z-50 focus:-translate-x-1/2 focus:rounded-full focus:bg-foreground focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-background"
      >
        Skip the walkthrough <ArrowRight className="inline size-3.5" aria-hidden="true" />
      </a>
      <ScrollScene steps={CHAPTERS} length="330svh" pinFrom="lg" stickyTop={STICKY_TOP}>
        <StoryboardBody />
      </ScrollScene>
      <span id="after-storyboard" tabIndex={-1} className="block scroll-mt-24 outline-none" />
    </section>
  );
}
