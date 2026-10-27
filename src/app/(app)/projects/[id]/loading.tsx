import "@/components/workspace/workspace.css";
import { Skeleton } from "@/components/ui/misc";
import { LogoMark } from "@/components/logo";

/** Mirrors the workspace shell (agent card, explorer, editor, browser frame) while the project opens. */
export default function Loading() {
  return (
    <div role="status" className="ws-root relative flex h-dvh flex-col bg-background">
      <div className="flex h-[52px] shrink-0 items-center gap-2.5 px-3" aria-hidden="true">
        <Skeleton className="size-7 rounded-lg" />
        <Skeleton className="h-5 w-8 rounded-[5px]" />
        <Skeleton className="h-4 w-40" />
        <div className="ml-auto flex gap-2">
          <Skeleton className="h-8 w-20 rounded-[10px]" />
          <Skeleton className="h-8 w-24 rounded-[10px]" />
          <Skeleton className="size-8 rounded-full" />
        </div>
      </div>
      <div className="ws-body relative grid min-h-0 flex-1 grid-cols-1 gap-1.5 px-1.5 pb-1.5 lg:grid-cols-[360px_1fr] min-[1440px]:grid-cols-[400px_1fr]" aria-hidden="true">
        {/* Agent card */}
        <div className="ws-card flex flex-col">
          <div className="flex h-12 items-center gap-2 border-b border-border px-3">
            <Skeleton className="size-4 rounded" />
            <Skeleton className="h-3.5 w-28" />
          </div>
          <div className="flex-1 space-y-4 p-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-4/5" />
            <div className="space-y-2 pt-2">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          </div>
          <div className="p-3">
            <Skeleton className="h-[120px] w-full rounded-2xl" />
          </div>
        </div>
        {/* Canvas */}
        <div className="hidden min-h-0 grid-cols-[200px_1fr_40%] gap-1.5 lg:grid">
          <div className="ws-card space-y-2 p-3">
            <Skeleton className="mb-3 h-7 w-full rounded-[10px]" />
            {[70, 55, 80, 60, 75, 50, 65].map((w, i) => (
              <Skeleton key={i} className="h-3.5" style={{ width: `${w}%`, marginLeft: i > 0 && i < 5 ? 14 : 0 }} />
            ))}
          </div>
          <div className="ws-card flex flex-col">
            <div className="flex h-10 items-end gap-1 border-b border-border px-2">
              <Skeleton className="h-7 w-24 rounded-b-none rounded-t-lg" />
              <Skeleton className="h-7 w-20 rounded-b-none rounded-t-lg opacity-60" />
            </div>
            <div className="flex-1 space-y-2.5 p-4">
              {[40, 65, 52, 78, 30, 60, 45].map((w, i) => (
                <Skeleton key={i} className="h-3" style={{ width: `${w}%` }} />
              ))}
            </div>
          </div>
          <div className="ws-card ws-stage p-2.5">
            <div className="flex h-full flex-col overflow-hidden rounded-[14px] border border-border-strong bg-card">
              <div className="flex h-10 items-center gap-2 border-b border-border px-2">
                <Skeleton className="size-6 rounded-md" />
                <Skeleton className="h-7 flex-1 rounded-full" />
              </div>
              <div className="flex-1" />
            </div>
          </div>
        </div>
      </div>
      {/* The one thing announced: the skeleton above is decorative. */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="ws-pill-in glass flex items-center gap-3 rounded-2xl border border-border-strong px-4 py-3 shadow-xl">
          <span className="ws-orb rounded-lg" data-running="" aria-hidden="true">
            <LogoMark size={26} state="running" />
          </span>
          <span className="text-[14px] font-medium">Opening project…</span>
        </div>
      </div>
    </div>
  );
}
