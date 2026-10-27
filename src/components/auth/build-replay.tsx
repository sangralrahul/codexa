"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoMark } from "@/components/logo";
import { BrowserFrame } from "@/components/frames/browser-frame";
import { IllustrationBadge } from "@/components/frames/illustration-badge";
import { PauseButton, useAutoplay } from "@/components/motion/autoplay";
import { useTimeline, useTypewriter } from "@/components/motion/timeline";
import { StepRow, type StepState } from "@/components/vignettes/step-row";

/** One example run, built on the server from a real starter (its id, name, file count and a real file). */
export type ReplayItem = {
  id: string;
  /** Short label for the progress dots ("SaaS"). */
  label: string;
  /** Real template name ("SaaS starter"). */
  name: string;
  slug: string;
  prompt: string;
  files: number;
  file: string;
};

// Per item (6s): the prompt types (cue 0), four agent rows tick (cues 1–4), the screenshot wipes in (cue 5), hold.
const CUES = [0, 2200, 2650, 3100, 3550, 4000];
const SHOT_CUE = CUES.length - 1;
const ITEM_MS = 6000;

/**
 * The script starts on item 0's finished frame (what the server renders and what calm shows),
 * holds it, then plays items 1…n-1 and finally item 0 again from its first cue, and loops.
 */
function buildScript(n: number) {
  const schedule: number[] = [0];
  const map: [item: number, cue: number][] = [[0, SHOT_CUE]];
  let base = ITEM_MS - CUES[SHOT_CUE];
  for (let k = 1; k <= n; k++) {
    const item = k % n;
    const cues = k === n ? CUES.slice(0, SHOT_CUE) : CUES;
    cues.forEach((c, i) => {
      schedule.push(base + c);
      map.push([item, i]);
    });
    base += ITEM_MS;
  }
  return { schedule, map, total: n * ITEM_MS };
}

const HEADLINES: { match: (p: string) => boolean; text: string; dim: string }[] = [
  { match: (p) => p.startsWith("/signup") || p.startsWith("/invite"), text: "From a sentence to a running app.", dim: "running app." },
  { match: () => true, text: "Your projects are where you left them.", dim: "where you left them." },
];

function Headline() {
  const pathname = usePathname() ?? "";
  const h = HEADLINES.find((x) => x.match(pathname)) ?? HEADLINES[0];
  const i = h.text.indexOf(h.dim);
  return (
    <p key={h.text} className="text-display-4 stage-swap max-w-[22ch] text-foreground xl:text-display-3">
      {h.text.slice(0, i)}
      <span className="text-dim">{h.dim}</span>
    </p>
  );
}

/**
 * "Build replay" (PLAN §5.5): a tilted browser frame cycling real starter screenshots.
 * For each item the prompt types into a mini prompt bar, four agent rows tick (real tool
 * names and real file paths), the screenshot wipes in under a signal scanline and the URL
 * pill updates. A scripted illustration (labelled), never a recording: the depiction is
 * aria-hidden and the controls (story dots, Pause, the honesty label) sit outside it.
 * Plays only while visible; calm shows item 0's finished frame.
 */
