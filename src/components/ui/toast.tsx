"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Kind = "success" | "error" | "info";
type ToastItem = { id: number; kind: Kind; title: string; description?: string; leaving?: boolean };

let items: ToastItem[] = [];
let seq = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function dismiss(id: number) {
  items = items.map((t) => (t.id === id ? { ...t, leaving: true } : t));
  emit();
  setTimeout(() => {
    items = items.filter((t) => t.id !== id);
    emit();
  }, 220);
}

function push(kind: Kind, title: string, description?: string) {
  const id = ++seq;
  items = [...items.slice(-3), { id, kind, title, description }];
  emit();
  setTimeout(() => dismiss(id), kind === "error" ? 6000 : 3500);
  return id;
}

/** Small confirmations after an action: toast.success("Project renamed"). */
export const toast = {
  success: (title: string, description?: string) => push("success", title, description),
  error: (title: string, description?: string) => push("error", title, description),
  info: (title: string, description?: string) => push("info", title, description),
};

const ICONS = { success: CheckCircle2, error: XCircle, info: Info };
const TONES = { success: "text-success", error: "text-danger", info: "text-info" };

/** Mounted once in the root layout; renders the toast stack bottom-right. */
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
    <div aria-live="polite" aria-relevant="additions" className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(92vw,360px)] flex-col gap-2">
      {list.map((t) => {
        const Icon = ICONS[t.kind];
        return (
          <div
            key={t.id}
            role={t.kind === "error" ? "alert" : "status"}
            className={cn(
              "glass pointer-events-auto flex items-start gap-3 rounded-xl border border-border p-3.5 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.45)]",
              t.leaving ? "animate-[toast-out_200ms_ease-in_forwards]" : "animate-[toast-in_320ms_cubic-bezier(0.2,0.9,0.3,1.2)_both]",
            )}
          >
            <Icon className={cn("mt-0.5 size-4 shrink-0", TONES[t.kind])} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{t.title}</p>
              {t.description ? <p className="mt-0.5 text-xs text-muted-foreground">{t.description}</p> : null}
            </div>
            <button type="button" onClick={() => dismiss(t.id)} className="rounded-md p-0.5 text-muted-foreground transition-colors hover:text-foreground" aria-label="Dismiss">
              <X className="size-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
