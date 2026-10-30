"use client";

import type { Monaco } from "@monaco-editor/react";
import { cssColor, cssColorAlpha } from "@/lib/client/workspace/css-colors";

/**
 * Monaco themes built at runtime from the design tokens (no hex in this file):
 * - codexa-night: the dark code pane (--code-bg / --code-fg / --syn-*).
 * - codexa-day:   a paper editor (--card / --foreground) whose syntax colours are the same
 *                 --syn-* hues deepened toward the ink so they hold contrast on white.
 * Cursor and selection are the primary indigo (no ember in the editor). Themes are re-defined whenever the
 * site theme changes so they always match the live tokens.
 */
export const NIGHT = "codexa-night";
export const DAY = "codexa-day";

const strip = (hex: string) => hex.replace(/^#/, "");

let relativeColors: boolean | null = null;
function supportsRelative() {
  if (relativeColors === null) relativeColors = typeof CSS !== "undefined" && CSS.supports("color", "oklch(from red l c h)");
  return relativeColors;
}

/** On paper the dark-pane syntax hues are deepened (lower lightness, more chroma) so they hold contrast. */
function syntax(deepen: boolean) {
  const tone = (token: string) => {
    if (!deepen) return `var(${token})`;
    // Comments: the factor keeps the paper comment at the same depth (OKLab L ≈ 0.47) as before the
    // dark-pane comment was lightened for contrast.
    const l = token === "--syn-comment" ? 0.76 : 0.6;
    return supportsRelative() ? `oklch(from var(${token}) calc(l * ${l}) calc(c * 1.6) h)` : `color-mix(in oklch, var(${token}) 56%, var(--foreground))`;
  };
  const c = (token: string) => strip(cssColor(tone(token)));
  return {
    keyword: c("--syn-keyword"),
    string: c("--syn-string"),
    fn: c("--syn-fn"),
    tag: c("--syn-tag"),
    number: c("--syn-number"),
    comment: c("--syn-comment"),
    attr: c("--syn-attr"),
    type: c("--syn-type"),
  };
}

function rules(s: ReturnType<typeof syntax>, fg: string) {
  return [
    { token: "", foreground: fg },
    { token: "comment", foreground: s.comment, fontStyle: "italic" },
    { token: "keyword", foreground: s.keyword },
    { token: "keyword.control", foreground: s.keyword },
    { token: "storage", foreground: s.keyword },
    { token: "string", foreground: s.string },
    { token: "string.escape", foreground: s.number },
    { token: "number", foreground: s.number },
    { token: "regexp", foreground: s.string },
    { token: "type", foreground: s.type },
    { token: "type.identifier", foreground: s.type },
    { token: "identifier", foreground: fg },
    { token: "delimiter", foreground: fg },
    { token: "tag", foreground: s.tag },
    { token: "metatag", foreground: s.tag },
    { token: "attribute.name", foreground: s.attr },
    { token: "attribute.value", foreground: s.string },
    { token: "variable", foreground: fg },
    { token: "variable.predefined", foreground: s.fn },
    { token: "function", foreground: s.fn },
    { token: "key", foreground: s.attr },
    { token: "string.key.json", foreground: s.attr },
    { token: "string.value.json", foreground: s.string },
    { token: "keyword.json", foreground: s.keyword },
    { token: "selector", foreground: s.tag },
    { token: "attribute.value.number", foreground: s.number },
    { token: "attribute.value.unit", foreground: s.number },
    { token: "markup.heading", foreground: s.fn, fontStyle: "bold" },
  ];
}

export function defineCodexaThemes(monaco: Monaco) {
  if (typeof document === "undefined") return;
  // Night: the code pane (dark in both site themes).
  const nBg = cssColor("var(--code-bg)");
  const nFg = cssColor("var(--code-fg)");
  const nMuted = cssColor("var(--code-muted)");
  const nBorder = cssColor("var(--code-border)");
  const accent = cssColor("var(--primary)");
  monaco.editor.defineTheme(NIGHT, {
    base: "vs-dark",
    inherit: true,
    rules: rules(syntax(false), strip(nFg)),
    colors: {
      "editor.background": nBg,
      "editor.foreground": nFg,
      "editorGutter.background": nBg,
      "editor.lineHighlightBackground": cssColor("color-mix(in oklab, var(--code-fg) 4%, var(--code-bg))"),
      "editor.lineHighlightBorder": cssColorAlpha("var(--code-fg)", 0),
      "editor.selectionBackground": cssColor("color-mix(in oklab, var(--primary) 34%, var(--code-bg))"),
      "editor.inactiveSelectionBackground": cssColor("color-mix(in oklab, var(--primary) 18%, var(--code-bg))"),
      "editor.selectionHighlightBackground": cssColorAlpha("var(--primary)", 0.12),
      "editor.wordHighlightBackground": cssColorAlpha("var(--code-fg)", 0.07),
      "editor.findMatchBackground": cssColorAlpha("var(--warning)", 0.35),
      "editor.findMatchHighlightBackground": cssColorAlpha("var(--warning)", 0.16),
      "editorCursor.foreground": accent,
      "editorLineNumber.foreground": cssColor("color-mix(in oklab, var(--code-muted) 70%, var(--code-bg))"),
      "editorLineNumber.activeForeground": nFg,
      "editorIndentGuide.background1": cssColor("color-mix(in oklab, var(--code-fg) 7%, var(--code-bg))"),
      "editorIndentGuide.activeBackground1": cssColor("color-mix(in oklab, var(--code-fg) 18%, var(--code-bg))"),
      "editorBracketMatch.background": cssColorAlpha("var(--primary)", 0.12),
      "editorBracketMatch.border": cssColorAlpha("var(--primary)", 0.5),
      "editorWidget.background": cssColor("color-mix(in oklab, var(--code-fg) 5%, var(--code-bg))"),
      "editorWidget.border": nBorder,
      "editorSuggestWidget.background": cssColor("color-mix(in oklab, var(--code-fg) 5%, var(--code-bg))"),
      "editorSuggestWidget.border": nBorder,
      "editorSuggestWidget.selectedBackground": cssColorAlpha("var(--primary)", 0.18),
      "editorHoverWidget.background": cssColor("color-mix(in oklab, var(--code-fg) 5%, var(--code-bg))"),
      "editorHoverWidget.border": nBorder,
      "editorStickyScroll.background": nBg,
      "editorStickyScrollHover.background": cssColor("color-mix(in oklab, var(--code-fg) 6%, var(--code-bg))"),
      "editorStickyScroll.shadow": cssColorAlpha("var(--code-bg)", 0.9),
      "scrollbarSlider.background": cssColorAlpha("var(--code-fg)", 0.1),
      "scrollbarSlider.hoverBackground": cssColorAlpha("var(--code-fg)", 0.18),
      "scrollbarSlider.activeBackground": cssColorAlpha("var(--code-fg)", 0.24),
      "editorOverviewRuler.border": cssColorAlpha("var(--code-fg)", 0),
      "editorError.foreground": cssColor("var(--danger)"),
      "editorWarning.foreground": cssColor("var(--warning)"),
      "editorWhitespace.foreground": nMuted,
      "focusBorder": cssColorAlpha("var(--primary)", 0.6),
      "editorBracketHighlight.foreground1": cssColor("var(--syn-number)"),
      "editorBracketHighlight.foreground2": cssColor("var(--syn-keyword)"),
      "editorBracketHighlight.foreground3": cssColor("var(--syn-fn)"),
      "editorBracketPairGuide.activeBackground1": cssColorAlpha("var(--syn-number)", 0.5),
      "editorBracketPairGuide.activeBackground2": cssColorAlpha("var(--syn-keyword)", 0.5),
      "editorBracketPairGuide.activeBackground3": cssColorAlpha("var(--syn-fn)", 0.5),
      "diffEditor.insertedTextBackground": cssColorAlpha("var(--success)", 0.16),
      "diffEditor.removedTextBackground": cssColorAlpha("var(--danger)", 0.16),
      "diffEditor.insertedLineBackground": cssColorAlpha("var(--success)", 0.08),
      "diffEditor.removedLineBackground": cssColorAlpha("var(--danger)", 0.08),
    },
  });

  // Day: a paper editor that sits inside the light workspace.
  const dBg = cssColor("var(--card)");
  const dFg = cssColor("var(--foreground)");
  monaco.editor.defineTheme(DAY, {
    base: "vs",
    inherit: true,
    rules: rules(syntax(true), strip(dFg)),
    colors: {
      "editor.background": dBg,
      "editor.foreground": dFg,
      "editorGutter.background": dBg,
      "editor.lineHighlightBackground": cssColor("color-mix(in oklab, var(--foreground) 3.5%, var(--card))"),
      "editor.lineHighlightBorder": cssColorAlpha("var(--foreground)", 0),
      "editor.selectionBackground": cssColor("color-mix(in oklab, var(--primary) 20%, var(--card))"),
      "editor.inactiveSelectionBackground": cssColor("color-mix(in oklab, var(--primary) 10%, var(--card))"),
      "editor.selectionHighlightBackground": cssColorAlpha("var(--primary)", 0.1),
      "editor.wordHighlightBackground": cssColorAlpha("var(--foreground)", 0.06),
      "editor.findMatchBackground": cssColorAlpha("var(--warning)", 0.35),
      "editor.findMatchHighlightBackground": cssColorAlpha("var(--warning)", 0.16),
      "editorCursor.foreground": accent,
      "editorLineNumber.foreground": cssColor("color-mix(in oklab, var(--muted-foreground) 55%, var(--card))"),
      "editorLineNumber.activeForeground": dFg,
      "editorIndentGuide.background1": cssColor("color-mix(in oklab, var(--foreground) 7%, var(--card))"),
      "editorIndentGuide.activeBackground1": cssColor("color-mix(in oklab, var(--foreground) 18%, var(--card))"),
      "editorBracketMatch.background": cssColorAlpha("var(--primary)", 0.1),
      "editorBracketMatch.border": cssColorAlpha("var(--primary)", 0.45),
      "editorWidget.background": cssColor("var(--card)"),
      "editorWidget.border": cssColor("var(--border-strong)"),
      "editorSuggestWidget.background": cssColor("var(--card)"),
      "editorSuggestWidget.border": cssColor("var(--border-strong)"),
      "editorSuggestWidget.selectedBackground": cssColorAlpha("var(--primary)", 0.12),
      "editorHoverWidget.background": cssColor("var(--card)"),
      "editorHoverWidget.border": cssColor("var(--border-strong)"),
      "editorStickyScroll.background": dBg,
      "editorStickyScrollHover.background": cssColor("var(--muted)"),
      "editorStickyScroll.shadow": cssColorAlpha("var(--foreground)", 0.08),
      "scrollbarSlider.background": cssColorAlpha("var(--foreground)", 0.1),
      "scrollbarSlider.hoverBackground": cssColorAlpha("var(--foreground)", 0.18),
      "scrollbarSlider.activeBackground": cssColorAlpha("var(--foreground)", 0.24),
      "editorOverviewRuler.border": cssColorAlpha("var(--foreground)", 0),
      "editorError.foreground": cssColor("var(--danger)"),
      "editorWarning.foreground": cssColor("var(--warning)"),
      "focusBorder": cssColorAlpha("var(--primary)", 0.5),
      "editorBracketHighlight.foreground1": cssColor("color-mix(in oklch, var(--syn-number) 56%, var(--foreground))"),
      "editorBracketHighlight.foreground2": cssColor("color-mix(in oklch, var(--syn-keyword) 56%, var(--foreground))"),
      "editorBracketHighlight.foreground3": cssColor("color-mix(in oklch, var(--syn-fn) 56%, var(--foreground))"),
      "diffEditor.insertedTextBackground": cssColorAlpha("var(--success)", 0.14),
      "diffEditor.removedTextBackground": cssColorAlpha("var(--danger)", 0.12),
      "diffEditor.insertedLineBackground": cssColorAlpha("var(--success)", 0.06),
      "diffEditor.removedLineBackground": cssColorAlpha("var(--danger)", 0.06),
    },
  });
}
