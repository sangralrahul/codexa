"use client";

import * as React from "react";
import { ArrowUp, Check, ChevronDown, Code2, Columns2, Eye, FileCode2, FolderOpen, Globe, Hammer, History, Loader2, Play, Rocket, Terminal } from "lucide-react";
import { LogoMark } from "@/components/logo";
import { PauseButton, useAutoplay } from "@/components/motion/autoplay";
import { templateShotSrc, templateShotSrcSet, SHOT_HEIGHT, SHOT_WIDTH } from "@/components/templates/shots";
import { TOKEN_KINDS, type CompactToken } from "./types";
import { cn } from "@/lib/utils";

/**
 * The product tour under the hero: an HTML/CSS illustration of one build in the Codexa workspace,
 * looping. The prompt types into the composer, the agent's plan ticks in, files appear in the
 * explorer while the editor streams the real first lines of src/Cart.tsx, a typecheck runs, the
 * Split view opens on the starter's real screenshot, and Publish runs the pre-publish checks.
 *
 * Every label is the app's own UI language; every path, the prompt and the code come from the
 * Ecommerce storefront template on the server. It is captioned as an illustration, not a recording.
 *
 * One clock (`t`, ms into the loop) drives everything; it only advances while the tour is on screen,
 * the tab is visible, the visitor has not paused it and calm is off. Server render, calm and the
 * first client render all show the final frame, so nothing mismatches on hydration and reduced
 * motion gets a complete still.
 */

export type TourScript = {
  templateId: string;
  templateName: string;
  prompt: string;
  files: { path: string; lines: number }[];
  codeFile: string;
  code: CompactToken[][];
  host: string;
  checks: number;
};

/* ---- The timeline (ms into the loop) ---- */
const TYPE_AT = 700;
const TYPE_MS = 34;
const PLAN_STEP_MS = 260;
const FILE_MS = 720;
const LINE_MS = 300;
const LOOP = 18_000;
const FINAL = 16_400;

function timeline(promptLength: number, files: number, lines: number) {
  const send = TYPE_AT + promptLength * TYPE_MS + 450;
  const plan = send + 500;
  const write = plan + 5 * PLAN_STEP_MS + 400;
  const code = write + 300;
  const codeEnd = code + lines * LINE_MS;
  const writeEnd = Math.max(write + files * FILE_MS, codeEnd);
  const check = writeEnd + 300;
  const checkDone = check + 900;
  const split = checkDone + 300;
  const shot = split + 500;
  const publish = shot + 1100;
  const scanEnd = publish + 1300;
  const toast = scanEnd + 150;
  return { send, plan, write, code, codeEnd, writeEnd, check, checkDone, split, shot, publish, scanEnd, toast };
}

function useTourClock(ref: React.RefObject<HTMLElement | null>) {
  const { playing, paused, setPaused, calm } = useAutoplay(ref, { threshold: 0.2 });
  const [t, setT] = React.useState(FINAL);
  const at = React.useRef<number | null>(null);
  React.useEffect(() => {
    if (!playing) return;
    // First play starts from the top; after a pause or scroll-away it resumes where it stopped.
    let base = performance.now() - (at.current ?? 0);
    const id = window.setInterval(() => {
      const now = performance.now();
      let next = now - base;
      if (next >= LOOP) {
        base = now;
        next = 0;
      }
      at.current = next;
      setT(next);
    }, 40);
    return () => window.clearInterval(id);
  }, [playing]);
  return { t: calm ? FINAL : t, paused, setPaused, calm };
}

const PLAN = (s: TourScript) => [
  `Start from the ${s.templateName} template`,
  "Products and categories in src/products.ts",
  "Keep the cart in localStorage",
  "Catalog, search and cart screens",
  "Run a typecheck",
];

function CodeLine({ line, chars }: { line: CompactToken[]; chars: number }) {
  let left = chars;
  const out: React.ReactNode[] = [];
  for (let i = 0; i < line.length && left > 0; i++) {
    const [k, v] = line[i];
    const part = v.slice(0, left);
    left -= part.length;
    out.push(
      <span key={i} className={`hm-syn-${TOKEN_KINDS[k] ?? "plain"}`}>
        {part}
      </span>,
    );
  }
  return <>{out}</>;
}

