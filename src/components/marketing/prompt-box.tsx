"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { HoverCard } from "radix-ui";
import { ArrowRight, Check, ChevronDown, Code2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/misc";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipProvider } from "@/components/ui/tooltip";
import { AutoGrowTextarea } from "@/components/ui/autogrow-textarea";
import { useCalm, shakeElement, isCalm } from "@/lib/client/motion";
import { useMediaQuery } from "@/lib/client/workspace/use-media-query";
import { IDEA_MAX, clampIdea, ideaHref, readPendingIdea, stashPendingIdea, type IdeaSource } from "@/lib/client/pending-idea";
import { HOME_CHIPS } from "@/content/marketing/home";
import { TEMPLATE_SHOTS, templateShotFor } from "@/components/templates/shots";
import { useHomeStore } from "@/components/marketing/home/home-store";
import type { StarterLite } from "@/components/marketing/home/types";

const MIN_CHARS = 10;
const COUNTER_FROM = 1500;
const MATCH_DEBOUNCE_MS = 150;
const CHIP_TYPE_MS = 12;
const STATIC_PLACEHOLDER = "Describe what you want to build. For example: a CRM for a two-person sales team with a pipeline view and email reminders.";
const examples = HOME_CHIPS.map((c) => c.prompt);

/** Types the example ideas into the placeholder, one after another. Static when calm, focused, filled or off-screen. */
function useTypedPlaceholder(active: boolean, ref: React.RefObject<HTMLElement | null>) {
  const calm = useCalm();
  const [text, setText] = React.useState(STATIC_PLACEHOLDER);
  const [inView, setInView] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  const on = active && !calm && inView;
  React.useEffect(() => {
    if (!on) return;
    let item = 0;
    let pos = 0;
    let deleting = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const full = `Build ${examples[item].charAt(0).toLowerCase()}${examples[item].slice(1)}`;
      pos += deleting ? -3 : 1;
      setText(full.slice(0, Math.max(0, pos)) || " ");
      if (!deleting && pos >= full.length) {
        deleting = true;
        timer = setTimeout(tick, 2400);
        return;
      }
      if (deleting && pos <= 0) {
        deleting = false;
        item = (item + 1) % examples.length;
      }
      timer = setTimeout(tick, deleting ? 14 : 36);
    };
    timer = setTimeout(tick, 900);
    return () => clearTimeout(timer);
  }, [on]);
  return on ? text : STATIC_PLACEHOLDER;
}

function Thumb({ id, shot, className }: { id: string | null; shot: boolean; className?: string }) {
  if (id && shot) {
    // A token ring (border-strong) so the mostly white screenshots still read as thumbnails on the paper theme.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={templateShotFor(id, 56)} alt="" width={28} height={18} loading="lazy" decoding="async" className={cn("shrink-0 rounded-[3px] bg-white object-cover object-top ring-1 ring-border-strong", className)} />;
  }
  const Icon = id ? Code2 : Sparkles;
  return (
    <span aria-hidden="true" className={cn("inline-flex shrink-0 items-center justify-center rounded-[3px] bg-muted text-muted-foreground ring-1 ring-border-strong", className)}>
      <Icon className="size-3" />
    </span>
  );
}

/** Chip previews need a real hover: fine pointers from md (touch never hovers; phones scroll the chips sideways). */
const PREVIEW_QUERY = "(hover: hover) and (pointer: fine) and (min-width: 768px)";
/** Space kept clear at the top of the viewport for the sticky header (68px plus breathing room). */
const PREVIEW_TOP_CLEARANCE = 84;

/**
 * Hover/focus preview of a chip's real starter screenshot (decorative). Portalled to the body, so
 * nothing in the hero (the product stage right below it) can paint over it, and it opens upward over
 * the composer, so it never covers the links row under the chips. When there is no room above
 * (scrolled up under the sticky header) Popper would flip it down; it stays hidden instead.
 * Clicking the chip closes it so the prompt typing into the box stays visible; it opens again on
 * the next hover or focus.
 */
