"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { shakeElement } from "@/lib/client/motion";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/misc";

/**
 * Tracks edits against the last saved values.
 * - `dirty` / `changed`: which fields differ from the saved baseline;
 * - `commit(submitted)`: call after a confirmed save; the baseline moves and the changed fields flash
 *   (`flashing(key)`) for 1.2s;
 * - `reset()`: back to the saved values.
 */
export function useDirtyForm<T extends Record<string, string>>(initial: T) {
  const [saved, setSaved] = useState<T>(initial);
  const [values, setValues] = useState<T>(initial);
  const [flash, setFlash] = useState<ReadonlySet<keyof T>>(new Set());
  const changed = useMemo(() => (Object.keys(values) as (keyof T)[]).filter((k) => values[k] !== saved[k]), [values, saved]);
  const set = useCallback(<K extends keyof T>(k: K, v: T[K]) => setValues((s) => ({ ...s, [k]: v })), []);
  const reset = useCallback(() => setValues(saved), [saved]);
  /** Move the saved baseline to `submitted` (the values that were sent). Edits made while saving stay dirty. */
  const commit = useCallback(
    (submitted?: T) => {
      const base = submitted ?? values;
      const keys = (Object.keys(base) as (keyof T)[]).filter((k) => base[k] !== saved[k]);
      setSaved(base);
      setFlash(new Set(keys));
    },
    [values, saved],
  );
  useEffect(() => {
    if (!flash.size) return;
    const t = window.setTimeout(() => setFlash(new Set()), 1300);
    return () => clearTimeout(t);
  }, [flash]);
  return { values, setValues, set, saved, dirty: changed.length > 0, changed, reset, commit, flashing: (k: keyof T) => flash.has(k) };
}

/**
 * Floating glass "Unsaved changes" dock (Linear / Discord pattern), shown while a settings form is dirty:
 * - Reset and Save (the Save button morphs to a drawn check on a confirmed save);
 * - Ctrl/⌘+S saves; a beforeunload guard warns before closing or reloading the tab;
 * - clicking a link that leaves the page while dirty is held once: the dock shakes and says so;
 *   a second click within a few seconds leaves and discards the edits.
 */
export function UnsavedDock({
  dirty,
  saving,
  saved,
  onSave,
  onReset,
  label = "Unsaved changes",
  error,
}: {
  dirty: boolean;
  saving: boolean;
  /** True right after a confirmed save (keeps the dock up briefly to show the check). */
  saved: boolean;
  onSave: () => void;
  onReset: () => void;
  label?: string;
  error?: string | null;
}) {
  const visible = dirty || saving || saved;
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(visible);
  const [leaving, setLeaving] = useState(false);
  const [warn, setWarn] = useState(false);
  const dockRef = useRef<HTMLDivElement>(null);
  const armedUntil = useRef(0);
  const saveRef = useRef(onSave);
  useEffect(() => {
    saveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Enter immediately; exit after the 180ms leave animation.
  useEffect(() => {
    if (visible) {
      const id = requestAnimationFrame(() => {
        setShown(true);
        setLeaving(false);
      });
      return () => cancelAnimationFrame(id);
    }
    const a = requestAnimationFrame(() => {
      setLeaving(true);
      setWarn(false);
    });
    const t = window.setTimeout(() => {
      setShown(false);
      setLeaving(false);
    }, 190);
    return () => {
      cancelAnimationFrame(a);
      clearTimeout(t);
    };
  }, [visible]);

  // Ctrl/⌘+S saves while dirty.
  useEffect(() => {
    if (!dirty) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dirty]);

  // Leaving with unsaved edits: the browser asks before unload; in-app links are held once.
  useEffect(() => {
    if (!dirty) return;
    const onUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download") || dockRef.current?.contains(a)) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      if (Date.now() < armedUntil.current) return; // second click: leave and discard
      e.preventDefault();
      e.stopPropagation();
      armedUntil.current = Date.now() + 4000;
      setWarn(true);
      shakeElement(dockRef.current, 6);
    };
    window.addEventListener("beforeunload", onUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty]);

  if (!mounted || !shown) return null;
  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 flex justify-center px-3">
      <div
        ref={dockRef}
        role="region"
        aria-label="Unsaved changes"
        data-leaving={leaving ? "" : undefined}
        data-warn={warn ? "" : undefined}
        className={cn(
          "unsaved-dock pointer-events-auto flex w-full max-w-[560px] items-center gap-3 rounded-[16px] border border-border-strong py-2 pl-4 pr-2 [--btn-radius:10px]",
        )}
      >
        <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", saved && !dirty ? "bg-success" : warn ? "bg-warning" : "bg-signal")} />
        <p className="min-w-0 flex-1 text-[13px]" aria-live="polite">
          {saved && !dirty ? (
            <span className="font-medium">All changes saved</span>
          ) : error ? (
            <span className="font-medium text-danger">{error}</span>
          ) : warn ? (
            <>
              <span className="font-medium">Save or reset first.</span> <span className="text-muted-foreground">Click the link again to discard.</span>
            </>
          ) : (
            <>
              <span className="font-medium">{label}</span>
              <span className="hidden text-muted-foreground sm:inline">
                {" · "}
                <Kbd mod className="border border-border bg-muted">
                  S
                </Kbd>{" "}
                to save
              </span>
            </>
          )}
        </p>
        <Button type="button" variant="ghost" size="sm" onClick={onReset} disabled={!dirty || saving}>
          <RotateCcw className="size-3.5" aria-hidden="true" /> Reset
        </Button>
        <Button type="button" size="sm" onClick={onSave} disabled={!dirty && !saved} state={saving ? "loading" : saved && !dirty ? "success" : "idle"} successLabel="Saved" loadingLabel="Saving">
          Save changes
        </Button>
      </div>
    </div>,
    document.body,
  );
}
