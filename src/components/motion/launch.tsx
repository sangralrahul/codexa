"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { isCalm, shakeElement } from "@/lib/client/motion";
import { LogoMark } from "@/components/logo";
import { StepRow, type StepState } from "@/components/vignettes/step-row";

export type LaunchStep = { id: string; label: string; state: StepState; detail?: string };

type Rect = { top: number; left: number; width: number; height: number };

const toRect = (r: DOMRect | Rect): Rect => ({ top: r.top, left: r.left, width: r.width, height: r.height });

/** The visible part of <main> (or the viewport), inset 12px: where the launch panel lands. */
function targetRect(): Rect {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const main = document.querySelector("main");
  const r = main?.getBoundingClientRect();
  const m = vw < 640 ? 8 : 12;
  const top = Math.max(r ? r.top : 0, 0) + m;
  const left = Math.max(r ? r.left : 0, 0) + m;
  const right = Math.min(r ? r.right : vw, vw) - m;
  const bottom = Math.min(r ? r.bottom : vh, vh) - m;
  if (right - left < 280 || bottom - top < 280) return { top: m, left: m, width: vw - m * 2, height: vh - m * 2 };
  return { top, left, width: right - left, height: bottom - top };
}

function insetFrom(origin: Rect, panel: Rect, radius: number) {
  const t = origin.top - panel.top;
  const l = origin.left - panel.left;
  const r = panel.left + panel.width - (origin.left + origin.width);
  const b = panel.top + panel.height - (origin.top + origin.height);
  return `inset(${t}px ${r}px ${b}px ${l}px round ${radius}px)`;
}

/**
 * M18 Launch overlay. The origin rect (composer, template card, onboarding card)
 * grows into a panel filling <main> (clip-path, 450ms) while the page dims; honest
 * step rows tick as their real promises resolve. Prefer the useLaunch() hook.
 */
export function LaunchSequence({
  open,
  originRect,
  title = "Setting up your project",
  steps,
  onRetry,
  onCancel,
  collapsing = false,
  onCollapsed,
}: {
  open: boolean;
  originRect?: DOMRect | Rect | null;
  title?: string;
  steps: LaunchStep[];
  onRetry?: () => void;
  onCancel?: () => void;
  /** Animate back into the origin rect, then call onCollapsed. */
  collapsing?: boolean;
  onCollapsed?: () => void;
}) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const retryRef = React.useRef<HTMLButtonElement>(null);
  const titleId = React.useId();
  const [rect, setRect] = React.useState<Rect | null>(null);
  const failed = steps.some((s) => s.state === "error");
  const allDone = steps.length > 0 && steps.every((s) => s.state === "done");

  React.useLayoutEffect(() => {
    if (!open) return;
    const sync = () => setRect(targetRect());
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, [open]);

  // Grow from the origin.
  React.useEffect(() => {
    const panel = panelRef.current;
    if (!open || !panel || !rect) return;
    panel.focus({ preventScroll: true });
    if (isCalm() || !originRect || !panel.animate) return;
    const anim = panel.animate([{ clipPath: insetFrom(toRect(originRect), rect, 20) }, { clipPath: "inset(0px 0px 0px 0px round 12px)" }], {
      duration: 450,
      easing: "cubic-bezier(.16,1,.3,1)",
    });
    return () => anim.cancel();
    // Only when it opens (rect changes on resize should not replay).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, Boolean(rect)]);

  // Collapse back into the origin.
  React.useEffect(() => {
    const panel = panelRef.current;
    if (!collapsing) return;
    if (!panel || !rect || !originRect || isCalm() || !panel.animate) {
      const id = window.setTimeout(() => onCollapsed?.(), 0);
      return () => clearTimeout(id);
    }
    const anim = panel.animate([{ clipPath: "inset(0px 0px 0px 0px round 12px)", opacity: 1 }, { clipPath: insetFrom(toRect(originRect), rect, 20), opacity: 0.4 }], {
      duration: 320,
      easing: "cubic-bezier(.65,0,.35,1)",
      fill: "forwards",
    });
    anim.onfinish = () => onCollapsed?.();
    return () => {
      anim.onfinish = null;
    };
  }, [collapsing, rect, originRect, onCollapsed]);

  React.useEffect(() => {
    if (failed) retryRef.current?.focus();
  }, [failed]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="launch-overlay"
      data-state={collapsing ? "closing" : "open"}
      onKeyDown={(e) => {
        // Escape only backs out of a failed launch; an in-flight request cannot be cancelled honestly.
        if (e.key === "Escape" && failed) onCancel?.();
      }}
    >
      <div className="launch-dim" aria-hidden="true" />
      {rect ? (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className="launch-panel e4 app-atmosphere bg-card outline-none"
          style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height, borderRadius: 12 }}
        >
          <div aria-hidden="true" className="bg-blueprint absolute inset-0 opacity-70" />
          <div className="launch-panel__content relative flex h-full flex-col items-center justify-center px-6 py-10">
            <LogoMark size={44} state={failed ? "error" : allDone ? "success" : "running"} />
            <h2 id={titleId} className="text-app-title mt-6 text-center">
              {failed ? "Something went wrong" : title}
            </h2>
            <ol aria-live="polite" className="mt-6 w-full max-w-sm space-y-1 rounded-xl border border-border bg-card/80 p-3 shadow-sm backdrop-blur">
              {steps.map((s, i) => (
                <StepRow key={s.id} state={s.state} label={s.label} detail={s.detail} connector={i < steps.length - 1} />
              ))}
            </ol>
            {failed ? (
              <div className="mt-5 flex items-center gap-2">
                {onRetry ? (
                  <button
                    ref={retryRef}
                    type="button"
                    onClick={onRetry}
                    className="inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-primary px-3.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
                  >
                    <RotateCcw className="size-3.5" aria-hidden="true" /> Retry
                  </button>
                ) : null}
                <button
                  ref={onRetry ? undefined : retryRef}
                  type="button"
                  onClick={onCancel}
                  className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-border-strong bg-background px-3.5 text-sm font-medium transition-colors hover:bg-muted"
                >
                  <ArrowLeft className="size-3.5" aria-hidden="true" /> Back
                </button>
              </div>
            ) : (
              <p className={cn("mt-4 text-center text-xs text-muted-foreground")}>Each step is shown as it finishes.</p>
            )}
          </div>
        </div>
      ) : null}
    </div>,
    document.body,
  );
}

