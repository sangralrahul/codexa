import { cn } from "@/lib/utils";

/**
 * Small decorative preview of a template, drawn with DOM blocks (no screenshots):
 * a browser frame whose contents suggest the category's typical layout.
 * Purely illustrative; unknown categories fall back to a generic page.
 */
const bar = "rounded-[3px] bg-foreground/12";
const soft = "rounded-[3px] bg-foreground/[0.06]";
const tile = "rounded-[4px] border border-border bg-card";
const accent = "rounded-[3px] bg-signal/80";

function Lines({ n, className }: { n: number; className?: string }) {
  return (
    <div className={cn("space-y-1", className)}>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className={cn(bar, "h-1")} style={{ width: `${92 - ((i * 17) % 40)}%` }} />
      ))}
    </div>
  );
}

function Sidebar({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full gap-1.5">
      <div className="flex w-[22%] flex-col gap-1 rounded-[4px] bg-foreground/[0.05] p-1.5">
        <div className={cn(bar, "mb-1 h-1.5 w-3/4")} />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={cn(i === 0 ? "bg-foreground/25" : "bg-foreground/10", "h-1 rounded-[3px]")} style={{ width: `${80 - i * 8}%` }} />
        ))}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

const layouts: Record<string, () => React.ReactNode> = {
  websites: () => (
    <div className="flex h-full flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <div className={cn(bar, "h-1.5 w-1/5")} />
        <div className="flex gap-1">{[0, 1, 2].map((i) => <div key={i} className={cn(soft, "h-1 w-3")} />)}</div>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-1">
        <div className={cn(bar, "h-2 w-3/5 bg-foreground/25")} />
        <div className={cn(bar, "h-1 w-2/5")} />
        <div className="mt-1 flex gap-1">
          <div className={cn(accent, "h-2 w-7")} />
          <div className={cn(soft, "h-2 w-7 border border-border")} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1">{[0, 1, 2].map((i) => <div key={i} className={cn(tile, "h-4")} />)}</div>
    </div>
  ),
  "web-apps": () => (
    <div className="flex h-full flex-col gap-1.5">
      <div className="flex items-center gap-1">
        <div className={cn(bar, "h-1.5 w-1/6")} />
        <div className={cn(soft, "ml-auto h-2 w-1/3 border border-border")} />
        <div className={cn(accent, "h-2 w-5")} />
      </div>
      <div className="grid flex-1 grid-cols-3 gap-1">
        {[0, 1, 2].map((c) => (
          <div key={c} className="space-y-1 rounded-[4px] bg-foreground/[0.05] p-1">
            <div className={cn(bar, "h-1 w-1/2")} />
            {Array.from({ length: 3 - (c % 2) }, (_, i) => <div key={i} className={cn(tile, "h-3")} />)}
          </div>
        ))}
      </div>
    </div>
  ),
  saas: () => (
    <Sidebar>
      <div className="flex h-full flex-col gap-1">
        <div className="grid grid-cols-3 gap-1">{[0, 1, 2].map((i) => <div key={i} className={cn(tile, "h-4 p-0.5")}><div className={cn(bar, "h-1 w-1/2")} /></div>)}</div>
        <div className={cn(tile, "flex-1 space-y-1 p-1")}>
          {[0, 1, 2, 3].map((i) => <div key={i} className={cn(i ? soft : bar, "h-1")} />)}
        </div>
      </div>
    </Sidebar>
  ),
  dashboards: () => (
    <Sidebar>
      <div className="flex h-full flex-col gap-1">
        <div className="grid grid-cols-3 gap-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className={cn(tile, "space-y-0.5 p-1")}>
              <div className={cn(soft, "h-0.5 w-1/2")} />
              <div className={cn(bar, "h-1.5 w-2/3 bg-foreground/25")} />
            </div>
          ))}
        </div>
        <div className={cn(tile, "flex flex-1 items-end gap-[3px] p-1.5")}>
          {[40, 65, 50, 80, 55, 90, 70, 60].map((h, i) => <div key={i} className={cn(i === 5 ? "bg-signal/80" : "bg-foreground/20", "flex-1 rounded-t-[2px]")} style={{ height: `${h}%` }} />)}
        </div>
      </div>
    </Sidebar>
  ),
  ecommerce: () => (
    <div className="flex h-full flex-col gap-1.5">
      <div className="flex items-center gap-1">
        <div className={cn(bar, "h-1.5 w-1/6")} />
        <div className={cn(soft, "ml-auto h-2 w-1/4 border border-border")} />
      </div>
      <div className="grid flex-1 grid-cols-3 gap-1">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex flex-col gap-0.5">
            <div className="flex-1 rounded-[4px] bg-foreground/10" />
            <div className={cn(bar, "h-0.5 w-3/4")} />
            <div className={cn(i === 1 ? accent : soft, "h-1 w-1/3")} />
          </div>
        ))}
      </div>
    </div>
  ),
  portfolios: () => (
    <div className="flex h-full flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <div className="size-4 rounded-full bg-foreground/20" />
        <div className="flex-1 space-y-0.5">
          <div className={cn(bar, "h-1.5 w-1/3 bg-foreground/25")} />
          <div className={cn(soft, "h-1 w-1/2")} />
        </div>
      </div>
      <div className="grid flex-1 grid-cols-2 gap-1">{[0, 1, 2, 3].map((i) => <div key={i} className={cn("rounded-[4px]", i === 0 ? "bg-signal/30" : "bg-foreground/10")} />)}</div>
    </div>
  ),
  "ai-tools": () => (
    <div className="flex h-full flex-col gap-1">
      <div className="flex flex-1 flex-col justify-end gap-1">
        <div className="ml-auto h-2.5 w-2/5 rounded-[5px] rounded-br-[2px] bg-foreground/25" />
        <div className={cn(tile, "w-3/4 space-y-0.5 rounded-[5px] rounded-bl-[2px] p-1")}>
          <div className={cn(bar, "h-0.5 w-full")} />
          <div className={cn(bar, "h-0.5 w-4/5")} />
          <div className={cn(bar, "h-0.5 w-2/3")} />
        </div>
        <div className="ml-auto h-2.5 w-1/3 rounded-[5px] rounded-br-[2px] bg-foreground/25" />
      </div>
      <div className={cn(tile, "flex h-3.5 items-center justify-end px-1")}>
        <div className="size-2 rounded-full bg-signal/80" />
      </div>
    </div>
  ),
  "admin-panels": () => (
    <Sidebar>
      <div className="flex h-full flex-col gap-1">
        <div className="flex gap-1">
          <div className={cn(soft, "h-2 flex-1 border border-border")} />
          <div className={cn(accent, "h-2 w-5")} />
        </div>
        <div className={cn(tile, "flex-1 divide-y divide-border overflow-hidden")}>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-1 px-1 py-[3px]">
              <div className={cn(i ? soft : bar, "h-1 w-1/3")} />
              <div className={cn(soft, "h-1 w-1/4")} />
              <div className={cn(i === 2 ? "bg-signal/50" : "bg-foreground/10", "ml-auto h-1 w-2 rounded-full")} />
            </div>
          ))}
        </div>
      </div>
    </Sidebar>
  ),
  crm: () => (
    <div className="grid h-full grid-cols-4 gap-1">
      {[3, 2, 2, 1].map((n, c) => (
        <div key={c} className="space-y-1 rounded-[4px] bg-foreground/[0.05] p-1">
          <div className={cn(c === 3 ? accent : bar, "h-1 w-2/3")} />
          {Array.from({ length: n }, (_, i) => (
            <div key={i} className={cn(tile, "space-y-0.5 p-0.5")}>
              <div className={cn(bar, "h-0.5 w-3/4")} />
              <div className={cn(soft, "h-0.5 w-1/2")} />
            </div>
          ))}
        </div>
      ))}
    </div>
  ),
  "mobile-first": () => (
    <div className="flex h-full items-center justify-center">
      <div className="flex h-full w-[34%] flex-col gap-1 rounded-[6px] border border-border bg-card p-1">
        <div className={cn(bar, "mx-auto h-0.5 w-1/3")} />
        <div className="h-1/3 rounded-[3px] bg-foreground/10" />
        <Lines n={3} />
        <div className="mt-auto flex justify-around border-t border-border pt-0.5">
          {[0, 1, 2, 3].map((i) => <div key={i} className={cn(i === 0 ? "bg-signal/80" : "bg-foreground/20", "size-1 rounded-full")} />)}
        </div>
      </div>
    </div>
  ),
};
layouts["landing-pages"] = layouts.websites;

export function TemplateThumb({ category, className }: { category: string; className?: string }) {
  const draw = layouts[category];
  return (
    <div aria-hidden="true" className={cn("overflow-hidden rounded-lg border border-border bg-surface", className)}>
      <div className="flex h-3.5 items-center gap-[3px] border-b border-border bg-background/60 px-1.5">
        {[0, 1, 2].map((i) => <span key={i} className="size-1 rounded-full bg-foreground/15" />)}
        <span className="ml-1.5 h-1 w-1/3 rounded-full bg-foreground/[0.07]" />
      </div>
      <div className="aspect-[16/9] p-2">
        {draw ? (
          draw()
        ) : (
          <div className="flex h-full flex-col gap-1.5">
            <div className={cn(bar, "h-1.5 w-1/4")} />
            <Lines n={4} />
            <div className="mt-auto grid grid-cols-2 gap-1">{[0, 1].map((i) => <div key={i} className={cn(tile, "h-5")} />)}</div>
          </div>
        )}
      </div>
    </div>
  );
}
