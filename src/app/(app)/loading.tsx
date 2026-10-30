import { AppPage } from "@/components/app/app-shell";
import { Skeleton } from "@/components/ui/misc";

/** Generic app placeholder (settings, GitHub, shared…): a page title and a column of cards. Pages with their own layout ship their own loading.tsx. */
export default function Loading() {
  return (
    <AppPage>
      <div role="status" aria-label="Loading" className="animate-fade-in">
        <Skeleton className="h-8 w-52 rounded-lg" />
        <Skeleton className="mt-3 h-4 w-96 max-w-full" />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="overflow-hidden rounded-lg border border-border bg-card">
              <Skeleton className="aspect-[16/10] rounded-none" />
              <div className="space-y-2 p-4">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppPage>
  );
}
