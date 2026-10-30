"use client";

import * as React from "react";
import { Bug, Check, Hammer, MessageCircleQuestion, type LucideIcon } from "lucide-react";
import { LogoMark } from "@/components/logo";
import { AgentRun, type AgentStep } from "@/components/vignettes/agent-run";
import { EditorPeek, type PeekFile } from "@/components/vignettes/editor-peek";
import { StepRow } from "@/components/vignettes/step-row";
import { TerminalStream, type TerminalLine } from "@/components/vignettes/terminal-stream";
import { useScript } from "@/components/vignettes/use-script";
import { cn } from "@/lib/utils";

/**
 * Marketing-only illustrations for the agent pages, built from the shared vignette primitives
 * (StepRow, useScript) so they behave like every other vignette: decorative (aria-hidden), the
 * final frame on the server and when calm, played once while in view, `playing` from a parent
 * wins. Sample text only; the frame around them carries the "Illustration" badge.
 */

type Mode = {
  id: "build" | "ask" | "fix";
  label: string;
  icon: LucideIcon;
  effect: string;
  prompt: string;
  mono?: boolean;
  body: React.ReactNode;
};

// Real agent tool names (src/lib/ai/tools/schemas.ts); sample files and text.
const MODES: Mode[] = [
  {
    id: "build",
    label: "Build",
    icon: Hammer,
    effect: "Edits files · snapshot first",
    prompt: "Add a paid / unpaid filter to the invoices table.",
    body: (
      <ol>
        <StepRow state="done" mono connector label={<><span className="text-foreground">write_file</span><span className="text-muted-foreground"> src/components/Filters.tsx</span></>} detail="+31" />
        <StepRow state="done" mono label={<><span className="text-foreground">edit_file</span><span className="text-muted-foreground"> src/App.tsx</span></>} detail="+6 −2" />
      </ol>
    ),
  },
  {
    id: "ask",
    label: "Ask",
    icon: MessageCircleQuestion,
    effect: "Read-only · no files changed",
    prompt: "Where is the GST total calculated?",
    body: (
      <p className="leading-relaxed text-foreground/90">
        In <span className="font-mono text-[12px]">src/lib/totals.ts</span>: <span className="font-mono text-[12px]">total()</span> adds up the line items, then
        applies <span className="font-mono text-[12px]">GST_RATE</span> to the subtotal.
      </p>
    ),
  },
  {
    id: "fix",
    label: "Fix",
    icon: Bug,
    effect: "Targets one error",
    prompt: "Type 'string' is not assignable to type 'number'. (src/lib/totals.ts)",
    mono: true,
    body: (
      <ol>
        <StepRow state="done" mono connector label={<><span className="text-foreground">read_file</span><span className="text-muted-foreground"> src/lib/totals.ts</span></>} />
        <StepRow state="done" mono connector label={<><span className="text-foreground">edit_file</span><span className="text-muted-foreground"> src/lib/totals.ts</span></>} detail="+1 −1" />
        <StepRow state="done" mono label={<><span className="text-foreground">run_command</span><span className="text-muted-foreground"> typecheck</span></>} detail="0 errors" />
      </ol>
    ),
  },
];

