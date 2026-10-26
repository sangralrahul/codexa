"use client";

import * as React from "react";

type Props = React.TextareaHTMLAttributes<HTMLTextAreaElement> & { minRows: number; maxRows: number };

/** Textarea that grows with its content between minRows and maxRows (used by <Textarea autoGrow>). */
export const AutoGrowTextarea = React.forwardRef<HTMLTextAreaElement, Props>(function AutoGrowTextarea({ minRows, maxRows, style, onInput, ...props }, ref) {
  const inner = React.useRef<HTMLTextAreaElement | null>(null);
  const setRefs = React.useCallback(
    (el: HTMLTextAreaElement | null) => {
      inner.current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) ref.current = el;
    },
    [ref],
  );

  const fit = React.useCallback(() => {
    const el = inner.current;
    if (!el) return;
    const cs = getComputedStyle(el);
    const line = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.5;
    const pad = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) + parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);
    const min = line * minRows + pad;
    const max = line * maxRows + pad;
    el.style.height = "auto";
    const next = Math.min(max, Math.max(min, el.scrollHeight + parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth)));
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight + 1 > max ? "auto" : "hidden";
  }, [minRows, maxRows]);

  // Fit on mount, on value changes made by the parent (controlled), and on width changes.
  React.useLayoutEffect(() => {
    fit();
  }, [fit, props.value]);
  React.useEffect(() => {
    const el = inner.current;
    if (!el) return;
    const ro = new ResizeObserver(() => fit());
    ro.observe(el);
    return () => ro.disconnect();
  }, [fit]);

  return (
    <textarea
      ref={setRefs}
      rows={minRows}
      style={{ ...style, transition: "height 120ms var(--ease-out)" }}
      onInput={(e) => {
        fit();
        onInput?.(e);
      }}
      {...props}
    />
  );
});
