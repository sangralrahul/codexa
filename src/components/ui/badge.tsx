import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "primary" | "success" | "warning" | "danger" | "outline" | "accent" | "signal" | "info";
const styles: Record<Variant, string> = {
  default: "bg-muted text-foreground shadow-[inset_0_0_0_1px_var(--border)]",
  primary: "bg-primary/10 text-primary",
  accent: "bg-accent/12 text-accent",
  success: "bg-success/12 text-success",
  warning: "bg-warning/12 text-warning",
  danger: "bg-danger/12 text-danger",
  // Kept for callers; the app has no ember accent any more, so it reads as the primary badge.
  signal: "bg-primary/10 text-primary",
  info: "bg-info/12 text-info",
  outline: "border border-border text-muted-foreground",
};

export function Badge({ className, variant = "default", ...props }: React.HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium leading-4 [&_svg]:size-3", styles[variant], className)} {...props} />;
}
