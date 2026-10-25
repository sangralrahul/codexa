import * as React from "react";
import { Slot } from "radix-ui";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "link";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm",
  secondary: "bg-foreground text-background hover:opacity-90 shadow-sm",
  outline: "border border-border-strong bg-background hover:bg-muted text-foreground",
  ghost: "hover:bg-muted text-foreground",
  danger: "bg-danger text-danger-foreground hover:opacity-90",
  link: "text-primary underline-offset-4 hover:underline px-0 h-auto",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5 rounded-md",
  md: "h-10 px-4 text-sm gap-2 rounded-lg",
  lg: "h-12 px-6 text-base gap-2 rounded-lg",
  icon: "h-9 w-9 rounded-md",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", asChild, loading, disabled, children, ...props }, ref) => {
    if (asChild) {
      return (
        <Slot.Root
          ref={ref}
          className={cn(
            "inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2",
            variants[variant],
            sizes[size],
            className,
          )}
          {...props}
        >
          {children}
        </Slot.Root>
      );
    }
    const Comp = "button";
    return (
      <Comp
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2",
          variants[variant],
          sizes[size],
          className,
        )}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
        {children}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn(
    "inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2",
    variants[variant],
    sizes[size],
    className,
  );
}
