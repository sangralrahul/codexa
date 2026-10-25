import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "primary" | "success" | "warning" | "danger" | "outline" | "accent";
const styles: Record<Variant, string> = {
  default: "bg-muted text-foreground",
  primary: "bg-primary/10 text-primary",
  accent: "bg-accent/10 text-accent",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
  outline: "border border-border text-muted-foreground",
};

export function Badge({ className, variant = "default", ...props }: React.HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium leading-4", styles[variant], className)}
      {...props}
    />
  );
}
