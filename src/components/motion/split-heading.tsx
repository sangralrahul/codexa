import * as React from "react";
import { cn } from "@/lib/utils";

type Size = "display-1" | "display-2" | "display-3" | "display-4";
type Kind = "plain" | "mark" | "dim";
type Seg = { text: string; kind: Kind };

const SIZE_CLASS: Record<Size, string> = {
  "display-1": "text-display-1",
  "display-2": "text-display-2",
  "display-3": "text-display-3",
  "display-4": "text-display-4",
};

/** [start, end) of the first occurrence of `needle` in `text`, or null. */
function rangeOf(text: string, needle?: string): [number, number] | null {
  if (!needle) return null;
  const i = text.indexOf(needle);
  return i < 0 ? null : [i, i + needle.length];
}

/** Splits text[from, to) into plain / mark / dim segments (mark wins over dim). */
function segmentsOf(text: string, from: number, to: number, mark: [number, number] | null, dim: [number, number] | null): Seg[] {
  const kindAt = (i: number): Kind => (mark && i >= mark[0] && i < mark[1] ? "mark" : dim && i >= dim[0] && i < dim[1] ? "dim" : "plain");
  const out: Seg[] = [];
  for (let i = from; i < to; i++) {
    const k = kindAt(i);
    const last = out[out.length - 1];
    if (last && last.kind === k) last.text += text[i];
    else out.push({ text: text[i], kind: k });
  }
  return out;
}

/**
 * Word units ([start, end) ranges) of text[from, to). The marked phrase stays one unit so its
 * highlight is continuous across the spaces between its words.
 */
function wordUnits(text: string, from: number, to: number, mark: [number, number] | null) {
  const parts: { start: number; end: number }[] = [];
  const re = /\S+/g;
  re.lastIndex = from;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) && m.index < to) {
    const start = m.index;
    const end = Math.min(to, start + m[0].length);
    const prev = parts[parts.length - 1];
    if (prev && mark && start >= mark[0] && start < mark[1] && prev.end > mark[0]) prev.end = end;
    else parts.push({ start, end });
  }
  return parts;
}

function renderSegs(segs: Seg[], markNode?: React.ReactNode) {
  return segs.map((s, i) =>
    s.kind === "mark" ? (
      markNode ? (
        <React.Fragment key={i}>{markNode}</React.Fragment>
      ) : (
        <span key={i} className="mark-select">
          {s.text}
        </span>
      )
    ) : s.kind === "dim" ? (
      <span key={i} className="text-dim">
        {s.text}
      </span>
    ) : (
      <React.Fragment key={i}>{s.text}</React.Fragment>
    ),
  );
}

/**
 * M2 line-mask heading (server component, LCP-safe).
 *
 * The real sentence is in the DOM once (sr-only); the visible copy is aria-hidden and
 * rises line by line (`lines`) or word by word (no `lines`) from overflow masks. Below sm,
 * `lines` flow as one balanced paragraph (rising word by word) instead of forcing breaks.
 * Opacity is never 0. `mark` gets the selection mark (H1 only, once per page);
 * `dim` gets the two-tone .text-dim. play="load" animates on first paint (CSS only);
 * play="view" waits until MotionEffects sees it. Calm shows the final frame.
 *
 * @example <SplitHeading as="h1" size="display-1" lines={["From one sentence", "to a running app."]} mark="running app." />
 */
export function SplitHeading({
  as = "h2",
  children,
  lines,
  mark,
  markNode,
  dim,
  size = "display-2",
  play,
  className,
  id,
}: {
  as?: "h1" | "h2" | "h3";
  children: string;
  /** Visual lines (joined with a space they must equal `children`). Without it, words rise one by one. */
  lines?: string[];
  /** Substring set in the selection mark (.mark-select). Use in the page H1 only. */
  mark?: string;
  /** Rendered in place of the marked phrase (visual copy only; the sr-only sentence keeps `mark`). */
  markNode?: React.ReactNode;
  /** Substring set in the two-tone .text-dim. */
  dim?: string;
  size?: Size;
  /** Default: "load" for h1, "view" otherwise. */
  play?: "load" | "view";
  className?: string;
  id?: string;
}) {
  const Tag = as;
  const mode = play ?? (as === "h1" ? "load" : "view");
  const full = lines && lines.length ? lines.join(" ") : String(children);
  const markR = rangeOf(full, mark);
  const dimR = rangeOf(full, dim);

  let body: React.ReactNode;
  let units = 0;
  if (lines && lines.length) {
    // Each line is a block of word units that rise together (--i = line). Below sm the lines
    // flow as one balanced paragraph and the same units rise word by word (--w), so a phone
    // never gets the forced breaks plus extra wraps (globals.css, M2).
    units = lines.length;
    let offset = 0;
    let w = 0;
    const rows = lines.map((line) => {
      const from = offset;
      offset += line.length + 1;
      return wordUnits(full, from, from + line.length, markR).map((p) => ({ ...p, w: w++ }));
    });
    body = rows.map((row, i) => (
      <React.Fragment key={i}>
        <span className="split-line">
          {row.map((p, j) => (
            <React.Fragment key={p.start}>
              <span className="split-word">
                <span className="split-in" style={{ "--i": i, "--w": p.w } as React.CSSProperties}>
                  {renderSegs(segmentsOf(full, p.start, p.end, markR, dimR), markNode)}
                </span>
              </span>
              {j < row.length - 1 ? " " : null}
            </React.Fragment>
          ))}
        </span>
        {i < rows.length - 1 ? " " : null}
      </React.Fragment>
    ));
  } else {
    // Word units; the marked phrase stays one unit so its highlight is continuous.
    const parts = wordUnits(full, 0, full.length, markR);
    units = parts.length;
    body = parts.map((p, i) => (
      <React.Fragment key={i}>
        <span className="split-word">
          <span className="split-in" style={{ "--i": i } as React.CSSProperties}>
            {renderSegs(segmentsOf(full, p.start, p.end, markR, dimR), markNode)}
          </span>
        </span>
        {i < parts.length - 1 ? " " : null}
      </React.Fragment>
    ));
  }

  const step = lines && lines.length ? 70 : 40;
  return (
    <Tag
      id={id}
      data-split=""
      data-play={mode}
      // The size utility stays outside cn(): tailwind-merge would treat it as a text colour.
      // Phones (`lines` flowing): `pretty` sets "From one / sentence to a / running app." where
      // balance would pull a lone article onto the mark's line; below 360px balance avoids a
      // one-word line. Variant utilities so they win over the display utility's balance.
      className={`${SIZE_CLASS[size]} ${cn("split-heading", lines && lines.length > 1 && "max-sm:text-pretty max-[22.5rem]:text-balance", className)}`}
      style={{ "--mark-delay": `${units * step + 450}ms` } as React.CSSProperties}
    >
      <span className="sr-only">{full}</span>
      <span aria-hidden="true">{body}</span>
    </Tag>
  );
}
