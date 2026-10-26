import { Skeleton } from "@/components/ui/misc";

/** Editor-shaped placeholder while the project workspace loads. */
export default function Loading() {
  return (
    <div role="status" aria-label="Opening project" className="flex h-dvh flex-col bg-background">
      <div className="flex h-12 items-center gap-3 border-b border-border px-3">
        <Skeleton className="size-7 rounded-lg" />
        <Skeleton className="h-4 w-56" />
        <div className="ml-auto flex gap-2">
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-[300px_1fr_420px]">
        <div className="space-y-2 border-r border-border p-3">
          {[60, 80, 70, 50, 75, 65].map((w, i) => (
            <Skeleton key={i} className="h-4" style={{ width: `${w}%` }} />
          ))}
        </div>
        <div className="flex items-center justify-center">
          <span className="spin size-6 rounded-full border-2 border-border border-t-foreground" />
        </div>
        <div className="border-l border-border p-3">
          <Skeleton className="h-full w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
