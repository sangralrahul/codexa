import { cn } from "@/lib/utils";
import type { StageFrame } from "./script";

/** Header status: Ready → Agent working → Validating → Preview running → Live. */
export function StatusPill({ status, className }: { status: StageFrame["status"]; className?: string }) {
  const dot = {
    idle: "bg-muted-foreground/50",
    busy: "bg-signal live-dot",
    warn: "bg-warning",
    ok: "bg-success",
    live: "live-dot",
  }[status.tone];
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full border px-2 text-[11.5px] font-medium transition-colors duration-(--dur-3)",
        status.tone === "live" ? "border-success/30 bg-success/[0.08] text-success" : status.tone === "warn" ? "border-warning/30 bg-warning/[0.08] text-foreground" : "border-border bg-background/60 text-foreground/85",
        className,
      )}
    >
      <span className={cn("size-1.5 shrink-0 rounded-full", dot)} />
      <span key={status.label} className="[animation:stage-swap-in_var(--dur-3)_var(--ease-out)_both]">
        {status.label}
      </span>
    </span>
  );
}