function ChipPreview({ templateId, name, children }: { templateId: string; name: string; children: React.ReactElement }) {
  const [open, setOpen] = React.useState(false);
  const used = React.useRef(false);
  return (
    <HoverCard.Root open={open} onOpenChange={(next) => setOpen(next && !used.current)} openDelay={180} closeDelay={60}>
      <HoverCard.Trigger
        asChild
        onClick={() => {
          used.current = true;
          setOpen(false);
        }}
        onPointerLeave={() => {
          used.current = false;
        }}
        onBlur={() => {
          used.current = false;
        }}
      >
        {children}
      </HoverCard.Trigger>
      <HoverCard.Portal>
        <HoverCard.Content
          side="top"
          align="center"
          sideOffset={10}
          collisionPadding={{ top: PREVIEW_TOP_CLEARANCE, right: 12, bottom: 12, left: 12 }}
          aria-hidden="true"
          className="cx-pop pointer-events-none z-50 w-[260px] rounded-[14px] border border-border-strong bg-card p-1.5 shadow-xl data-[side=bottom]:hidden"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={templateShotFor(templateId, 360)} alt="" width={248} height={155} decoding="async" className="aspect-[16/10] w-full rounded-[9px] bg-white object-cover object-top" />
          <span className="flex items-center justify-between gap-2 px-1 pb-0.5 pt-1.5 text-[11.5px]">
            <span className="truncate font-medium text-foreground">{name}</span>
            <span className="shrink-0 text-muted-foreground">Starter</span>
          </span>
        </HoverCard.Content>
      </HoverCard.Portal>
    </HoverCard.Root>
  );
}

/**
 * The AI capability state as a compact chip (PLAN §5.2: it replaces the fine-print disclaimer).
 * Configured: a green dot and "Agent ready". Not configured: an outlined warning dot and
 * "AI not configured", linking to the AI agent docs, with the rest of the explanation in a tooltip
 * (and in the link's accessible name, since tooltips do not open on touch).
 */
function CapabilityChip({ aiReady, className }: { aiReady: boolean; className?: string }) {
  const chip = "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-[6px] border border-border bg-surface px-2.5 text-xs whitespace-nowrap";
  if (aiReady) {
    return (
      <span className={cn(chip, "text-foreground/80", className)}>
        <span aria-hidden="true" className="size-1.5 rounded-full bg-success shadow-[0_0_0_3px_color-mix(in_oklab,var(--success)_18%,transparent)]" />
        Agent ready
      </span>
    );
  }
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip content="This deployment has no AI provider key yet. The editor, runtime and deploy still work.">
        <Link
          href="/docs/ai-agent"
          aria-label="AI not configured on this deployment. The editor, runtime and deploy still work. Read the AI agent docs"
          className={cn(chip, "group/ai text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground", className)}
        >
          <span aria-hidden="true" className="size-1.5 rounded-full border border-warning" />
          AI not configured
          <ArrowRight className="size-3 transition-transform group-hover/ai:translate-x-0.5" aria-hidden="true" />
        </Link>
      </Tooltip>
    </TooltipProvider>
  );
}

