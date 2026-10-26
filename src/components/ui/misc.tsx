import * as React from "react";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";

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
const alertStyles: Record<AlertVariant, { box: string; Icon: typeof Info }> = {
  info: { box: "border-info/30 bg-info/5 text-foreground", Icon: Info },
  success: { box: "border-success/30 bg-success/5 text-foreground", Icon: CheckCircle2 },
  warning: { box: "border-warning/40 bg-warning/5 text-foreground", Icon: AlertTriangle },
  danger: { box: "border-danger/40 bg-danger/5 text-foreground", Icon: XCircle },
};

export function Alert({
  variant = "info",
  title,
  children,
  className,
}: {
  variant?: AlertVariant;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const { box, Icon } = alertStyles[variant];
  return (
    <div role={variant === "danger" ? "alert" : "status"} className={cn("pop-in flex gap-3 rounded-lg border p-3.5 text-sm", box, className)}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        {title ? <p className="font-medium">{title}</p> : null}
        {children ? <div className={cn("text-muted-foreground", title && "mt-0.5")}>{children}</div> : null}
      </div>
    </div>
  );
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd>{children}</kbd>;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("pop-in flex flex-col items-center justify-center rounded-xl border border-dashed border-border-strong px-6 py-12 text-center", className)}>
      {icon ? (
        <div className="mb-4 flex size-11 items-center justify-center rounded-xl border border-border bg-surface text-muted-foreground shadow-[inset_0_1px_0_0_var(--hairline)] [&_svg]:size-5">{icon}</div>
      ) : null}
      <h3 className="text-sm font-semibold">{title}</h3>
      {description ? <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn("size-4 animate-spin", className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export function StatusDot({ status, className }: { status: "ok" | "warn" | "error" | "idle" | "busy"; className?: string }) {
  const color =
    status === "ok" ? "bg-success" : status === "warn" ? "bg-warning" : status === "error" ? "bg-danger" : status === "busy" ? "bg-primary animate-pulse-dot" : "bg-muted-foreground/50";
  return <span aria-hidden="true" className={cn("inline-block size-2 rounded-full", color, className)} />;
}
