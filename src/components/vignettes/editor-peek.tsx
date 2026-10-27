"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { GlideIndicator, useGlide } from "@/components/motion/glide";
import { CodeLines } from "./code-lines";
import { langFromPath, tokenize, type Token } from "./tokenize";
import { useScript } from "./use-script";

export type PeekFile = { path: string; code?: string; tokens?: Token[][] };

const DEFAULT_FILES: PeekFile[] = [
  {
    path: "src/App.tsx",
    code: `import { InvoiceTable } from "./components/InvoiceTable";

export default function App() {
  const [filter, setFilter] = useState<Filter>("all");
  return (
    <main className="mx-auto max-w-4xl p-6">
      <Filters value={filter} onChange={setFilter} />
      <InvoiceTable rows={byStatus(invoices, filter)} />
    </main>
  );
}`,
  },
  {
    path: "src/components/InvoiceTable.tsx",
    code: `export function InvoiceTable({ rows }: { rows: Invoice[] }) {
  return (
    <table className="w-full text-sm">
      {rows.map((r) => (
        <Row key={r.id} invoice={r} total={withGst(r.amount)} />
      ))}
    </table>
  );
}`,
  },
  {
    path: "src/styles.css",
    code: `.badge {
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 12px;
}
.badge[data-paid="true"] { color: var(--success); }`,
  },
];

/**
 * A real-editor peek: file tabs with a gliding indicator and highlighted code. Tabs cycle
 * once when it comes into view, then stay on the first file; clicking a tab switches it.
 * Decorative (aria-hidden; tabs are pointer-only). Sample code.
 */
export function EditorPeek({ playing, className, files = DEFAULT_FILES }: { playing?: boolean; className?: string; files?: PeekFile[] }) {
  const schedule = React.useMemo(() => [...files.map((_, i) => i * 2400), files.length * 2400], [files]);
  const { ref, index, started } = useScript(schedule, files.length * 2400 + 200, playing);
  const [picked, setPicked] = React.useState<number | null>(null);
  const tabsRef = React.useRef<HTMLDivElement>(null);
  const glide = useGlide(tabsRef, { selector: '[data-active="true"]' });
  const scripted = !started || index >= files.length || index < 0 ? 0 : index;
  const active = picked ?? scripted;
  const file = files[active];
  const lines = React.useMemo(() => file.tokens ?? tokenize(file.code ?? "", langFromPath(file.path)), [file]);

  return (
    <div ref={ref} aria-hidden="true" className={cn("w-full min-w-0 overflow-hidden rounded-xl border border-code-border bg-code-bg shadow-sm [contain:inline-size]", className)}>
      <div ref={tabsRef} className="relative flex items-stretch overflow-hidden border-b border-code-border">
        <GlideIndicator ref={glide} className="glide-indicator--bar bottom-auto top-0" />
        {files.map((f, i) => (
          <button
            key={f.path}
            type="button"
            tabIndex={-1}
            data-active={i === active ? "true" : undefined}
            onClick={() => setPicked(i)}
            className={cn(
              "relative z-[1] flex h-9 shrink-0 items-center gap-1.5 border-r border-code-border px-3 font-mono text-[11.5px] transition-colors duration-200",
              i === active ? "bg-code-fg/[0.06] text-code-fg" : "text-code-muted hover:text-code-fg/80",
            )}
          >
            <span className={cn("size-1.5 rounded-full", f.path.endsWith(".css") ? "bg-syn-attr" : "bg-syn-fn")} />
            {f.path.split("/").pop()}
          </button>
        ))}
      </div>
      <div key={active} className="stage-swap min-h-[11rem] px-1 py-2.5">
        <CodeLines tokens={lines} />
      </div>
    </div>
  );
}
