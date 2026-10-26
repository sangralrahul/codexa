import type { StarterLite } from "./types";

/**
 * Live match (PLAN §5.2): a small, client-side keyword score that points the visitor's sentence at
 * the closest starter template. No model is involved — the UI always labels the result
 * "Closest starter", never "AI picked". Pure and deterministic, so it is unit-testable.
 */

const STOP = new Set(
  "a an the and or for of to in on with my our your their i we me us it its is are be that this these those from by as at into some any can will want need like make build create app apps application site website web simple small new please let using use".split(
    " ",
  ),
);

/** Lowercase words, minus stop words, with a light plural trim ("candles" → "candle"). */
export function words(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]+/g) ?? [])
    .filter((w) => w.length > 1 && !STOP.has(w))
    .map((w) => (w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w));
}

type Index = { id: string; weights: Map<string, number> };

/** Name words weigh 3, tags and category 2, description words 1. */
export function buildIndex(starters: StarterLite[]): Index[] {
  return starters.map((s) => {
    const weights = new Map<string, number>();
    const add = (text: string, w: number) => {
      for (const word of words(text)) weights.set(word, Math.max(weights.get(word) ?? 0, w));
    };
    add(s.description, 1);
    add(s.categoryName, 2);
    add(s.tags.join(" "), 2);
    add(s.name, 3);
    return { id: s.id, weights };
  });
}

export type MatchResult = { id: string; score: number };

/** Minimum score for a match; below it the picker stays on "Auto". */
export const MATCH_THRESHOLD = 3;
const SYNONYM_WEIGHT = 5;

/**
 * Scores every starter against `text` and returns the best one above the threshold.
 * `synonyms` maps a word to a starter id (shop → storefront). Ties go to the starter that the
 * stage can replay, then to the earlier one in the list (featured first).
 */
export function matchStarter(text: string, index: Index[], synonyms: Record<string, string>, staged?: Set<string>): MatchResult | null {
  const ws = words(text);
  if (ws.length === 0) return null;
  const syn = new Map<string, number>();
  for (const w of ws) {
    const target = synonyms[w] ?? synonyms[`${w}s`];
    if (target) syn.set(target, (syn.get(target) ?? 0) + SYNONYM_WEIGHT);
  }
  let best: MatchResult | null = null;
  let bestTie = -1;
  index.forEach((entry, order) => {
    let score = syn.get(entry.id) ?? 0;
    for (const w of new Set(ws)) score += entry.weights.get(w) ?? 0;
    if (score < MATCH_THRESHOLD) return;
    const tie = (staged?.has(entry.id) ? 1000 : 0) - order;
    if (!best || score > best.score || (score === best.score && tie > bestTie)) {
      best = { id: entry.id, score };
      bestTie = tie;
    }
  });
  return best;
}
