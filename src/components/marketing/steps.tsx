import type { Step } from "@/content/marketing/types";
import { Inline } from "./inline";
import { cn } from "@/lib/utils";

export function Steps({ steps, className, orientation = "horizontal" }: { steps: Step[]; className?: string; orientation?: "horizontal" | "vertical" }) {
  return (
    <ol
      className={cn(
        "grid gap-6",
        orientation === "horizontal" ? "sm:grid-cols-2 lg:grid-cols-5" : "grid-cols-1 max-w-2xl",
        steps.length <= 4 && orientation === "horizontal" && "lg:grid-cols-4",
        steps.length <= 3 && orientation === "horizontal" && "lg:grid-cols-3",
        className,
      )}
    >
      {steps.map((s, i) => (
        <li key={s.title} className="relative flex gap-4 sm:flex-col sm:gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border-strong bg-background text-sm font-semibold tabular-nums" aria-hidden="true">
            {i + 1}
          </span>
          <div>
            <h3 className="text-base font-semibold tracking-tight">
              <span className="sr-only">Step {i + 1}: </span>
              {s.title}
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              <Inline text={s.description} />
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