/** "Starter: Auto ▾" — opens a picker of every starter. The label follows the live match. */
function StarterPicker({
  starters,
  picked,
  closest,
  onPick,
  compact,
}: {
  starters: StarterLite[];
  picked: string | null;
  closest: StarterLite | null;
  onPick: (id: string | null) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const listRef = React.useRef<HTMLDivElement>(null);
  const chosen = picked ? starters.find((s) => s.id === picked) ?? null : null;
  const shown = chosen ?? closest;
  const prefix = chosen ? "Starter" : closest ? "Closest starter" : "Starter";
  const name = shown?.name ?? "Auto";
  const options: (StarterLite | null)[] = [null, ...starters];

  const onKey = (e: React.KeyboardEvent) => {
    const items = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? []);
    const i = items.indexOf(document.activeElement as HTMLButtonElement);
    const cols = listRef.current ? getComputedStyle(listRef.current).gridTemplateColumns.split(" ").length : 1;
    const delta: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols };
    let next = -1;
    if (e.key in delta) next = Math.max(0, Math.min(items.length - 1, (i < 0 ? 0 : i) + delta[e.key]));
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = items.length - 1;
    if (next < 0) return;
    e.preventDefault();
    items[next]?.focus();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${prefix}: ${name}. Choose a starter template`}
          className={cn(
            "group/starter inline-flex h-9 min-w-0 max-w-full items-center gap-2 rounded-[8px] border border-border bg-surface pl-1.5 pr-2.5 text-[13px] text-muted-foreground transition-[border-color,color,background-color] duration-200 hover:border-border-strong hover:text-foreground data-[state=open]:border-border-strong data-[state=open]:text-foreground",
            compact && "h-8",
          )}
        >
          <Thumb id={shown?.id ?? null} shot={Boolean(shown?.shot)} className="h-[18px] w-7" />
          <span key={`${prefix}-${name}`} className="flex min-w-0 items-baseline gap-1 [animation:stage-swap-in_var(--dur-3)_var(--ease-out)_both] calm:[animation:none]">
            <span className="shrink-0">{prefix}:</span>
            <span className="truncate font-medium text-foreground">{name}</span>
          </span>
          <ChevronDown className="size-3.5 shrink-0 transition-transform duration-200 group-data-[state=open]/starter:rotate-180" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(36rem,calc(100vw-24px))] p-0">
        <div className="border-b border-border px-4 pb-3 pt-3.5">
          <p className="text-[13px] font-medium text-foreground">Starter template</p>
          <p className="mt-0.5 text-xs text-muted-foreground">On Auto, Codexa suggests the closest starter from your words. Matching is a keyword score in your browser.</p>
        </div>
        <div ref={listRef} role="listbox" aria-label="Starter template" onKeyDown={onKey} className="grid max-h-[min(24rem,60vh)] grid-cols-2 gap-1.5 overflow-y-auto p-2.5 sm:grid-cols-3">
          {options.map((s) => {
            const id = s?.id ?? null;
            const selected = picked === id;
            return (
              <button
                key={id ?? "auto"}
                type="button"
                role="option"
                aria-selected={selected}
                tabIndex={selected ? 0 : -1}
                onClick={() => {
                  onPick(id);
                  setOpen(false);
                }}
                className={cn(
                  "group/opt relative flex min-w-0 flex-col gap-1.5 rounded-[10px] p-1.5 text-left transition-colors duration-150 hover:bg-muted focus-visible:bg-muted",
                  selected && "bg-selection/60 hover:bg-selection/70",
                )}
              >
                <span className="relative block aspect-[16/10] w-full overflow-hidden rounded-md bg-muted shadow-[0_0_0_1px_var(--border)]">
                  {s?.shot ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={templateShotFor(s.id, 320)} alt="" loading="lazy" decoding="async" width={160} height={100} className="size-full bg-white object-cover object-top transition-transform duration-500 group-hover/opt:scale-[1.04]" />
                  ) : (
                    <span aria-hidden="true" className="flex size-full items-center justify-center text-muted-foreground">
                      {s ? <Code2 className="size-5" /> : <Sparkles className="size-5 text-primary" />}
                    </span>
                  )}
                  {selected ? (
                    <span aria-hidden="true" className="absolute right-1 top-1 inline-flex size-5 items-center justify-center rounded-full bg-foreground text-background">
                      <Check className="size-3" />
                    </span>
                  ) : null}
                </span>
                <span className="min-w-0 px-0.5">
                  <span className="block truncate text-[12.5px] font-medium text-foreground">{s ? s.name : "Auto"}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">{s ? `${s.categoryName} · ${s.frameworkName}` : closest ? `Closest: ${closest.name}` : "Closest match"}</span>
                </span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * The idea composer (PLAN §5.2, §4.1). Same contract everywhere it is used:
 * sr-only label "Describe the application you want to build"; at least 10 characters, with a
 * role=alert error, aria-invalid and aria-describedby; maxLength 2000; signed-in goes to
 * /dashboard?prompt=…, signed-out to /signup?prompt=… after stashing the idea passport.
 *
 * - variant="hero": the big composer with example chips (each types its prompt and switches the
 *   home stage), the starter picker and live "Closest starter" match.
 * - variant="compact": a smaller composer for CTA bands, no chips.
 * Inside the home page (HomeStoreProvider) it also brightens the Horizon light while focused or typed into.
 *
 * Idea passport: `defaultValue` seeds the text (e.g. Remix: "Start from the X template and "; an
 * untouched seed is not submitted). With `prefill` (on by default for the hero) the box picks the
 * idea back up after mount: `?prompt=` / `?template=` in the URL first, otherwise the stashed
 * pending idea, so a link back to the homepage (or a return visit within 24h) keeps the idea.
 */
export function PromptBox({
  signedIn,
  variant = "hero",
  source,
  defaultTemplateId,
  defaultValue,
  prefill,
  aiReady: aiReadyProp,
  capabilityChip = true,
  footer,
  className,
  align = "center",
}: {
  signedIn: boolean;
  variant?: "hero" | "compact";
  /** Where the idea came from (stored in the idea passport). Default: "home" (hero) or "cta" (compact). */
  source?: IdeaSource;
  /** Preselect a starter (e.g. "Remix this template"). */
  defaultTemplateId?: string;
  /** Initial text (e.g. Remix: "Start from the X template and "). Submitting it unchanged asks for more. */
  defaultValue?: string;
  /** Pick up the carried idea (?prompt= or the stashed pending idea) after mount. Default: true for the hero. */
  prefill?: boolean;
  /** Show the capability chip ("Agent ready" / "AI not configured…"). Read from the home store when omitted. */
  aiReady?: boolean;
  /** Render the capability chip at all. Off in the marketing hero: the AI state is an app concern, shown once the visitor is inside. */
  capabilityChip?: boolean;
  /** How the chips and footer row sit under the card: centred (default) or flush left (the two-column hero). */
  align?: "center" | "start";
  /** Extra items at the end of the meta line under the composer (e.g. the hero's links). */
  footer?: React.ReactNode;
  className?: string;
}) {
  const router = useRouter();
  const store = useHomeStore();
  const id = React.useId();
  const hero = variant === "hero";
  const drivesStage = Boolean(store && hero);
  const starters = React.useMemo(() => store?.starters ?? [], [store]);
  const aiReady = capabilityChip ? (aiReadyProp ?? store?.aiReady) : undefined;

  const [value, setValue] = React.useState(() => (defaultValue ? defaultValue.slice(0, IDEA_MAX) : ""));
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const [picked, setPicked] = React.useState<string | null>(defaultTemplateId ?? null);
  const [closestId, setClosestId] = React.useState<string | null>(null);
  const [chipTemplate, setChipTemplate] = React.useState<{ id: string; prompt: string } | null>(null);
  const formRef = React.useRef<HTMLFormElement>(null);
  const placeholder = useTypedPlaceholder(!focused && value === "", formRef);
  const shakeRef = React.useRef<HTMLDivElement>(null);
  const areaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const typing = React.useRef(0);
  /** The chip prompt being typed in (submit mid-typing sends all of it, not the half-typed text). */
  const typingTarget = React.useRef<string | null>(null);
  const matchTimer = React.useRef(0);

  const closest = closestId ? starters.find((s) => s.id === closestId) ?? null : null;
  // On the home page the chips are checked against the real starter list (an unknown id is dropped).
  const chips = React.useMemo(() => (starters.length ? HOME_CHIPS.filter((c) => starters.some((s) => s.id === c.templateId)) : HOME_CHIPS), [starters]);
  // Server and first paint render plain chips; hover-capable screens wrap them in the preview card after hydration.
  const canPreview = useMediaQuery(PREVIEW_QUERY, false) && hero;
  // The preview card mounts on open: fetch its screenshots on the first sign of intent (pointer over or
  // focus into the chip row), so the card never opens on an empty frame.
  const prefetched = React.useRef(false);
  const prefetchPreviews = () => {
    if (prefetched.current || !canPreview) return;
    prefetched.current = true;
    for (const c of chips) {
      if (!TEMPLATE_SHOTS.has(c.templateId)) continue;
      const img = new Image();
      img.decoding = "async";
      img.src = templateShotFor(c.templateId, 360);
    }
  };

  // Register the hero prompt so the stage's "Build your own" can focus it.
  React.useEffect(() => {
    if (!drivesStage || !store) return;
    store.prompt.register(areaRef.current);
    return () => store.prompt.register(null);
  }, [drivesStage, store]);

  React.useEffect(
    () => () => {
      clearInterval(typing.current);
      clearTimeout(matchTimer.current);
    },
    [],
  );

  // Idea passport, return leg: after hydration (so the server HTML stays empty and stable), pick up
  // ?prompt=/&template= or the stashed idea. Runs once; never overwrites something already typed.
  const shouldPrefill = prefill ?? hero;
  const prefilled = React.useRef(false);
  React.useEffect(() => {
    if (!shouldPrefill || prefilled.current) return;
    // Deferred a tick (React's lint forbids synchronous setState in an effect body); all reads and
    // the URL clean-up happen inside it, so a StrictMode double-run cannot lose the idea.
    const t = window.setTimeout(() => {
      if (prefilled.current) return;
      prefilled.current = true;
      let text = "";
      let templateId: string | undefined;
      try {
        const params = new URLSearchParams(window.location.search);
        text = clampIdea(params.get("prompt"));
        templateId = params.get("template") ?? undefined;
        if (text) {
          // Keep the address clean (and the idea out of shared links) once it is in the box.
          params.delete("prompt");
          params.delete("template");
          const qs = params.toString();
          window.history.replaceState(window.history.state, "", `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`);
        }
      } catch {
        /* no URL access */
      }
      if (!text) {
        const pending = readPendingIdea();
        text = pending?.text ?? "";
        templateId = pending?.templateId;
      }
      if (!text) return;
      const known = templateId && (!starters.length || starters.some((s) => s.id === templateId)) ? templateId : undefined;
      setValue((cur) => (cur.trim() ? cur : text));
      if (known) {
        setPicked((cur) => cur ?? known);
        if (drivesStage) store?.requestScenario(known, "pick");
      } else if (store) {
        const m = store.match(text)?.id ?? null;
        setClosestId(m);
        if (m && drivesStage) store.requestScenario(m, "match");
      }
    }, 0);
    return () => window.clearTimeout(t);
  }, [shouldPrefill, starters, drivesStage, store]);

  /** Live match (150ms debounce): the starter chip follows it; on the hero it also switches the stage. */
  const scheduleMatch = (text: string, chip?: { id: string; prompt: string } | null) => {
    if (!store) return;
    clearTimeout(matchTimer.current);
    matchTimer.current = window.setTimeout(() => {
      const fromChip = chip && clampIdea(text) === clampIdea(chip.prompt) ? chip.id : null;
      const m = fromChip ?? store.match(text)?.id ?? null;
      setClosestId(m);
      if (m && drivesStage && !picked) store.requestScenario(m, "match");
    }, MATCH_DEBOUNCE_MS);
  };

  const change = (next: string, chip?: { id: string; prompt: string } | null) => {
    const delta = next.length - value.length;
    setValue(next);
    if (error && next.trim().length >= MIN_CHARS) setError(null);
    if (drivesStage && delta > 0) store?.horizon.typed(delta);
    scheduleMatch(next, chip === undefined ? chipTemplate : chip);
  };

  const typeChip = (chip: (typeof HOME_CHIPS)[number]) => {
    clearInterval(typing.current);
    typingTarget.current = null;
    setError(null);
    const tag = { id: chip.templateId, prompt: chip.prompt };
    setChipTemplate(tag);
    if (drivesStage && !picked) store?.requestScenario(chip.templateId, "chip");
    const done = () => {
      const el = areaRef.current;
      el?.focus({ preventScroll: true });
      el?.setSelectionRange(chip.prompt.length, chip.prompt.length);
    };
    if (isCalm()) {
      setValue(chip.prompt);
      scheduleMatch(chip.prompt, tag);
      done();
      return;
    }
    let n = 0;
    setValue("");
    typingTarget.current = chip.prompt;
    // Time-based (12ms per character), so a slow tick catches up instead of stretching the typing.
    let started = -1;
    typing.current = window.setInterval(() => {
      const now = performance.now();
      if (started < 0) started = now - CHIP_TYPE_MS;
      const next = Math.min(chip.prompt.length, Math.max(n + 1, Math.floor((now - started) / CHIP_TYPE_MS)));
      if (drivesStage) store?.horizon.typed(next - n);
      n = next;
      setValue(chip.prompt.slice(0, n));
      if (n >= chip.prompt.length) {
        clearInterval(typing.current);
        typingTarget.current = null;
        scheduleMatch(chip.prompt, tag);
        done();
      }
    }, CHIP_TYPE_MS);
  };

  const pick = (starterId: string | null) => {
    setPicked(starterId);
    if (starterId && drivesStage) store?.requestScenario(starterId, "pick");
  };

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    clearInterval(typing.current);
    const typedTo = typingTarget.current;
    typingTarget.current = null;
    if (typedTo !== null) setValue(typedTo);
    const prompt = clampIdea(typedTo ?? value);
    if (defaultValue && prompt === clampIdea(defaultValue)) {
      setError("Add what you want to change, after the words already in the box.");
      shakeElement(shakeRef.current, 6);
      const el = areaRef.current;
      el?.focus();
      el?.setSelectionRange(value.length, value.length);
      return;
    }
    if (prompt.length < MIN_CHARS) {
      setError("Describe your idea in at least a sentence so we can create a useful starting point.");
      shakeElement(shakeRef.current, 6);
      areaRef.current?.focus();
      return;
    }
    setError(null);
    setSubmitting(true);
    const fromChip = chipTemplate && clampIdea(chipTemplate.prompt) === prompt ? chipTemplate.id : undefined;
    // The live match is debounced; on submit, score the final text directly so a fast submit keeps its starter.
    const templateId = picked ?? fromChip ?? (store ? store.match(prompt)?.id : closestId) ?? undefined;
    stashPendingIdea(prompt, source ?? (hero ? "home" : "cta"), templateId);
    router.push(ideaHref(signedIn ? "/dashboard" : "/signup", prompt, templateId));
    // If navigation is slow or cancelled, give the button back.
    window.setTimeout(() => setSubmitting(false), 8000);
  }

  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const hint = signedIn ? "Continues in your dashboard." : "Creates a free account first; your idea is carried over.";

  return (
    <form ref={formRef} onSubmit={onSubmit} className={cn("@container mx-auto w-full text-left", hero ? "max-w-3xl" : "max-w-2xl", className)} aria-label={hero ? "Build an app from a sentence" : "Start a new build"}>
      <div ref={shakeRef} className="relative">
        <div
          data-active={value.length > 0 ? "" : undefined}
          className={cn("mk-composer", !hero && "mk-composer--compact")}
        >
          <div className={hero ? "rounded-[17px]" : "rounded-[13px]"}>
            <label id={`${id}-label`} htmlFor={`${id}-prompt`} className="sr-only">
              Describe the application you want to build
            </label>
            <AutoGrowTextarea
              ref={areaRef}
              id={`${id}-prompt`}
              name="prompt"
              value={value}
              minRows={hero ? 3 : 2}
              maxRows={hero ? 8 : 6}
              maxLength={IDEA_MAX}
              placeholder={placeholder}
              onChange={(e) => {
                clearInterval(typing.current);
                typingTarget.current = null;
                change(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  formRef.current?.requestSubmit();
                }
              }}
              onFocus={() => {
                setFocused(true);
                if (drivesStage) store?.horizon.focus(true);
              }}
              onBlur={() => {
                setFocused(false);
                if (drivesStage) store?.horizon.focus(false);
              }}
              aria-describedby={error ? errorId : hintId}
              aria-invalid={Boolean(error)}
              className={cn(
                "block w-full resize-none bg-transparent text-foreground outline-none placeholder:text-muted-foreground/75 focus-visible:outline-none",
                hero ? "px-5 pb-2 pt-5 text-[16px] leading-[1.55] sm:text-[17px]" : "px-4 pb-1.5 pt-3.5 text-[15px] leading-[1.55]",
              )}
            />
            <div className={cn("flex items-center gap-2", hero ? "px-3.5 pb-3.5" : "px-2.5 pb-2.5")}>
              {starters.length > 0 ? (
                <div className="min-w-0 flex-1 sm:flex-initial">
                  <StarterPicker starters={starters} picked={picked} closest={closest} onPick={pick} compact={!hero} />
                </div>
              ) : null}
              <div className="ml-auto flex shrink-0 items-center gap-2.5">
                {/* Wide enough (the form is a size container): the capability chip sits here, before ⌘↵. Narrower, it moves under the box. */}
                {aiReady === undefined ? null : <CapabilityChip aiReady={aiReady} className="hidden @lg:inline-flex" />}
                {value.length > COUNTER_FROM ? (
                  <span className={`text-meta ${cn("tabular-nums", value.length >= IDEA_MAX ? "text-danger" : "text-muted-foreground")}`}>
                    {value.length.toLocaleString("en-US")} / {IDEA_MAX.toLocaleString("en-US")}
                  </span>
                ) : null}
                <Kbd mod className="hidden border border-border bg-muted/60 px-1.5 [@media(pointer:fine)]:sm:inline-flex">
                  ↵
                </Kbd>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  appearance="app"
                  aria-busy={submitting || undefined}
                  className={cn("h-10 gap-1.5 pl-4 pr-3.5 text-[14px]", !hero && "h-9 text-sm")}
                >
                  Build
                  <span data-spark-icon className="relative grid size-4 place-items-center">
                    <ArrowRight
                      className={cn("col-start-1 row-start-1 size-4 transition-[opacity,transform] duration-(--dur-3) ease-snap", submitting && "rotate-90 scale-50 opacity-0")}
                      aria-hidden="true"
                    />
                    <span
                      aria-hidden="true"
                      className={cn(
                        "col-start-1 row-start-1 size-4 rounded-full border-2 border-current border-r-transparent transition-opacity duration-(--dur-2)",
                        submitting ? "animate-spin opacity-100" : "opacity-0",
                      )}
                    />
                  </span>
                  {submitting ? <span className="sr-only">Opening…</span> : null}
                </Button>
              </div>
            </div>
          </div>
        </div>
        {hero ? (
          // The textarea's description. Always in the accessibility tree; shown under the box (left-aligned,
          // in the gap above the chips, so nothing moves) while the composer is in use.
          <p
            id={hintId}
            className={cn(
              "pointer-events-none absolute inset-x-4 top-full mt-1.5 truncate text-[11px] leading-4 text-muted-foreground sm:inset-x-5 sm:text-xs transition-[opacity,translate] duration-(--dur-3) ease-out calm:transition-none",
              (focused || value.length > 0) && !error ? "translate-y-0 opacity-100" : "-translate-y-0.5 opacity-0",
            )}
          >
            {hint}
          </p>
        ) : null}
      </div>

      {error ? (
        <p id={errorId} role="alert" className="mt-2.5 px-1 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {hero ? (
        // Phones: a sideways scroller whose right edge fades out, so the cut-off chip reads as "more this way".
        <ul
          aria-label="Example ideas"
          onPointerEnter={prefetchPreviews}
          onFocus={prefetchPreviews}
          className={cn(
            "-mx-4 mt-5 flex snap-x snap-mandatory scroll-px-4 gap-2 overflow-x-auto px-4 pb-1 [mask-image:linear-gradient(to_right,black_calc(100%-48px),transparent)] [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0 sm:[mask-image:none] [&::-webkit-scrollbar]:hidden",
            align === "center" ? "sm:justify-center lg:-mx-20" : "sm:justify-start",
          )}
        >
          {chips.map((chip) => {
            const starter = starters.find((s) => s.id === chip.templateId);
            const active = chipTemplate?.id === chip.templateId && value === chip.prompt;
            const button = (
              <button
                type="button"
                onClick={() => typeChip(chip)}
                data-active={active ? "" : undefined}
                className={cn(
                  "group/chip inline-flex h-8 items-center gap-2 rounded-[8px] border bg-card pl-1.5 pr-3 text-[13px] text-muted-foreground transition-[border-color,color,background-color] duration-200 hover:border-border-strong hover:text-foreground",
                  active ? "border-primary/50 text-foreground" : "border-border",
                )}
              >
                <Thumb id={chip.templateId} shot={TEMPLATE_SHOTS.has(chip.templateId)} className="h-[13px] w-5 rounded-[2px]" />
                {chip.label}
              </button>
            );
            return (
              <li key={chip.templateId} className="relative shrink-0 snap-start">
                {canPreview && TEMPLATE_SHOTS.has(chip.templateId) ? (
                  <ChipPreview templateId={chip.templateId} name={starter?.name ?? chip.label}>
                    {button}
                  </ChipPreview>
                ) : (
                  button
                )}
              </li>
            );
          })}
        </ul>
      ) : null}

      {/* One centred row under the composer: the capability chip when the box is too narrow to hold it,
          the compact variant's account hint, then the caller's links. */}
      <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-2 px-1 text-xs text-muted-foreground", align === "center" ? "justify-center" : "justify-start", hero ? "mt-4" : "mt-3")}>
        {aiReady === undefined ? null : <CapabilityChip aiReady={aiReady} className="@lg:hidden" />}
        {hero ? null : <p id={hintId}>{hint}</p>}
        {footer}
      </div>
    </form>
  );
}
