import * as React from "react";
import { Code2, ExternalLink, Eye, Globe, Lock, Monitor, RotateCw, Smartphone, Tablet, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { CodeLines } from "@/components/vignettes/code-lines";
import { FileRow } from "@/components/vignettes/file-row";
import { StepRow } from "@/components/vignettes/step-row";
import { DeviceFrame } from "@/components/frames/device-frame";
import { TemplatePreview } from "@/components/templates/template-preview";
import type { Token } from "@/components/vignettes/tokenize";
import type { Scenario } from "../types";
import type { StageFrame } from "./script";

const TERMINAL_TONE = {
  cmd: "text-code-fg",
  ok: "text-syn-string",
  error: "text-syn-tag",
  muted: "text-code-muted",
  warn: "text-syn-number",
} as const;

function basename(p: string) {
  return p.split("/").pop() ?? p;
}

/** The decorative Preview | Code switch with a gliding pill (driven by the script, not clickable). */
export function ViewSwitch({ view, className }: { view: "code" | "preview"; className?: string }) {
  return (
    <span className={cn("relative inline-grid grid-cols-2 items-center rounded-[9px] bg-muted p-0.5 shadow-[inset_0_0_0_1px_var(--border)]", className)}>
      <span
        className="absolute inset-y-0.5 left-0.5 w-[calc(50%-2px)] rounded-[7px] bg-card shadow-[var(--shadow-sm),inset_0_0_0_1px_var(--border)] transition-transform duration-[380ms] ease-snap calm:transition-none"
        style={{ transform: view === "code" ? "translateX(100%)" : "translateX(0)" }}
      />
      {(["preview", "code"] as const).map((v) => (
        <span key={v} className={cn("relative z-[1] inline-flex h-6 items-center justify-center gap-1.5 px-2.5 text-[12px] font-medium transition-colors duration-300", view === v ? "text-foreground" : "text-muted-foreground")}>
          {v === "preview" ? <Eye className="size-3.5" /> : <Code2 className="size-3.5" />}
          {v === "preview" ? "Preview" : "Code"}
        </span>
      ))}
    </span>
  );
}

function Terminal({ frame, illustrative, className }: { frame: StageFrame; illustrative: string; className?: string }) {
  const errors = frame.errorLine !== null ? 1 : 0;
  return (
    <div
      className={cn(
        "absolute inset-x-0 bottom-0 z-[2] border-t border-code-border bg-code-bg transition-[translate,opacity] duration-(--dur-4) ease-out calm:transition-none",
        frame.terminalOpen ? "translate-y-0 opacity-100" : "translate-y-full opacity-0",
        className,
      )}
    >
      <div className="flex h-8 items-center gap-3 border-b border-code-border px-3 text-[11px] text-code-muted">
        <span className="font-medium text-code-fg/85">Terminal</span>
        <span className="inline-flex items-center gap-1.5">
          Problems
          <span className={cn("rounded-full px-1.5 tabular-nums leading-4", errors ? "bg-syn-tag/20 text-syn-tag" : "bg-code-fg/10 text-code-muted")}>{errors}</span>
        </span>
        {frame.errorLine !== null || frame.repairing ? <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.1em] text-syn-tag/90">{illustrative}</span> : null}
      </div>
      <div className="flex min-h-[7.25rem] flex-col justify-end gap-0.5 px-3 py-2 font-mono text-[11.5px] leading-[1.6]">
        {frame.terminal.slice(-5).map((l, i, arr) => (
          <p key={`${frame.terminal.length - arr.length + i}`} className={cn("truncate code-line-in", TERMINAL_TONE[l.tone])}>
            {l.text}
          </p>
        ))}
      </div>
    </div>
  );
}

function CodeView({ frame, scenario, tokens, illustrative }: { frame: StageFrame; scenario: Scenario; tokens: Token[][]; illustrative: string }) {
  const fresh = new Set(frame.explorerFresh);
  return (
    <div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-[176px_minmax(0,1fr)]">
      {(
        <div className="hidden min-h-0 overflow-hidden border-r border-border bg-surface/50 py-2 lg:block">
          <p className="px-3 pb-1.5 text-[11px] font-medium text-muted-foreground">Files</p>
          <div className="space-y-px px-1.5">
            {scenario.files.map((p) =>
              fresh.has(p) ? (
                <FileRow key={`${p}-fresh`} path={p} fresh action={scenario.writes.find((w) => w.path === p)?.action} active={frame.activeTab === p} className="h-6 text-[11.5px]" />
              ) : (
                <FileRow key={p} path={p} active={frame.activeTab === p} className="h-6 text-[11.5px]" />
              ),
            )}
          </div>
        </div>
      )}
      <div className="relative flex min-h-0 min-w-0 flex-col overflow-hidden bg-code-bg">
        {/* Tabs */}
        <div className="flex h-9 shrink-0 items-stretch overflow-hidden border-b border-code-border">
          {frame.tabs.length === 0 ? <span className="flex items-center px-3 font-mono text-[11px] text-code-muted">No files open</span> : null}
          {frame.tabs.map((t) => {
            const active = t === frame.activeTab;
            return (
              <span
                key={t}
                className={cn(
                  "relative flex shrink-0 items-center gap-1.5 border-r border-code-border px-3 font-mono text-[11.5px] [animation:materialize-icon_var(--dur-4)_var(--ease-spring)_both]",
                  active ? "bg-code-fg/[0.06] text-code-fg" : "text-code-muted",
                )}
              >
                {active ? <span className="absolute inset-x-0 top-0 h-[2px] bg-signal" /> : null}
                <span className={cn("size-1.5 rounded-full", t.endsWith(".css") ? "bg-syn-attr" : t.endsWith(".tsx") ? "bg-syn-fn" : "bg-syn-number")} />
                {basename(t)}
                <span className="text-[10px] text-syn-string">{scenario.writes.find((w) => w.path === t)?.action === "A" ? "A" : "M"}</span>
              </span>
            );
          })}
        </div>
        {/* Editor body */}
        <div className="relative min-h-0 flex-1 overflow-hidden px-1 py-2.5">
          {frame.activeTab === scenario.mainFile && frame.revealed > 0 ? (
            <CodeLines
              tokens={tokens}
              revealed={frame.streaming ? frame.revealed : undefined}
              caret={frame.streaming}
              errorLines={frame.errorLine !== null ? [frame.errorLine] : undefined}
              highlight={frame.fixedLine !== null ? [frame.fixedLine] : undefined}
            />
          ) : frame.writing ? (
            <div className="space-y-2 px-3 pt-1">
              <p className="mb-3 font-mono text-[11px] text-code-muted">
                Writing <span className="text-code-fg/85">{frame.writing}</span>
                <span className="caret" />
              </p>
              {[72, 54, 88, 40, 66, 80, 34, 58].map((w, i) => (
                <span key={i} className="skeleton block h-2.5 rounded-full bg-code-fg/[0.07]" style={{ width: `${w}%` }} />
              ))}
            </div>
          ) : frame.activeTab === scenario.mainFile ? null : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center font-mono text-[11.5px] text-code-muted">
              <Code2 className="size-5 opacity-60" />
              <span>The agent opens files as it edits them</span>
            </div>
          )}
          {frame.errorLine !== null ? (
            <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-md bg-syn-tag/15 px-1.5 py-0.5 font-mono text-[10.5px] text-syn-tag">
              <TriangleAlert className="size-3" /> {illustrative}
            </span>
          ) : null}
        </div>
        <Terminal frame={frame} illustrative={illustrative} />
      </div>
    </div>
  );
}

