"use client";

import { useEffect, useState } from "react";

/**
 * Cycles through `words` in place with a vertical slide. The full sentence
 * is given to screen readers once (`label`); the animated words are hidden
 * from them so they aren't announced on every change.
 */
export function WordSwap({ words, label, interval = 2400 }: { words: string[]; label: string; interval?: number }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setI((n) => (n + 1) % words.length), interval);
    return () => clearInterval(id);
  }, [words.length, interval]);
  const prev = (i - 1 + words.length) % words.length;
  return (
    <>
      <span className="sr-only">{label}</span>
      <span aria-hidden="true" className="word-swap">
        {words.map((w, n) => (
          <span key={w} data-state={n === i ? "in" : n === prev ? "out" : "next"} className="serif-accent whitespace-nowrap pr-[0.08em]">
            {w}
          </span>
        ))}
      </span>
    </>
  );
}
