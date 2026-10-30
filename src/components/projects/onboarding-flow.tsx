"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, ArrowUp, BarChart3, Bot, Briefcase, ChevronDown, Globe, LayoutTemplate, Pencil, Rocket, Server, ShoppingBag, Wrench, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { accountApi, projectsApi } from "@/lib/client/workspace/api";
import { stashInitialPrompt } from "@/lib/client/workspace/storage";
import type { TemplateSummary } from "@/lib/client/workspace/types";
import { useCalm } from "@/lib/client/motion";
import { IDEA_MAX, clearPendingIdea, readPendingIdea, type IdeaSource } from "@/lib/client/pending-idea";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Alert, Kbd } from "@/components/ui/misc";
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LogoMark, Wordmark } from "@/components/logo";
import { useLaunch, type LaunchStep } from "@/components/motion/launch";
import { GOALS, nameFromPrompt, rankTemplates, type GoalId } from "@/components/auth/onboarding/goals";
import { OB_STEPS, OnboardingProgress } from "@/components/auth/onboarding/progress";
import { ProfileFields } from "@/components/auth/onboarding/profile-fields";
import { TemplateChoice } from "@/components/auth/onboarding/template-choice";

type Mode = "template" | "prompt";

type Props = {
  user: { name: string; email?: string; timezone: string; locale: string };
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

const GOAL_ICON: Record<GoalId, LucideIcon> = { saas: Rocket, dashboard: BarChart3, landing: Globe, store: ShoppingBag, ai: Bot, internal: Wrench, portfolio: Briefcase, api: Server };

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
      setText(`Build ${full.slice(0, Math.max(0, pos))}`);
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
 * First-run onboarding, two quiet steps in one centred column:
 *  1. About you: name, timezone and date format.
 *  2. Build: one large prompt box with idea chips (each also ranks the starters), and
 *     "Start from a template" that opens the ranked starter picker in place.
 *  3. Launch: honest rows that tick as each real request resolves.
 * Contracts kept: the onboarding PATCH fields, skip → /dashboard, codexa:initialPrompt only in
 * prompt mode, timezone detection only when the stored zone is empty or UTC, no Create for viewers.
 */
export function OnboardingFlow({ user, workspaceId, templates, defaultTemplateId, aiConfigured, carried, userMenu }: Props) {
  const router = useRouter();
  const calm = useCalm();
  const known = useMemo(() => new Set(templates.map((t) => t.id)), [templates]);
  const byId = useMemo(() => new Map(templates.map((t) => [t.id, t])), [templates]);

  // Profile
  const [name, setName] = useState(user.name);
  const [timezone, setTimezone] = useState(user.timezone || "UTC");
  const [detected, setDetected] = useState<string | null>(null);
  const [locale, setLocale] = useState(user.locale || "en");
  const [profileError, setProfileError] = useState<string | null>(null);

  // Idea
  const [prompt, setPrompt] = useState(carried?.prompt ?? "");
  const [ideaTemplateId, setIdeaTemplateId] = useState<string | null>(carried?.templateId && known.has(carried.templateId) ? carried.templateId : null);
  const [ideaChip, setIdeaChip] = useState<string | null>(carried?.prompt ? "From the homepage" : null);
  const [goals, setGoals] = useState<GoalId[]>([]);
  const [lastGoal, setLastGoal] = useState<GoalId | null>(null);
  const [promptFocused, setPromptFocused] = useState(false);

  // Start
  const [mode, setMode] = useState<Mode>("prompt");
  const [pickedTemplate, setPickedTemplate] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);

  // Flow: a carried idea skips straight to the prompt when the name is already known.
  const [step, setStep] = useState<0 | 1>(carried?.prompt && user.name.trim() ? 1 : 0);
  const [dir, setDir] = useState<"forward" | "back" | "none">("none");
  const [announce, setAnnounce] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);
  const [skipping, setSkipping] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const nameRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef(0);
  const progress = useRef<{ saved: boolean }>({ saved: false });
  const shownStep = useRef<0 | 1>(step);

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

  // The idea passport: an idea stashed by the homepage (or carried through sign-up / GitHub) pre-fills the prompt.
  useEffect(() => {
    if (carried?.prompt) return;
    const pending = readPendingIdea();
    if (!pending) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of browser storage after hydration
    setPrompt((p) => p || pending.text);
    setIdeaChip(SOURCE_LABEL[pending.source] ?? "From the homepage");
    if (pending.templateId && known.has(pending.templateId)) setIdeaTemplateId(pending.templateId);
  }, [carried?.prompt, known]);

  // Desktop: the cursor waits in the first field of the step.
  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const el = step === 1 ? promptRef.current : nameRef.current?.querySelector<HTMLInputElement>("#ob-name");
    if (!el) return;
    el.focus({ preventScroll: true });
    el.setSelectionRange(el.value.length, el.value.length);
  }, [step]);

  // A step change moves focus to its heading for screen readers (keyboard users then land in the field above).
  useEffect(() => {
    if (shownStep.current === step) return;
    shownStep.current = step;
    if (!window.matchMedia("(pointer: fine)").matches) titleRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: calm ? "auto" : "smooth" });
  }, [step, calm]);

  useEffect(() => () => clearInterval(typingTimer.current), []);

  const ranked = useMemo(() => rankTemplates(templates, goals, lastGoal), [templates, goals, lastGoal]);
  const autoTemplate = ideaTemplateId ?? (goals.length ? ranked.list[0]?.id : null) ?? defaultTemplateId;
  const templateId = pickedTemplate && known.has(pickedTemplate) ? pickedTemplate : autoTemplate;
  const template = byId.get(templateId) ?? byId.get(defaultTemplateId) ?? templates[0];
  const derivedName = (mode === "prompt" && prompt.trim() ? nameFromPrompt(prompt) : template?.name) || "My first project";
  const finalName = (projectName ?? derivedName).trim() || "My first project";
  const placeholder = useTypedPlaceholder(step === 1 && !prompt && !promptFocused);
  const progressStep = launching ? 2 : step;
  const firstName = name.trim().split(/\s+/)[0] ?? "";

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

  function pickIdea(goal: GoalId) {
    const g = GOALS.find((x) => x.id === goal);
    if (!g) return;
    clearInterval(typingTimer.current);
    setGoals((cur) => (cur.includes(goal) ? cur : [...cur, goal]));
    setLastGoal(goal);
    setIdeaTemplateId(null);
    setPickedTemplate(null);
    const text = g.idea;
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
      nameRef.current?.querySelector<HTMLInputElement>("#ob-name")?.focus();
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
        description: mode === "prompt" ? text.slice(0, 500) || undefined : goals.length ? `Building: ${GOALS.filter((g) => goals.includes(g.id)).map((g) => g.label).join(", ")}` : undefined,
        templateId: template?.id ?? defaultTemplateId,
      });
      launch.update("create", "done");
      // The IDE's chat panel reads this once and hands it to the agent (prompt mode only).
      if (mode === "prompt" && text) stashInitialPrompt(text);
      clearPendingIdea();
      launch.update("open", "active");
      router.push(`/projects/${res.project.id}`);
    } catch (err) {
      launch.fail("create", err instanceof Error ? err.message : "Could not create the project");
    }
  }

  function create() {
    if (!workspaceId || launching) return;
    if (mode === "prompt" && !prompt.trim()) {
      setError("Describe your app first, or start from a template.");
      promptRef.current?.focus();
      return;
    }
    setError(null);
    void run();
  }

  // Keyboard: Enter in the prompt builds (Shift+Enter for a new line), Ctrl/⌘+Enter continues or creates, Esc goes back.
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
      if (t?.closest("input, textarea, select, [contenteditable='true']")) return;
      if (step === 1 && e.key === "Escape") {
        e.preventDefault();
        goTo(0);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const nameChip = editingName ? (
    <Input
      aria-label="Project name"
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
      autoFocus
      className="h-8 w-56 rounded-full text-[13px]"
    />
  ) : (
    <button
      type="button"
      onClick={() => setEditingName(true)}
      aria-label={`Project name: ${finalName}. Edit`}
      className="group inline-flex h-8 min-w-0 max-w-full items-center gap-1.5 rounded-full px-2.5 text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <span key={finalName} className="ob-swap min-w-0 truncate">
        {finalName}
      </span>
      <Pencil className="size-3 shrink-0 opacity-60 transition-opacity group-hover:opacity-100" aria-hidden="true" />
    </button>
  );

  return (
    <div className="relative isolate flex min-h-dvh flex-col bg-background [--btn-radius:10px]">
      <div aria-hidden="true" className="ob-glow pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px]" />

      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center gap-4 px-4 sm:px-8">
          <span className="flex shrink-0 items-center gap-2.5">
            <LogoMark size={24} state={launching ? "running" : "idle"} />
            <Wordmark className="hidden text-[17px] sm:inline" />
          </span>
          <OnboardingProgress current={progressStep} className="mx-auto hidden max-w-xs md:flex" />
          <div className="ml-auto flex shrink-0 items-center gap-1.5 md:ml-0">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" disabled={launching || skipping} className="text-muted-foreground hover:text-foreground">
                  Skip
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

      <main ref={cardRef} className="flex flex-1 flex-col items-center px-4 pb-20 sm:px-8">
        <OnboardingProgress current={progressStep} className="mt-2 max-w-xs md:hidden" />
        <div key={step} data-dir={dir} className={cn("ob-step w-full", step === 0 ? "max-w-[460px] pt-[min(10vh,96px)]" : "max-w-[720px] pt-[min(9vh,88px)]")}>
          {step === 0 ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                next();
              }}
              noValidate
            >
              <div className="flex justify-center">
                <LogoMark size={40} />
              </div>
              <h1 id="ob-step-title" ref={titleRef} tabIndex={-1} className="mt-6 text-balance text-center text-[30px] font-semibold leading-tight tracking-[-0.02em] text-foreground outline-none sm:text-[34px]">
                Welcome to Codexa
              </h1>
              <p className="mx-auto mt-3 max-w-sm text-pretty text-center text-[15px] leading-relaxed text-muted-foreground">A few details so your workspace feels like yours. You can change them later in Settings.</p>

              <div ref={nameRef} className="mt-9 rounded-lg border border-border bg-card p-5 shadow-[inset_0_1px_0_var(--hairline),var(--shadow-md)] sm:p-6">
                <ProfileFields
                  name={name}
                  timezone={timezone}
                  locale={locale}
                  detected={detected}
                  error={profileError}
                  onName={(v) => {
                    setName(v);
                    if (v.trim()) setProfileError(null);
                  }}
                  onTimezone={setTimezone}
                  onLocale={setLocale}
                />
              </div>

              <Button type="submit" size="lg" className="mt-6 h-11 w-full text-[15px]">
                Continue <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            </form>
          ) : (
            <>
              <h1 id="ob-step-title" ref={titleRef} tabIndex={-1} className="text-balance text-center text-[30px] font-semibold leading-tight tracking-[-0.02em] text-foreground outline-none sm:text-[40px]">
                What do you want to build{firstName ? `, ${firstName}` : ""}?
              </h1>
              <p className="mx-auto mt-3 max-w-lg text-pretty text-center text-[15px] leading-relaxed text-muted-foreground sm:text-base">
                Describe it in plain words. Codexa writes the code, runs a live preview and keeps every version.
              </p>

              {mode === "prompt" ? (
                <>
                  {ideaChip ? (
                    <div className="mt-8 flex justify-center">
                      <span className="ob-chip inline-flex items-center gap-1.5 rounded-full bg-signal/12 py-1 pl-2.5 pr-1 text-xs font-medium text-accent">
                        <span aria-hidden="true" className="size-1.5 rounded-full bg-accent" />
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
                      </span>
                    </div>
                  ) : null}

                  <div
                    className={cn(
                      "ob-prompt rounded-[20px] border border-border bg-card shadow-[inset_0_1px_0_var(--hairline),var(--shadow-lg)] transition-[border-color,box-shadow] duration-200 focus-within:border-border-strong",
                      ideaChip ? "mt-3" : "mt-9",
                    )}
                  >
                    <label htmlFor="ob-prompt" className="sr-only">
                      Describe what you want to build
                    </label>
                    <Textarea
                      id="ob-prompt"
                      ref={promptRef}
                      value={prompt}
                      rows={3}
                      maxLength={IDEA_MAX}
                      placeholder={placeholder}
                      aria-describedby="ob-prompt-hint"
                      onFocus={() => setPromptFocused(true)}
                      onBlur={() => setPromptFocused(false)}
                      onChange={(e) => {
                        clearInterval(typingTimer.current);
                        setPrompt(e.target.value);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey && !e.metaKey && !e.ctrlKey && !e.nativeEvent.isComposing) {
                          e.preventDefault();
                          create();
                        }
                      }}
                      className="min-h-[120px] resize-none rounded-[20px] border-0 bg-transparent px-5 pt-5 text-[16px] leading-relaxed shadow-none focus-visible:shadow-none focus-visible:outline-none"
                    />
                    <div className="flex items-center gap-2 px-3 pb-3">
                      <div className="min-w-0 flex-1">{prompt.trim() ? nameChip : null}</div>
                      <p id="ob-prompt-hint" className="hidden shrink-0 text-xs text-muted-foreground [@media(pointer:fine)]:sm:block">
                        {prompt.length >= 1800 ? (
                          <span className={cn("tabular-nums", prompt.length >= IDEA_MAX && "text-danger")}>
                            {prompt.length.toLocaleString("en-US")} / {IDEA_MAX.toLocaleString("en-US")}
                          </span>
                        ) : (
                          <>
                            <Kbd className="bg-muted">Enter</Kbd> to build · <Kbd className="bg-muted">Shift</Kbd> <Kbd className="bg-muted">Enter</Kbd> new line
                          </>
                        )}
                      </p>
                      <Button
                        type="button"
                        onClick={create}
                        disabled={!workspaceId || launching || !prompt.trim()}
                        aria-label="Build it"
                        className="h-9 shrink-0 rounded-full px-4"
                      >
                        Build <ArrowUp className="size-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>

                  <ul aria-label="Ideas to start from" className="mt-5 flex flex-wrap justify-center gap-2">
                    {GOALS.map((g) => {
                      const Icon = GOAL_ICON[g.id];
                      const on = goals.includes(g.id) && lastGoal === g.id;
                      return (
                        <li key={g.id}>
                          <button
                            type="button"
                            onClick={() => pickIdea(g.id)}
                            title={g.idea}
                            aria-pressed={on}
                            className={cn(
                              "inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-[13px] font-medium transition-[color,border-color,background-color] duration-200",
                              on ? "border-border-strong bg-muted text-foreground" : "border-border bg-card text-muted-foreground hover:border-border-strong hover:text-foreground",
                            )}
                          >
                            <Icon className="size-3.5" aria-hidden="true" />
                            {g.label}
                          </button>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="mt-10 flex items-center gap-4 text-xs text-muted-foreground">
                    <span aria-hidden="true" className="h-px flex-1 bg-border" />
                    or
                    <span aria-hidden="true" className="h-px flex-1 bg-border" />
                  </div>
                  <div className="mt-5 flex justify-center">
                    <Button type="button" variant="outline" onClick={() => setMode("template")} className="h-10 rounded-full px-5">
                      <LayoutTemplate className="size-4" aria-hidden="true" /> Start from a template
                      <ChevronDown className="size-3.5 opacity-60" aria-hidden="true" />
                    </Button>
                  </div>

                  {!aiConfigured ? (
                    <p className="mx-auto mt-6 max-w-md text-center text-xs leading-relaxed text-muted-foreground">
                      AI generation isn&apos;t set up on this server yet. Your project is still created and your description waits in the chat panel.
                    </p>
                  ) : null}
                </>
              ) : (
                <div className="mt-9">
                  <div className="mb-4 flex flex-wrap items-center gap-3">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setMode("prompt")} className="-ml-2 text-muted-foreground hover:text-foreground">
                      <ArrowLeft className="size-4" aria-hidden="true" /> Describe it instead
                    </Button>
                    <div className="ml-auto flex min-w-0 items-center gap-2 text-[13px] text-muted-foreground">
                      Name {nameChip}
                    </div>
                  </div>
                  <TemplateChoice templates={ranked.list} suggested={ranked.suggested} value={template.id} onChange={setPickedTemplate} />
                  <div className="sticky bottom-0 z-10 -mx-4 mt-6 flex items-center gap-3 border-t border-border bg-background/85 px-4 py-4 backdrop-blur-xl sm:mx-0 sm:rounded-lg sm:border sm:px-5">
                    <p className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{template.name}</span>
                      <span className="hidden sm:inline"> · {template.frameworkName}</span>
                    </p>
                    <Button type="button" onClick={create} disabled={!workspaceId || launching} className="shrink-0">
                      Use this template <ArrowRight className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              )}

              {!workspaceId ? (
                <Alert variant="warning" className="mt-6">
                  You don&apos;t have edit access to a workspace yet, so a project can&apos;t be created here. Skip to your dashboard; a workspace owner can give you editor
                  access.
                </Alert>
              ) : null}

              <div className="mt-10 flex justify-center">
                <button
                  type="button"
                  onClick={() => goTo(0)}
                  disabled={launching}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <ArrowLeft className="size-3.5" aria-hidden="true" /> Back to your details
                </button>
              </div>
            </>
          )}
          {error ? (
            <Alert variant="danger" className="mt-6">
              {error}
            </Alert>
          ) : null}
        </div>
      </main>

      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
      {launch.element}
    </div>
  );
}