export function ProductTour({ script }: { script: TourScript }) {
  const ref = React.useRef<HTMLElement>(null);
  const { t, paused, setPaused, calm } = useTourClock(ref);
  const T = React.useMemo(() => timeline(script.prompt.length, script.files.length, script.code.length), [script]);
  const plan = PLAN(script);

  const typed = t < T.send ? Math.max(0, Math.min(script.prompt.length, Math.floor((t - TYPE_AT) / TYPE_MS))) : 0;
  const sent = t >= T.send;
  const planShown = sent ? Math.max(0, Math.min(plan.length, Math.floor((t - T.plan) / PLAN_STEP_MS) + 1)) : 0;
  const filesShown = t >= T.write ? Math.min(script.files.length, Math.floor((t - T.write) / FILE_MS) + 1) : 0;
  const writing = t >= T.write && t < T.writeEnd;
  const lineLen = (l: CompactToken[]) => l.reduce((n, [, v]) => n + v.length, 0);
  const codeProgress = t >= T.code ? (t - T.code) / LINE_MS : 0;
  const linesDone = Math.min(script.code.length, Math.floor(codeProgress));
  const partial = codeProgress - linesDone;
  const checking = t >= T.check && t < T.checkDone;
  const checked = t >= T.checkDone;
  // Plan steps tick off as the work behind them lands: template, products, cart, screens, typecheck.
  const planDone = checked ? plan.length : t >= T.writeEnd ? 4 : Math.min(3, filesShown);
  const view: "code" | "split" = t >= T.split ? "split" : "code";
  const shotIn = t >= T.shot;
  const publishing = t >= T.publish && t < T.toast;
  const scanned = t >= T.publish ? Math.min(script.checks, Math.floor(((t - T.publish) / (T.scanEnd - T.publish)) * script.checks)) : 0;
  const published = t >= T.toast;
  const fading = t > LOOP - 500;
  const status = !sent ? null : checked ? "ready" : "building";
  const elapsed = sent ? Math.max(1, Math.floor((Math.min(t, T.checkDone) - T.send) / 1000) + 1) : 0;
  const explorer = script.files.slice(0, filesShown);
  const cursorLine = writing ? Math.min(script.code.length - 1, linesDone) : -1;

  return (
    <figure ref={ref} className="hm-tour" data-fading={fading || undefined} data-calm={calm || undefined}>
      <div className="hm-tour__win" aria-hidden="true">
        {/* Title bar: the workspace header as the app draws it. */}
        <div className="hm-tour__bar">
          <span className="hm-tour__brand">
            <LogoMark size={18} />
            <span className="hm-tour__proj">
              Candle store <ChevronDown className="size-3 opacity-60" />
            </span>
            <span className="hm-tour__saved">
              <i /> Saved
            </span>
          </span>
          <span className="hm-tour__seg">
            <span>
              <Eye className="size-3.5" /> Preview
            </span>
            <span data-on={view === "split" || undefined}>
              <Columns2 className="size-3.5" /> Split
            </span>
            <span data-on={view === "code" || undefined}>
              <Code2 className="size-3.5" /> Code
            </span>
          </span>
          <span className="hm-tour__actions">
            {status === "building" ? (
              <span className="hm-tour__chip">
                <Loader2 className="size-3.5 hm-spin" /> Building 0:{String(elapsed).padStart(2, "0")}
              </span>
            ) : status === "ready" ? (
              <span className="hm-tour__chip hm-tour__chip--ok">
                <Play className="size-3" fill="currentColor" strokeWidth={0} /> Running
              </span>
            ) : null}
            <span className="hm-tour__ghost">
              <History className="size-3.5" /> History
            </span>
            <span className="hm-tour__publish" data-press={publishing || undefined}>
              <Rocket className="size-3.5" /> Publish
            </span>
          </span>
        </div>

        <div className="hm-tour__body">
          {/* Chat: the visitor's prompt, the plan, the files being written, the typecheck. */}
          <div className="hm-tour__chat">
            <div className="hm-tour__chathead">
              <span>New chat</span>
              <ChevronDown className="size-3 opacity-60" />
            </div>
            <div className="hm-tour__feed">
              {sent ? (
                <div className="hm-tour__msg hm-in">
                  <p>{script.prompt}</p>
                </div>
              ) : (
                <div className="hm-tour__empty">
                  <Hammer className="size-4" />
                  <span>Describe what to build. The agent plans it, writes the files and runs them.</span>
                </div>
              )}
              {planShown > 0 ? (
                <div className="hm-tour__card hm-in">
                  <p className="hm-tour__cardh">
                    Plan <span>{plan.length} steps</span>
                  </p>
                  <ol className="hm-tour__plan">
                    {plan.slice(0, planShown).map((p, i) => (
                      <li key={p} className="hm-in" data-done={i < planDone || undefined}>
                        <span className="hm-tour__n">{i < planDone ? <Check className="size-2.5" strokeWidth={3} /> : i + 1}</span>
                        {p}
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}
              {filesShown > 0 ? (
                <div className="hm-tour__card hm-in">
                  <p className="hm-tour__cardh">
                    Writing files <span>{filesShown}</span>
                  </p>
                  <ul className="hm-tour__files">
                    {explorer.map((f, i) => {
                      const busy = writing && i === filesShown - 1;
                      return (
                        <li key={f.path} className="hm-in">
                          <b>A</b>
                          <code>{f.path}</code>
                          {busy ? <Loader2 className="size-3 hm-spin" /> : <em>+{f.lines}</em>}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
              {t >= T.check ? (
                <div className="hm-tour__tool hm-in" data-ok={checked || undefined}>
                  {checked ? <Check className="size-3.5" strokeWidth={2.5} /> : <Loader2 className="size-3.5 hm-spin" />}
                  <code>run_command</code>
                  <span>npm run typecheck</span>
                  <em>{checked ? "passed" : "running"}</em>
                </div>
              ) : null}
            </div>
            <div className="hm-tour__composer" data-typing={(typed > 0 && !sent) || undefined}>
              <p className={cn(typed === 0 && "hm-tour__ph")}>
                {typed > 0 ? script.prompt.slice(0, typed) : "Describe what to build or change, or paste a screenshot…"}
                {typed > 0 && !sent ? <span className="hm-caret" /> : null}
              </p>
              <div className="hm-tour__composerbar">
                <span className="hm-tour__mode">
                  <Hammer className="size-3" /> Build <ChevronDown className="size-3 opacity-60" />
                </span>
                <span className="hm-tour__send" data-ready={(typed > 8 && !sent) || undefined}>
                  <ArrowUp className="size-3.5" strokeWidth={2.5} />
                </span>
              </div>
            </div>
          </div>

          {/* Main: explorer and editor; the preview slides in for Split. */}
          <div className="hm-tour__main" data-view={view}>
            <div className="hm-tour__explorer">
              <p className="hm-tour__label">Explorer</p>
              <p className="hm-tour__dir">
                <FolderOpen className="size-3.5" /> src
              </p>
              <ul>
                {explorer.map((f) => (
                  <li key={f.path} className="hm-in" data-active={f.path === script.codeFile || undefined}>
                    <FileCode2 className="size-3.5" />
                    <span>{f.path.replace(/^src\//, "")}</span>
                    <b>A</b>
                  </li>
                ))}
              </ul>
            </div>
            <div className="hm-tour__editor">
              <div className="hm-tour__tabs">
                {t >= T.code ? (
                  <span data-on>
                    <FileCode2 className="size-3.5" /> {script.codeFile.replace(/^src\//, "")}
                    {writing ? <i /> : null}
                  </span>
                ) : (
                  <span className="opacity-60">No file open</span>
                )}
              </div>
              <ol className="hm-tour__code">
                {script.code.map((line, i) => {
                  const show = i < linesDone ? Infinity : i === linesDone ? Math.floor(partial * Math.max(1, lineLen(line))) : 0;
                  if (t < T.code || i > linesDone) return null;
                  return (
                    <li key={i} data-cursor={i === cursorLine || undefined}>
                      <span className="hm-tour__ln">{i + 1}</span>
                      <span className="hm-tour__src">
                        <CodeLine line={line} chars={show} />
                        {i === cursorLine ? <span className="hm-caret" /> : null}
                      </span>
                    </li>
                  );
                })}
              </ol>
              <div className="hm-tour__term">
                <span className="hm-tour__termtab">
                  <Terminal className="size-3.5" /> Terminal
                </span>
                <span className="hm-tour__termline">
                  {checked ? (
                    <>
                      <Check className="size-3 text-success" strokeWidth={3} /> typecheck passed · dev server running
                    </>
                  ) : checking ? (
                    <>$ npm run typecheck</>
                  ) : sent ? (
                    <>Waiting for the agent…</>
                  ) : (
                    <>Preview not running</>
                  )}
                </span>
              </div>
            </div>
            <div className="hm-tour__preview" data-on={view === "split" || undefined}>
              <div className="hm-tour__url">
                <Globe className="size-3" />
                <span>preview · candle-store</span>
              </div>
              <div className="hm-tour__shot" data-in={shotIn || undefined}>
                <span className="hm-tour__skel" />
                {/* eslint-disable-next-line @next/next/no-img-element -- real template screenshot with srcset */}
                <img src={templateShotSrc(script.templateId)} srcSet={templateShotSrcSet(script.templateId)} sizes="(min-width: 1200px) 560px, 90vw" alt="" width={SHOT_WIDTH} height={SHOT_HEIGHT} loading="lazy" decoding="async" />
              </div>
            </div>
          </div>
        </div>

        <div className="hm-tour__statusbar">
          <span>
            <i data-on={status === "ready" || undefined} /> {status === "ready" ? "Preview running" : "Preview not running"}
          </span>
          <span>{filesShown > 0 ? `${filesShown} files changed` : "Working copy"}</span>
          <span className="hm-tour__sbend">TypeScript</span>
        </div>

        {/* Publish: the checks counter, then the result. */}
        {publishing ? (
          <div className="hm-tour__toast hm-in">
            <Loader2 className="size-4 hm-spin" />
            <span>
              Running pre-publish checks <b>{scanned}</b>/{script.checks}
            </span>
          </div>
        ) : published ? (
          <div className="hm-tour__toast hm-tour__toast--ok hm-in">
            <span className="hm-tour__okdot">
              <Check className="size-3" strokeWidth={3} />
            </span>
            <span>
              <b>{script.checks} checks passed</b> · Published to <u>{script.host}</u>
            </span>
          </div>
        ) : null}
      </div>
      <figcaption className="hm-tour__cap">
        <span className="hm-tour__captag">Product tour</span>
        <span>An illustration of one build in the workspace. The prompt, file paths and code come from the {script.templateName} template; the preview is its real screenshot.</span>
        <PauseButton paused={paused || calm} onToggle={() => setPaused((p) => !p)} label="Pause the product tour" className="ml-auto shrink-0" />
      </figcaption>
    </figure>
  );
}
