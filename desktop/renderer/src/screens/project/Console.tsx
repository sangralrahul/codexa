import { useEffect, useRef, useState } from "react";
import { ArrowDownToLine, Check, Copy, Eraser, Terminal, X } from "lucide-react";
import { logsApi, type LogLine } from "../../lib/api";
import { cn } from "../../lib/util";
import { Button } from "../../ui";

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
    <div className="flex h-full flex-col border-t border-border bg-card">
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-border px-3">
        <Terminal className="size-3.5 text-muted" />
        <span className="text-[12.5px] font-semibold">Console</span>
        <span className="flex items-center gap-1.5 text-[11.5px] text-dim">
          <span className={cn("size-1.5 rounded-full", s.dot)} /> {s.label}
        </span>
        <span className="text-[11px] tabular-nums text-dim">· {visible.length} lines</span>
        <span className="ml-auto" />
        <button
          type="button"
          aria-pressed={errorsOnly}
          onClick={() => setErrorsOnly((v) => !v)}
          className={cn("inline-flex h-6 items-center gap-1.5 rounded-md px-2 text-[11.5px] font-medium transition-colors", errorsOnly ? "bg-danger/10 text-danger" : "text-muted hover:bg-surface hover:text-fg")}
        >
          Errors
          <span className={cn("rounded px-1 tabular-nums", errors ? "bg-danger/15 text-danger" : "bg-surface text-dim")}>{errors}</span>
        </button>
        {!pinned ? (
          <Button size="icon-sm" variant="ghost" aria-label="Jump to latest" title="Jump to latest" onClick={jump}>
            <ArrowDownToLine />
          </Button>
        ) : null}
        <Button size="icon-sm" variant="ghost" aria-label="Copy output" title="Copy output" onClick={() => void copy()} disabled={shown.length === 0}>
          {copied ? <Check /> : <Copy />}
        </Button>
        <Button size="icon-sm" variant="ghost" aria-label="Clear console" title="Clear" onClick={() => setClearedAt(lines.at(-1)?.ts ?? new Date().toISOString())}>
          <Eraser />
        </Button>
        <Button size="icon-sm" variant="ghost" aria-label="Close console" title="Close (Ctrl J)" onClick={onClose}>
          <X />
        </Button>
      </div>
      <div
        ref={ref}
        onScroll={(e) => {
          const el = e.currentTarget;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
          setPinned(stick.current);
        }}
        className="scroll selectable min-h-0 flex-1 bg-bg px-3 py-2 font-mono text-[12px] leading-[1.6]"
      >
        {shown.length === 0 ? (
          <p className="text-dim">{errorsOnly ? "No errors. Nice." : "No output yet. Logs from installing, building and running your app show up here."}</p>
        ) : (
          shown.map((l, i) => (
            <div key={i} className={cn("flex gap-2 whitespace-pre-wrap break-words rounded px-1 -mx-1", l.stream === "stderr" ? "bg-danger/[0.06] text-danger" : l.stream === "system" ? "text-accent" : "text-fg/85")}>
              <span className="shrink-0 select-none text-dim">{new Date(l.ts).toLocaleTimeString(undefined, { hour12: false })}</span>
              <span className="min-w-0 flex-1">{l.line}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
