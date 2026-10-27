import { TemplatePreview } from "@/components/templates/template-preview";
import { cn } from "@/lib/utils";

/**
 * Small DOM-drawn product illustrations for the docs "Start here" tiles (Prompt → Preview →
 * Deploy). Decorative (aria-hidden), token-only, labelled "Illustration" by the caller; the
 * Preview art uses a real starter screenshot.
 */
function Frame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div aria-hidden="true" className={cn("relative h-40 overflow-hidden rounded-[14px] border border-border bg-surface", className)}>
      <div className="bg-dots absolute inset-0 opacity-80" />
      {children}
    </div>
  );
}

export function PromptArt() {
  return (
    <Frame>
      <div className="rim absolute inset-x-5 top-6 rounded-[14px] border border-border-strong bg-card p-3 shadow-lg transition-[translate,box-shadow] duration-(--dur-4) ease-out [--rim-opacity:0.8] group-hover:-translate-y-1 group-hover:shadow-xl calm:group-hover:translate-y-0">
        <p className="text-[12.5px] leading-snug text-foreground/85">
          A habit tracker with weekly streaks and a progress chart
          {/* The caret blinks only while the tile is hovered or focused (never on its own). */}
          <span className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[0.18em] bg-signal group-focus-visible:animate-[caret_1s_steps(1)_infinite] group-hover:animate-[caret_1s_steps(1)_infinite] calm:animate-none!" />
        </p>
        <div className="mt-3 flex items-center justify-between">
          <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">Starter: Auto</span>
          <span className="inline-flex h-6 items-center rounded-full bg-foreground px-2.5 text-[11px] font-medium text-background">Build it</span>
        </div>
      </div>
    </Frame>
  );
}

export function PreviewArt() {
  return (
    <Frame>
      <div className="absolute inset-x-5 top-5 overflow-hidden rounded-[10px] border border-border-strong bg-card shadow-lg">
        <div className="flex h-5 items-center gap-1 border-b border-border bg-surface px-2">
          <span className="size-1.5 rounded-full bg-border-strong" />
          <span className="size-1.5 rounded-full bg-border-strong" />
          <span className="ml-1.5 h-2 flex-1 rounded-full bg-muted" />
        </div>
        <TemplatePreview id="vite-react-dashboard" category="dashboards" sizes="280px" className="rounded-none border-0 shadow-none" />
      </div>
      <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2 py-0.5 font-mono text-[10px] text-muted-foreground shadow-sm">
        <span className="size-1.5 rounded-full bg-success" /> preview
      </span>
    </Frame>
  );
}

export function DeployArt() {
  const rows = [
    { v: "v3", note: "Add streak badges", live: true },
    { v: "v2", note: "Weekly chart", live: false },
    { v: "v1", note: "First deploy", live: false },
  ];
  return (
    <Frame>
      <div className="absolute inset-x-5 top-5 rounded-[12px] border border-border-strong bg-card p-1.5 shadow-lg transition-[translate,box-shadow] duration-(--dur-4) ease-out group-hover:-translate-y-1 group-hover:shadow-xl calm:group-hover:translate-y-0">
        {rows.map((r) => (
          <div key={r.v} className={cn("flex items-center gap-2 rounded-md px-2 py-1.5 text-[11.5px]", r.live && "bg-surface-2")}>
            <span className="font-mono text-muted-foreground">{r.v}</span>
            <span className="min-w-0 flex-1 truncate text-foreground/85">{r.note}</span>
            {r.live ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-success/12 px-1.5 py-px text-[10px] font-medium text-success">
                <span className="size-1.5 rounded-full bg-success" /> Live
              </span>
            ) : (
              <span className="text-[10px] text-foreground-dim">Roll back</span>
            )}
          </div>
        ))}
      </div>
    </Frame>
  );
}