/** Build, Ask and Fix: the mode switch moves Build → Ask → Fix once, each with one sample exchange. */
export function AgentModes({ playing, className }: { playing?: boolean; className?: string }) {
  const { ref, index, started, calm } = useScript([0, 2000, 4000], 4600, playing);
  const at = started ? Math.max(0, Math.min(MODES.length - 1, index)) : MODES.length - 1;
  const mode = MODES[at];
  const animate = started && !calm;
  return (
    <div ref={ref} aria-hidden="true" className={cn("flex w-full min-w-0 flex-col gap-3 text-[13px] [contain:inline-size]", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center rounded-[10px] bg-muted p-0.5 shadow-[inset_0_0_0_1px_var(--border)]">
          {MODES.map((m) => {
            const on = m.id === mode.id;
            const Icon = m.icon;
            return (
              <span
                key={m.id}
                className={cn(
                  "inline-flex h-7 items-center gap-1.5 rounded-[8px] px-3 text-[12.5px] font-medium transition-[color,background-color,box-shadow] duration-300",
                  on ? "bg-card text-foreground shadow-[var(--shadow-sm),inset_0_0_0_1px_var(--border)]" : "text-muted-foreground",
                )}
              >
                <Icon className="size-3.5" />
                {m.label}
              </span>
            );
          })}
        </div>
        <span className="text-[11.5px] text-muted-foreground">{mode.effect}</span>
      </div>
      <div key={mode.id} className={cn("space-y-3", animate && "stage-swap")}>
        <div className={cn("ml-8 rounded-2xl rounded-tr-md bg-muted px-3.5 py-2.5 leading-relaxed text-foreground shadow-[inset_0_0_0_1px_var(--border)]", mode.mono && "font-mono text-[12px] text-danger")}>
          {mode.prompt}
        </div>
        <div className="rounded-xl border border-border bg-card/90 p-3 shadow-sm">
          <div className="mb-2 flex items-center gap-2">
            <LogoMark size={16} />
            <span className="font-medium">Agent</span>
            <span className="ml-auto rounded-md bg-muted px-1.5 py-0.5 text-[10.5px] font-medium text-muted-foreground">{mode.label}</span>
          </div>
          {mode.body}
        </div>
      </div>
    </div>
  );
}

type Line = { text: string; tone: "cmd" | "muted" | "ok" };
const VALIDATE_LINES: Line[] = [
  { text: "$ npm run typecheck", tone: "cmd" },
  { text: "> tsc --noEmit", tone: "muted" },
  { text: "Found 0 errors.", tone: "ok" },
  { text: "$ npm run build", tone: "cmd" },
  { text: "> vite build", tone: "muted" },
  { text: "✓ built to dist/", tone: "ok" },
];
const TONE: Record<Line["tone"], string> = {
  cmd: "text-code-fg",
  muted: "text-code-muted",
  // Code surfaces are dark in both themes: syntax tokens, not the theme status colours.
  ok: "text-syn-string",
};

/** Validation in the sandbox: a type-check, then a build, each ending clean. Sample output, no timings. */
export function ValidateRun({ playing, className }: { playing?: boolean; className?: string }) {
  const schedule = React.useMemo(() => VALIDATE_LINES.map((_, i) => 250 + i * 480), []);
  const { ref, index, done, started, calm } = useScript(schedule, 250 + VALIDATE_LINES.length * 480 + 300, playing);
  return (
    <div ref={ref} aria-hidden="true" className={cn("flex w-full min-w-0 flex-col overflow-hidden rounded-xl border border-code-border bg-code-bg shadow-sm [contain:inline-size]", className)}>
      <div className="flex items-center gap-2 border-b border-code-border px-3 py-2 text-[11px] text-code-muted">
        <span className="font-medium text-code-fg/80">Validation</span>
        <span className="text-code-muted">sandbox</span>
        <span className="ml-auto inline-flex items-center gap-1.5">
          <span className={cn("size-1.5 rounded-full", done ? "bg-syn-string" : "bg-primary")} />
          {done ? "passed" : "checking"}
        </span>
      </div>
      <div className="min-h-[9.5rem] flex-1 space-y-0.5 px-3 py-2.5 font-mono text-[12px] leading-[1.7]">
        {VALIDATE_LINES.map((l, i) =>
          index >= i ? (
            <p key={i} className={cn("whitespace-pre-wrap break-all", started && !calm && "code-line-in", TONE[l.tone])}>
              {l.text}
              {i === index && !done && started ? <span className="caret" /> : null}
            </p>
          ) : null,
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   The plan (propose_plan) on its own: what the agent intends to change, file by
   file, before it edits anything. Its own picture, so a page never shows the full
   agent run twice (hero and the "Plan" step).
   --------------------------------------------------------------------------- */

type PlanItem = { action: "new" | "edit"; path: string; note: string };

// Sample plan in the shape of the real propose_plan tool (ordered, short steps), naming the same
// sample files the editor illustration opens next (InvoiceTable.tsx, App.tsx, styles.css).
const PLAN: PlanItem[] = [
  { action: "new", path: "src/components/InvoiceTable.tsx", note: "Invoice rows with their GST totals" },
  { action: "edit", path: "src/App.tsx", note: "Add the paid / unpaid filter and render the table" },
  { action: "edit", path: "src/styles.css", note: "A badge for paid and unpaid invoices" },
];
const PLAN_PROMPT = "Add an invoices table with GST totals and a paid / unpaid filter.";

/**
 * The plan step: two context reads, then the plan's numbered steps arrive one by one, each with
 * the file it touches. Ends on the next real stage label ("Editing the project").
 */
export function PlanSteps({ playing, className }: { playing?: boolean; className?: string }) {
  // Cue 0: reading; 1: list_files; 2: read_file; 3: planning; 4..6: plan items; 7: done.
  const schedule = React.useMemo(() => [0, 350, 900, 1450, ...PLAN.map((_, i) => 1900 + i * 520), 1900 + PLAN.length * 520 + 200], []);
  const { ref, index, done, started, calm } = useScript(schedule, 1900 + PLAN.length * 520 + 600, playing);
  const at = started ? index : schedule.length - 1;
  const planning = at >= 3;
  const stage = planning ? "Planning" : "Reading the project";
  const live = started && !done && !calm;
  return (
    <div ref={ref} aria-hidden="true" className={cn("flex w-full min-w-0 flex-col gap-3 text-[13px] [contain:inline-size]", className)}>
      <div className="flex min-w-0 items-center gap-2 rounded-xl bg-muted px-3 py-2 shadow-[inset_0_0_0_1px_var(--border)]">
        <span className="shrink-0 rounded-md bg-card px-1.5 py-0.5 text-[10.5px] font-medium text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)]">Build</span>
        <span className="min-w-0 truncate text-foreground/90">{PLAN_PROMPT}</span>
      </div>
      <div className="rounded-xl border border-border bg-card/90 p-3 shadow-sm">
        <div className="mb-1.5 flex items-center gap-2">
          <LogoMark size={16} state={live ? "running" : "idle"} />
          <span className="font-medium">Agent</span>
          <span className={cn("truncate text-[12px]", live ? "text-shimmer" : "text-muted-foreground")}>{stage}</span>
        </div>
        <ol>
          {at >= 1 ? <StepRow state={at === 1 && live ? "active" : "done"} mono connector={at >= 2} label={<span className="text-foreground">list_files</span>} detail={at > 1 || !live ? "12 files" : undefined} /> : null}
          {at >= 2 ? <StepRow state={at === 2 && live ? "active" : "done"} mono label={<><span className="text-foreground">read_file</span><span className="text-muted-foreground"> src/App.tsx</span></>} /> : null}
        </ol>
        {planning ? (
          <section className={cn("mt-3 rounded-lg border border-border bg-background/60 p-3", live && at === 3 && "pop-in")}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-[12.5px] font-semibold text-foreground">Plan</span>
              <span className="font-mono text-[11px] text-muted-foreground">propose_plan · {PLAN.length} steps</span>
            </div>
            <ol className="space-y-2">
              {PLAN.map((p, i) =>
                at >= 4 + i ? (
                  <li key={p.path} className="step-row flex items-start gap-2.5">
                    <span className="mt-px inline-flex size-[18px] shrink-0 items-center justify-center rounded-full border border-border-strong font-mono text-[10px] tabular-nums text-muted-foreground">{i + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-mono text-[12px] text-foreground">{p.path}</span>
                      <span className="mt-0.5 block text-[12px] leading-snug text-muted-foreground">{p.note}</span>
                    </span>
                    <span className={cn("mt-px shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[10px] font-medium", p.action === "new" ? "bg-success/12 text-success" : "bg-muted text-muted-foreground")}>{p.action}</span>
                  </li>
                ) : null,
              )}
            </ol>
          </section>
        ) : null}
      </div>
      {done || !started ? (
        <p className={cn("flex items-center gap-2 px-1 text-[12px] text-muted-foreground", started && !calm && "pop-in")}>
          <span className="size-1.5 rounded-full bg-primary" />
          Next: Editing the project, after a snapshot of the current files.
        </p>
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   The bounded repair loop: validation fails, the agent reads the error, edits,
   and validates again, counting attempts against the real limit (passed in from
   LIMITS.maxRepairAttempts by the server-side registry).
   --------------------------------------------------------------------------- */

/** Validate → error → repair (attempt 1 of max) → validate passes. Sample error and files; real tool and stage names. */
export function RepairLoop({ playing, className, maxAttempts }: { playing?: boolean; className?: string; maxAttempts: number }) {
  // Cue 0: typecheck running; 1: it fails; 2: repairing, read_file; 3: edit_file; 4: typecheck again; 5: done.
  const { ref, index, done, started, calm } = useScript([0, 700, 1500, 2100, 2700, 3400], 3800, playing);
  const at = started ? index : 5;
  const live = started && !done && !calm;
  const stage = at >= 5 ? "Done" : at >= 4 ? "Validating" : at >= 2 ? "Repairing" : "Validating";
  const row = (i: number) => (at === i && live ? "active" : "done") as "active" | "done";
  const loop = [
    { label: "Validate", on: at <= 1 },
    { label: "Repair", on: at >= 2 && at <= 3 },
    { label: "Validate", on: at >= 4 },
  ];
  return (
    <div ref={ref} aria-hidden="true" className={cn("flex w-full min-w-0 flex-col gap-3 text-[13px] [contain:inline-size]", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11.5px] font-medium">
          {loop.map((s, i) => (
            <React.Fragment key={i}>
              {i > 0 ? <span className="h-px w-3 bg-border-strong" /> : null}
              <span className={cn("rounded-full px-2.5 py-1 shadow-[inset_0_0_0_1px_var(--border)] transition-[color,background-color] duration-300", s.on ? "bg-foreground text-background" : "bg-muted text-muted-foreground")}>{s.label}</span>
            </React.Fragment>
          ))}
        </div>
        <span className="font-mono text-[11px] text-muted-foreground">{at >= 2 ? `repair attempt 1 of ${maxAttempts}` : `at most ${maxAttempts} repairs`}</span>
      </div>
      <div className="rounded-xl border border-border bg-card/90 p-3 shadow-sm">
        <div className="mb-1.5 flex items-center gap-2">
          <LogoMark size={16} state={live ? "running" : "idle"} />
          <span className="font-medium">Agent</span>
          <span className={cn("truncate text-[12px]", live ? "text-shimmer" : "text-muted-foreground")}>{stage}</span>
          <span className="ml-auto rounded-md bg-muted px-1.5 py-0.5 text-[10.5px] font-medium text-muted-foreground">Build</span>
        </div>
        <ol>
          <StepRow state={at === 0 && live ? "active" : "error"} mono connector={at >= 1} label={<><span className="text-foreground">run_command</span><span className="text-muted-foreground"> typecheck</span></>} detail={at >= 1 ? "1 error" : undefined} />
          {at >= 1 ? (
            <li className={cn("mb-1.5 ml-[26px] overflow-hidden rounded-lg border border-code-border bg-code-bg px-2.5 py-2 font-mono text-[11.5px] leading-relaxed", live && at === 1 && "code-line-in")}>
              <span className="block truncate text-code-muted">src/lib/totals.ts:14</span>
              <span className="block text-syn-tag">Type &apos;string&apos; is not assignable to type &apos;number&apos;.</span>
            </li>
          ) : null}
          {at >= 2 ? <StepRow state={row(2)} mono connector={at >= 3} label={<><span className="text-foreground">read_file</span><span className="text-muted-foreground"> src/lib/totals.ts</span></>} /> : null}
          {at >= 3 ? <StepRow state={row(3)} mono connector={at >= 4} label={<><span className="text-foreground">edit_file</span><span className="text-muted-foreground"> src/lib/totals.ts</span></>} detail={at > 3 || !live ? "+1 −1" : undefined} /> : null}
          {at >= 4 ? <StepRow state={row(4)} mono label={<><span className="text-foreground">run_command</span><span className="text-muted-foreground"> typecheck</span></>} detail={at > 4 || !live ? "0 errors" : undefined} /> : null}
        </ol>
      </div>
      {at >= 5 ? (
        <div className={cn("flex gap-2 rounded-xl bg-surface px-3 py-2.5 leading-relaxed shadow-[inset_0_0_0_1px_var(--border)]", started && !calm && "pop-in")}>
          <Check className="mt-0.5 size-3.5 shrink-0 text-success" />
          <span className="text-foreground/90">
            Passed on repair attempt 1 of {maxAttempts}. After {maxAttempts} failed attempts the agent stops and reports what it found.
          </span>
        </div>
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Variants of the shared vignettes with page-specific sample content (props only),
   so pages that need "an agent run" or "an editor" twice do not show the same one.
   --------------------------------------------------------------------------- */

const SITE_STEPS: AgentStep[] = [
  { tool: "list_files", result: "9 files" },
  { tool: "read_file", target: "src/App.tsx" },
  { tool: "propose_plan", result: "3 steps" },
  { tool: "write_file", target: "src/sections/Classes.tsx", result: "+54" },
  { tool: "edit_file", target: "src/App.tsx", result: "+9 −3" },
  { tool: "run_command", target: "build", result: "built to dist/" },
];

/** A website request: a one-page studio site (React + Vite starter). */
export function SiteAgentRun(props: { playing?: boolean; className?: string }) {
  return (
    <AgentRun
      {...props}
      prompt="A one-page site for a pottery studio: classes, prices and a contact form."
      steps={SITE_STEPS}
      summary="Added the classes, prices and contact sections. A snapshot was saved first, so you can restore it."
    />
  );
}

const UI_STEPS: AgentStep[] = [
  { tool: "list_files", result: "14 files" },
  { tool: "read_file", target: "src/components/Hero.tsx" },
  { tool: "propose_plan", result: "2 steps" },
  { tool: "edit_file", target: "src/components/Hero.tsx", result: "+4 −2" },
  { tool: "edit_file", target: "src/styles.css", result: "+3" },
  { tool: "run_command", target: "typecheck", result: "0 errors" },
];

/** A layout change described in words (the visual editor's loop). */
export function UiAgentRun(props: { playing?: boolean; className?: string }) {
  return (
    <AgentRun
      {...props}
      prompt="Make the hero two columns on desktop and stack it on phones."
      steps={UI_STEPS}
      summary="The hero is two columns on wide screens and stacks on phones. Check each size in the preview."
    />
  );
}

const API_FILES: PeekFile[] = [
  {
    path: "src/routes/invoices.ts",
    code: `import { Router } from "express";
import { z } from "zod";

const Invoice = z.object({ customer: z.string().min(1), amount: z.number().positive() });

export const invoices = Router();

invoices.post("/", (req, res) => {
  const body = Invoice.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.issues });
  res.status(201).json(create(body.data));
});`,
  },
  {
    path: "src/server.ts",
    code: `import express from "express";
import { invoices } from "./routes/invoices";

const app = express();
app.use(express.json());
app.use("/api/invoices", invoices);

app.listen(Number(process.env.PORT ?? 3000));`,
  },
];

/** The editor on an Express API project (routes with validation). */
export function ApiEditorPeek(props: { playing?: boolean; className?: string }) {
  return <EditorPeek {...props} files={API_FILES} />;
}

const TEST_LINES: TerminalLine[] = [
  { text: "$ npm test", tone: "cmd" },
  { text: "> vitest run", tone: "muted" },
  { text: "✓ src/lib/totals.test.ts (4 tests)", tone: "ok" },
  { text: "Test Files  1 passed (1)", tone: "plain" },
  { text: "Tests  4 passed (4)", tone: "ok" },
];

/** A Vitest run in the sandbox. Sample output, no timings. */
export function TestRun(props: { playing?: boolean; className?: string }) {
  return <TerminalStream {...props} lines={TEST_LINES} />;
}

const BUILD_LINES: TerminalLine[] = [
  { text: "$ npm run build", tone: "cmd" },
  { text: "> vite build", tone: "muted" },
  { text: "dist/index.html", tone: "plain" },
  { text: "dist/assets/index.js", tone: "plain" },
  { text: "✓ built to dist/", tone: "ok" },
  { text: "➜  Publishing dist/ to invoice-tracker.example.com", tone: "plain" },
];

/** A deployment build: the build command's output, then the publish. Sample output, no timings. */
export function BuildLog(props: { playing?: boolean; className?: string }) {
  return <TerminalStream {...props} title="Build log" lines={BUILD_LINES} />;
}
