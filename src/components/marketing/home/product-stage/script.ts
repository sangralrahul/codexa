import { HOME_CHAPTERS } from "@/content/marketing/home";
import type { Scenario, StageTools } from "../types";

/**
 * The storyboard script (PLAN §5.2 table): six chapters, each a short segment of named cues.
 * One global schedule spans them all, so a frame is a pure function of "the last cue reached":
 * earlier chapters always show their finished state, and seeking is just picking a cue.
 * Pure module (no React), shared by the desktop window and the phone layout.
 */

/** Lines of the main file the stage shows (scenarios.ts tokenises a 16-line window). */
const CODE_LINES = 16;

const CHAPTER_EVENTS = {
  describe: [
    ["d0", 0],
    ["dTyped", 1500],
    ["dSent", 1750],
    ["dWorking", 2050],
    ["dEnd", 2400],
  ],
  plan: [
    ["p0", 0],
    ["pList", 380],
    ["pRead", 760],
    ["pCard", 1050],
    ["pSnap", 1350],
    ["pDone", 1700],
    ["pEnd", 2000],
  ],
  generate: [
    ["g0", 0],
    ["gA", 600],
    ["gB", 1200],
    ...Array.from({ length: CODE_LINES }, (_, i) => [`gL${i + 1}`, 1270 + i * 70] as const),
    ["gMain", 2500],
    ["gSum", 2900],
    ["gEnd", 3400],
  ],
  validate: [
    ["v0", 0],
    ["vErr", 550],
    ["vRepair", 950],
    ["vFixed", 1450],
    ["vClean", 1850],
    ["vBuilt", 2150],
    ["vEnd", 2400],
  ],
  preview: [
    ["r0", 0],
    ["rBoot", 450],
    ["rWipe", 750],
    ["rTablet", 1500],
    ["rDesk", 1950],
    ["rEnd", 2200],
  ],
  ship: [
    ["s0", 0],
    ["sFly", 750],
    ["sLand", 1250],
    ["sGlide", 1500],
    ["sEnd", 1800],
  ],
} as const;

type ChapterKey = keyof typeof CHAPTER_EVENTS;
export type CueName = (typeof CHAPTER_EVENTS)[ChapterKey][number][0];

const names: string[] = [];
const times: number[] = [];
export const CHAPTER_START: number[] = [];
export const CHAPTER_END: number[] = [];
export const CHAPTER_OFFSET: number[] = [];
{
  let offset = 0;
  HOME_CHAPTERS.forEach((c, i) => {
    const events = CHAPTER_EVENTS[c.id as ChapterKey];
    CHAPTER_OFFSET[i] = offset;
    CHAPTER_START[i] = names.length;
    for (const [name, at] of events) {
      names.push(name);
      times.push(offset + at);
    }
    CHAPTER_END[i] = names.length - 1;
    // 1ms gap: a chapter's end cue always comes before the next chapter's first cue.
    offset += c.durationMs + 1;
  });
}

/** Global cue times (ms, ascending). */
export const SCHEDULE: readonly number[] = times;
export const TOTAL_MS = times[times.length - 1];
export const LAST_CUE = times.length - 1;
export const CHAPTERS = HOME_CHAPTERS.length;
const INDEX: Record<string, number> = Object.fromEntries(names.map((n, i) => [n, i]));

/** Index of a named cue (for "has it been reached?" checks). */
export function cue(name: CueName): number {
  return INDEX[name];
}

/** Which chapter a global cue belongs to. */
export function chapterOf(index: number): number {
  for (let i = CHAPTERS - 1; i >= 0; i--) if (index >= CHAPTER_START[i]) return i;
  return 0;
}

export type RowState = "pending" | "active" | "done" | "error";
export type AgentRow = { key: string; tool: string; target?: string; state: RowState; detail?: string; fresh?: boolean };
export type TerminalLine = { text: string; tone: "cmd" | "ok" | "error" | "muted" | "warn" };

