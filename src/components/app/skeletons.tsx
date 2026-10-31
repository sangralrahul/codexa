import { AppPage } from "./app-shell";
import { Skeleton } from "@/components/ui/misc";

/** Placeholders that match the real layouts (same sizes, so nothing shifts when the page arrives). */

/** A right-rail panel placeholder: 48px header with an icon tile, then `rows` list rows. */
function PanelSkeleton({ rows, title }: { rows: number; title: number }) {
  return (
    <div className="card-premium overflow-hidden">
      <div className="flex h-12 items-center gap-2.5 border-b border-border px-4">
        <Skeleton className="size-7 rounded-[8px]" />
        <Skeleton className="h-3.5" style={{ width: title }} />
        <Skeleton className="ml-auto h-3 w-12" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-2.5">
            <Skeleton className="size-7 rounded-[8px]" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3" style={{ width: `${62 - (i % 3) * 10}%` }} />
              <Skeleton className="h-2.5" style={{ width: `${40 + (i % 2) * 12}%` }} />
            </div>
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Mirrors the cockpit: header card with the composer, four KPI cards with bars, the projects grid beside the right rail. */
export function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Loading dashboard" className="animate-fade-in">
      <AppPage width="wide" className="space-y-8 py-6 lg:py-7">
        <div className="card-premium rounded-[20px] px-5 pb-5 pt-6 sm:px-7 sm:pb-7 sm:pt-8">
          <div className="flex items-end gap-6">
            <div className="flex-1 space-y-3">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-8 w-72 rounded-lg" />
              <Skeleton className="h-3.5 w-64" />
            </div>
            <Skeleton className="h-9 w-24 rounded-[10px]" />
            <Skeleton className="h-9 w-32 rounded-[10px]" />
          </div>
          <div className="mt-6 rounded-[16px] border border-border bg-card p-4">
            <Skeleton className="h-4 w-2/3" />
            <div className="mt-[52px] flex items-center gap-2">
              <Skeleton className="h-8 w-20 rounded-md" />
              <Skeleton className="h-8 w-36 rounded-md" />
              <Skeleton className="h-8 w-24 rounded-md" />
              <Skeleton className="ml-auto h-9 w-24 rounded-md" />
            </div>
          </div>
          <div className="mt-4 flex gap-2 overflow-hidden">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-8 w-28 shrink-0 rounded-full" />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="card-premium flex flex-col gap-3 p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <Skeleton className="size-9 rounded-[10px]" />
                <Skeleton className="h-3.5 w-24" />
              </div>
              <div className="flex items-end justify-between gap-3">
                <Skeleton className="h-7 w-20 rounded-md" />
                <div className="flex h-7 w-28 items-end gap-0.5">
                  {[4, 7, 5, 9, 6, 10, 8, 12, 7, 11, 9, 13, 10, 14].map((h, j) => (
                    <Skeleton key={j} className="flex-1 rounded-sm" style={{ height: h * 2 }} />
                  ))}
                </div>
              </div>
              <Skeleton className="h-1 w-full rounded-full" />
              <div className="flex justify-between">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-8">
            <div>
              <div className="mb-3.5 flex items-center gap-3">
                <Skeleton className="size-8 rounded-[10px]" />
                <Skeleton className="h-4 w-36" />
                <Skeleton className="ml-auto h-7 w-16 rounded-md" />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="card-premium overflow-hidden">
                    <div className="flex h-9 items-center gap-2 border-b border-border bg-surface px-3">
                      <Skeleton className="h-2 w-8 rounded-full" />
                      <Skeleton className="h-5 flex-1 rounded-md" />
                      <Skeleton className="h-5 w-12 rounded-full" />
                    </div>
                    <Skeleton className="aspect-[16/10] rounded-none" />
                    <div className="space-y-2.5 p-4">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-full" />
                      <div className="flex gap-3 pt-1">
                        <Skeleton className="h-3 w-14" />
                        <Skeleton className="h-3 w-28" />
                        <Skeleton className="ml-auto h-5 w-12 rounded-full" />
                      </div>
                      <div className="flex gap-3 border-t border-border pt-3">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="ml-auto h-3 w-24" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-3.5 flex items-center gap-3">
                <Skeleton className="size-8 rounded-[10px]" />
                <Skeleton className="h-4 w-40" />
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="aspect-[16/10] rounded-xl" />
                ))}
              </div>
            </div>
          </div>
          <div className="min-w-0 space-y-5">
            <PanelSkeleton rows={5} title={92} />
            <PanelSkeleton rows={6} title={108} />
            <PanelSkeleton rows={5} title={96} />
            <PanelSkeleton rows={5} title={96} />
          </div>
        </div>
      </AppPage>
    </div>
  );
}

export function ProjectsSkeleton() {
  return (
    <AppPage>
      <div role="status" aria-label="Loading projects" className="animate-fade-in">
        <div className="mb-6 flex flex-col gap-3 xl:flex-row xl:items-center">
          <Skeleton className="h-8 w-40 rounded-lg" />
          <Skeleton className="h-9 w-[330px] max-w-full rounded-md" />
          <div className="flex gap-2 xl:ml-auto">
            <Skeleton className="h-8 w-56 rounded-md" />
            <Skeleton className="h-8 w-[156px] rounded-md" />
            <Skeleton className="h-8 w-16 rounded-md" />
          </div>
        </div>
        <Skeleton className="mb-3 h-3 w-24" />
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="overflow-hidden rounded-lg border border-border bg-card">
              <Skeleton className="aspect-[16/10] rounded-none" />
              <div className="space-y-2.5 p-4">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="mt-4 h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppPage>
  );
}

export function NewProjectSkeleton() {
  return (
    <AppPage>
      <div role="status" aria-label="Loading" className="animate-fade-in">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="mt-3 h-4 w-[min(560px,100%)]" />
        <Skeleton className="mb-8 mt-8 h-9 w-[440px] max-w-full rounded-md" />
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_400px] xl:gap-10">
          <div>
            <div className="mb-5 flex gap-1.5 overflow-hidden">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-8 w-24 shrink-0 rounded-md" />
              ))}
            </div>
            <div className="grid gap-x-5 gap-y-7 sm:grid-cols-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i}>
                  <Skeleton className="aspect-[16/10] rounded-lg" />
                  <Skeleton className="mt-3 h-4 w-1/2" />
                  <Skeleton className="mt-2 h-3 w-3/4" />
                </div>
              ))}
            </div>
          </div>
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <Skeleton className="aspect-[16/10] rounded-none" />
            <div className="space-y-4 p-5">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
              <div className="grid grid-cols-3 gap-2">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-16 rounded-md" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppPage>
  );
}
