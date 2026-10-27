"use client";

import * as React from "react";
import { STARTER_SYNONYMS } from "@/content/marketing/home";
import { buildIndex, matchStarter, type MatchResult } from "./match";
import type { Scenario, StageTools, StarterLite } from "./types";

/**
 * The home page's small shared state (PLAN §7.4 task 4). The hero prompt and the stage talk
 * through it: a chip click or a live match switches the stage scenario, focus and typing
 * brighten the Horizon light, and the stage's "Build your own" button focuses the prompt.
 * Outside <HomeStoreProvider> (CTA band, solution pages, 404) useHomeStore() returns null and
 * the prompt box works on its own.
 */

type SwitchHow = "chip" | "match" | "pick";
export type ScenarioSwitch = { id: string; how: SwitchHow; at: number };

type HomeStore = {
  starters: StarterLite[];
  scenarios: Scenario[];
  tools: StageTools;
  aiReady: boolean;
  maxRepairAttempts: number;
  scenario: Scenario;
  /** Last switch (the stage replays the current chapter after a chip click). */
  lastSwitch: ScenarioSwitch | null;
  requestScenario: (id: string, how: SwitchHow) => void;
  /** Closest starter for a sentence (or null below the threshold). Pure; cheap enough per keystroke. */
  match: (text: string) => MatchResult | null;
  horizon: {
    register: (el: HTMLElement | null) => void;
    focus: (on: boolean) => void;
    typed: (chars: number) => void;
    warm: (on: boolean) => void;
  };
  prompt: {
    register: (el: HTMLTextAreaElement | null) => void;
    focus: () => void;
  };
};

const Ctx = React.createContext<HomeStore | null>(null);

export function useHomeStore() {
  return React.useContext(Ctx);
}

/** Boost levels for the reactive Horizon (Silk reads --horizon-boost, 0–0.4, and eases toward it). */
const FOCUS_BOOST = 0.15;
const PER_CHAR = 0.002;
const TYPING_CAP = 0.1;
const WARM_BOOST = 0.1;

export function HomeStoreProvider({
  starters,
  scenarios,
  tools,
  aiReady,
  maxRepairAttempts,
  children,
}: {
  starters: StarterLite[];
  scenarios: Scenario[];
  tools: StageTools;
  aiReady: boolean;
  maxRepairAttempts: number;
  children: React.ReactNode;
}) {
  const [scenarioId, setScenarioId] = React.useState(scenarios[0]?.id ?? "");
  const [lastSwitch, setLastSwitch] = React.useState<ScenarioSwitch | null>(null);
  const index = React.useMemo(() => buildIndex(starters), [starters]);
  const staged = React.useMemo(() => new Set(scenarios.map((s) => s.id)), [scenarios]);

  // Horizon boost: written straight onto a small wrapper (no React renders), Silk smooths it.
  const horizonEl = React.useRef<HTMLElement | null>(null);
  const boost = React.useRef({ focus: 0, typing: 0, warm: 0, timer: 0 as number | 0 });
  const writeBoost = React.useCallback(() => {
    const b = boost.current;
    const v = Math.min(0.4, b.focus + b.typing + b.warm);
    horizonEl.current?.style.setProperty("--horizon-boost", v.toFixed(3));
  }, []);
  const decay = React.useCallback(() => {
    const b = boost.current;
    if (b.timer) return;
    b.timer = window.setInterval(() => {
      b.typing = Math.max(0, b.typing * 0.82 - 0.002);
      writeBoost();
      if (b.typing <= 0) {
        clearInterval(b.timer);
        b.timer = 0;
      }
    }, 120);
  }, [writeBoost]);
  React.useEffect(() => {
    const b = boost.current;
    return () => clearInterval(b.timer);
  }, []);

  const promptEl = React.useRef<HTMLTextAreaElement | null>(null);

  const value = React.useMemo<HomeStore>(() => {
    const scenario = scenarios.find((s) => s.id === scenarioId) ?? scenarios[0];
    return {
      starters,
      scenarios,
      tools,
      aiReady,
      maxRepairAttempts,
      scenario,
      lastSwitch,
      requestScenario: (id, how) => {
        if (!staged.has(id) || (id === scenarioId && how === "match")) return;
        setScenarioId(id);
        setLastSwitch({ id, how, at: Date.now() });
      },
      match: (text) => matchStarter(text, index, STARTER_SYNONYMS, staged),
      horizon: {
        register: (el) => {
          horizonEl.current = el;
          writeBoost();
        },
        focus: (on) => {
          boost.current.focus = on ? FOCUS_BOOST : 0;
          writeBoost();
        },
        typed: (chars) => {
          if (chars <= 0) return;
          boost.current.typing = Math.min(TYPING_CAP, boost.current.typing + chars * PER_CHAR);
          writeBoost();
          decay();
        },
        warm: (on) => {
          boost.current.warm = on ? WARM_BOOST : 0;
          writeBoost();
        },
      },
      prompt: {
        register: (el) => {
          promptEl.current = el;
        },
        focus: () => {
          const el = promptEl.current;
          if (!el) return;
          el.scrollIntoView({ block: "center", behavior: document.documentElement.dataset.motion === "reduced" || window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
          el.focus({ preventScroll: true });
        },
      },
    };
  }, [starters, scenarios, tools, aiReady, maxRepairAttempts, scenarioId, lastSwitch, staged, index, writeBoost, decay]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
