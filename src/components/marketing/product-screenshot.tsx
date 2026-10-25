import { Bot, CheckCircle2, FileCode2, FolderOpen, MonitorSmartphone, Play, Search, Sparkles, Terminal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StatusDot } from "@/components/ui/misc";
import { cn } from "@/lib/utils";

const files = ["src/App.tsx", "src/components/Invoice.tsx", "src/lib/api.ts", "src/index.css", "package.json"];
const code = [
  ["kw", "export default function "],
  ["fn", "InvoiceList"],
  ["", "() {"],
  ["nl", ""],
  ["", "  const { data, isLoading } = "],
  ["fn", "useInvoices"],
  ["", "();"],
  ["nl", ""],
  ["", "  if (isLoading) return <"],
  ["tag", "Skeleton"],
  ["", " rows={5} />;"],
  ["nl", ""],
  ["", "  return <"],
  ["tag", "Table"],
  ["", " rows={data} onPay={pay} />;"],
  ["nl", ""],
  ["", "}"],
] as const;

const chat = [
  { role: "user", text: "Add an invoices page with a paid/unpaid filter and a Razorpay pay button." },
  { role: "stage", text: "Planning · 3 steps" },
  { role: "tool", text: "read_file src/App.tsx" },
  { role: "tool", text: "write_file src/components/Invoice.tsx" },
  { role: "stage", text: "Type-check passed · 0 errors" },
  { role: "assistant", text: "Added the page, filter and button. Snapshot created before changes so you can revert." },
] as const;

/**
 * A static DOM mock of the Codexa workspace, built from the same UI
 * primitives as the real app. It is labelled as an interface preview and is
 * not a screenshot of a live session.
 */
export function ProductScreenshot({ className, caption, animated = false }: { className?: string; caption?: string; animated?: boolean }) {
  const frame = (
      <div
        aria-hidden="true"
        className={cn("overflow-hidden bg-card text-left [font-size:11px] sm:[font-size:12px]", animated ? "glow-border__inner shadow-2xl" : "rounded-xl border border-border shadow-lg")}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border bg-surface px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="flex gap-1">
              <span className={cn("size-2.5 rounded-full", animated ? "bg-danger/80" : "bg-border-strong")} />
              <span className={cn("size-2.5 rounded-full", animated ? "bg-warning/80" : "bg-border-strong")} />
              <span className={cn("size-2.5 rounded-full", animated ? "bg-success/80" : "bg-border-strong")} />
            </span>
            <span className="ml-2 font-medium">invoice-tracker</span>
            <Badge variant="outline">vite-react</Badge>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <span className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1">
              <Play className="size-3" /> Run
            </span>
            <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-1", animated ? "btn-glow" : "bg-primary text-primary-foreground")}>Deploy</span>
          </div>
        </div>
        <div className="grid min-h-[320px] grid-cols-[minmax(0,1fr)] md:grid-cols-[150px_minmax(0,1.3fr)_minmax(0,1fr)]">
          <div className="hidden border-r border-border bg-surface p-2 md:block">
            <p className="mb-1 flex items-center gap-1 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <FolderOpen className="size-3" /> Files
            </p>
            <ul className="space-y-0.5">
              {files.map((f, i) => (
                <li key={f} className={cn("flex items-center gap-1.5 rounded px-1.5 py-1 text-muted-foreground", i === 1 && "bg-muted text-foreground")}>
                  <FileCode2 className="size-3 shrink-0" />
                  <span className="truncate">{f.replace("src/", "")}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 flex items-center gap-1 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Search className="size-3" /> Search
            </p>
          </div>
          <div className="flex min-w-0 flex-col">
            <div className="flex border-b border-border bg-surface">
              {["Invoice.tsx", "App.tsx"].map((t, i) => (
                <span key={t} className={cn("border-r border-border px-3 py-1.5", i === 0 ? "bg-card font-medium" : "text-muted-foreground")}>
                  {t}
                </span>
              ))}
            </div>
            <pre className="m-0 flex-1 rounded-none bg-code-bg p-3 font-mono text-[11px] leading-5 text-code-fg">
              {code.map(([kind, text], i) =>
                kind === "nl" ? (
                  "\n"
                ) : (
                  <span key={i} className={cn(kind === "kw" && "text-accent", kind === "fn" && "text-primary", kind === "tag" && "text-success")}>
                    {text}
                  </span>
                ),
              )}
              {animated ? <span className="caret" /> : null}
            </pre>
            <div className="flex items-center gap-3 border-t border-border bg-surface px-3 py-1.5 text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="size-3 text-success" /> No problems
              </span>
              <span className="inline-flex items-center gap-1">
                <Terminal className="size-3" /> Logs
              </span>
              <span className="ml-auto inline-flex items-center gap-1">
                <span className={cn(animated && "animate-pulse-dot")}>
                  <StatusDot status="ok" />
                </span>{" "}
                Preview running
              </span>
            </div>
          </div>
          <div className="flex min-w-0 flex-col border-t border-border md:border-l md:border-t-0">
            <div className="flex items-center gap-2 border-b border-border bg-surface px-3 py-1.5">
              <Bot className="size-3.5 text-primary" />
              <span className="font-medium">AI agent</span>
              <Badge variant="primary" className="ml-auto">
                Build
              </Badge>
            </div>
            <ul className={cn("flex-1 space-y-2 p-3", animated && "seq")}>
              {chat.map((m, i) => (
                <li
                  key={i}
                  style={{ "--i": i } as React.CSSProperties}
                  className={cn(
                    "rounded-lg px-2.5 py-1.5",
                    m.role === "user" && "ml-6 bg-primary/10",
                    m.role === "assistant" && "bg-muted",
                    m.role === "stage" && "flex items-center gap-1.5 text-muted-foreground",
                    m.role === "tool" && "font-mono text-[10px] text-muted-foreground",
                  )}
                >
                  {m.role === "stage" ? <Sparkles className="size-3" /> : null}
                  {m.text}
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-2 border-t border-border px-3 py-2 text-muted-foreground">
              <MonitorSmartphone className="size-3.5" />
              <span>Preview · Desktop · 1280px</span>
            </div>
          </div>
        </div>
      </div>
  );
  return (
    <figure className={cn("mx-auto w-full max-w-5xl", className)}>
      {animated ? <div className="glow-border">{frame}</div> : frame}
      <figcaption className="mt-3 text-center text-xs text-muted-foreground">
        <Badge variant="outline" className="mr-2 align-middle">
          Interface preview
        </Badge>
        {caption ?? "A static illustration of the Codexa workspace layout, built from the product's UI components. Not a screenshot of a live session."}
      </figcaption>
    </figure>
  );
}
