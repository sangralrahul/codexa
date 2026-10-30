import { Skeleton } from "@/components/ui/misc";

/** Settings-shaped placeholder for the page column (the nav stays rendered by the layout). */
export default function SettingsLoading() {
  return (
    <div role="status" aria-label="Loading settings" className="animate-fade-in">
      <Skeleton className="h-3 w-40 rounded-full" />
      <Skeleton className="mt-3 h-8 w-56 rounded-lg" />
      <Skeleton className="mt-3 h-4 w-[28rem] max-w-full" />
      <div className="mt-8 space-y-5">
        {[0, 1].map((i) => (
          <div key={i} className="overflow-hidden rounded-lg border border-border bg-card/80 shadow-[inset_0_1px_0_var(--hairline)]">
            <div className="flex items-start gap-3.5 px-6 pt-5">
              <Skeleton className="size-9 rounded-md" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-72 max-w-full" />
              </div>
            </div>
            <div className="space-y-4 px-6 pb-6 pt-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-10 w-full rounded-md" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-10 w-full rounded-md" />
                </div>
              </div>
              {i === 0 ? <Skeleton className="h-10 w-full rounded-md" /> : null}
            </div>
            <div className="flex items-center justify-between border-t border-border/80 bg-surface/50 px-6 py-3">
              <Skeleton className="h-3 w-48" />
              <Skeleton className="h-8 w-28 rounded-md" />
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">Loading settings…</span>
    </div>
  );
}
