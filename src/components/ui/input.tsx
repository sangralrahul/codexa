import * as React from "react";
import { cn } from "@/lib/utils";
import { AutoGrowTextarea } from "./autogrow-textarea";

// Controls: 10px radius, hairline border, a neutral `--focus` ring. Danger border/glow is reserved for
// aria-invalid so an autofocused empty field never reads as an error (DESIGN.md §6).
export const controlClasses =
  "w-full rounded-md border border-border bg-input text-sm text-foreground shadow-[inset_0_1px_0_var(--hairline)] transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-muted-foreground/80 hover:border-border-strong focus-visible:border-focus focus-visible:shadow-[0_0_0_4px_color-mix(in_oklab,var(--focus)_18%,transparent)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-danger aria-invalid:focus-visible:border-danger aria-invalid:focus-visible:shadow-[0_0_0_4px_color-mix(in_oklab,var(--danger)_16%,transparent)]";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, type = "text", ...props }, ref) => (
  <input ref={ref} type={type} className={cn("flex h-10 px-3 py-2", controlClasses, className)} {...props} />
));
Input.displayName = "Input";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  /** Grow with the content between minRows and maxRows (then scroll). */
  autoGrow?: { minRows: number; maxRows: number };
};

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, autoGrow, ...props }, ref) => {
  const classes = cn("flex min-h-[96px] px-3 py-2.5 leading-relaxed", controlClasses, autoGrow && "min-h-0 resize-none", className);
  if (autoGrow) return <AutoGrowTextarea ref={ref} className={classes} minRows={autoGrow.minRows} maxRows={autoGrow.maxRows} {...props} />;
  return <textarea ref={ref} className={classes} {...props} />;
});
Textarea.displayName = "Textarea";

/** Native select (kept for simple forms; prefer SelectMenu for styled options). */
export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn("select-chevron flex h-10 py-2 pl-3 pr-9", controlClasses, className)}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-[13px] font-medium leading-none text-foreground", className)} {...props} />;
}

/**
 * Label + control + hint/error. When the child is a single element whose id is `htmlFor`
 * (or has no id), Field injects `aria-describedby` (the hint or error id) and, on error,
 * `aria-invalid` — callers no longer wire these by hand. Errors render with role=alert.
 */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
  optional,
  labelAside,
}: {
  label: string;
  htmlFor: string;
  hint?: React.ReactNode;
  error?: string | null;
  children: React.ReactNode;
  className?: string;
  /** Shows a muted "Optional" after the label. */
  optional?: boolean;
  /** Content aligned to the right of the label row (e.g. a "Forgot password?" link). */
  labelAside?: React.ReactNode;
}) {
  const hintId = `${htmlFor}-hint`;
  const errorId = `${htmlFor}-error`;
  const describedBy = error ? errorId : hint ? hintId : undefined;
  let control = children;
  if (describedBy && React.isValidElement<Record<string, unknown>>(children)) {
    const p = children.props;
    if (p.id === undefined || p.id === htmlFor) {
      const ids = new Set([...String(p["aria-describedby"] ?? "").split(/\s+/), describedBy].filter(Boolean));
      control = React.cloneElement(children, {
        "aria-describedby": [...ids].join(" "),
        ...(error && p["aria-invalid"] === undefined ? { "aria-invalid": true } : {}),
      });
    }
  }
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor={htmlFor}>
          {label}
          {optional ? <span className="ml-1.5 font-normal text-muted-foreground">Optional</span> : null}
        </Label>
        {labelAside}
      </div>
      {control}
      {error ? (
        <p id={errorId} role="alert" className="pop-in flex items-start gap-1.5 text-xs text-danger">
          <svg viewBox="0 0 16 16" aria-hidden="true" className="mt-px size-3.5 shrink-0">
            <circle cx="8" cy="8" r="7" fill="currentColor" fillOpacity="0.14" />
            <path d="M8 4.5v4M8 11h.01" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
