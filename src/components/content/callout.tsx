import * as React from "react";
import { AlertTriangle, Info, Lightbulb, ShieldAlert, Scale } from "lucide-react";
import { cn } from "@/lib/utils";

export type CalloutKind = "note" | "tip" | "warning" | "danger" | "review";

const styles: Record<CalloutKind, { box: string; label: string; Icon: typeof Info }> = {
  note: { box: "border-info/30 bg-info/5", label: "Note", Icon: Info },
  tip: { box: "border-success/30 bg-success/5", label: "Tip", Icon: Lightbulb },
  warning: { box: "border-warning/40 bg-warning/5", label: "Warning", Icon: AlertTriangle },
  danger: { box: "border-danger/40 bg-danger/5", label: "Caution", Icon: ShieldAlert },
  review: { box: "border-warning/40 bg-warning/5", label: "Requires review", Icon: Scale },
};

/**
 * Highlighted aside used in docs and rendered from markdown blockquotes that
 * start with "Note:", "Tip:", "Warning:", "Caution:" or "Review:".
 */
export function Callout({ kind = "note", title, children, className }: { kind?: CalloutKind; title?: string; children: React.ReactNode; className?: string }) {
  const { box, label, Icon } = styles[kind];
  return (
    <aside role={kind === "danger" ? "alert" : "note"} className={cn("my-5 flex gap-3 rounded-lg border p-4 text-sm", box, className)}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1 [&>p]:m-0 [&>p+p]:mt-2">
        <p className="mb-1 font-semibold">{title ?? label}</p>
        {children}
      </div>
    </aside>
  );
}

/** Visible marker for content that must be checked by legal or security before publication. */
export function ReviewNote({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <Callout kind="review" title="This page requires legal review before publication" className={className}>
      {children ?? <p>The statements above describe intended behaviour and have not yet been reviewed by legal counsel.</p>}
    </Callout>
  );
}

export const CALLOUT_PREFIX: Record<string, CalloutKind> = {
  note: "note",
  tip: "tip",
  warning: "warning",
  caution: "danger",
  danger: "danger",
  review: "review",
};
