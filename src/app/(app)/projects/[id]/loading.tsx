import "@/components/workspace/workspace.css";
import { Skeleton } from "@/components/ui/misc";
import { LogoMark } from "@/components/logo";

/** [indent, width%] for the code-shaped placeholder lines. */
const CODE: [number, number][] = [
  [0, 34], [0, 42], [0, 0], [0, 28], [1, 50], [1, 40], [2, 58], [2, 32], [1, 18], [0, 8], [0, 0], [0, 40], [1, 54], [1, 26],
];

/** Mirrors the workspace shell (agent card, Code card, browser card) while the project opens. */
export default function Loading() {
  return (
    <div role="status" className="ws-root relative flex h-dvh flex-col bg-background">
      {/* Header: logo | project, then view switch, then Run | History Share | Publish */}
      <div className="flex h-12 shrink-0 items-center gap-2 px-2.5" aria-hidden="true">
        <Skeleton className="size-7 rounded-lg" />
        <span className="ws-divider" />
        <Skeleton className="h-[18px] w-7 rounded-[4px]" />
        <Skeleton className="h-3.5 w-32" />
        <div className="mx-auto hidden gap-1 rounded-lg p-0.5 shadow-[inset_0_0_0_1px_var(--border)] xl:flex">
          <Skeleton className="h-7 w-20 rounded-md" />
          <Skeleton className="h-7 w-16 rounded-md opacity-60" />
          <Skeleton className="h-7 w-16 rounded-md opacity-60" />
        </div>
        <div className="ml-auto flex items-center gap-1.5 xl:ml-0">
          <Skeleton className="h-8 w-16 rounded-lg" />
          <span className="ws-divider mx-1" />
          <Skeleton className="h-8 w-20 rounded-lg opacity-70" />
          <Skeleton className="h-8 w-[72px] rounded-lg" />
          <Skeleton className="size-8 rounded-full" />
        </div>
      </div>
      <div className="ws-body relative grid min-h-0 flex-1 grid-cols-1 gap-1.5 px-1.5 pb-1.5 lg:grid-cols-[340px_1fr] min-[1440px]:grid-cols-[380px_1fr]" aria-hidden="true">
        {/* Agent card */}
        <div className="ws-card flex flex-col">
          <div className="ws-chrome flex h-10 items-center gap-2 border-b border-border px-3">
            <Skeleton className="size-3.5 rounded" />
            <Skeleton className="h-3 w-28" />
          </div>
          <div className="flex-1 space-y-3 p-3">
            <Skeleton className="ml-auto h-9 w-2/3 rounded-xl" />
            <div className="space-y-3 rounded-xl border border-border p-3">
              <div className="flex items-center gap-2.5">
                <Skeleton className="size-6 rounded-lg" />
                <Skeleton className="h-3 w-24" />
              </div>
              <div className="grid grid-cols-6 gap-1">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-1 rounded-full" />
                ))}
              </div>
              <Skeleton className="h-7 w-full rounded-lg" />
            </div>
          </div>
          <div className="p-2.5">
            <Skeleton className="h-[104px] w-full rounded-xl" />
          </div>
        </div>
        {/* Canvas */}
        <div className="hidden min-h-0 grid-cols-[minmax(0,1fr)_36%] gap-1.5 lg:grid">
          {/* Code card: explorer and editor joined by a hairline */}
          <div className="ws-card grid grid-cols-[208px_minmax(0,1fr)]">
            <div className="border-r border-border">
              <div className="ws-chrome flex h-10 items-center border-b border-border px-2">
                <Skeleton className="h-7 w-28 rounded-lg" />
              </div>
              <div className="space-y-2.5 p-3">
                {[70, 55, 80, 60, 75, 50, 65].map((w, i) => (
                  <Skeleton key={i} className="h-3" style={{ width: `${w}%`, marginLeft: i > 0 && i < 5 ? 14 : 0 }} />
                ))}
              </div>
            </div>
            <div className="flex flex-col">
              <div className="ws-tabstrip flex h-10 items-stretch shadow-[inset_0_-1px_0_var(--border)]">
                <span className="w-10 border-r border-border" />
                <span className="flex w-28 items-center border-r border-border bg-card px-3">
                  <Skeleton className="h-3 w-full" />
                </span>
                <span className="flex w-24 items-center border-r border-border px-3 opacity-60">
                  <Skeleton className="h-3 w-full" />
                </span>
              </div>
              <div className="flex flex-1 gap-4 px-3 pt-3">
                <div className="w-6 space-y-[11px]">
                  {CODE.map((_, i) => (
                    <div key={i} className="ml-auto h-[9px] w-3 rounded-sm bg-muted" />
                  ))}
                </div>
                <div className="min-w-0 flex-1 space-y-[11px]">
                  {CODE.map(([indent, w], i) => (
                    <div key={i} className="h-[9px] rounded-sm bg-muted" style={{ marginLeft: indent * 16, width: `${w}%` }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
          {/* Preview card: the card is the browser window */}
          <div className="ws-card flex flex-col">
            <div className="ws-chrome flex h-10 items-center gap-1.5 border-b border-border px-2">
              <Skeleton className="size-6 rounded-md" />
              <Skeleton className="h-7 flex-1 rounded-md" />
              <Skeleton className="h-7 w-[84px] rounded-md" />
            </div>
            <div className="flex-1" />
          </div>
        </div>
      </div>
      {/* The one thing announced: the skeleton above is decorative. */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="ws-pill-in flex items-center gap-2.5 rounded-lg border border-border-strong bg-card px-3.5 py-2.5 shadow-lg">
          <span className="ws-orb rounded-lg" data-running="" aria-hidden="true">
            <LogoMark size={20} state="running" />
          </span>
          <span className="text-[13px] font-medium">Opening project…</span>
        </div>
      </div>
    </div>
  );
}
