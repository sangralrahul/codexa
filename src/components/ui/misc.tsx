import * as React from "react";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { ModKey } from "./kbd";

export function Separator({ className, orientation = "horizontal" }: { className?: string; orientation?: "horizontal" | "vertical" }) {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={cn("shrink-0 bg-border", orientation === "horizontal" ? "h-px w-full" : "h-full w-px", className)}
    />
  );
}

export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div aria-hidden="true" style={style} className={cn("skeleton rounded-md bg-muted", className)} />;
}

type AlertVariant = "info" | "success" | "warning" | "danger";
const alertStyles: Record<AlertVariant, { box: string; icon: string; Icon: typeof Info }> = {
  info: { box: "border-info/25 bg-info/[0.06]", icon: "text-info", Icon: Info },
  success: { box: "border-success/25 bg-success/[0.06]", icon: "text-success", Icon: CheckCircle2 },
  warning: { box: "border-warning/30 bg-warning/[0.07]", icon: "text-warning", Icon: AlertTriangle },
  danger: { box: "border-danger/30 bg-danger/[0.06]", icon: "text-danger", Icon: XCircle },
};

/**
 * Inline message. By default danger is role=alert and the rest role=status (announced).
 * Static notes on content pages pass `live={false}` → role=note (not announced on load).
 */
export function Alert({
  variant = "info",
  title,
  children,
  className,
  live,
  action,
}: {
  variant?: AlertVariant;
  title?: string;
  children?: React.ReactNode;
  className?: string;
  live?: boolean;
  /** Right-aligned action (button or link). */
  action?: React.ReactNode;
}) {
  const { box, icon, Icon } = alertStyles[variant];
  const role = live === false ? "note" : variant === "danger" ? "alert" : "status";
  return (
    <div role={role} className={cn("pop-in flex gap-3 rounded-xl border p-3.5 text-sm text-foreground shadow-[inset_0_1px_0_var(--hairline)]", box, className)}>
      <Icon className={cn("mt-0.5 size-4 shrink-0", icon)} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title ? <p className="font-medium">{title}</p> : null}
        {children ? <div className={cn("text-muted-foreground", title && "mt-0.5")}>{children}</div> : null}
      </div>
      {action ? <div className="shrink-0 self-center">{action}</div> : null}
    </div>
  );
}

/**
 * Keyboard key. `mod` prefixes the platform modifier ("⌘" on Apple, "Ctrl" elsewhere),
 * e.g. <Kbd mod>K</Kbd> → "⌘ K" / "Ctrl K". The 4px gap keeps "Ctrl" and the key apart
 * visually, and a collapsed space keeps them apart in the text ("Ctrl K", never "CtrlK").
 * Server-safe (the modifier resolves on the client).
 */
export function Kbd({ children, mod = false, className, ...rest }: { children?: React.ReactNode; mod?: boolean; className?: string; "aria-hidden"?: boolean | "true" | "false" }) {
  return (
    <kbd {...rest} className={cn("inline-flex h-5 min-w-5 items-center justify-center gap-1 rounded-[5px] px-1 font-sans text-[11px] font-medium leading-none text-muted-foreground", className)}>
      {mod ? <ModKey /> : null}
      {mod && children != null && children !== false ? " " : null}
      {children}
    </kbd>
  );
}

/** Small framed scene for the illustrated empty state ("lights-off" product frame). */
function EmptyIllustration({ icon }: { icon?: React.ReactNode }) {
  return (
    <div aria-hidden="true" className="relative mb-6 w-full max-w-[260px]">
      <div className="e2 overflow-hidden rounded-[14px]">
        <div className="flex items-center gap-1.5 border-b border-border px-3 py-2">
          <span className="h-1.5 w-10 rounded-full bg-border-strong/70" />
          <span className="ml-auto h-1.5 w-6 rounded-full bg-border" />
        </div>
        <div className="relative space-y-2 p-3">
          <div className="bg-blueprint absolute inset-0 opacity-80" />
          <div className="relative flex gap-2">
            <span className="h-10 flex-1 rounded-md border border-dashed border-border-strong" />
            <span className="h-10 flex-1 rounded-md border border-dashed border-border-strong" />
          </div>
          <span className="relative block h-1.5 w-3/4 rounded-full bg-border" />
          <span className="relative block h-1.5 w-1/2 rounded-full bg-border" />
        </div>
      </div>
      {icon ? (
        <div className="rim absolute -bottom-4 left-1/2 flex size-10 -translate-x-1/2 items-center justify-center rounded-xl border border-border-strong bg-card text-foreground shadow-lg [&_svg]:size-[18px]">
          {icon}
        </div>
      ) : null}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  variant = "default",
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  /** "illustrated" draws a small framed product scene above the copy. */
  variant?: "default" | "illustrated";
  className?: string;
}) {
  const illustrated = variant === "illustrated";
  return (
    <div
      className={cn(
        "pop-in flex flex-col items-center justify-center rounded-2xl px-6 text-center",
        illustrated ? "keylight border border-border py-14" : "border border-dashed border-border-strong py-12",
        className,
      )}
    >
      {illustrated ? (
        <EmptyIllustration icon={icon} />
      ) : icon ? (
        <div className="mb-4 flex size-11 items-center justify-center rounded-xl border border-border bg-surface text-muted-foreground shadow-[inset_0_1px_0_0_var(--hairline)] [&_svg]:size-5">{icon}</div>
      ) : null}
      <h3 className={cn("font-semibold tracking-tight", illustrated ? "mt-2 text-base" : "text-sm")}>{title}</h3>
      {description ? <p className="mt-1.5 max-w-sm text-pretty text-sm text-muted-foreground">{description}</p> : null}
      {action || secondaryAction ? (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {action}
          {secondaryAction}
        </div>
      ) : null}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn("size-4 animate-spin", className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Status dot. `pulse` adds the expanding live ring — only for things that are really
 * happening (a running preview, a live deploy). "busy" pulses by default.
 */
export function StatusDot({ status, pulse, className }: { status: "ok" | "warn" | "error" | "idle" | "busy"; pulse?: boolean; className?: string }) {
  const color =
    status === "ok" ? "bg-success" : status === "warn" ? "bg-warning" : status === "error" ? "bg-danger" : status === "busy" ? "bg-primary" : "bg-muted-foreground/50";
  const ring = pulse ?? status === "busy";
  return <span aria-hidden="true" className={cn("inline-block size-2 shrink-0 rounded-full", color, ring && "live-dot", className)} />;
}

/** 6px live dot with a 1.6s expanding ring (static when calm). Decorative: pair it with text. */
export function LiveDot({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("live-dot", className)} />;
}
