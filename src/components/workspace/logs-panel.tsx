"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDownToLine, Check, Copy, TerminalSquare, Trash2 } from "lucide-react";
import type { ITheme, Terminal } from "@xterm/xterm";
import type { FitAddon } from "@xterm/addon-fit";
import { useTheme } from "@/components/theme/theme-provider";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { cssColor, cssColorAlpha } from "@/lib/client/workspace/css-colors";
import { useLogSnapshot, useRuntime } from "@/lib/client/workspace/runtime";
import type { LogLine } from "@/lib/runtime/types";
import { stripAnsi } from "@/lib/client/workspace/problems";
import { toolButton } from "./panel-tabs";

/**
 * The dock's terminal: the runtime's stdout/stderr/system lines (one SSE stream owned by
 * WorkspaceRuntimeProvider) written into xterm.js with a full ANSI palette read from the
 * design tokens. Falls back to a plain <pre> when xterm cannot be loaded or opened.
 */
const MAX_LINES = 5000;
const COLORS = { stdout: "", stderr: "\x1b[31m", system: "\x1b[36m" } as const;
const RESET = "\x1b[0m";

/** xterm needs concrete colours: every ANSI slot is a token (or a token mixed toward white). */
function terminalTheme(): ITheme {
  const bright = (token: string) => cssColor(`color-mix(in oklab, var(${token}) 72%, white)`);
  return {
    background: cssColor("var(--code-bg)"),
    foreground: cssColor("var(--code-fg)"),
    cursor: cssColor("var(--code-bg)"),
    cursorAccent: cssColor("var(--code-bg)"),
    selectionBackground: cssColorAlpha("var(--primary)", 0.3),
    black: cssColor("color-mix(in oklab, var(--code-bg) 70%, var(--code-fg))"),
    red: cssColor("var(--danger)"),
    green: cssColor("var(--success)"),
    yellow: cssColor("var(--warning)"),
    blue: cssColor("var(--info)"),
    magenta: cssColor("var(--accent)"),
    cyan: cssColor("var(--syn-attr)"),
    white: cssColor("var(--code-fg)"),
    brightBlack: cssColor("var(--code-muted)"),
    brightRed: bright("--danger"),
    brightGreen: bright("--success"),
    brightYellow: bright("--signal-2"),
    brightBlue: bright("--info"),
    brightMagenta: bright("--accent"),
    brightCyan: bright("--syn-type"),
    brightWhite: cssColor("color-mix(in oklab, var(--code-fg) 70%, white)"),
  };
}

const writeLine = (term: Terminal, l: LogLine) => term.write(`${COLORS[l.stream]}${l.line.replace(/\r?\n/g, "\r\n")}${RESET}\r\n`);

