"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDownToLine, Copy, Trash2 } from "lucide-react";
import type { Terminal } from "@xterm/xterm";
import type { FitAddon } from "@xterm/addon-fit";
import { Button } from "@/components/ui/button";
import { StatusDot } from "@/components/ui/misc";
import { Tooltip, TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { LogLine } from "@/lib/runtime/types";

/**
 * Logs panel: streams the runtime's stdout/stderr/system lines over SSE into
 * an xterm.js terminal (stderr red, system cyan). Falls back to a plain
 * <pre> when xterm cannot be loaded or opened (no WebGL, old browsers, SSR).
 */
const MAX_LINES = 5000;
const COLORS = { stdout: "", stderr: "\x1b[31m", system: "\x1b[36m" } as const;
const RESET = "\x1b[0m";

type ConnState = "connecting" | "live" | "ended" | "error";

export function LogsPanel({ projectId }: { projectId: string; conversationId?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const linesRef = useRef<LogLine[]>([]);
  const [fallback, setFallback] = useState(false);
  const [fallbackLines, setFallbackLines] = useState<LogLine[]>([]);
  const [autoscroll, setAutoscroll] = useState(true);
  const [conn, setConn] = useState<ConnState>("connecting");
  const [runtimeStatus, setRuntimeStatus] = useState<string>("stopped");
  const [copied, setCopied] = useState(false);
  const [hasOutput, setHasOutput] = useState(false);
  const autoscrollRef = useRef(true);
  useEffect(() => {
    autoscrollRef.current = autoscroll;
  }, [autoscroll]);

  const append = useCallback(
    (line: LogLine) => {
      linesRef.current.push(line);
      if (linesRef.current.length === 1) setHasOutput(true);
      if (linesRef.current.length > MAX_LINES) linesRef.current.splice(0, linesRef.current.length - MAX_LINES);
      const term = termRef.current;
      if (term) {
        term.write(`${COLORS[line.stream]}${line.line.replace(/\r?\n/g, "\r\n")}${RESET}\r\n`);
        if (autoscrollRef.current) term.scrollToBottom();
      } else if (fallback) {
        setFallbackLines((prev) => (prev.length > MAX_LINES ? [...prev.slice(-MAX_LINES + 1), line] : [...prev, line]));
      }
    },
    [fallback],
  );

  // Mount xterm (client only). Any failure flips to the <pre> fallback.
  useEffect(() => {
    let disposed = false;
    let term: Terminal | null = null;
    let ro: ResizeObserver | null = null;
    (async () => {
      try {
        const [{ Terminal }, { FitAddon }] = await Promise.all([import("@xterm/xterm"), import("@xterm/addon-fit")]);
        await import("@xterm/xterm/css/xterm.css");
        if (disposed || !hostRef.current) return;
        term = new Terminal({
          convertEol: true,
          disableStdin: true,
          fontSize: 12,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          scrollback: MAX_LINES,
          theme: { background: "#0b0d12", foreground: "#e6e8ee", cursor: "#0b0d12" },
        });
        const fit = new FitAddon();
        term.loadAddon(fit);
        term.open(hostRef.current);
        fit.fit();
        termRef.current = term;
        fitRef.current = fit;
        for (const l of linesRef.current) term.write(`${COLORS[l.stream]}${l.line}${RESET}\r\n`);
        term.scrollToBottom();
        ro = new ResizeObserver(() => {
          try {
            fit.fit();
          } catch {
            /* hidden */
          }
        });
        ro.observe(hostRef.current);
      } catch {
        if (!disposed) {
          setFallback(true);
          setFallbackLines([...linesRef.current]);
        }
      }
    })();
    return () => {
      disposed = true;
      ro?.disconnect();
      term?.dispose();
      termRef.current = null;
    };
  }, []);

  // SSE subscription. EventSource reconnects on its own when the relay drops;
  // when the relay says there is no runtime ("end"), we retry every 5s so logs
  // appear as soon as a preview is started.
  const [reconnectKey, setReconnectKey] = useState(0);
  useEffect(() => {
    const es = new EventSource(`/api/v1/projects/${encodeURIComponent(projectId)}/runtime/logs`);
    let ended = false;
    let retry: ReturnType<typeof setTimeout> | null = null;
    es.onopen = () => setConn("live");
    es.onerror = () => {
      if (!ended) setConn("error");
    };
    es.addEventListener("log", (e) => {
      try {
        append(JSON.parse((e as MessageEvent).data) as LogLine);
      } catch {
        /* malformed line */
      }
    });
    es.addEventListener("status", (e) => {
      try {
        setRuntimeStatus((JSON.parse((e as MessageEvent).data) as { status: string }).status);
      } catch {
        /* ignore */
      }
    });
    es.addEventListener("end", () => {
      ended = true;
      setConn("ended");
      es.close();
      retry = setTimeout(() => {
        setConn("connecting");
        setReconnectKey((k) => k + 1);
      }, 5000);
    });
    return () => {
      es.close();
      if (retry) clearTimeout(retry);
    };
  }, [projectId, append, reconnectKey]);

  const clear = () => {
    linesRef.current = [];
    termRef.current?.clear();
    setFallbackLines([]);
    setHasOutput(false);
  };
  const copy = async () => {
    const text = linesRef.current.map((l) => `[${l.stream}] ${l.line}`).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };

  const dot = runtimeStatus === "running" ? "ok" : runtimeStatus === "starting" ? "busy" : runtimeStatus === "error" ? "error" : "idle";
  const connLabel = conn === "live" ? "streaming" : conn === "connecting" ? "connecting" : conn === "ended" ? "no runtime" : "reconnecting";

  return (
    <TooltipProvider>
      <section className="flex h-full min-h-0 flex-col bg-background" aria-label="Logs">
        <div className="flex shrink-0 items-center gap-2 border-b border-border px-2 py-1.5">
          <span className="flex items-center gap-1.5 text-xs font-medium" aria-live="polite">
            <StatusDot status={dot} /> Runtime {runtimeStatus} · <span className="font-normal text-muted-foreground">{connLabel}</span>
          </span>
          <div className="ml-auto flex items-center gap-1">
            <Tooltip content={autoscroll ? "Autoscroll on" : "Autoscroll off"}>
              <Button size="icon" variant="ghost" aria-label="Toggle autoscroll" aria-pressed={autoscroll} onClick={() => setAutoscroll((v) => !v)} className={cn(autoscroll && "bg-muted")}>
                <ArrowDownToLine className="size-4" aria-hidden="true" />
              </Button>
            </Tooltip>
            <Tooltip content={copied ? "Copied" : "Copy logs"}>
              <Button size="icon" variant="ghost" aria-label="Copy logs" onClick={() => void copy()}>
                <Copy className="size-4" aria-hidden="true" />
              </Button>
            </Tooltip>
            <Tooltip content="Clear">
              <Button size="icon" variant="ghost" aria-label="Clear logs" onClick={clear}>
                <Trash2 className="size-4" aria-hidden="true" />
              </Button>
            </Tooltip>
          </div>
        </div>
        <div className="relative min-h-0 flex-1 bg-[#0b0d12]">
          {fallback ? (
            <pre className="h-full overflow-auto p-2 font-mono text-[12px] leading-5 text-[#e6e8ee]" aria-live="polite">
              {fallbackLines.length ? fallbackLines.map((l, i) => (
                <div key={i} className={cn(l.stream === "stderr" && "text-red-400", l.stream === "system" && "text-cyan-300")}>
                  {l.line}
                </div>
              )) : <span className="text-[#9aa3b2]">No log output yet. Start the preview to see dev server output here.</span>}
            </pre>
          ) : (
            <div ref={hostRef} className="h-full w-full p-1" aria-label="Terminal output" />
          )}
          {!fallback && conn === "ended" && !hasOutput ? (
            <p className="pointer-events-none absolute inset-x-0 top-2 text-center text-xs text-[#9aa3b2]">No runtime is running. Start the preview to stream its logs here.</p>
          ) : null}
        </div>
      </section>
    </TooltipProvider>
  );
}
