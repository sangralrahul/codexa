import * as React from "react";
import { Slot } from "radix-ui";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatefulButton } from "./button-state";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "link" | "ember" | "soft";
export type ButtonSize = "sm" | "md" | "lg" | "xl" | "icon";
/** "marketing": pill (default). "app": 10px rounded rectangle. Or set `--btn-radius` on any ancestor. */
export type ButtonAppearance = "marketing" | "app";
export type ButtonState = "idle" | "loading" | "success";

const variants: Record<ButtonVariant, string> = {
  primary: "btn-solid bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm",
  secondary: "btn-solid bg-foreground text-background hover:opacity-90 shadow-sm",
  outline: "border border-border-strong bg-background/60 text-foreground shadow-[inset_0_1px_0_var(--hairline)] hover:border-foreground/25 hover:bg-muted",
  ghost: "text-foreground hover:bg-muted",
  danger: "bg-danger text-danger-foreground shadow-sm hover:opacity-90",
  link: "h-auto px-0 text-foreground underline-offset-4 hover:underline",
  // One per viewport, at most two per page (hero Build, final CTA; IDE Publish).
  ember: "btn-ember",
  soft: "bg-muted text-foreground shadow-[inset_0_0_0_1px_var(--border)] hover:bg-surface-3",
};

// Every button presses in (90ms) and springs back (240ms); calm keeps only the colour change.
// The ripple comes from MotionEffects.
const base =
  "relative inline-flex select-none items-center justify-center whitespace-nowrap font-medium transition-[color,background-color,border-color,box-shadow,opacity,scale,translate] duration-200 ease-snap active:scale-[0.97] active:duration-75 calm:active:scale-100 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 [&_svg]:shrink-0";

const radius = "rounded-[var(--btn-radius,9999px)]";
const sizes: Record<ButtonSize, string> = {
  sm: cn("h-8 gap-1.5 px-3.5 text-[13px]", radius),
  md: cn("h-10 gap-2 px-5 text-sm", radius),
  lg: cn("h-12 gap-2 px-6 text-base", radius),
  xl: cn("h-14 gap-2.5 px-8 text-[17px] tracking-[-0.01em]", radius),
  icon: "h-9 w-9 rounded-md",
};

const appearances: Record<ButtonAppearance, string> = {
  marketing: "[--btn-radius:9999px]",
  app: "[--btn-radius:10px]",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
  /** Spinner + disabled (kept for existing callers; prefer `state`). */
  loading?: boolean;
  /** Eight-stroke ember burst on activation (MotionEffects). At most one per viewport. */
  spark?: boolean;
  /** Drifts ≤6px toward a fine pointer. Header/hero CTAs only. */
  magnetic?: boolean;
  /** Commit feedback: label → spinner → drawn check. Width stays locked to the idle label. Only set "success" after a real success. */
  state?: ButtonState;
  /** Text next to the check in the success state (default "Done"). */
  successLabel?: string;
  /** Text next to the spinner in the loading state (default: the children). */
  loadingLabel?: string;
  /** Revert the success visuals to idle after this many ms (e.g. 1400). Default: stay until `state` changes. */
  successDuration?: number;
  appearance?: ButtonAppearance;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "primary", size = "md", asChild, loading, disabled, children, spark, magnetic, state, successLabel, loadingLabel, successDuration, appearance, ...props },
    ref,
  ) => {
    const classes = cn(base, variants[variant], sizes[size], appearance && appearances[appearance], className);
    const motionProps = { "data-spark": spark ? "" : undefined, "data-magnetic": magnetic ? "" : undefined };
    if (asChild) {
      return (
        <Slot.Root ref={ref} className={classes} data-btn="" {...motionProps} {...props}>
          {children}
        </Slot.Root>
      );
    }
    if (state !== undefined) {
      return (
        <StatefulButton
          ref={ref}
          className={cn(classes, "disabled:pointer-events-none disabled:opacity-50 data-[state=success]:disabled:opacity-100 data-[state=loading]:disabled:opacity-100")}
          state={state}
          successLabel={successLabel}
          loadingLabel={loadingLabel}
          successDuration={successDuration}
          disabled={disabled}
          {...motionProps}
          {...props}
        >
          {children}
        </StatefulButton>
      );
    }
    return (
      <button
        ref={ref}
        className={cn(classes, "disabled:pointer-events-none disabled:opacity-50")}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...motionProps}
        {...props}
      >
        {loading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";

/** Button styling for links and other elements (server-safe). */
export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string, appearance?: ButtonAppearance) {
  return cn(base, variants[variant], sizes[size], appearance && appearances[appearance], className);
}
