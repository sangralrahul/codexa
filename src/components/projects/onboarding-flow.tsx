"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, LayoutTemplate, Pencil, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { accountApi, projectsApi } from "@/lib/client/workspace/api";
import { stashInitialPrompt } from "@/lib/client/workspace/storage";
import type { TemplateSummary } from "@/lib/client/workspace/types";
import { useCalm } from "@/lib/client/motion";
import { IDEA_MAX, clearPendingIdea, readPendingIdea, type IdeaSource } from "@/lib/client/pending-idea";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Alert, Kbd } from "@/components/ui/misc";
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Segmented } from "@/components/ui/segmented";
import { LogoMark } from "@/components/logo";
import { useLaunch, type LaunchStep } from "@/components/motion/launch";
import { GOALS, ideasFor, nameFromPrompt, rankTemplates, type GoalId } from "@/components/auth/onboarding/goals";
import { OB_STEPS, OnboardingProgress } from "@/components/auth/onboarding/progress";
import { ProfileChip } from "@/components/auth/onboarding/profile-chip";
import { TemplateChoice } from "@/components/auth/onboarding/template-choice";
import { WorkspacePreview, type PreviewState } from "@/components/auth/onboarding/workspace-preview";
import { AnimatedHeight } from "@/components/auth/onboarding/animated-height";
import { StarterShot } from "@/components/auth/onboarding/starter-shot";

type Mode = "template" | "prompt";

type Props = {
  user: { name: string; timezone: string; locale: string };
  /** Null when the person cannot create projects here (no workspace, or a viewer). */
  workspaceId: string | null;
  workspaceName: string | null;
  templates: TemplateSummary[];
  defaultTemplateId: string;
  aiConfigured: boolean;
  /** An idea carried in the URL (only when the browser could not store it): already clamped on the server. */
  carried?: { prompt?: string; templateId?: string };
  /** The account menu for the header (server-rendered element). */
  userMenu?: React.ReactNode;
};

const SOURCE_LABEL: Record<IdeaSource, string> = { home: "From the homepage", cta: "From the homepage", solution: "From a solutions page", command: "From the command menu" };

const EXAMPLES = ["an invoice tracker with GST totals", "a habit tracker with streaks and weekly charts", "a booking page for a yoga studio", "a CRM for a two-person sales team"];

/** Placeholder that types example ideas while the prompt box is empty (static when calm). */
function useTypedPlaceholder(active: boolean) {
  const calm = useCalm();
  const [text, setText] = useState("Describe your app in a sentence or two…");
  useEffect(() => {
    if (!active || calm) return;
    let idea = 0;
    let pos = 0;
    let erasing = false;
    let timer = 0;
    const tick = () => {
      const full = EXAMPLES[idea];
      pos += erasing ? -1 : 1;
      setText(`e.g. ${full.slice(0, Math.max(0, pos))}`);
      if (!erasing && pos >= full.length) {
        erasing = true;
        timer = window.setTimeout(tick, 2200);
        return;
      }
      if (erasing && pos <= 0) {
        erasing = false;
        idea = (idea + 1) % EXAMPLES.length;
      }
      timer = window.setTimeout(tick, erasing ? 16 : 44);
    };
    timer = window.setTimeout(tick, 900);
    return () => clearTimeout(timer);
  }, [active, calm]);
  return text;
}

/**
 * First-run onboarding, "Mission control" (PLAN §5.5):
 *  1. "What are you building?" A prompt box, goal image cards (keys 1–8) and goal-derived
 *     ideas, with the profile chip on top (ob-name / ob-tz / ob-locale in a popover).
 *  2. "How do you want to start?" Describe it or start from a template; the templates are
 *     ranked by the goals (GOAL_TO_CATEGORY) and the project name is derived, editable.
 *  3. Launch: honest rows that tick as each real request resolves.
 * The right-hand preview follows every choice. Contracts kept: the onboarding PATCH fields,
 * finish(false) → /dashboard, codexa:initialPrompt only in prompt mode, timezone detection
 * only when the stored zone is empty or UTC, no Create for viewers.
 */