function PreviewView({ frame, scenario, urlRef }: { frame: StageFrame; scenario: Scenario; urlRef?: React.Ref<HTMLSpanElement> }) {
  const live = frame.publish === "live";
  const host = live ? `${scenario.slug}.example.com` : `${scenario.slug}.preview.example.com`;
  return (
    <div className="relative flex h-full min-h-0 flex-col gap-2.5 bg-surface/40 p-3">
      <div aria-hidden="true" className="bg-dots pointer-events-none absolute inset-0 opacity-70" />
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[12px] border border-border-strong bg-card shadow-lg">
        <div className="flex h-9 shrink-0 items-center gap-2 border-b border-border bg-surface/80 px-2.5">
          <RotateCw className={cn("size-3.5 text-muted-foreground transition-transform duration-500", frame.previewWipe && "rotate-180")} />
          <span
            ref={urlRef}
            className={cn(
              "flex h-6 min-w-0 flex-1 items-center gap-1.5 rounded-full bg-muted px-2.5 font-mono text-[11px] shadow-[inset_0_0_0_1px_var(--border)] transition-[box-shadow] duration-(--dur-4)",
              live && "shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--success)_45%,transparent)]",
            )}
          >
            {live ? <Globe className="size-3 shrink-0 text-success" /> : <Lock className="size-3 shrink-0 text-muted-foreground" />}
            <span key={host} className="truncate text-foreground/85 [animation:stage-swap-in_var(--dur-3)_var(--ease-out)_both]">
              {host}
            </span>
            {live ? <span className="live-dot ml-auto" /> : null}
          </span>
          <span className="hidden items-center gap-0.5 rounded-md bg-muted p-0.5 lg:flex">
            {([Monitor, Tablet, Smartphone] as const).map((Icon, i) => (
              <span
                key={i}
                className={cn(
                  "inline-flex size-5 items-center justify-center rounded-[5px] transition-colors duration-300",
                  (i === 0 && frame.device === "desktop") || (i === 1 && frame.device === "tablet") ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
                )}
              >
                <Icon className="size-3" />
              </span>
            ))}
          </span>
          <ExternalLink className="size-3.5 text-muted-foreground" />
        </div>
        <div className="relative min-h-0 flex-1 bg-surface/60">
          {frame.previewShown ? (
            <div className="absolute inset-0 flex items-start justify-center p-3 [container-type:size]">
              <DeviceFrame device={frame.device} fit="height" className={cn(frame.previewWipe && "wipe-in")}>
                <TemplatePreview id={scenario.id} category={scenario.categoryName} className="size-full rounded-none border-0 shadow-none" imgClassName="size-full aspect-auto object-cover object-top" />
              </DeviceFrame>
            </div>
          ) : (
            <div className="absolute inset-0 p-4">
              <div className="grid h-full grid-cols-[22%_1fr] gap-3 opacity-80">
                <div className="space-y-2">
                  {[60, 80, 70, 50].map((w, i) => (
                    <span key={i} className="skeleton block h-2.5 rounded-full bg-foreground/[0.06]" style={{ width: `${w}%` }} />
                  ))}
                </div>
                <div className="space-y-3">
                  <span className="skeleton block h-16 rounded-lg bg-foreground/[0.05]" />
                  <div className="grid grid-cols-3 gap-2">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="skeleton block h-12 rounded-lg bg-foreground/[0.05]" />
                    ))}
                  </div>
                  <span className="skeleton block h-24 rounded-lg bg-foreground/[0.05]" />
                </div>
              </div>
              {frame.boot ? (
                <div className="glass absolute left-1/2 top-1/2 w-[min(18rem,80%)] -translate-x-1/2 -translate-y-1/2 rounded-[12px] border border-border px-3 py-2.5 shadow-lg [animation:pop-in_var(--dur-4)_var(--ease-out)_both]">
                  <ol>
                    <StepRow state={frame.boot.container} label="Starting container" connector />
                    <StepRow state={frame.boot.server} label="Dev server" detail={scenario.devCommand} />
                  </ol>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
      {frame.versionsVisible ? (
        <div className="glass absolute bottom-5 left-5 z-[2] w-56 rounded-[12px] border border-border p-2 shadow-xl [animation:pop-in_var(--dur-4)_var(--ease-out)_both]">
          <p className="px-1 pb-1.5 text-[11px] font-medium text-muted-foreground">Deployments</p>
          <div className="relative space-y-1">
            <span
              className="absolute right-1.5 top-[7px] z-[1] inline-flex h-5 items-center gap-1 rounded-full bg-success/15 px-1.5 text-[10.5px] font-medium text-success transition-transform duration-[420ms] ease-spring calm:transition-none"
              style={{ transform: frame.liveOnNew ? "translateY(0)" : "translateY(36px)" }}
            >
              <span className="live-dot" /> Live
            </span>
            {[
              { id: "v2", note: "This run" },
              { id: "v1", note: "Starter" },
            ].map((v, i) => (
              <div key={v.id} className={cn("flex h-8 items-center gap-2 rounded-[8px] border px-2 text-[11.5px]", (i === 0) === frame.liveOnNew ? "border-success/30 bg-success/[0.05]" : "border-border bg-card/80")}>
                <span className="w-5 font-mono font-semibold">{v.id}</span>
                <span className="min-w-0 truncate text-muted-foreground">{v.note}</span>
              </div>
            ))}
          </div>
          <p className="px-1 pt-1.5 text-[10.5px] text-muted-foreground">Sample domain · roll back any version</p>
        </div>
      ) : null}
    </div>
  );
}

/** The canvas card: Preview | Code, the code view (explorer, tabs, editor, terminal) or the framed preview. */
export function CanvasPane({
  frame,
  scenario,
  tokens,
  illustrative,
  urlRef,
  className,
}: {
  frame: StageFrame;
  scenario: Scenario;
  tokens: Token[][];
  illustrative: string;
  urlRef?: React.Ref<HTMLSpanElement>;
  className?: string;
}) {
  const crumb = frame.view === "code" ? (frame.activeTab ?? "") : "";
  return (
    <div className={cn("flex min-h-0 min-w-0 flex-col overflow-hidden rounded-[12px] border border-border bg-card shadow-sm", className)}>
      <div className="flex h-10 shrink-0 items-center gap-3 border-b border-border px-2.5">
        <ViewSwitch view={frame.view} />
        <span className="min-w-0 truncate font-mono text-[11px] text-muted-foreground">{crumb}</span>
        <span className="ml-auto hidden shrink-0 items-center gap-1.5 text-[11px] text-muted-foreground xl:inline-flex">
          {frame.previewShown ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/70 px-2 py-0.5 [animation:pop-in_var(--dur-4)_var(--ease-out)_both]">
              <span className="size-1.5 rounded-full bg-success" /> Updated · {scenario.writes.length} files
            </span>
          ) : (
            <span>{scenario.frameworkName}</span>
          )}
        </span>
      </div>
      <div className="relative min-h-0 flex-1">
        <div className={cn("absolute inset-0 transition-[opacity,translate] duration-(--dur-4) ease-out calm:transition-none", frame.view === "code" ? "opacity-100" : "pointer-events-none -translate-x-3 opacity-0")}>
          <CodeView frame={frame} scenario={scenario} tokens={tokens} illustrative={illustrative} />
        </div>
        <div className={cn("absolute inset-0 transition-[opacity,translate] duration-(--dur-4) ease-out calm:transition-none", frame.view === "preview" ? "opacity-100" : "pointer-events-none translate-x-3 opacity-0")}>
          <PreviewView frame={frame} scenario={scenario} urlRef={urlRef} />
        </div>
      </div>
    </div>
  );
}

export { Terminal, CodeView, PreviewView };