export function BuildReplay({ items, className, light }: { items: ReplayItem[]; className?: string; /** The page's one live light (Horizon), placed behind the frame so it rises from behind its top edge. */ light?: React.ReactNode }) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const auto = useAutoplay(rootRef, { threshold: 0.2 });
  const { playing, paused, setPaused, calm } = auto;
  const script = React.useMemo(() => buildScript(items.length), [items.length]);
  const { index, seek } = useTimeline(script.schedule, { playing, loop: true, totalMs: script.total });
  const [epoch, setEpoch] = React.useState(0);
  // Calm shows finished frames only; the story dots still switch between them.
  const [calmItem, setCalmItem] = React.useState(0);
  const [started, setStarted] = React.useState(false);
  if (playing && !started) setStarted(true);

  const [itemIdx, cue] = calm ? [Math.min(calmItem, items.length - 1), SHOT_CUE] : (script.map[Math.max(0, index)] ?? [0, SHOT_CUE]);
  const item = items[itemIdx];
  const prev = items[(itemIdx - 1 + items.length) % items.length];
  const building = cue < SHOT_CUE;
  const cps = Math.max(26, Math.ceil(item.prompt.length / 1.6));
  const typed = useTypewriter(item.prompt, { playing: playing && cue === 0, cps, startDelayMs: 160, complete: cue > 0, restartKey: `${itemIdx}-${epoch}` });
  const typing = cue === 0 && typed.length < item.prompt.length;

  const rows: { label: string; detail?: string }[] = [
    { label: "propose_plan", detail: `${item.files} files · ${item.name}` },
    { label: `write_file ${item.file}` },
    { label: "run_command typecheck", detail: "0 errors" },
    { label: "finish", detail: "Preview ready" },
  ];
  const rowState = (r: number): StepState => (cue - 1 > r ? "done" : cue - 1 === r ? "active" : "pending");
  const url = building ? "about:blank" : `${item.slug}.preview.example.com`;
  // Where the current item's progress segment starts (the first frame begins part-way through item 0).
  const intoItem = itemIdx === 0 && cue === SHOT_CUE && index === 0 && !calm ? CUES[SHOT_CUE] : 0;

  const jump = (k: number) => {
    if (calm) {
      setCalmItem(k);
      return;
    }
    const target = script.map.findIndex(([it, c]) => it === k && c === 0);
    if (target < 0) return;
    seek(target);
    setEpoch((e) => e + 1);
    setStarted(true);
  };

  return (
    <div ref={rootRef} className={cn("relative flex min-h-0 w-full flex-col", className)}>
      <Headline />

      {/* The depiction (decorative). */}
      <div aria-hidden="true" className="replay-stage relative flex min-h-0 w-full flex-1 select-none flex-col justify-center py-14">
        <div className="replay-plane relative mx-auto w-full max-w-[clamp(340px,calc((100dvh_-_500px)_*_1.6),640px)]">
          {light ? <div className="pointer-events-none absolute inset-0 -z-10">{light}</div> : null}
          <div className="replay-reflection" />
          <div className="rim rounded-[16px] shadow-stage">
          <BrowserFrame url={url} className="relative overflow-hidden rounded-[16px] bg-card shadow-none" bodyClassName="aspect-[16/10] overflow-hidden bg-surface">
            <div className="bg-blueprint absolute inset-0 opacity-70" />
            {started ? (
              // The app that just finished stays underneath, dimmed, until the next one has wiped in over it.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={`u-${prev.id}-${epoch}`}
                src={`/templates/${prev.id}.webp`}
                alt=""
                width={960}
                height={600}
                decoding="async"
                className="replay-under absolute inset-0 size-full object-cover object-top"
              />
            ) : null}
            {building ? (
              <div key={`b-${itemIdx}-${epoch}`} className="stage-swap absolute inset-0 grid place-items-center">
                <span className="glass inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 font-mono text-[11px] text-muted-foreground shadow-sm">
                  <span className="live-dot" />
                  {cue === 0 ? "Waiting for the prompt" : `Building ${item.name}`}
                </span>
              </div>
            ) : (
              <div key={`s-${itemIdx}-${epoch}`} className="wipe-in absolute inset-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/templates/${item.id}.webp`} alt="" width={960} height={600} decoding="async" className="size-full object-cover object-top" />
              </div>
            )}
          </BrowserFrame>
          </div>

          {/* Agent log: floats over the top-right corner. */}
          <div className="e3 absolute -right-4 -top-8 w-[min(18.5rem,58%)] rounded-2xl p-3 xl:-right-8">
            <div className="flex items-center gap-2 border-b border-border pb-2">
              <LogoMark size={18} state={building ? (cue > 0 ? "running" : "idle") : "success"} />
              <span className="text-label text-muted-foreground">Agent</span>
              <span className="ml-auto truncate font-mono text-[11px] text-muted-foreground">{item.slug}</span>
            </div>
            <ol className="mt-1.5 min-h-[7.25rem]">
              {rows.map((r, i) =>
                rowState(i) === "pending" ? null : (
                  <StepRow key={`${itemIdx}-${epoch}-${i}`} state={rowState(i)} label={r.label} detail={rowState(i) === "done" ? r.detail : undefined} mono connector={i < rows.length - 1 && rowState(i + 1) !== "pending"} className="py-0.5" />
                ),
              )}
              {cue === 0 ? <li className="py-1 font-mono text-[11.5px] text-muted-foreground">Idle · waiting for a prompt</li> : null}
            </ol>
          </div>

          {/* Mini prompt bar: floats over the bottom-left corner. */}
          <div className="e3 absolute -bottom-10 -left-4 w-[min(24rem,78%)] rounded-2xl p-2.5 xl:-left-8">
            <div className="flex items-end gap-2">
              <p className="min-h-[2.5rem] flex-1 px-1.5 py-1 text-[13px] leading-5 text-foreground">
                {typed || <span className="text-muted-foreground">Describe your app…</span>}
                {typing && playing ? <span className="caret" /> : null}
              </p>
              <span
                data-ready={!typing && typed.length > 0 ? "" : undefined}
                className={cn("replay-send flex size-8 shrink-0 items-center justify-center rounded-full", !typing && typed ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}
              >
                <ArrowUp className="size-4" />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Controls and the visible honesty caption (outside the decorative area). */}
      <div className="relative mt-auto flex flex-wrap items-center gap-x-4 gap-y-3 pt-6">
        <div role="group" aria-label="Example runs" className="flex min-w-0 flex-1 items-center gap-1.5">
          {items.map((it, k) => {
            const state = k < itemIdx ? "done" : k === itemIdx ? "current" : "next";
            return (
              <button
                key={it.id}
                type="button"
                onClick={() => jump(k)}
                aria-current={k === itemIdx ? "true" : undefined}
                aria-label={`Show the ${it.name} example`}
                data-state={state}
                data-paused={!playing ? "" : undefined}
                data-no-ripple
                className="replay-seg group flex min-w-0 flex-1 flex-col gap-1.5 rounded-md py-1 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <span className="relative h-[3px] w-full overflow-hidden rounded-full bg-foreground/15">
                  <span
                    key={k === itemIdx ? `${itemIdx}-${epoch}-${index === 0 ? "a" : "b"}` : "x"}
                    className="replay-seg__fill absolute inset-0 rounded-full bg-foreground/80"
                    style={{ "--replay-delay": `-${intoItem}ms`, "--replay-ms": `${ITEM_MS}ms` } as React.CSSProperties}
                  />
                </span>
                <span className={cn("truncate text-[11px] font-medium transition-colors", k === itemIdx ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")}>{it.label}</span>
              </button>
            );
          })}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <IllustrationBadge
            label="Illustration"
            detail={
              <>
                A scripted replay built from four real Codexa starters: their real file names, file counts and screenshots. No AI model runs here. In your
                own project the plan, the code and the timing will differ, and AI generation needs a key set up by the operator.
              </>
            }
          />
          <PauseButton paused={paused || calm} onToggle={() => setPaused((p) => !p)} label="Pause the example run" />
        </div>
        <p className="w-full text-[11px] leading-relaxed text-muted-foreground">Illustration of an example run · not a recording. Screenshots are the real starter templates.</p>
      </div>
    </div>
  );
}