export function OnboardingFlow({ user, workspaceId, workspaceName, templates, defaultTemplateId, aiConfigured, carried, userMenu }: Props) {
  const router = useRouter();
  const calm = useCalm();
  const known = useMemo(() => new Set(templates.map((t) => t.id)), [templates]);
  const byId = useMemo(() => new Map(templates.map((t) => [t.id, t])), [templates]);

  // Profile
  const [name, setName] = useState(user.name);
  const [timezone, setTimezone] = useState(user.timezone || "UTC");
  const [detected, setDetected] = useState<string | null>(null);
  const [locale, setLocale] = useState(user.locale || "en");
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Idea and goals
  const [prompt, setPrompt] = useState(carried?.prompt ?? "");
  const [ideaTemplateId, setIdeaTemplateId] = useState<string | null>(carried?.templateId && known.has(carried.templateId) ? carried.templateId : null);
  const [ideaChip, setIdeaChip] = useState<string | null>(carried?.prompt ? "From the homepage" : null);
  const [goals, setGoals] = useState<GoalId[]>([]);
  const [lastGoal, setLastGoal] = useState<GoalId | null>(null);
  const [promptFocused, setPromptFocused] = useState(false);

  // Start
  const [mode, setMode] = useState<Mode | null>(null);
  const [pickedTemplate, setPickedTemplate] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);

  // Flow
  const [step, setStep] = useState<0 | 1>(0);
  const [dir, setDir] = useState<"forward" | "back" | "none">("none");
  const [announce, setAnnounce] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);
  const [skipping, setSkipping] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const typingTimer = useRef(0);
  const progress = useRef<{ saved: boolean }>({ saved: false });
  const shownStep = useRef<0 | 1>(0);

  // The browser's own zone, once, when the stored one is empty or UTC (the server can't know it).
  useEffect(() => {
    if (user.timezone && user.timezone !== "UTC") return;
    try {
      const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (zone) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of a browser-only value
        setTimezone(zone);
        setDetected(zone);
      }
    } catch {
      // keep UTC
    }
  }, [user.timezone]);

  // The idea passport: an idea stashed by the homepage (or carried through sign-up / GitHub) pre-fills step 1.
  useEffect(() => {
    if (carried?.prompt) return;
    const pending = readPendingIdea();
    if (!pending) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of browser storage after hydration
    setPrompt((p) => p || pending.text);
    setIdeaChip(SOURCE_LABEL[pending.source] ?? "From the homepage");
    if (pending.templateId && known.has(pending.templateId)) setIdeaTemplateId(pending.templateId);
  }, [carried?.prompt, known]);

  // Desktop: the cursor waits in the prompt box.
  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const el = promptRef.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    el.setSelectionRange(el.value.length, el.value.length);
  }, []);

  // Focus follows a step change (not the first load, and not a calm-mode flip after hydration); the card's top comes into view below the sticky header.
  useEffect(() => {
    if (shownStep.current === step) return;
    shownStep.current = step;
    titleRef.current?.focus({ preventScroll: true });
    const top = cardRef.current?.getBoundingClientRect().top ?? 0;
    if (top < 80) window.scrollTo({ top: window.scrollY + top - 88, behavior: calm ? "auto" : "smooth" });
  }, [step, calm]);

  useEffect(() => () => clearInterval(typingTimer.current), []);

  const ranked = useMemo(() => rankTemplates(templates, goals, lastGoal), [templates, goals, lastGoal]);
  const autoTemplate = ideaTemplateId ?? (goals.length ? ranked.list[0]?.id : null) ?? defaultTemplateId;
  const templateId = pickedTemplate && known.has(pickedTemplate) ? pickedTemplate : autoTemplate;
  const template = byId.get(templateId) ?? byId.get(defaultTemplateId) ?? templates[0];
  const effectiveMode: Mode = mode ?? (prompt.trim() ? "prompt" : "template");
  const derivedName = (effectiveMode === "prompt" && prompt.trim() ? nameFromPrompt(prompt) : template?.name) || "My first project";
  const finalName = (projectName ?? derivedName).trim() || "My first project";
  const ideas = ideasFor(goals);
  const placeholder = useTypedPlaceholder(!prompt && !promptFocused);
  const progressStep = launching ? 2 : step;

  const launch = useLaunch({
    title: "Setting up your workspace",
    onRetry: () => void run(),
    onCancel: () => setLaunching(false),
  });

  function goTo(next: 0 | 1) {
    setDir(calm ? "none" : next > step ? "forward" : "back");
    setStep(next);
    setError(null);
    setAnnounce(`Step ${next + 1} of 3, ${OB_STEPS[next]}`);
  }

  function toggleGoal(id: GoalId) {
    const on = goals.includes(id);
    setGoals(on ? goals.filter((g) => g !== id) : [...goals, id]);
    setLastGoal(on ? null : id);
  }

  function typeIdea(text: string, goal: GoalId) {
    clearInterval(typingTimer.current);
    if (!goals.includes(goal)) {
      setGoals([...goals, goal]);
      setLastGoal(goal);
    }
    const done = () => {
      const el = promptRef.current;
      el?.focus({ preventScroll: true });
      el?.setSelectionRange(text.length, text.length);
    };
    if (calm) {
      setPrompt(text);
      done();
      return;
    }
    let n = 0;
    setPrompt("");
    typingTimer.current = window.setInterval(() => {
      n = Math.min(text.length, n + 2);
      setPrompt(text.slice(0, n));
      if (n >= text.length) {
        clearInterval(typingTimer.current);
        done();
      }
    }, 14);
  }

  function next() {
    if (!name.trim()) {
      setProfileError("Add your name so teammates know who they're working with.");
      setProfileOpen(true);
      return;
    }
    setProfileError(null);
    // Saved silently: the same fields go again with `completed` at the end, so a failure here loses nothing.
    void accountApi.onboarding({ name: name.trim(), timezone, locale }).catch(() => {});
    goTo(1);
  }

  async function skip() {
    if (skipping) return;
    setSkipping(true);
    setError(null);
    try {
      await accountApi.onboarding({ ...(name.trim() ? { name: name.trim() } : {}), timezone, locale, completed: true });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not finish setup. Please try again.");
      setSkipping(false);
    }
  }

  async function run() {
    if (!workspaceId) return;
    const text = prompt.trim();
    const steps: LaunchStep[] = [
      { id: "setup", label: "Saving your setup", state: progress.current.saved ? "done" : "active" },
      {
        id: "create",
        // "Creating Invoice tracker from Analytics dashboard"; when the name is still the starter's own, say it once.
        label: !template ? `Creating ${finalName}` : finalName === template.name ? `Creating your ${template.name} project` : `Creating ${finalName} from ${template.name}`,
        state: progress.current.saved ? "active" : "pending",
      },
      { id: "open", label: "Opening the editor", state: "pending" },
    ];
    launch.start(cardRef.current, steps);
    setLaunching(true);
    if (!progress.current.saved) {
      try {
        await accountApi.onboarding({ ...(name.trim() ? { name: name.trim() } : {}), timezone, locale, completed: true });
        progress.current.saved = true;
        launch.update("setup", "done");
        launch.update("create", "active");
      } catch (err) {
        launch.fail("setup", err instanceof Error ? err.message : "Could not save your setup");
        return;
      }
    }
    try {
      const res = await projectsApi.create({
        workspaceId,
        name: finalName,
        description: effectiveMode === "prompt" ? text.slice(0, 500) || undefined : goals.length ? `Building: ${GOALS.filter((g) => goals.includes(g.id)).map((g) => g.label).join(", ")}` : undefined,
        templateId: template?.id ?? defaultTemplateId,
      });
      launch.update("create", "done");
      // The IDE's chat panel reads this once and hands it to the agent (prompt mode only).
      if (effectiveMode === "prompt" && text) stashInitialPrompt(text);
      clearPendingIdea();
      launch.update("open", "active");
      router.push(`/projects/${res.project.id}`);
    } catch (err) {
      launch.fail("create", err instanceof Error ? err.message : "Could not create the project");
    }
  }

  function create() {
    if (!workspaceId || launching) return;
    if (effectiveMode === "prompt" && !prompt.trim()) {
      setError("Describe your app first, or start from a template.");
      return;
    }
    setError(null);
    void run();
  }

  // Keyboard: 1–8 toggle goals, Ctrl/⌘+Enter continues or creates, Esc goes back.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (launch.open || e.defaultPrevented) return;
      if (document.querySelector("[data-radix-popper-content-wrapper], [role='dialog']")) return;
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        if (step === 0) next();
        else create();
        return;
      }
      const t = e.target as HTMLElement | null;
      if (t?.closest("input, textarea, select, [contenteditable='true']") || e.altKey || e.metaKey || e.ctrlKey || e.shiftKey) return;
      if (step === 0 && /^[1-8]$/.test(e.key)) {
        const goal = GOALS[Number(e.key) - 1];
        if (goal) {
          e.preventDefault();
          toggleGoal(goal.id);
        }
      } else if (step === 1 && e.key === "Escape") {
        e.preventDefault();
        goTo(0);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const preview: PreviewState = {
    workspaceName: workspaceName ?? `${name.trim() || "Your"}'s workspace`,
    userName: name.trim() || "You",
    projectName: step === 0 && !prompt.trim() && !goals.length ? "" : finalName,
    // Always the starter that Create would use, so the preview never shows something else.
    template: template ? { id: template.id, name: template.name, category: template.category } : null,
    prompt: effectiveMode === "prompt" || step === 0 ? prompt.trim() : "",
    typing: promptFocused,
    mode: effectiveMode,
  };

  return (
    <div className="relative isolate flex min-h-dvh flex-col [--btn-radius:10px]">
      <div aria-hidden="true" className="app-atmosphere pointer-events-none absolute inset-0 -z-10" />
      <div aria-hidden="true" className="bg-blueprint pointer-events-none absolute inset-x-0 top-0 -z-10 h-[560px] opacity-60" />

      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/75 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-[1240px] items-center gap-4 px-4 sm:px-8">
          <span className="flex shrink-0 items-center gap-2.5">
            <LogoMark size={26} state={launching ? "running" : "idle"} />
            <span className="hidden text-[13px] font-semibold uppercase tracking-[0.2em] sm:inline">Codexa</span>
          </span>
          <OnboardingProgress current={progressStep} className="mx-auto hidden max-w-sm md:flex" />
          <div className="ml-auto flex shrink-0 items-center gap-1.5 md:ml-0">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" disabled={launching || skipping} className="text-muted-foreground hover:text-foreground">
                  Skip setup
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 [--btn-radius:10px]">
                <p className="text-[13px] font-semibold text-foreground">Skip setup?</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">You&apos;ll land on your dashboard. You can create a project there any time, and change your profile in Settings.</p>
                <div className="mt-4 flex justify-end gap-2">
                  <PopoverClose asChild>
                    <Button variant="ghost" size="sm">
                      Keep going
                    </Button>
                  </PopoverClose>
                  <Button size="sm" onClick={() => void skip()} loading={skipping}>
                    Go to dashboard
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            {userMenu}
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[1240px] flex-1 items-start gap-8 px-4 pb-16 pt-6 sm:px-8 lg:grid-cols-[minmax(0,540px)_minmax(0,1fr)] lg:gap-14 lg:pt-12 xl:gap-20">
        <section aria-labelledby="ob-step-title" className="min-w-0">
          <OnboardingProgress current={progressStep} className="mb-5 md:hidden" />
          <WorkspacePreview state={preview} variant="strip" className="mb-5 lg:hidden" />

          <AnimatedHeight ref={cardRef} className="e2 rim rounded-[22px] shadow-[inset_0_1px_0_var(--hairline),var(--shadow-xl)]" innerClassName="p-5 sm:p-7">
            <div key={step} data-dir={dir} className={cn("ob-step", dir === "none" && "ob-rise")}>
              {step === 0 ? (
                <>
                  <div className="mb-6">
                    <ProfileChip
                      name={name}
                      timezone={timezone}
                      locale={locale}
                      detected={detected}
                      error={profileError}
                      open={profileOpen}
                      onOpenChange={(o) => {
                        setProfileOpen(o);
                        if (o) setProfileError(null);
                      }}
                      onName={(v) => {
                        setName(v);
                        if (v.trim()) setProfileError(null);
                      }}
                      onTimezone={setTimezone}
                      onLocale={setLocale}
                    />
                  </div>
                  <p className="text-label text-muted-foreground">Step 1 of 3 · Idea</p>
                  <h1 id="ob-step-title" ref={titleRef} tabIndex={-1} className="text-app-display mt-3 outline-none">
                    What are you <span className="text-dim">building?</span>
                  </h1>
                  <p className="mt-3 text-pretty text-[15px] leading-relaxed text-muted-foreground">
                    Describe it in a sentence, pick what it&apos;s closest to, or both. Your picks put the matching starters first.
                  </p>

                  {ideaChip ? (
                    <div className="ob-chip mt-5 inline-flex items-center gap-1.5 rounded-full bg-signal/12 py-1 pl-2.5 pr-1 text-xs font-medium text-signal-ink">
                      <span aria-hidden="true" className="size-1.5 rounded-full bg-signal" />
                      {ideaChip}
                      <button
                        type="button"
                        aria-label="Dismiss the carried-over note"
                        onClick={() => {
                          setIdeaChip(null);
                          clearPendingIdea();
                        }}
                        className="ml-0.5 flex size-5 items-center justify-center rounded-full transition-colors hover:bg-signal/20"
                      >
                        <X className="size-3" aria-hidden="true" />
                      </button>
                    </div>
                  ) : null}

                  <div suppressHydrationWarning className={cn("comet-border rounded-[18px] shadow-md", ideaChip ? "mt-3" : "mt-6")} data-active={prompt ? "" : undefined}>
                    <div className="comet-border__inner rounded-[17px]">
                      <label htmlFor="ob-prompt" className="sr-only">
                        Describe what you want to build
                      </label>
                      <Textarea
                        id="ob-prompt"
                        ref={promptRef}
                        value={prompt}
                        rows={5}
                        maxLength={IDEA_MAX}
                        placeholder={placeholder}
                        aria-describedby="ob-prompt-hint"
                        onFocus={() => setPromptFocused(true)}
                        onBlur={() => setPromptFocused(false)}
                        onChange={(e) => {
                          clearInterval(typingTimer.current);
                          setPrompt(e.target.value);
                        }}
                        className="min-h-[140px] resize-none rounded-[17px] border-0 bg-transparent px-4 pt-4 text-[15px] shadow-none focus-visible:shadow-none"
                      />
                      <div className="flex items-center gap-3 border-t border-border px-4 py-2.5">
                        <p id="ob-prompt-hint" className="min-w-0 flex-1 truncate text-xs text-muted-foreground [@media(pointer:coarse)]:invisible">
                          <span aria-hidden="true" className="inline-flex items-center gap-1 align-middle">
                            <Kbd mod className="bg-muted" />
                            <Kbd className="bg-muted">Enter</Kbd>
                          </span>{" "}
                          <span className="sr-only">Control or Command plus Enter</span> to continue
                        </p>
                        {prompt.length >= 1800 ? (
                          <span className={cn("text-meta shrink-0", prompt.length >= IDEA_MAX ? "text-danger" : "text-muted-foreground")}>
                            {prompt.length.toLocaleString("en-US")} / {IDEA_MAX.toLocaleString("en-US")}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <ul aria-label="Prompt ideas" className="mt-3 flex flex-wrap gap-2">
                    {ideas.map((idea) => (
                      <li key={idea.goal}>
                        <button
                          type="button"
                          onClick={() => typeIdea(idea.text, idea.goal)}
                          title={idea.text}
                          className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs font-medium text-muted-foreground shadow-[inset_0_1px_0_var(--hairline)] transition-[color,border-color,translate] duration-200 hover:-translate-y-px hover:border-border-strong hover:text-foreground"
                        >
                          <Sparkles className="size-3.5 text-signal" aria-hidden="true" />
                          {idea.label}
                        </button>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-8">
                    <div className="flex items-baseline justify-between gap-3">
                      <h2 id="ob-goals-label" className="text-[13px] font-semibold text-foreground">
                        What is it closest to?
                      </h2>
                      <span className="hidden text-xs text-muted-foreground sm:inline">
                        Pick any · keys <Kbd>1</Kbd>–<Kbd>8</Kbd>
                      </span>
                    </div>
                    <div role="group" aria-labelledby="ob-goals-label" className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                      {GOALS.map((g, i) => {
                        const on = goals.includes(g.id);
                        const t = byId.get(g.templateId);
                        return (
                          <button
                            key={g.id}
                            type="button"
                            aria-pressed={on}
                            aria-keyshortcuts={String(i + 1)}
                            onClick={() => toggleGoal(g.id)}
                            className={cn(
                              "ob-goal group relative flex flex-col rounded-[14px] border bg-card p-1.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                              on ? "border-transparent" : "border-border hover:-translate-y-0.5 hover:border-border-strong",
                            )}
                          >
                            <span aria-hidden="true" className="shot-pan relative block overflow-hidden rounded-[10px]">
                              <StarterShot id={g.templateId} category={t?.category ?? g.category} sizes="(min-width: 640px) 130px, 45vw" priority />
                              <Kbd className="glass absolute left-1.5 top-1.5 hidden h-[18px] min-w-[18px] border border-border px-1 text-[10px] text-foreground shadow-sm sm:inline-flex">{i + 1}</Kbd>
                              {on ? (
                                <span className="ob-goal__check absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-signal text-background shadow-md">
                                  <Check className="size-3" />
                                </span>
                              ) : null}
                            </span>
                            <span className={cn("block truncate px-1 pb-0.5 pt-2 text-[12.5px] font-medium transition-colors", on ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")}>{g.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-8 flex flex-col-reverse items-stretch gap-3 border-t border-border pt-5 sm:flex-row sm:items-center">
                    <p className="text-xs text-muted-foreground sm:flex-1">
                      {prompt.trim() ? "Next: choose how to start." : goals.length ? "No description yet? You can start from a suggested template." : "Both are optional. You can also skip setup."}
                    </p>
                    <Button type="button" onClick={next} aria-keyshortcuts="Control+Enter Meta+Enter" className="sm:min-w-[9.5rem]">
                      Continue <ArrowRight className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-label text-muted-foreground">Step 2 of 3 · Start</p>
                  <h1 id="ob-step-title" ref={titleRef} tabIndex={-1} className="text-app-display mt-3 outline-none">
                    How do you want to <span className="text-dim">start?</span>
                  </h1>
                  <p className="mt-3 text-pretty text-[15px] leading-relaxed text-muted-foreground">Either way you get a real project with files you own. You can change everything later.</p>

                  <Segmented
                    aria-label="How to start"
                    value={effectiveMode}
                    onValueChange={(v) => setMode(v)}
                    fullWidth
                    className="mt-6"
                    options={[
                      { value: "prompt", label: "Describe it", icon: <Sparkles /> },
                      { value: "template", label: "Start from a template", icon: <LayoutTemplate /> },
                    ]}
                  />

                  <div className="mt-5">
                    {effectiveMode === "prompt" ? (
                      <div className="rounded-2xl border border-border bg-surface/60 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-label text-muted-foreground">Your description</p>
                          <button
                            type="button"
                            onClick={() => {
                              goTo(0);
                              requestAnimationFrame(() => promptRef.current?.focus());
                            }}
                            className="inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          >
                            <Pencil className="size-3" aria-hidden="true" /> Edit
                          </button>
                        </div>
                        {prompt.trim() ? (
                          <p className="mt-2 line-clamp-4 whitespace-pre-line text-pretty text-[15px] leading-relaxed text-foreground">{prompt.trim()}</p>
                        ) : (
                          <p className="mt-2 text-sm text-muted-foreground">Nothing yet. Go back and describe your app in a sentence, or start from a template.</p>
                        )}
                        <div className="mt-4 flex items-center gap-3 border-t border-border pt-3">
                          <div aria-hidden="true" className="w-16 shrink-0">
                            <StarterShot id={template.id} category={template.category} className="rounded-md" sizes="64px" priority />
                          </div>
                          <p className="min-w-0 flex-1 text-xs text-muted-foreground">
                            Builds on <span className="font-medium text-foreground">{template.name}</span>
                            {ideaTemplateId === template.id ? " (the closest starter to your idea)" : null}.
                          </p>
                          <button type="button" onClick={() => setMode("template")} className="shrink-0 text-xs font-medium text-foreground underline-offset-4 hover:underline">
                            Change
                          </button>
                        </div>
                      </div>
                    ) : (
                      <TemplateChoice templates={ranked.list} suggested={ranked.suggested} value={template.id} onChange={setPickedTemplate} />
                    )}
                  </div>

                  <div className="mt-5">
                    {editingName ? (
                      <Field label="Project name" htmlFor="ob-project">
                        <Input
                          id="ob-project"
                          value={projectName ?? derivedName}
                          onChange={(e) => setProjectName(e.target.value)}
                          onBlur={() => setEditingName(false)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === "Escape") {
                              e.preventDefault();
                              setEditingName(false);
                            }
                          }}
                          maxLength={100}
                          required
                          autoFocus
                        />
                      </Field>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEditingName(true)}
                        aria-label={`Project name: ${finalName}. Edit`}
                        className="group inline-flex h-9 max-w-full items-center gap-2 rounded-full border border-border bg-card pl-3 pr-2.5 text-sm shadow-[inset_0_1px_0_var(--hairline)] transition-colors hover:border-border-strong"
                      >
                        <span className="text-muted-foreground">Name</span>
                        <span key={finalName} className="ob-swap min-w-0 truncate font-medium text-foreground">
                          {finalName}
                        </span>
                        <Pencil className="size-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" aria-hidden="true" />
                      </button>
                    )}
                  </div>

                  {effectiveMode === "prompt" ? (
                    <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                      {aiConfigured
                        ? "Codexa creates the project, opens the editor and hands your description to the AI agent."
                        : "AI generation isn't set up on this server yet. The project is still created and your description is saved in the chat panel."}
                    </p>
                  ) : null}
                  {!workspaceId ? (
                    <Alert variant="warning" className="mt-4">
                      You don&apos;t have edit access to a workspace yet, so a project can&apos;t be created here. Skip to your dashboard; a workspace owner can give you
                      editor access.
                    </Alert>
                  ) : null}

                  <div className="mt-8 flex flex-col-reverse items-stretch gap-3 border-t border-border pt-5 sm:flex-row sm:items-center">
                    <Button type="button" variant="ghost" onClick={() => goTo(0)} disabled={launching} aria-keyshortcuts="Escape" className="group">
                      <ArrowLeft className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5" aria-hidden="true" /> Back
                      <span aria-hidden="true" className="ml-1 hidden [@media(pointer:fine)]:sm:inline-flex">
                        <Kbd className="bg-muted text-[10px]">Esc</Kbd>
                      </span>
                    </Button>
                    <div className="flex flex-col-reverse gap-2 sm:ml-auto sm:flex-row">
                      <Button type="button" variant="outline" onClick={() => void skip()} loading={skipping} disabled={launching}>
                        Skip for now
                      </Button>
                      <Button
                        type="button"
                        onClick={create}
                        disabled={!workspaceId || launching || (effectiveMode === "prompt" && !prompt.trim())}
                        aria-keyshortcuts="Control+Enter Meta+Enter"
                        className="sm:min-w-[11rem]"
                      >
                        Create project
                        <span aria-hidden="true" className="hidden sm:inline-flex">
                          <Kbd mod className="bg-primary-foreground/15 text-primary-foreground/80">
                            ↵
                          </Kbd>
                        </span>
                      </Button>
                    </div>
                  </div>
                </>
              )}
              {error ? (
                <Alert variant="danger" className="mt-4">
                  {error}
                </Alert>
              ) : null}
            </div>
          </AnimatedHeight>
        </section>

        <aside aria-label="Preview of your workspace" className="sticky top-28 hidden lg:block">
          <WorkspacePreview state={preview} />
        </aside>
      </div>

      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
      {launch.element}
    </div>
  );
}
