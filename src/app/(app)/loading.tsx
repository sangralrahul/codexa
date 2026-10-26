import { AppPage } from "@/components/app/app-shell";
import { Skeleton } from "@/components/ui/misc";

/** Shown instantly while an app page loads on the server. */
export default function Loading() {
  return (
    <AppPage>
      <div role="status" aria-label="Loading" className="animate-fade-in">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="mt-3 h-4 w-80 max-w-full" />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="overflow-hidden rounded-xl border border-border">
              <Skeleton className="h-36 rounded-none" />
              <div className="space-y-2 p-4">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppPage>
  );
}
