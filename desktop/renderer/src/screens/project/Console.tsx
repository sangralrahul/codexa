import { useEffect, useRef, useState } from "react";
import { Eraser, Terminal, X } from "lucide-react";
import { logsApi, type LogLine } from "../../lib/api";
import { cn } from "../../lib/util";
import { Button } from "../../ui";

/** The dev server's output (install, build, runtime errors), refreshed every few seconds while open. */
export function ConsolePanel({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const [lines, setLines] = useState<LogLine[]>([]);
  const [status, setStatus] = useState<string>("");
  const [clearedAt, setClearedAt] = useState<string | null>(null);
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
  }, [lines]);

  const shown = clearedAt ? lines.filter((l) => l.ts > clearedAt) : lines;

  return (
    <div className="flex h-full flex-col border-t border-border bg-card">
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-border px-3">
        <Terminal className="size-3.5 text-muted" />
        <span className="text-[12.5px] font-semibold">Console</span>
        <span className="text-[11.5px] text-dim">{status === "running" ? "dev server running" : status === "unavailable" ? "previews unavailable" : status || "…"}</span>
        <span className="ml-auto" />
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
        }}
        className="scroll selectable min-h-0 flex-1 bg-bg px-3 py-2 font-mono text-[12px] leading-[1.6]"
      >
        {shown.length === 0 ? (
          <p className="text-dim">No output yet. Logs from installing, building and running your app show up here.</p>
        ) : (
          shown.map((l, i) => (
            <div key={i} className={cn("whitespace-pre-wrap break-words", l.stream === "stderr" ? "text-danger" : l.stream === "system" ? "text-accent" : "text-fg/85")}>
              <span className="mr-2 select-none text-dim">{new Date(l.ts).toLocaleTimeString(undefined, { hour12: false })}</span>
              {l.line}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