export function LogsPanel({ visible = true }: { visible?: boolean }) {
  const rt = useRuntime();
  const store = rt.logs;
  const snap = useLogSnapshot(store);
  const { resolved } = useTheme();
  const hostRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const [fallback, setFallback] = useState(false);
  const [autoscroll, setAutoscroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const autoscrollRef = useRef(true);
  useEffect(() => {
    autoscrollRef.current = autoscroll;
  }, [autoscroll]);

  // Mount xterm (client only). Any failure flips to the <pre> fallback.
  useEffect(() => {
    let disposed = false;
    let term: Terminal | null = null;
    let ro: ResizeObserver | null = null;
    let offLine: (() => void) | null = null;
    let offClear: (() => void) | null = null;
    (async () => {
      try {
        const [{ Terminal }, { FitAddon }] = await Promise.all([import("@xterm/xterm"), import("@xterm/addon-fit")]);
        await import("@xterm/xterm/css/xterm.css");
        if (disposed || !hostRef.current) return;
        term = new Terminal({
          convertEol: true,
          disableStdin: true,
          fontSize: 12.5,
          lineHeight: 1.35,
          fontFamily: "var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, monospace",
          scrollback: MAX_LINES,
          theme: terminalTheme(),
        });
        const fit = new FitAddon();
        term.loadAddon(fit);
        term.open(hostRef.current);
        try {
          fit.fit();
        } catch {
          /* hidden on mount */
        }
        termRef.current = term;
        fitRef.current = fit;
        for (const l of store.lines) writeLine(term, l);
        term.scrollToBottom();
        offLine = store.onLine((l) => {
          if (!termRef.current) return;
          writeLine(termRef.current, l);
          if (autoscrollRef.current) termRef.current.scrollToBottom();
        });
        offClear = store.onClear(() => termRef.current?.clear());
        ro = new ResizeObserver(() => {
          try {
            fit.fit();
          } catch {
            /* hidden */
          }
        });
        ro.observe(hostRef.current);
      } catch {
        if (!disposed) setFallback(true);
      }
    })();
    return () => {
      disposed = true;
      offLine?.();
      offClear?.();
      ro?.disconnect();
      term?.dispose();
      termRef.current = null;
    };
  }, [store]);

  // Follow the site theme (tokens are re-read after the class flips).
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      if (termRef.current) termRef.current.options.theme = terminalTheme();
    });
    return () => cancelAnimationFrame(raf);
  }, [resolved]);

  // Re-fit when the dock is revealed.
  useEffect(() => {
    if (!visible) return;
    const raf = requestAnimationFrame(() => {
      try {
        fitRef.current?.fit();
      } catch {
        /* still hidden */
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [visible]);

  const copy = async () => {
    const text = store.lines.map((l) => `[${l.stream}] ${l.line}`).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };

  const connLabel = snap.conn === "live" ? "Streaming" : snap.conn === "connecting" ? "Connecting" : snap.conn === "ended" ? "No runtime" : "Reconnecting";

  return (
    <section className="flex h-full min-h-0 flex-col bg-code-bg" aria-label="Terminal">
      {/* A slim terminal bar, so the controls never sit on top of output (phones included). */}
      <div className="flex h-8 shrink-0 items-center gap-1 border-b border-code-border pl-3 pr-1 text-code-muted">
        <span className={cn("size-1.5 shrink-0 rounded-full", snap.conn === "live" ? "bg-success" : snap.conn === "error" ? "bg-warning" : "bg-code-muted/60")} aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate font-mono text-[11px]">
          {connLabel}
          {snap.total ? <span className="text-code-muted/70"> · {snap.total.toLocaleString("en-US")} line{snap.total === 1 ? "" : "s"}</span> : null}
        </span>
        <Tooltip content={autoscroll ? "Autoscroll on" : "Autoscroll off"}>
          <button type="button" aria-label="Toggle autoscroll" aria-pressed={autoscroll} onClick={() => setAutoscroll((v) => !v)} className={cn(toolButton, "size-6 text-code-muted hover:bg-code-fg/10 hover:text-code-fg aria-pressed:bg-code-fg/10 aria-pressed:text-code-fg")}>
            <ArrowDownToLine className="size-3.5" aria-hidden="true" />
          </button>
        </Tooltip>
        <Tooltip content={copied ? "Copied" : "Copy logs"}>
          <button type="button" aria-label="Copy logs" onClick={() => void copy()} className={cn(toolButton, "size-6 text-code-muted hover:bg-code-fg/10 hover:text-code-fg")}>
            {copied ? <Check className="pop-in size-3.5 text-success" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
          </button>
        </Tooltip>
        <Tooltip content="Clear">
          <button type="button" aria-label="Clear logs" onClick={() => store.clear()} className={cn(toolButton, "size-6 text-code-muted hover:bg-code-fg/10 hover:text-code-fg")}>
            <Trash2 className="size-3.5" aria-hidden="true" />
          </button>
        </Tooltip>
      </div>
      <div className="relative min-h-0 flex-1 bg-code-bg">
        {fallback ? (
          <pre className="h-full overflow-auto p-3 font-mono text-[12.5px] leading-5 text-code-fg">
            {store.lines.length ? (
              store.lines.slice(-1000).map((l, i) => (
                <div key={i} className={cn(l.stream === "stderr" && "text-danger", l.stream === "system" && "text-syn-attr")}>
                  {stripAnsi(l.line)}
                </div>
              ))
            ) : (
              <span className="text-code-muted">No log output yet. Start the preview to see dev server output here.</span>
            )}
          </pre>
        ) : (
          <div ref={hostRef} className="h-full w-full px-3 py-2" aria-label="Terminal output" role="log" />
        )}
        {!fallback && !snap.total ? (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center text-code-muted">
            <TerminalSquare className="size-6" aria-hidden="true" />
            <p className="text-[12.5px]">{snap.conn === "ended" ? "No runtime is running. Start the preview to stream its logs here." : "Waiting for output from the dev server…"}</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
