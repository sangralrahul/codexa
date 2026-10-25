import Link from "next/link";
import { ArrowUpRight, Check, CircleAlert, RotateCcw, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Home-page bento: each tile pairs one capability with a small, accurate
 * slice of the product UI (built from DOM, themed, no screenshots). The
 * contents are illustrative examples, not live data.
 */
function Tile({ title, body, href, className, children }: { title: string; body: string; href: string; className?: string; children: React.ReactNode }) {
  return (
    <Link href={href} data-reveal className={cn("glow-card group flex flex-col overflow-hidden rounded-3xl border border-border", className)}>
      <div className="p-7 pb-5">
        <h3 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          {title}
          <ArrowUpRight className="size-4 text-muted-foreground transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
        </h3>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{body}</p>
      </div>
      <div aria-hidden="true" className="relative mt-auto px-7 pb-7">
        {children}
      </div>
    </Link>
  );
}

const panel = "rounded-2xl border border-border bg-surface/80 p-4 font-mono text-[11.5px] leading-relaxed";

export function PlatformBento() {
  return (
    <div className="grid gap-4 lg:grid-cols-6">
      <Tile
        className="lg:col-span-4"
        href="/ai-agent"
        title="An agent that shows its work"
        body="It plans, edits real files with tools, runs the type-check and build, reads the errors and repairs them, bounded to two attempts. Every step is visible and cancellable."
      >
        <ol className={panel}>
          {[
            { icon: Check, tone: "text-success", text: "read_file  src/App.tsx" },
            { icon: Check, tone: "text-success", text: "write_file src/components/InvoiceTable.tsx" },
            { icon: CircleAlert, tone: "text-signal", text: "typecheck  1 error · Property 'total' is missing" },
            { icon: Wrench, tone: "text-foreground", text: "repair     add total to Invoice type" },
            { icon: Check, tone: "text-success", text: "typecheck  0 errors · build passed" },
          ].map((s, i) => (
            <li key={s.text} data-reveal style={{ "--reveal-delay": `${200 + i * 140}ms` } as React.CSSProperties} className="flex items-center gap-2.5 py-0.5">
              <s.icon className={cn("size-3.5 shrink-0", s.tone)} />
              <span className="truncate text-foreground/85">{s.text}</span>
            </li>
          ))}
        </ol>
      </Tile>

      <Tile className="lg:col-span-2" href="/features" title="Every AI run is reversible" body="A snapshot is taken before each run. Review per-file diffs and restore in one click.">
        <div className={panel}>
          <p className="mb-2 text-muted-foreground">src/lib/totals.ts</p>
          <p className="rounded bg-danger/10 px-1.5 text-danger">- return sum(items)</p>
          <p className="rounded bg-success/10 px-1.5 text-success">+ return sum(items) * (1 + gst)</p>
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 font-sans text-[11px] text-foreground transition-colors group-hover:border-foreground/40">
            <RotateCcw className="size-3" /> Restore snapshot
          </span>
        </div>
      </Tile>

      <Tile className="lg:col-span-2" href="/features" title="Runs in its own sandbox" body="Previews run in an isolated container with hot reload and streamed logs, never inside the web app.">
        <div className={cn(panel, "bg-code-bg text-code-fg")}>
          <p className="text-white/45">$ npm run dev</p>
          <p>
            <span className="text-success">VITE</span> ready in 412 ms
          </p>
          <p className="text-white/70">➜ Preview: abc123-preview.example.com</p>
          <p className="text-white/70">
            GET / <span className="text-success">200</span> · 8 ms
          </p>
        </div>
      </Tile>

      <Tile className="lg:col-span-2" href="/app-deployment" title="Deploy, then roll back" body="Build in the sandbox, publish to a subdomain, keep every deployment, restore any of them.">
        <ul className={cn(panel, "space-y-1.5 font-sans text-xs")}>
          {[
            ["v3", "2 min ago", true],
            ["v2", "yesterday", false],
            ["v1", "3 days ago", false],
          ].map(([v, when, live]) => (
            <li key={String(v)} className="flex items-center justify-between rounded-lg bg-card px-2.5 py-1.5">
              <span className="font-mono">{v}</span>
              <span className="text-muted-foreground">{when}</span>
              {live ? <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-medium text-success">Live</span> : <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">Roll back</span>}
            </li>
          ))}
        </ul>
      </Tile>

      <Tile className="lg:col-span-2" href="/integrations" title="Query your own database" body="Connect PostgreSQL or Supabase, browse the schema and run SQL. Destructive statements ask first.">
        <div className={panel}>
          <p>
            <span className="hljs-keyword">select</span> name, plan <span className="hljs-keyword">from</span> customers <span className="hljs-keyword">limit</span> <span className="hljs-number">3</span>;
          </p>
          <div className="mt-3 overflow-hidden rounded-lg border border-border font-sans text-[11px]">
            {[
              ["Studio Kite", "pro"],
              ["Banyan Foods", "team"],
              ["Northwind", "free"],
            ].map(([n, p]) => (
              <div key={n} className="flex justify-between border-b border-border bg-card px-2.5 py-1 last:border-b-0">
                <span>{n}</span>
                <span className="text-muted-foreground">{p}</span>
              </div>
            ))}
          </div>
        </div>
      </Tile>
    </div>
  );
}
