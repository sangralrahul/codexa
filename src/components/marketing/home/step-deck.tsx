"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  HOME_CHAPTERS,
  HOME_STAGE_COPY,
  timesWord,
} from "@/content/marketing/home";
import { useHomeStore } from "./home-store";
import { expandTokens } from "./types";
import { ProductStage } from "./product-stage/product-stage";
import { CHAPTER_END, CHAPTERS, frameAt } from "./product-stage/script";

/** Site header (floating pill) height: the step bar sticks right under it. */
const HEADER = 76;
/** Step bar height plus the gap above the first card. */
const BAR = 64;
/** Each card pins this much lower than the one before, so covered cards peek out like a deck. */
const PEEK = 12;

const pinTop = (i: number) => HEADER + BAR + i * PEEK;

/**
 * "Watch it build" as a Razorpay-style deck: six step cards (Describe → Ship), each showing the
 * stage at the end of its step. A card sticks under the step bar while the next one slides up over
 * it; covered cards sink back slightly and stay visible as a stack of top edges. The step bar
 * follows the scroll, and a step scrolls to its card. Phones and calm mode get a plain list.
 */
export function StepDeck() {
  const store = useHomeStore();
  const rootRef = React.useRef<HTMLDivElement>(null);
  const [active, setActive] = React.useState(0);
  // Cards up to this index render their stage; later ones mount as they come within ~1.5 screens
  // (six full product windows at once made the page heavy). Once mounted, a stage stays mounted.
  const [reach, setReach] = React.useState(1);

  const scenario = store!.scenario;
  const tools = store!.tools;
  const maxRepair = store!.maxRepairAttempts;
  const repairWord = timesWord(maxRepair);
  const tokens = React.useMemo(() => expandTokens(scenario.code), [scenario]);
  const frames = React.useMemo(
    () =>
      HOME_CHAPTERS.map((_, i) =>
        frameAt(CHAPTER_END[i], scenario, tools, maxRepair),
      ),
    [scenario, tools, maxRepair],
  );

  React.useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const cards = Array.from(
      root.querySelectorAll<HTMLElement>("[data-deck-card]"),
    );
    const marks = Array.from(
      root.querySelectorAll<HTMLElement>("[data-deck-mark]"),
    );
    let frame = 0;
    const update = () => {
      frame = 0;
      const vh = window.innerHeight;
      // How far each card has risen into its pinned place (0 = below the fold, 1 = pinned).
      const rise = marks.map((m, i) =>
        Math.min(
          1,
          Math.max(0, 1 - (m.getBoundingClientRect().top - pinTop(i)) / vh),
        ),
      );
      let current = 0;
      let near = 0;
      marks.forEach((m, i) => {
        const top = m.getBoundingClientRect().top;
        if (top <= pinTop(i) + 2) current = i;
        if (top < vh * 2.5) near = i;
      });
      setReach((r) => Math.max(r, near));
      cards.forEach((card, i) => {
        let depth = 0;
        for (let k = i + 1; k < cards.length; k++) depth += rise[k];
        card.style.setProperty("--depth", depth.toFixed(3));
      });
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const goTo = (i: number) => {
    const mark =
      rootRef.current?.querySelectorAll<HTMLElement>("[data-deck-mark]")[i];
    if (!mark) return;
    const calm =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      document.documentElement.dataset.motion === "reduced";
    const sticky = window.matchMedia("(min-width: 48rem)").matches && !calm;
    const y =
      window.scrollY +
      mark.getBoundingClientRect().top -
      (sticky ? pinTop(i) : HEADER + BAR);
    window.scrollTo({ top: y, behavior: calm ? "auto" : "smooth" });
  };

  return (
    <section
      id="watch-it-build"
      aria-labelledby="watch-it-build-title"
      className="relative scroll-mt-[76px] py-16 sm:py-20"
    >
      <div
        ref={rootRef}
        className="mx-auto w-full max-w-[1360px] px-4 sm:px-6 md:w-[min(1360px,calc(100vw-48px))] md:px-0"
      >
        <div className="mb-8 flex flex-wrap items-end justify-between gap-x-10 gap-y-3">
          <div>
            <p className="text-label mb-4 text-signal-ink">How it works</p>
            <h2
              id="watch-it-build-title"
              className="text-display-2 max-w-[20ch]"
            >
              Six steps from a sentence{" "}
              <span className="text-dim">to a shipped app.</span>
            </h2>
          </div>
          <p className="max-w-[26rem] text-pretty text-xs leading-relaxed text-muted-foreground">
            {HOME_STAGE_COPY.caption(scenario.name)}
          </p>
        </div>

        {/* Step bar: sticks under the header and follows the deck. */}
        <nav aria-label="Build steps" className="deck-bar">
          <ol className="grid grid-cols-6 gap-1.5 sm:gap-3">
            {HOME_CHAPTERS.map((c, i) => (
              <li key={c.id} className="min-w-0">
                <button
                  type="button"
                  onClick={() => goTo(i)}
                  aria-current={i === active ? "step" : undefined}
                  data-no-ripple
                  className="group/step flex w-full min-w-0 flex-col gap-2 rounded-md pb-1 pt-2 text-left outline-offset-4"
                >
                  <span
                    className={cn(
                      "text-label flex items-baseline gap-1.5 truncate transition-colors duration-(--dur-3)",
                      i === active
                        ? "text-foreground"
                        : "text-muted-foreground group-hover/step:text-foreground",
                    )}
                  >
                    <span className={cn(i <= active && "text-signal-ink")}>
                      {i + 1}
                    </span>
                    <span className="hidden truncate sm:inline">{c.label}</span>
                  </span>
                  <span className="relative block h-[2px] overflow-hidden rounded-full bg-border">
                    <span
                      className={cn(
                        "absolute inset-0 origin-left rounded-full bg-signal transition-transform duration-(--dur-4) ease-out",
                        i <= active ? "scale-x-100" : "scale-x-0",
                      )}
                    />
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </nav>

        {/* Marks and cards are siblings: a sticky card must not be confined to a wrapper, and each mark
            keeps its card's unpinned position (for the scroll math and the step bar). */}
        <div className="deck mt-3">
          {HOME_CHAPTERS.map((c, i) => (
            <React.Fragment key={c.id}>
              <span data-deck-mark aria-hidden="true" className="block h-0" />
              <article
                data-deck-card
                aria-labelledby={`deck-step-${i}`}
                className="deck-card"
                style={{ "--pin": `${pinTop(i)}px` } as React.CSSProperties}
              >
                <header className="flex flex-wrap items-start justify-between gap-x-8 gap-y-2 px-5 pb-4 pt-5 sm:px-7 sm:pt-6">
                  <div className="min-w-0">
                    <p className="text-label text-signal-ink">
                      Step {i + 1} of {CHAPTERS} · {c.label}
                    </p>
                    <h3
                      id={`deck-step-${i}`}
                      className="text-display-4 mt-2 max-w-[48ch] text-foreground"
                    >
                      {c.caption({ repairWord })}
                    </h3>
                  </div>
                  <span
                    aria-hidden="true"
                    className="font-display text-[44px] font-bold leading-none tracking-[-0.04em] text-foreground/10 sm:text-[56px]"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </header>
                <div className="px-3 pb-3 sm:px-4 sm:pb-4">
                  {i > reach ? (
                    <div
                      aria-hidden="true"
                      className="deck-stage min-h-[420px] rounded-[16px] border border-border bg-surface md:min-h-0"
                    />
                  ) : (
                    <ProductStage
                      frame={frames[i]}
                      scenario={scenario}
                      tokens={tokens}
                      typed={scenario.prompt}
                      swapKey={`${scenario.id}-${i}`}
                      phaseKey="poster"
                      still
                      paused={false}
                      className="deck-stage"
                    />
                  )}
                </div>
              </article>
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}
