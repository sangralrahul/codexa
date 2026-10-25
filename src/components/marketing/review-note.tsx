import { ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Visible callout for content that must be reviewed by counsel or the
 * security team before it is treated as binding. Never remove it silently.
 */
export function ReviewNote({ kind = "legal", className, children }: { kind?: "legal" | "security" | "both"; className?: string; children?: React.ReactNode }) {
  const who = kind === "both" ? "legal and security" : kind;
  return (
    <aside role="note" aria-label="Review required" className={cn("flex gap-3 rounded-lg border border-warning/40 bg-warning/5 p-4 text-sm", className)}>
      <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
      <div>
        <p className="font-medium">Requires {who} review</p>
        <p className="mt-0.5 text-muted-foreground">
          {children ?? `This page is a working draft written by the product team. It requires ${who} review before publication and should not be relied on as a binding statement until that review is complete.`}
        </p>
      </div>
    </aside>
  );
}