export type StageFrame = {
  index: number;
  chapter: number;
  status: { label: string; tone: "idle" | "busy" | "warn" | "ok" | "live" };
  /** Agent stage label (real labels from the agent: message-parts.tsx). */
  stage: string | null;
  sent: boolean;
  working: boolean;
  context: AgentRow[];
  /** Context rows fold into one "Read the project" row once the writes start. */
  contextFolded: boolean;
  plan: { visible: boolean; done: boolean[] };
  snapshot: boolean;
  writes: AgentRow[];
  checks: AgentRow[];
  repairing: boolean;
  finished: boolean;
  /** Canvas */
  view: "code" | "preview";
  tabs: string[];
  activeTab: string | null;
  /** Path being written while the editor shows a skeleton. */
  writing: string | null;
  /** Visible lines of the main file (all of them unless it is being rewritten). */
  revealed: number;
  streaming: boolean;
  /** 1-based lines inside the excerpt (add `scenario.codeStart - 1` for the file's own line number). */
  errorLine: number | null;
  fixedLine: number | null;
  terminal: TerminalLine[];
  terminalOpen: boolean;
  /** Paths the agent has written so far (explorer flash, tab badges). */
  explorerFresh: string[];
  boot: { container: RowState; server: RowState } | null;
  previewShown: boolean;
  previewWipe: boolean;
  device: "desktop" | "tablet";
  /** Header */
  /** The dev server is booting (Run shows "Starting…"). */
  starting: boolean;
  running: boolean;
  publish: "idle" | "publishing" | "flying" | "live";
  versionsVisible: boolean;
  liveOnNew: boolean;
  /** Depth cards */
  cards: { snapshot: boolean; typecheck: boolean; phone: boolean };
};

/**
 * The frame at global cue `index` for a scenario. `-1` (before the first cue) is the empty
 * workspace; LAST_CUE is the finished storyboard (the SSR poster and the calm frame).
 */
