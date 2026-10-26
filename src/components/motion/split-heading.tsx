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

function renderSegs(segs: Seg[]) {
  return segs.map((s, i) =>
    s.kind === "mark" ? (
      <span key={i} className="mark-select">
        {s.text}
      </span>
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
 * rises line by line (`lines`) or word by word (no `lines`) from overflow masks.
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
    let offset = 0;
    units = lines.length;
    body = lines.map((line, i) => {
      const segs = segmentsOf(full, offset, offset + line.length, markR, dimR);
      offset += line.length + 1;
      return (
        <span key={i} className="split-line">
          <span className="split-in" style={{ "--i": i } as React.CSSProperties}>
            {renderSegs(segs)}
          </span>
        </span>
      );
    });
  } else {
    // Word units; the marked phrase stays one unit so its highlight is continuous.
    const parts: { start: number; end: number }[] = [];
    const re = /\S+/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(full))) {
      const start = m.index;
      const end = start + m[0].length;
      const prev = parts[parts.length - 1];
      if (prev && markR && start >= markR[0] && start < markR[1] && prev.end > markR[0]) prev.end = end;
      else parts.push({ start, end });
    }
    units = parts.length;
    body = parts.map((p, i) => (
      <React.Fragment key={i}>
        <span className="split-word">
          <span className="split-in" style={{ "--i": i } as React.CSSProperties}>
            {renderSegs(segmentsOf(full, p.start, p.end, markR, dimR))}
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
      className={`${SIZE_CLASS[size]} ${cn("split-heading", className)}`}
      style={{ "--mark-delay": `${units * step + 450}ms` } as React.CSSProperties}
    >
      <span className="sr-only">{full}</span>
      <span aria-hidden="true">{body}</span>
    </Tag>
  );
}
