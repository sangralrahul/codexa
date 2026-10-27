import { CircleAlert, GitBranch, Sparkles, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Scenario } from "../types";
import type { StageFrame } from "./script";

function languageOf(path: string) {
  if (/\.tsx?$/.test(path)) return "TypeScript";
  if (/\.jsx?$/.test(path)) return "JavaScript";
  if (path.endsWith(".css")) return "CSS";
  if (path.endsWith(".html")) return "HTML";
  return "Plain text";
}

/**
 * The 26px status bar along the bottom of the replayed workspace (mirrors the IDE's StatusBar):
 * runtime state, branch, problems, cursor line, language and the agent. Every item follows the
 * scripted frame, so the illustrative type error shows up here too. Decorative (inside the
 * stage's aria-hidden body).
 */
export function StageStatusBar({ frame, scenario }: { frame: StageFrame; scenario: Scenario }) {
  const errors = frame.errorLine !== null ? 1 : 0;
  const runtime = frame.running ? "Running" : frame.boot ? "Starting…" : "Stopped";
  const file = frame.view === "code" ? (frame.activeTab ?? scenario.mainFile) : scenario.mainFile;
  const line = frame.errorLine ?? frame.fixedLine ?? (frame.streaming ? Math.max(1, frame.revealed) : Math.min(scenario.code.length, 16));
  return (
    <div className="flex h-[26px] shrink-0 items-center gap-0.5 px-1.5 text-[11px] text-muted-foreground">
      <span className="inline-flex h-full items-center gap-1.5 px-2">
        <span className={cn("size-1.5 shrink-0 rounded-full transition-colors duration-(--dur-3)", frame.running ? "live-dot" : frame.boot ? "bg-signal" : "bg-muted-foreground/45")} />
        <span key={runtime} className="[animation:stage-swap-in_var(--dur-3)_var(--ease-out)_both]">
          {runtime}
        </span>
      </span>
      <span className="inline-flex h-full items-center gap-1 px-2">
        <GitBranch className="size-3.5" />
        <span className="font-mono">main</span>
      </span>
      <span className="inline-flex h-full items-center gap-1 px-2">
        <CircleAlert className={cn("size-3.5 transition-colors", errors && "text-danger")} />
        <span className={cn("font-mono tabular-nums", errors && "text-danger")}>{errors}</span>
        <TriangleAlert className="ml-1 size-3.5" />
        <span className="font-mono tabular-nums">0</span>
      </span>
      <span className="ml-auto hidden h-full items-center px-2 font-mono tabular-nums lg:inline-flex">
        Ln {line}, Col 1
      </span>
      <span className="hidden h-full items-center px-2 lg:inline-flex">{languageOf(file)}</span>
      <span className={cn("ml-auto inline-flex h-full items-center gap-1.5 px-2 lg:ml-0", frame.working && "text-foreground/85")}>
        <Sparkles className={cn("size-3.5 transition-colors", frame.working && "text-signal")} />
        {frame.working ? (frame.repairing ? "Agent repairing" : "Agent working") : "Agent"}
      </span>
    </div>
  );
}
