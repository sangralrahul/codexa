import type { Step } from "@/content/marketing/types";
import { Inline } from "./inline";
import { cn } from "@/lib/utils";

export function Steps({ steps, className, orientation = "horizontal" }: { steps: Step[]; className?: string; orientation?: "horizontal" | "vertical" }) {
  const horizontal = orientation === "horizontal";
  return (
    <div className={cn("relative", className)}>
      {horizontal && steps.length >= 3 && steps.length <= 5 ? (
        // Connector from the first number to the last, with a light travelling along it (large
        // screens, one row only). The last column starts at (n-1)/n of the row plus gaps (gap-6).
        <div
          aria-hidden="true"
          className="beam absolute left-[1.375rem] top-[1.375rem] hidden h-px bg-border-strong lg:block"
          style={{ right: `calc((100% - ${steps.length - 1} * 1.5rem) / ${steps.length} - 1.375rem)` }}
        />
      ) : null}
      <ol
        className={cn(
          "relative grid gap-6",
          horizontal ? "sm:grid-cols-2 lg:grid-cols-5" : "grid-cols-1 max-w-2xl",
          steps.length <= 4 && horizontal && "lg:grid-cols-4",
          steps.length <= 3 && horizontal && "lg:grid-cols-3",
        )}
      >
        {steps.map((s, i) => (
          <li
            key={s.title}
            data-reveal
            style={{ "--reveal-delay": `${i * 90}ms` } as React.CSSProperties}
            className="group relative flex gap-4 sm:flex-col sm:gap-4"
          >
            <span
              className="relative flex size-11 shrink-0 items-center justify-center rounded-full border border-border-strong bg-background text-sm font-semibold tabular-nums shadow-sm transition group-hover:border-transparent group-hover:shadow-[0_0_0_1px_var(--glow-2),0_0_24px_-4px_var(--glow-2)]"
              aria-hidden="true"
            >
              <span className="text-gradient">{String(i + 1).padStart(2, "0")}</span>
            </span>
            <div>
              <h3 className="text-base font-semibold tracking-tight">
                <span className="sr-only">Step {i + 1}: </span>
                {s.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                <Inline text={s.description} />
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
