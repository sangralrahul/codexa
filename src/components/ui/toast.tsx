"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Kind = "success" | "error" | "info";
type ToastItem = { id: number; kind: Kind; title: string; description?: string; leaving?: boolean };

let items: ToastItem[] = [];
let seq = 0;
const listeners = new Set<() => void>();
const timers = new Map<number, { timeout: number; remaining: number; started: number }>();
const emit = () => listeners.forEach((l) => l());

function dismiss(id: number) {
  const t = timers.get(id);
  if (t) clearTimeout(t.timeout);
  timers.delete(id);
  items = items.map((t) => (t.id === id ? { ...t, leaving: true } : t));
  emit();
  setTimeout(() => {
    items = items.filter((t) => t.id !== id);
    emit();
  }, 170);
}

function schedule(id: number, ms: number) {
  const timeout = window.setTimeout(() => dismiss(id), ms);
  timers.set(id, { timeout, remaining: ms, started: Date.now() });
}

function pauseAll() {
  for (const [id, t] of timers) {
    clearTimeout(t.timeout);
    timers.set(id, { ...t, remaining: Math.max(800, t.remaining - (Date.now() - t.started)) });
  }
}

function resumeAll() {
  for (const [id, t] of timers) schedule(id, t.remaining);
}

function push(kind: Kind, title: string, description?: string) {
  const id = ++seq;
  const dropped = items.slice(0, Math.max(0, items.length - 3));
  dropped.forEach((t) => timers.get(t.id) && clearTimeout(timers.get(t.id)!.timeout));
  items = [...items.slice(-3), { id, kind, title, description }];
  emit();
  schedule(id, kind === "error" ? 6000 : 3500);
  return id;
}

/** Small confirmations after an action: toast.success("Project renamed"). Hovering the stack pauses the timers. */
export const toast = {
  success: (title: string, description?: string) => push("success", title, description),
  error: (title: string, description?: string) => push("error", title, description),
  info: (title: string, description?: string) => push("info", title, description),
  dismiss,
};

const ICONS = { success: CheckCircle2, error: XCircle, info: Info };
const TONES = { success: "text-success", error: "text-danger", info: "text-info" };

/** Mounted once in the root layout; renders the toast stack bottom-right (bottom-centre on phones). */
export function Toaster() {
  const list = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => items,
    () => items,
  );
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);
  if (!mounted) return null;
  return (
    <div
      aria-live="polite"
      aria-relevant="additions"
      onPointerEnter={pauseAll}
      onPointerLeave={resumeAll}
      className="pointer-events-none fixed inset-x-3 bottom-3 z-[100] flex flex-col items-center gap-2 sm:inset-x-auto sm:bottom-4 sm:right-4 sm:w-[360px] sm:items-stretch"
    >
      {list.map((t) => {
        const Icon = ICONS[t.kind];
        return (
          <div
            key={t.id}
            role={t.kind === "error" ? "alert" : "status"}
            className={cn(
              "glass pointer-events-auto flex w-full max-w-[360px] items-start gap-3 rounded-[14px] border border-border-strong p-3.5 shadow-xl",
              t.leaving ? "animate-[toast-out_160ms_var(--ease-in)_forwards]" : "animate-[toast-in_220ms_var(--ease-out)_both]",
            )}
          >
            <Icon className={cn("mt-0.5 size-4 shrink-0", TONES[t.kind])} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{t.title}</p>
              {t.description ? <p className="mt-0.5 text-xs text-muted-foreground">{t.description}</p> : null}
            </div>
            <button type="button" onClick={() => dismiss(t.id)} data-no-ripple className="rounded-md p-0.5 text-muted-foreground transition-colors hover:text-foreground" aria-label="Dismiss">
              <X className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
