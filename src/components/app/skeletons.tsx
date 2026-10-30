import { AppPage } from "./app-shell";
import { Skeleton } from "@/components/ui/misc";

/** Placeholders that match the real layouts (same sizes, so nothing shifts when the page arrives). */

export function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Loading dashboard" className="animate-fade-in">
      <AppPage className="pb-4 pt-8 lg:pb-6 lg:pt-12">
        <div className="mx-auto max-w-4xl">
          <Skeleton className="mx-auto h-3 w-40" />
          <Skeleton className="mx-auto mt-4 h-11 w-[min(520px,90%)] rounded-lg" />
          <div className="mx-auto mt-7 max-w-3xl">
            <div className="comet-border rounded-[20px]" data-active>
              <div className="comet-border__inner rounded-[19px] bg-card p-4">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="mt-2 h-4 w-1/3" />
                <div className="mt-[68px] flex items-center gap-2">
                  <Skeleton className="h-8 w-36 rounded-md" />
                  <Skeleton className="h-8 w-24 rounded-md" />
                  <Skeleton className="ml-auto h-9 w-24 rounded-md" />
                </div>
              </div>
            </div>
            <Skeleton className="mx-auto mt-3 h-5 w-[min(560px,90%)] rounded-full" />
          </div>
          <div className="mt-5 flex justify-center gap-2 overflow-hidden">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-10 w-32 shrink-0 rounded-lg" />
            ))}
          </div>
        </div>
      </AppPage>
      <AppPage className="space-y-10 pt-2">
        <div>
          <Skeleton className="mb-3 h-4 w-36" />
          <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div className="grid overflow-hidden rounded-lg border border-border bg-card md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
              <Skeleton className="aspect-[16/10] rounded-none md:aspect-auto md:min-h-[236px]" />
              <div className="space-y-3 p-6">
                <Skeleton className="h-3 w-40" />
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-6 w-56 rounded-full" />
                <Skeleton className="h-20 w-full rounded-md" />
                <Skeleton className="h-9 w-32 rounded-md" />
              </div>
            </div>
            <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-5">
                  <Skeleton className="h-10 w-16 rounded-[8px]" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-2/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="space-y-4 rounded-lg border border-border bg-card p-5">
            <Skeleton className="h-4 w-24" />
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-6 rounded-full" />
                <Skeleton className="h-3.5 flex-1" />
                <Skeleton className="h-3 w-14" />
              </div>
            ))}
          </div>
          <div className="space-y-4 rounded-lg border border-border bg-card p-5">
            <Skeleton className="h-4 w-28" />
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-1 w-full rounded-full" />
              </div>
            ))}
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
