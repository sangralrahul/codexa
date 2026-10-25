"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Check, Code2, Eye, FileCode2, Loader2, Play, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A looping, scripted illustration of a Codexa session: the prompt is typed,
 * the agent works through its steps, code streams in, and the preview fills
 * in. Everything is driven by one clock (`t`, in ms) so the scenes stay in
 * sync. It is labelled as an illustration: no real AI call happens here.
 */
const LOOP_MS = 16_000;
const PROMPT = "Build an invoice tracker for freelancers with GST totals and a paid / unpaid filter.";
const STEPS = ["Planning 4 files", "Writing src/App.tsx", "Writing src/components/InvoiceTable.tsx", "Type-check passed · 0 errors", "Preview running"];
const STEP_START = 2900;
const STEP_GAP = 900;
const CODE_START = 3700;
const PREVIEW_AT = 7700;

const CODE: [string, string][][] = [
  [["k", "import"], ["", " { useState } "], ["k", "from"], ["s", ' "react"'], ["", ";"]],
  [["k", "import"], ["", " { InvoiceTable } "], ["k", "from"], ["s", ' "./components/InvoiceTable"'], ["", ";"]],
  [],
  [["k", "export default function"], ["f", " App"], ["", "() {"]],
  [["", "  "], ["k", "const"], ["", " [filter, setFilter] = "], ["f", "useState"], ["", "<"], ["t", "Filter"], ["", ">("], ["s", '"all"'], ["", ");"]],
  [["", "  "], ["k", "const"], ["", " gst = "], ["f", "totalWithGst"], ["", "(invoices, "], ["n", "0.18"], ["", ");"]],
  [],
  [["", "  "], ["k", "return"], ["", " ("]],
  [["", "    <"], ["t", "main"], ["", " className="], ["s", '"mx-auto max-w-4xl p-6"'], ["", ">"]],
  [["", "      <"], ["t", "Summary"], ["", " outstanding={gst.due} paid={gst.paid} />"]],
  [["", "      <"], ["t", "Filters"], ["", " value={filter} onChange={setFilter} />"]],
  [["", "      <"], ["t", "InvoiceTable"], ["", " rows={"], ["f", "byStatus"], ["", "(invoices, filter)} />"]],
  [["", "    </"], ["t", "main"], ["", ">"]],
  [["", "  );"]],
  [["", "}"]],
];
// Reuses the highlight.js token colours defined in globals.css.
const TOKEN: Record<string, string> = { k: "hljs-keyword", s: "hljs-string", f: "hljs-title", t: "hljs-name", n: "hljs-number", "": "" };

const ROWS = [
  { client: "Studio Kite", amount: "₹18,000", paid: true },
  { client: "Banyan Foods", amount: "₹24,500", paid: false },
  { client: "Northwind Labs", amount: "₹9,800", paid: true },
  { client: "Chai & Code", amount: "₹18,000", paid: false },
];

function useClock() {
  const [t, setT] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const id = requestAnimationFrame(() => setT(LOOP_MS - 3000)); // show the finished state, no motion
      return () => cancelAnimationFrame(id);
    }
    let visible = false;
    let start = performance.now();
    let elapsed = 0;
    const id = window.setInterval(() => {
      if (!visible || document.hidden) {
        start = performance.now() - elapsed;
        return;
      }
      elapsed = (performance.now() - start) % LOOP_MS;
      setT(elapsed);
    }, 50);
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { threshold: 0.2 });
    if (ref.current) io.observe(ref.current);
    return () => {
      clearInterval(id);
      io.disconnect();
    };
  }, []);
  return { t, ref };
}

