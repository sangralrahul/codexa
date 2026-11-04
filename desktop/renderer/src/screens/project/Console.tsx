import { useEffect, useRef, useState } from "react";
import { ArrowDownToLine, Check, Copy, Eraser, Terminal, X } from "lucide-react";
import { logsApi, type LogLine } from "../../lib/api";
import { cn } from "../../lib/util";
import { Tip } from "../../ui";

const STATUS: Record<string, { label: string; dot: string }> = {
  running: { label: "dev server running", dot: "bg-success" },
  starting: { label: "starting", dot: "pulse bg-warning" },
  stopped: { label: "stopped", dot: "bg-dim" },
  error: { label: "stopped with an error", dot: "bg-danger" },
  unavailable: { label: "previews unavailable", dot: "bg-dim" },
};

/** The dev server's output (install, build, runtime errors), refreshed every few seconds while open. */
export function ConsolePanel({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const [lines, setLines] = useState<LogLine[]>([]);
  const [status, setStatus] = useState<string>("");
  const [clearedAt, setClearedAt] = useState<string | null>(null);
  const [errorsOnly, setErrorsOnly] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pinned, setPinned] = useState(true);
  const ref = useRef<HTMLDivElement>(null);
  const stick = useRef(true);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const r = await logsApi.tail(projectId, 400);
        if (!alive) return;
        setLines(r.lines);
        setStatus(r.status);
      } catch {
        if (alive) setStatus("unavailable");
      }
    };
    void tick();
    const t = setInterval(tick, 3000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [projectId]);

  useEffect(() => {
    if (stick.current) ref.current?.scrollTo({ top: ref.current.scrollHeight });
  }, [lines, errorsOnly]);

  const visible = clearedAt ? lines.filter((l) => l.ts > clearedAt) : lines;
  const errors = visible.filter((l) => l.stream === "stderr").length;
  const shown = errorsOnly ? visible.filter((l) => l.stream === "stderr") : visible;
  const s = STATUS[status] ?? { label: status || "…", dot: "bg-dim" };

  const copy = async () => {
    await navigator.clipboard.writeText(shown.map((l) => `${new Date(l.ts).toLocaleTimeString(undefined, { hour12: false })} ${l.line}`).join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  const jump = () => {
    stick.current = true;
    setPinned(true);
    ref.current?.scrollTo({ top: ref.current.scrollHeight });
  };

  return (
    <div className="flex h-full flex-col border-t border-border bg-bg" role="region" aria-label="Console">
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-border bg-sidebar pl-3 pr-1.5">
        <Terminal className="size-3.5 text-muted" aria-hidden="true" />
        <span className="ws-label text-fg">Console</span>
        <span className="flex items-center gap-1.5 rounded-full border border-border px-2 py-px text-[11px] text-muted">
          <span className={cn("ws-dot", s.dot)} /> {s.label}
        </span>
        <span className="mono text-[10.5px] tabular-nums text-dim">
          {visible.length} line{visible.length === 1 ? "" : "s"}
        </span>
        <span className="ml-auto" />
        <button
          type="button"
          aria-pressed={errorsOnly}
          onClick={() => setErrorsOnly((v) => !v)}
          className={cn("inline-flex h-6 items-center gap-1.5 rounded-md border px-2 text-[11.5px] font-medium transition-colors", errorsOnly ? "border-danger/30 bg-danger/10 text-danger" : "border-transparent text-muted hover:bg-surface hover:text-fg")}
        >
          Errors only
          <span className={cn("mono rounded-[3px] px-1 text-[10.5px] tabular-nums", errors ? "bg-danger/15 text-danger" : "bg-surface text-dim")}>{errors}</span>
        </button>
        <span aria-hidden="true" className="mx-0.5 h-4 w-px bg-border" />
        {!pinned ? (
          <Tip label="Jump to latest">
            <button type="button" className="ws-icon ws-icon--xs" aria-label="Jump to latest" onClick={jump}>
              <ArrowDownToLine />
            </button>
          </Tip>
        ) : null}
        <Tip label={copied ? "Copied" : "Copy output"}>
          <button type="button" className="ws-icon ws-icon--xs" aria-label="Copy output" onClick={() => void copy()} disabled={shown.length === 0}>
            {copied ? <Check className="text-success" /> : <Copy />}
          </button>
        </Tip>
        <Tip label="Clear">
          <button type="button" className="ws-icon ws-icon--xs" aria-label="Clear console" onClick={() => setClearedAt(lines.at(-1)?.ts ?? new Date().toISOString())}>
            <Eraser />
          </button>
        </Tip>
        <Tip label="Close" keys="Ctrl J" align="end">
          <button type="button" className="ws-icon ws-icon--xs" aria-label="Close console" onClick={onClose}>
            <X />
          </button>
        </Tip>
      </div>
      <div
        ref={ref}
        onScroll={(e) => {
          const el = e.currentTarget;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
          setPinned(stick.current);
        }}
        className="scroll selectable min-h-0 flex-1 bg-bg py-1.5 font-mono text-[12px] leading-[1.65]"
        role="log"
        aria-label="Dev server output"
      >
        {shown.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-1.5 px-6 text-center font-sans">
            <p className="text-[12.5px] font-medium text-fg">{errorsOnly ? "No errors" : "No output yet"}</p>
            <p className="max-w-[420px] text-[12px] leading-relaxed text-dim">{errorsOnly ? "Nothing on stderr since the console was last cleared." : "Logs from installing, building and running your app show up here while the preview runs."}</p>
          </div>
        ) : (
          shown.map((l, i) => (
            <div key={i} className="ws-log" data-stream={l.stream}>
              <span className="shrink-0 select-none tabular-nums text-dim">{new Date(l.ts).toLocaleTimeString(undefined, { hour12: false })}</span>
              <span className={cn("min-w-0 flex-1", l.stream === "stdout" && "text-fg/85")}>{l.line}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
