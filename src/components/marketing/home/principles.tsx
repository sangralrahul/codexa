import * as React from "react";
import { Code2, History, ShieldCheck } from "lucide-react";
import { Section } from "@/components/marketing/section";
import { FileRow } from "@/components/vignettes/file-row";
import { CommitList, type Commit } from "@/components/vignettes/commit-list";
import { HOME_PRINCIPLES, timesWord } from "@/content/marketing/home";
import type { Scenario } from "./types";
import { TimeTravel } from "./time-travel";
import { ValidatedVisual } from "./validated-visual";

function basename(p: string) {
  return (p.split("/").pop() ?? p).replace(/\.[^.]+$/, "");
}

function Card({ n, icon: Icon, title, body, children, note }: { n: string; icon: React.ElementType; title: string; body: string; children: React.ReactNode; note?: string }) {
  return (
    <li data-spotlight-tile="" className="e1 group/card relative flex w-[86vw] max-w-[24rem] shrink-0 snap-center flex-col overflow-hidden rounded-2xl p-5 sm:p-7 lg:min-h-[440px] lg:w-auto lg:max-w-none">
      <div className="flex items-center gap-3">
        <span className="font-mono text-[12px] tabular-nums text-signal-ink">{n}</span>
        <span aria-hidden="true" className="h-px flex-1 bg-border" />
        <Icon className="size-4 text-muted-foreground transition-colors duration-300 group-hover/card:text-foreground" aria-hidden="true" />
      </div>
      <h3 className="text-display-4 mt-5">{title}</h3>
      <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{body}</p>
      <div className="relative mt-auto pt-7">{children}</div>
      {note ? <p className="mt-4 text-[11.5px] text-muted-foreground">{note}</p> : null}
    </li>
  );
}

/**
 * H4 principles (PLAN §5.2): three tall cards, each with an interactive micro-visual built from
 * the default starter's real files (Real code), the real check sequence (Validated) and a
 * time-travel slider over sample data (Reversible).
 */
export function Principles({ scenario, maxRepairAttempts }: { scenario: Scenario; maxRepairAttempts: number }) {
  const repairWord = timesWord(maxRepairAttempts);
  const c = HOME_PRINCIPLES.cards;
  // Sample commits naming the starter's real files with their real line counts (hashes are illustrative; CommitList labels them).
  const commits: Commit[] = [
    { hash: "a1f9c3e", message: `Wire everything into ${basename(scenario.mainFile)}`, added: scenario.mainLines, removed: 0, when: "just now" },
    ...scenario.writes
      .filter((w) => w.action === "A")
      .slice(0, 2)
      .map((w, i) => ({ hash: i === 0 ? "7c2d0b4" : "e93b1a7", message: `Add ${basename(w.path)}`, added: w.lines, removed: 0, when: i === 0 ? "4 min ago" : "6 min ago" })),
  ].slice(0, 3);
  const files = scenario.files.filter((p) => p.startsWith("src/")).slice(0, 3);

  return (
    <Section size="lg" aria-labelledby="principles-title" className="py-16 sm:py-24 lg:py-32">
      <div aria-hidden="true" className="bg-dots pointer-events-none absolute inset-x-0 top-1/3 -z-10 h-2/3 opacity-60" />
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div data-reveal className="max-w-5xl">
          <p className="text-label mb-5 text-signal-ink">{HOME_PRINCIPLES.index}</p>
          <h2 id="principles-title" className="text-display-2">
            {HOME_PRINCIPLES.title.replace(HOME_PRINCIPLES.highlight, "")}
            <span className="text-dim">{HOME_PRINCIPLES.highlight}</span>
          </h2>
        </div>
      </div>
      <ul data-reveal="stagger" data-spotlight="grid" className="-mx-4 mt-10 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:mx-0 lg:mt-14 lg:grid lg:grid-cols-3 lg:gap-5 lg:overflow-visible lg:px-0 lg:pb-0 [&::-webkit-scrollbar]:hidden">
        <Card n="01" icon={Code2} title={c.code.title} body={c.code.body} note={c.code.note}>
          <div className="space-y-2.5">
            <div className="rounded-xl border border-border bg-background/60 p-1.5">
              {files.map((p) => (
                <FileRow key={p} path={p} action={scenario.writes.find((w) => w.path === p)?.action} />
              ))}
            </div>
            <CommitList commits={commits} />
          </div>
        </Card>
        <Card n="02" icon={ShieldCheck} title={c.validated.title} body={c.validated.body(repairWord)}>
          <ValidatedVisual repairWord={repairWord} />
        </Card>
        <Card n="03" icon={History} title={c.reversible.title} body={c.reversible.body}>
          <TimeTravel />
        </Card>
      </ul>
    </Section>
  );
}
