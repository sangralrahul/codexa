import * as React from "react";
import { Cpu, Database, Globe, Lock } from "lucide-react";
import { IllustrationBadge } from "@/components/frames/illustration-badge";
import { cn } from "@/lib/utils";

/**
 * Small CSS-only depictions for the Enterprise bento (server components, tokens only). Decorative
 * (aria-hidden): the tile's heading and text carry the meaning; each plate carries the honesty badge.
 */

function Plate({ detail, children, className }: { detail: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("relative flex flex-col rounded-[14px] bg-surface/70 p-4 shadow-[inset_0_1px_0_var(--hairline)] sm:p-5", className)}>
      <div className="mb-3 flex justify-end">
        <IllustrationBadge label="Illustration" detail={detail} />
      </div>
      <div aria-hidden="true" className="flex flex-1 flex-col justify-center">
        {children}
      </div>
    </div>
  );
}

/** A dedicated instance: its own web app, database and runner, fenced off from the shared service. */
export function IsolationVisual({ className }: { className?: string }) {
  const parts = [
    { icon: Globe, label: "Web app" },
    { icon: Database, label: "Database" },
    { icon: Cpu, label: "Runner" },
  ];
  return (
    <Plate className={className} detail="A diagram of a dedicated environment: a separate Codexa instance with its own database and runner. Agreed and provisioned per contract.">
      <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] items-stretch gap-3 text-[12px]">
        <div className="flex flex-col justify-center rounded-xl border border-dashed border-border-strong p-3 text-muted-foreground">
          <span className="font-mono text-[10px] uppercase tracking-[0.08em]">Shared service</span>
          <span className="mt-2 space-y-1.5">
            {[0, 1, 2].map((i) => (
              <span key={i} className="block h-1.5 rounded-full bg-border" style={{ width: `${85 - i * 18}%` }} />
            ))}
          </span>
        </div>
        <div className="rounded-xl border border-primary/40 bg-card p-3 shadow-[0_0_0_4px_color-mix(in_oklab,var(--primary)_8%,transparent),var(--shadow-sm)]">
          <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-primary">
            <Lock className="size-3" />
            Your instance
          </span>
          <ul className="mt-2.5 space-y-1.5">
            {parts.map((p) => (
              <li key={p.label} className="flex items-center gap-2 rounded-md bg-background/70 px-2 py-1.5 shadow-[inset_0_0_0_1px_var(--border)]">
                <p.icon className="size-3.5 text-muted-foreground" />
                <span className="text-foreground/90">{p.label}</span>
                <span className="ml-auto size-1.5 rounded-full bg-success" />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Plate>
  );
}

/** Audit log rows using the product's real action names; the subjects are sample data. */
export function AuditLogVisual({ className }: { className?: string }) {
  const rows = [
    { action: "user.login", detail: "Signed in" },
    { action: "team.role_changed", detail: "editor → admin" },
    { action: "integration.created", detail: "GitHub" },
    { action: "deployment.live", detail: "invoice-tracker v3" },
  ];
  return (
    <Plate className={className} detail="Sample entries using the audit log's real action names. Enterprise can have the log exported on request.">
      <div className="overflow-hidden rounded-xl border border-border bg-card text-[12px] shadow-sm">
        <div className="flex items-center justify-between border-b border-border bg-surface/80 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
          <span>Audit log</span>
          <span>Export on request</span>
        </div>
        <ul className="divide-y divide-border">
          {rows.map((r) => (
            <li key={r.action} className="flex items-center gap-3 px-3 py-2">
              <span className="size-1.5 shrink-0 rounded-full bg-primary/70" />
              <span className="truncate font-mono text-[11.5px] text-foreground">{r.action}</span>
              <span className="ml-auto truncate text-muted-foreground">{r.detail}</span>
            </li>
          ))}
        </ul>
      </div>
    </Plate>
  );
}
