"use client";

import * as React from "react";
import { Check, KeyRound, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useScript } from "./use-script";

const DEFAULT_KEYS = ["DATABASE_URL", "RESEND_API_KEY"];
const NEW_KEY = "STRIPE_SECRET_KEY";

/**
 * Environment variables: keys are visible, values are always masked. A new secret is typed
 * in, masked, then "Encrypted · saved" (secrets are encrypted before storage and never sent
 * back to the browser — true of Codexa). Sample keys. Final frame on the server and when calm.
 */
export function EnvVars({ playing, className, keys = DEFAULT_KEYS, newKey = NEW_KEY }: { playing?: boolean; className?: string; keys?: string[]; newKey?: string }) {
  const schedule = React.useMemo(() => [0, 500, ...Array.from({ length: newKey.length }, (_, i) => 520 + i * 45), 520 + newKey.length * 45 + 500, 520 + newKey.length * 45 + 1300], [newKey]);
  const { ref, index, started, calm } = useScript(schedule, schedule[schedule.length - 1] + 400, playing);
  const final = !started || index >= schedule.length - 1;
  const typing = started && index >= 1 && index < schedule.length - 2;
  const typed = !started ? newKey : index < 2 ? "" : newKey.slice(0, Math.min(newKey.length, index - 1));
  const masked = !started || index >= schedule.length - 2;
  const showNew = !started || index >= 1;

  return (
    <div ref={ref} aria-hidden="true" className={cn("flex w-full min-w-0 flex-col gap-2 text-[13px] [contain:inline-size]", className)}>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {keys.map((k) => (
          <div key={k} className="flex h-10 items-center gap-2.5 border-b border-border px-3 last:border-b-0">
            <KeyRound className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate font-mono text-[12px]">{k}</span>
            <span className="font-mono text-[12px] tracking-[0.2em] text-muted-foreground">••••••••</span>
            <Lock className="size-3 shrink-0 text-muted-foreground" />
          </div>
        ))}
        {showNew ? (
          <div className={cn("flex h-10 items-center gap-2.5 border-t border-border bg-signal/[0.05] px-3", started && !calm && index === 1 && "pop-in")}>
            <KeyRound className="size-3.5 shrink-0 text-signal" />
            <span className="min-w-0 flex-1 truncate font-mono text-[12px]">
              {typed}
              {typing ? <span className="caret" /> : null}
            </span>
            <span className={cn("font-mono text-[12px] tracking-[0.2em] text-muted-foreground transition-opacity duration-300", masked ? "opacity-100" : "opacity-0")}>••••••••</span>
            {final ? <Check className={cn("size-3.5 shrink-0 text-success", started && !calm && "pop-in")} /> : <Lock className="size-3 shrink-0 text-muted-foreground" />}
          </div>
        ) : null}
      </div>
      <p className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
        {final ? <span className="font-medium text-success">Encrypted · saved.</span> : null}
        <span>Values are encrypted at rest and never shown again. Sample keys.</span>
      </p>
    </div>
  );
}