type LaunchOptions = { title?: string; onRetry?: () => void; onCancel?: () => void };
type LaunchState = { open: boolean; steps: LaunchStep[]; origin: Rect | null; path: string; collapsing: boolean; shakeAfter: boolean };

/**
 * Launch controller. Render `launch.element` once in your component, then:
 *
 *   launch.start(formEl, [{ id: "create", label: "Creating project", state: "active" }]);
 *   const res = await api.create(...);             // real promise
 *   launch.update("create", "done");
 *   launch.add({ id: "open", label: "Opening the editor", state: "active" });
 *   router.push(href);                             // overlay disappears on the next pathname
 *
 * On failure: `launch.fail("create", message)` shows the red row with Retry/Back,
 * or `launch.fail("create", message, { collapse: true })` folds back into the
 * origin and shakes it (show your inline error there). No percentages, no invented timings.
 */
export function useLaunch(options: LaunchOptions = {}) {
  const pathname = usePathname() ?? "";
  const originEl = React.useRef<HTMLElement | null>(null);
  const optsRef = React.useRef(options);
  React.useEffect(() => {
    optsRef.current = options;
  });
  const [state, setState] = React.useState<LaunchState>({ open: false, steps: [], origin: null, path: "", collapsing: false, shakeAfter: false });

  const start = React.useCallback(
    (origin: HTMLElement | null, steps: LaunchStep[]) => {
      originEl.current = origin;
      const r = origin?.getBoundingClientRect();
      setState({ open: true, steps, origin: r ? toRect(r) : null, path: pathname, collapsing: false, shakeAfter: false });
    },
    [pathname],
  );
  const update = React.useCallback((id: string, next: StepState, detail?: string) => {
    setState((s) => ({ ...s, steps: s.steps.map((x) => (x.id === id ? { ...x, state: next, detail: detail ?? x.detail } : x)) }));
  }, []);
  const add = React.useCallback((step: Omit<LaunchStep, "state"> & { state?: StepState }) => {
    setState((s) => ({ ...s, steps: [...s.steps.filter((x) => x.id !== step.id), { ...step, state: step.state ?? "active" }] }));
  }, []);
  const fail = React.useCallback((id: string, message: string, opts?: { collapse?: boolean }) => {
    setState((s) => ({
      ...s,
      steps: s.steps.map((x) => (x.id === id ? { ...x, state: "error" as const, detail: message } : x)),
      collapsing: Boolean(opts?.collapse),
      shakeAfter: Boolean(opts?.collapse),
    }));
  }, []);
  const close = React.useCallback(() => setState((s) => ({ ...s, open: false, collapsing: false })), []);
  const cancel = React.useCallback(() => {
    setState((s) => ({ ...s, collapsing: true, shakeAfter: false }));
    optsRef.current.onCancel?.();
  }, []);
  const onCollapsed = React.useCallback(() => {
    setState((s) => {
      if (s.shakeAfter) window.setTimeout(() => shakeElement(originEl.current), 0);
      return { ...s, open: false, collapsing: false, shakeAfter: false };
    });
    window.setTimeout(() => originEl.current?.focus?.({ preventScroll: true }), 0);
  }, []);

  // A route change ends the launch: derived, so nothing lingers on the next page.
  const visible = state.open && state.path === pathname;
  const element = (
    <LaunchSequence
      open={visible}
      originRect={state.origin}
      title={options.title}
      steps={state.steps}
      onRetry={options.onRetry}
      onCancel={cancel}
      collapsing={state.collapsing}
      onCollapsed={onCollapsed}
    />
  );
  return { start, update, add, fail, close, element, open: visible, steps: state.steps };
}
