/**
 * Problems for the bottom dock, parsed from real runtime output (stderr and system lines)
 * and from the AI run's validation output. Pure; nothing here invents an error.
 */
import type { LogLine } from "@/lib/runtime/types";

export type Problem = {
  id: string;
  severity: "error" | "warning";
  message: string;
  file?: string;
  line?: number;
  column?: number;
  source: "runtime" | "checks";
  /** The raw lines around the problem (sent to the AI with "Fix with AI"). */
  context: string[];
};

const ANSI = /\x1b\[[0-9;]*[A-Za-z]/g;
const strip = (s: string) => s.replace(ANSI, "").trimEnd();

/** Map an absolute/sandbox path to a project-relative one when we can recognise it. */
export function projectPath(raw: string, known?: Set<string>): string | undefined {
  let p = raw.replace(/\\/g, "/").replace(/^file:\/\//, "").replace(/[?#].*$/, "");
  const anchors = ["/src/", "/public/", "/app/", "/pages/", "/server/", "/lib/"];
  if (known?.has(p.replace(/^\.?\//, ""))) return p.replace(/^\.?\//, "");
  for (const a of anchors) {
    const i = p.lastIndexOf(a);
    if (i !== -1) {
      const candidate = p.slice(i + 1);
      if (!known || known.has(candidate)) return candidate;
    }
  }
  p = p.replace(/^\.?\//, "");
  if (!known || known.has(p)) return p || undefined;
  return undefined;
}

const PATTERNS: { re: RegExp; map: (m: RegExpMatchArray) => { file: string; line: number; column?: number; message: string; severity?: "error" | "warning" } }[] = [
  // tsc: src/App.tsx(12,5): error TS2304: Cannot find name 'x'.
  { re: /^(.+?\.[cm]?[jt]sx?)\((\d+),(\d+)\):\s*(error|warning)\s+(TS\d+:\s*.+)$/i, map: (m) => ({ file: m[1], line: +m[2], column: +m[3], severity: m[4].toLowerCase() as "error" | "warning", message: m[5] }) },
  // tsc --pretty: src/App.tsx:12:5 - error TS2304: Cannot find name 'x'.
  { re: /^(.+?\.[cm]?[jt]sx?):(\d+):(\d+)\s+-\s+(error|warning)\s+(TS\d+:\s*.+)$/i, map: (m) => ({ file: m[1], line: +m[2], column: +m[3], severity: m[4].toLowerCase() as "error" | "warning", message: m[5] }) },
  // vite / babel: [plugin:vite:react-babel] /app/src/App.tsx: Unexpected token (12:5)
  { re: /^\[plugin:[^\]]+\]\s+(.+?\.\w+):\s*(.+?)\s*\((\d+):(\d+)\)\s*$/, map: (m) => ({ file: m[1], line: +m[3], column: +m[4], message: m[2] }) },
  // esbuild / node: src/App.tsx:12:5: ERROR: Expected ";" but found "x"
  { re: /^(.+?\.\w+):(\d+):(\d+):\s*(?:ERROR|error):\s*(.+)$/, map: (m) => ({ file: m[1], line: +m[2], column: +m[3], message: m[4] }) },
];

const ERROR_WORDS = /\b(error|failed|exception|cannot|unexpected|not found|ENOENT|EADDRINUSE|Uncaught)\b/i;
const WARN_WORDS = /\bwarn(ing)?\b/i;

function locate(lines: string[], index: number, known?: Set<string>) {
  // A location on the next lines (esbuild prints the file under the message).
  for (let k = index; k < Math.min(lines.length, index + 4); k++) {
    const m = lines[k].match(/((?:\.{0,2}\/)?[\w@./-]+\.\w+):(\d+):(\d+)/);
    if (m) {
      const file = projectPath(m[1], known);
      if (file) return { file, line: +m[2], column: +m[3] };
    }
  }
  return {};
}

/** Parse problems from output lines (newest last). `known` restricts file links to real project files. */
export function parseProblems(lines: { text: string; stream?: LogLine["stream"] }[], source: Problem["source"], known?: Set<string>): Problem[] {
  const out: Problem[] = [];
  const seen = new Set<string>();
  const texts = lines.map((l) => strip(l.text));
  texts.forEach((text, i) => {
    const stream = lines[i].stream;
    if (!text.trim() || stream === "stdout") return;
    let problem: Omit<Problem, "id" | "context"> | null = null;
    for (const p of PATTERNS) {
      const m = text.trim().match(p.re);
      if (m) {
        const r = p.map(m);
        problem = { severity: r.severity ?? "error", message: r.message.trim(), file: projectPath(r.file, known), line: r.line, column: r.column, source };
        break;
      }
    }
    if (!problem) {
      if (stream === "system" && !ERROR_WORDS.test(text)) return;
      const severity = ERROR_WORDS.test(text) || stream === "stderr" ? (WARN_WORDS.test(text) && !ERROR_WORDS.test(text) ? "warning" : "error") : "warning";
      // Stack frames and blank continuation lines belong to the problem above them.
      if (/^\s+at\s/.test(text) || /^\s*[│|^~]/.test(text)) return;
      problem = { severity, message: text.trim(), source, ...locate(texts, i, known) };
    }
    const key = `${problem.file ?? ""}:${problem.line ?? ""}:${problem.message}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ ...problem, id: `${source}-${i}-${key.length}`, context: texts.slice(Math.max(0, i - 3), i + 6).filter(Boolean) });
  });
  return out.slice(-200);
}