export function LiveDemo({ className }: { className?: string }) {
  const { t, ref } = useClock();
  const typed = PROMPT.slice(0, Math.floor(Math.min(1, t / 2600) * PROMPT.length));
  const stepState = (i: number) => (t < STEP_START + i * STEP_GAP ? "hidden" : t < STEP_START + i * STEP_GAP + 750 ? "running" : "done");
  const showPreview = t >= PREVIEW_AT;
  const lines = Math.max(0, Math.min(CODE.length, Math.floor((t - CODE_START) / 230)));
  const at = (ms: number) => t >= PREVIEW_AT + ms;
  const fading = t > LOOP_MS - 450;
  const status = t < STEP_START ? "Ready" : t < STEP_START + STEPS.length * STEP_GAP ? "Agent working" : "Preview running";

  return (
    <figure className={cn("mx-auto w-full max-w-6xl", className)}>
      <div ref={ref} className="comet-border shadow-[0_50px_120px_-40px_rgba(0,0,0,0.55)]">
        <div aria-hidden="true" className={cn("comet-border__inner overflow-hidden text-left text-[12px] transition-opacity duration-300", fading && "opacity-60")}>
          {/* Title bar */}
          <div className="flex items-center gap-3 border-b border-border bg-surface/80 px-4 py-2.5">
            <span className="flex gap-1.5">
              <span className="size-2.5 rounded-full bg-danger/80" />
              <span className="size-2.5 rounded-full bg-warning/80" />
              <span className="size-2.5 rounded-full bg-success/80" />
            </span>
            <span className="ml-1 font-medium">invoice-tracker</span>
            <span className="hidden rounded-md border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">vite-react</span>
            <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">
              <span className={cn("size-1.5 rounded-full", status === "Ready" ? "bg-muted-foreground" : status === "Agent working" ? "animate-pulse-dot bg-signal" : "bg-success")} />
              {status}
            </span>
            <span className="hidden items-center gap-1 rounded-md border border-border px-2 py-1 sm:inline-flex">
              <Play className="size-3" /> Run
            </span>
            <span className="hidden rounded-md bg-foreground px-2.5 py-1 font-medium text-background sm:inline">Deploy</span>
          </div>

          <div className="grid md:grid-cols-[320px_minmax(0,1fr)]">
            {/* Agent panel */}
            <div className="flex min-h-[220px] flex-col border-b border-border md:min-h-[420px] md:border-b-0 md:border-r">
              <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
                <Bot className="size-3.5" />
                <span className="font-medium">Agent</span>
                <span className="ml-auto rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">Build</span>
              </div>
              <div className="flex-1 space-y-3 p-4">
                <div className="ml-6 rounded-xl rounded-tr-sm bg-muted px-3 py-2 leading-relaxed">
                  <span className={cn(t < 2600 && "caret")}>{typed}</span>
                </div>
                <ul className="space-y-1.5">
                  {STEPS.map((s, i) => {
                    const st = stepState(i);
                    if (st === "hidden") return null;
                    return (
                      <li key={s} className="pop-in flex items-center gap-2 text-muted-foreground">
                        {st === "running" ? <Loader2 className="spin size-3.5 text-signal" /> : <Check className="size-3.5 text-success" />}
                        <span className={cn(i > 0 && i < 3 && "font-mono text-[11px]", st === "done" && "text-foreground/80")}>{s}</span>
                      </li>
                    );
                  })}
                </ul>
                {at(200) ? (
                  <div className="pop-in flex gap-2 rounded-xl bg-surface px-3 py-2 leading-relaxed">
                    <Sparkles className="mt-0.5 size-3.5 shrink-0 text-signal" />
                    <span>Done. The invoices page, GST totals and filter are in place. A snapshot was saved first, so you can revert.</span>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Workspace */}
            <div className="flex min-w-0 flex-col">
              <div className="flex items-center gap-1 border-b border-border px-3 py-1.5">
                <span className={cn("inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 transition-colors", !showPreview ? "bg-muted text-foreground" : "text-muted-foreground")}>
                  <Code2 className="size-3.5" /> Code
                </span>
                <span className={cn("inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 transition-colors", showPreview ? "bg-muted text-foreground" : "text-muted-foreground")}>
                  <Eye className="size-3.5" /> Preview
                </span>
                <span className="ml-auto hidden items-center gap-1 font-mono text-[10px] text-muted-foreground sm:inline-flex">
                  <FileCode2 className="size-3" /> src/App.tsx
                </span>
              </div>

              <div className="relative min-h-[300px] flex-1 md:min-h-[380px]">
                {/* Code */}
                <pre className={cn("absolute inset-0 m-0 overflow-hidden rounded-none bg-code-bg p-4 font-mono text-[11.5px] leading-[1.7] text-code-fg transition-opacity duration-500", showPreview ? "opacity-0" : "opacity-100")}>
                  {CODE.slice(0, lines).map((line, i) => (
                    <div key={i} className="pop-in whitespace-pre">
                      <span className="mr-4 inline-block w-4 select-none text-right text-white/25">{i + 1}</span>
                      {line.map(([k, text], j) => (
                        <span key={j} className={TOKEN[k]}>
                          {text}
                        </span>
                      ))}
                      {i === lines - 1 && !showPreview ? <span className="caret" /> : null}
                    </div>
                  ))}
                </pre>

                {/* Preview of the generated app */}
                <div className={cn("absolute inset-0 overflow-hidden bg-background p-5 transition-opacity duration-500 sm:p-6", showPreview ? "opacity-100" : "pointer-events-none opacity-0")}>
                  {at(100) ? (
                    <div className="pop-in flex items-center justify-between">
                      <div>
                        <p className="text-[15px] font-semibold tracking-tight">Invoices</p>
                        <p className="text-[11px] text-muted-foreground">October · GST 18% included</p>
                      </div>
                      <span className="rounded-lg bg-foreground px-3 py-1.5 text-[11px] font-medium text-background">New invoice</span>
                    </div>
                  ) : null}
                  {at(300) ? (
                    <div className="pop-in mt-4 flex gap-1.5">
                      {["All", "Paid", "Unpaid"].map((f, i) => (
                        <span key={f} className={cn("rounded-full border px-2.5 py-1 text-[11px]", i === 0 ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground")}>
                          {f}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <div className="mt-4 grid grid-cols-3 gap-2.5">
                    {[
                      ["Outstanding", "₹42,500"],
                      ["Paid", "₹27,800"],
                      ["Invoices", "4"],
                    ].map(([label, value], i) =>
                      at(500 + i * 150) ? (
                        <div key={label} className="pop-in rounded-xl border border-border p-3">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
                          <p className="mt-1 text-[15px] font-semibold tabular-nums tracking-tight">{value}</p>
                        </div>
                      ) : (
                        <div key={label} />
                      ),
                    )}
                  </div>
                  <div className="mt-4 overflow-hidden rounded-xl border border-border">
                    {ROWS.map((r, i) =>
                      at(1000 + i * 180) ? (
                        <div key={r.client} className="pop-in flex items-center justify-between border-b border-border px-3 py-2.5 last:border-b-0">
                          <span className="font-medium">{r.client}</span>
                          <span className="flex items-center gap-3">
                            <span className="tabular-nums">{r.amount}</span>
                            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", r.paid ? "bg-success/15 text-success" : "bg-signal/15 text-signal")}>{r.paid ? "Paid" : "Unpaid"}</span>
                          </span>
                        </div>
                      ) : null,
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <figcaption className="mt-4 text-center text-xs text-muted-foreground">Illustration of a Codexa session: prompt, agent steps, generated code and the running preview. Not a recording.</figcaption>
    </figure>
  );
}
