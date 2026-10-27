import Link from "next/link";
import * as React from "react";
import { ArrowUpRight, Code2, Eye, GitBranch, IndianRupee, KeyRound, Rocket, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { IllustrationBadge } from "@/components/frames/illustration-badge";
import { AgentRun, DeployHistory, DiffRestore, EditorPeek, SqlRunner, TerminalStream, ViewportMorph } from "@/components/vignettes";
import { HOME_PLATFORM } from "@/content/marketing/home";
import type { Scenario } from "./types";
import { SnapshotTimeline } from "./snapshot-timeline";

const CHIP_ICONS = { code: Code2, eye: Eye, rocket: Rocket, git: GitBranch, key: KeyRound, users: Users, rupee: IndianRupee } as const;

type Tile = { key: string; title: string; body: string; span: string; visual: React.ReactNode; visualClassName?: string };

/**
 * H5 platform bento (PLAN §5.2): seven operable vignettes in rows of [7,5] [4,4,4] [6,6] over a
 * dot grid lit by one shared spotlight. Each animates once in view and is final when calm.
 * Row one is balanced by giving "Undo anything" both halves of its claim (file diff + whole-run
 * history), the history stretching to the agent tile's height.
 * On phones the tiles become a horizontal snap row (keeps the page short).
 */
export function PlatformGrid({ scenario }: { scenario: Scenario }) {
  const tiles: Tile[] = [
    { key: "agent", title: "An agent that shows its work", body: "Every tool call is listed as it runs: reads, the plan, writes and checks.", span: "lg:col-span-7", visual: <AgentRun /> },
    {
      key: "undo",
      title: "Undo anything",
      body: "A snapshot before every run. Restore the file or the whole run.",
      span: "lg:col-span-5",
      // It shares a row with the tall agent tile: the file diff on top, the whole-run history filling the rest
      // (from md; the phone card keeps the diff only, inside its capped height).
      visual: (
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <DiffRestore className="shrink-0" />
          <SnapshotTimeline className="hidden flex-1 md:flex" />
        </div>
      ),
      visualClassName: "flex flex-col",
    },
    { key: "sandbox", title: "An isolated sandbox", body: "Dev server, type-check and build run outside the web app.", span: "lg:col-span-4", visual: <TerminalStream /> },
    { key: "deploy", title: "Deploy history", body: "Every publish is a version. Roll back in one click.", span: "lg:col-span-4", visual: <DeployHistory /> },
    { key: "db", title: "Database panel", body: "Browse tables and run SQL, with a confirm before destructive statements.", span: "lg:col-span-4", visual: <SqlRunner /> },
    { key: "editor", title: "A real editor", body: "Tabs, search and diagnostics. Your code, your keyboard.", span: "lg:col-span-6", visual: <EditorPeek /> },
    {
      key: "viewport",
      title: "Preview on every viewport",
      body: `The real ${scenario.name} starter at desktop, tablet and phone sizes.`,
      span: "lg:col-span-6",
      visual: <ViewportMorph templateId={scenario.id} category={scenario.categoryName} />,
    },
  ];

  return (
    <section aria-labelledby="platform-title" className="relative py-16 sm:py-24 lg:py-28">
      <div className="container-x relative">
        <div data-reveal className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-label mb-5 text-signal-ink">{HOME_PLATFORM.index}</p>
            <h2 id="platform-title" className="text-display-2">
              {HOME_PLATFORM.title.replace(HOME_PLATFORM.highlight, "")}
              <span className="text-dim">{HOME_PLATFORM.highlight}</span>
            </h2>
          </div>
          {/* The one prominent honesty label for the whole bento; each tile repeats it quietly. */}
          <p className="flex shrink-0 flex-wrap items-center gap-2.5 text-sm text-muted-foreground lg:pb-2">
            <IllustrationBadge />
            {HOME_PLATFORM.caption}
          </p>
        </div>

        <div className="relative mt-12">
          <div aria-hidden="true" className="bg-dots pointer-events-none absolute -inset-x-10 -inset-y-12 -z-10" />
          <ul
            data-spotlight="grid"
            className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-2 md:gap-4 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-12 [&::-webkit-scrollbar]:hidden"
          >
            {tiles.map((t) => (
              <li
                key={t.key}
                data-spotlight-tile=""
                className={cn("e1 relative flex w-[86vw] max-w-[24rem] shrink-0 snap-center flex-col overflow-hidden rounded-2xl md:w-auto md:max-w-none", t.span)}
              >
                <div className="relative z-[2] flex items-start gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-title text-foreground">{t.title}</h3>
                    <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">{t.body}</p>
                  </div>
                  <span className="mt-1 shrink-0 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Illustration</span>
                </div>
                <div
                  className={cn(
                    "relative z-[2] mt-5 min-h-[220px] flex-1 px-5 pb-5 max-md:max-h-[300px] max-md:overflow-hidden max-md:[mask-image:linear-gradient(to_bottom,black_82%,transparent)] sm:px-6 sm:pb-6",
                    t.visualClassName,
                  )}
                >
                  {t.visual}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8">
          <ul aria-label="Explore the platform" className="flex flex-wrap gap-2">
            {HOME_PLATFORM.chips.map((c) => {
              const Icon = CHIP_ICONS[c.icon];
              return (
                <li key={c.href}>
                  <Link
                    href={c.href}
                    className="group/chip inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-card/70 pl-3 pr-2.5 text-[13px] text-foreground/85 shadow-[inset_0_1px_0_var(--hairline)] transition-[border-color,color] hover:border-border-strong hover:text-foreground"
                  >
                    <Icon className="size-3.5 text-muted-foreground transition-colors group-hover/chip:text-signal" aria-hidden="true" />
                    {c.label}
                    {/* Always shown (touch never hovers), so the padding stays balanced; it nudges on hover. */}
                    <ArrowUpRight className="size-3 text-muted-foreground transition-[color,translate] duration-200 group-hover/chip:-translate-y-px group-hover/chip:translate-x-px group-hover/chip:text-foreground calm:transition-none" aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