export function frameAt(index: number, s: Scenario, tools: StageTools, maxRepairAttempts: number): StageFrame {
  const at = (n: CueName) => index >= cue(n);
  const chapter = Math.max(0, chapterOf(index));
  const main = s.mainFile;
  const writes = s.writes;
  const lineSuffix = (n: number) => `${n} line${n === 1 ? "" : "s"}`;

  // --- Agent: context and plan
  const context: AgentRow[] = [];
  if (at("p0")) context.push({ key: "list", tool: tools.list, state: at("pList") ? "done" : "active", detail: at("pList") ? `${s.fileCount} files` : undefined });
  if (at("pList")) context.push({ key: "read", tool: tools.read, target: main, state: at("pRead") ? "done" : "active", detail: at("pRead") ? lineSuffix(s.mainLines) : undefined });
  if (at("pRead")) context.push({ key: "plan", tool: tools.plan, state: at("pDone") ? "done" : "active", detail: at("pDone") ? `${s.plan.length} steps` : undefined });

  const planDone = [at("pDone"), at("gA"), at("gB"), at("gMain")];

  // --- Agent: writes (one per scenario write; the last is the main file)
  const writeCues: CueName[] = ["g0", "gA", "gB"];
  const doneCues: CueName[] = ["gA", "gB", "gMain"];
  const writeRows: AgentRow[] = [];
  const offset = 3 - Math.min(3, writes.length);
  writes.slice(0, 3).forEach((w, i) => {
    const startCue = writeCues[i + offset];
    const doneCue = doneCues[i + offset];
    if (!at(startCue)) return;
    const done = at(doneCue);
    writeRows.push({
      key: `w${i}`,
      tool: w.action === "A" ? tools.write : tools.edit,
      target: w.path,
      state: done ? "done" : "active",
      detail: done ? (w.action === "A" ? `+${w.lines}` : lineSuffix(w.lines)) : undefined,
      fresh: true,
    });
  });

  // --- Agent: checks (the Repair Beat)
  const checks: AgentRow[] = [];
  const errLine = Math.min(s.errorLine, s.code.length);
  // The excerpt keeps the file's own numbering: messages quote the real line.
  const fileLine = s.codeStart + errLine - 1;
  if (at("v0")) checks.push({ key: "tc1", tool: tools.run, target: "typecheck", state: at("vErr") ? "error" : "active", detail: at("vErr") ? `1 error · ${main}:${fileLine}` : undefined });
  if (at("vRepair")) checks.push({ key: "fix", tool: tools.edit, target: main, state: at("vFixed") ? "done" : "active", detail: at("vFixed") ? "+1 −1" : `Repairing · attempt 1 of ${maxRepairAttempts}` });
  if (at("vFixed")) checks.push({ key: "tc2", tool: tools.run, target: "typecheck", state: at("vClean") ? "done" : "active", detail: at("vClean") ? "0 errors" : undefined });
  if (at("vClean")) checks.push({ key: "build", tool: tools.run, target: "build", state: at("vBuilt") ? "done" : "active", detail: at("vBuilt") ? "built" : undefined });
  if (at("rBoot")) checks.push({ key: "finish", tool: tools.finish, state: "done", detail: "summary" });

  // --- Stage label (the agent's own words)
  let stage: string | null = null;
  if (at("dWorking")) stage = "Reading the project";
  if (at("pRead")) stage = "Planning";
  if (at("g0")) stage = "Editing the project";
  if (at("v0")) stage = "Validating";
  if (at("vRepair") && !at("vFixed")) stage = "Repairing";
  if (at("vFixed")) stage = "Validating";
  if (at("rBoot")) stage = "Done";

  // --- Header status: the project's state. The runtime (Run → Starting… → Running) has its own
  // button and status-bar item, so this pill never repeats it.
  let status: StageFrame["status"] = { label: "Ready", tone: "idle" };
  if (at("dWorking")) status = { label: "Agent working", tone: "busy" };
  if (at("v0")) status = { label: "Validating", tone: "warn" };
  if (at("vBuilt")) status = { label: "Checks passed", tone: "ok" };
  if (at("sLand")) status = { label: "Live", tone: "live" };

  // --- Editor: the project starts as the starter, so its main file is open from the first frame.
  // Each write opens its own tab; then the main file is rewritten line by line.
  const written: string[] = [];
  writes.slice(0, 3).forEach((w, i) => {
    if (at(writeCues[i + offset]) && !written.includes(w.path)) written.push(w.path);
  });
  const tabs: string[] = [main, ...written.filter((p) => p !== main)];
  let revealed = 0;
  for (let i = 1; i <= CODE_LINES; i++) if (at(`gL${i}` as CueName)) revealed = i;
  const mainOpen = at("gB");
  // Three write slots (g0→gA, gA→gB, gB→gMain); with two writes the first slot is the agent preparing.
  const slotOffset = 3 - Math.min(3, writes.length);
  const slot = at("gB") ? 2 : at("gA") ? 1 : at("g0") ? 0 : -1;
  const writing = slot >= 0 && slot < 2 && slot - slotOffset >= 0 ? writes[slot - slotOffset].path : null;
  const activeTab = mainOpen || !writing ? main : writing;

  // --- Terminal (validate)
  const terminal: TerminalLine[] = [];
  if (at("v0")) terminal.push({ text: "$ npm run typecheck", tone: "cmd" });
  if (at("vErr")) terminal.push({ text: `${main}(${fileLine},7): error TS2322: Type 'string' is not assignable to type 'number'.`, tone: "error" });
  if (at("vRepair")) terminal.push({ text: `Repairing · attempt 1 of ${maxRepairAttempts}`, tone: "warn" });
  if (at("vFixed")) terminal.push({ text: "$ npm run typecheck", tone: "cmd" });
  if (at("vClean")) terminal.push({ text: "0 errors", tone: "ok" });
  if (at("vClean")) terminal.push({ text: "$ npm run build", tone: "cmd" });
  if (at("vBuilt")) terminal.push({ text: "✓ built", tone: "ok" });

  const view: StageFrame["view"] = at("r0") ? "preview" : "code";

  return {
    index,
    chapter,
    status,
    stage,
    sent: at("dSent"),
    working: at("dWorking") && !at("rBoot"),
    context,
    contextFolded: at("gA"),
    plan: { visible: at("pCard"), done: planDone },
    snapshot: at("pSnap"),
    writes: writeRows,
    checks,
    repairing: at("vRepair") && !at("vFixed"),
    finished: at("rBoot"),
    view,
    tabs,
    activeTab,
    writing,
    revealed: mainOpen && !at("gMain") ? revealed : CODE_LINES,
    streaming: mainOpen && !at("gMain"),
    errorLine: at("vErr") && !at("vFixed") ? errLine : null,
    fixedLine: at("vFixed") && !at("r0") ? errLine : null,
    terminal,
    terminalOpen: at("v0") && !at("r0"),
    explorerFresh: written,
    boot: at("r0") && !at("rWipe") ? { container: at("rBoot") ? "done" : "active", server: at("rBoot") ? "active" : "pending" } : null,
    previewShown: at("rWipe"),
    previewWipe: at("rWipe") && !at("rEnd"),
    device: at("rTablet") && !at("rDesk") ? "tablet" : "desktop",
    starting: at("r0") && !at("rBoot"),
    running: at("rBoot"),
    publish: at("sLand") ? "live" : at("sFly") ? "flying" : at("s0") ? "publishing" : "idle",
    versionsVisible: at("sLand"),
    liveOnNew: at("sGlide"),
    cards: { snapshot: at("pSnap"), typecheck: at("vClean"), phone: at("rWipe") },
  };
}

/** Which phone-layout tab a chapter shows. */
export function phoneTabFor(chapter: number): "chat" | "code" | "preview" {
  if (chapter <= 1) return "chat";
  if (chapter <= 3) return "code";
  return "preview";
}
