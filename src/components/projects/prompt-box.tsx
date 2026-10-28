"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, CornerDownLeft, Globe, ImagePlus, Link2, Loader2, Lock, Sparkles, Undo2, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown";
import { AutoGrowTextarea } from "@/components/ui/autogrow-textarea";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useLaunch } from "@/components/motion/launch";
import { ProjectThumb } from "@/components/app/project-thumb";
import { isCalm, useCalm } from "@/lib/client/motion";
import { clampIdea, readPendingIdea, type IdeaSource } from "@/lib/client/pending-idea";
import { usePlatformMod } from "@/lib/client/platform";
import type { ProjectVisibility } from "@/lib/client/workspace/types";
import { cn } from "@/lib/utils";
import { api } from "@/lib/client/api";
import { addImages, dataUrlOf, IMAGE_ACCEPT, imageFilesFrom, MAX_PROMPT_IMAGES, stashInitialImages, type PromptImage } from "@/lib/client/attachments";
import { createFromPrompt, describeCreateError, PROMPT_MAX, type CreateError } from "./create-from-prompt";
import { VISIBILITY_HINTS, VISIBILITY_LABELS } from "./format";

export type PromptTemplate = {
  id: string;
  name: string;
  category: string;
  framework?: string;
  frameworkName: string;
  fileCount?: number;
};
export type PromptPreset = {
  label: string;
  prompt: string;
  templateId: string;
};
export type PromptWorkspace = { id: string; name: string; plan: string };

const IDEAS = [
  "a habit tracker with streaks and weekly charts",
  "a landing page for a coffee subscription",
  "an internal tool to review support tickets",
  "an invoice tracker with GST totals",
  "a recipe app where I can save and tag recipes",
];

const VIS_ICON: Record<ProjectVisibility, typeof Lock> = {
  private: Lock,
  unlisted: Link2,
  public: Globe,
};
const SOURCE_LABEL: Record<IdeaSource, string> = {
  home: "the homepage",
  cta: "the website",
  solution: "the website",
  command: "the command menu",
};

const STATIC_PLACEHOLDER = `Describe your app, e.g. ${IDEAS[0]}`;

/**
 * Placeholder that types the example ideas once each, then settles on a static example. It only runs
 * while the box is empty, unfocused, on screen and the tab is visible, and never when calm, so focusing
 * the box (or switching motion off) stops it at once.
 */
function useTypedPlaceholder(active: boolean, ref: React.RefObject<HTMLElement | null>) {
  const calm = useCalm();
  const [text, setText] = useState(STATIC_PLACEHOLDER);
  const [visible, setVisible] = useState(false);
  const [done, setDone] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    let inView = false;
    const sync = () => setVisible(inView && document.visibilityState === "visible");
    const io = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      sync();
    });
    io.observe(el);
    document.addEventListener("visibilitychange", sync);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [ref]);
  const on = active && visible && !calm && !done;
  useEffect(() => {
    if (!on) return;
    let idea = 0;
    let pos = 0;
    let erasing = false;
    let timer = 0;
    const tick = () => {
      const full = IDEAS[idea];
      pos += erasing ? -2 : 1;
      setText(`Ask Codexa to build ${full.slice(0, Math.max(0, pos))}`);
      if (!erasing && pos >= full.length) {
        // The last idea stays typed out: one pass, then it rests.
        if (idea === IDEAS.length - 1) {
          setDone(true);
          return;
        }
        erasing = true;
        timer = window.setTimeout(tick, 2000);
        return;
      }
      if (erasing && pos <= 0) {
        erasing = false;
        idea += 1;
      }
      timer = window.setTimeout(tick, erasing ? 16 : 40);
    };
    timer = window.setTimeout(tick, 900);
    return () => clearTimeout(timer);
  }, [on]);
  if (done) return `Ask Codexa to build ${IDEAS[IDEAS.length - 1]}`;
  return on ? text : STATIC_PLACEHOLDER;
}

const chip =
  "group/chip inline-flex h-8 min-w-0 shrink-0 items-center gap-2 rounded-[10px] border border-border bg-background/60 px-2 text-xs text-muted-foreground transition-[color,border-color,background-color] hover:border-border-strong hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring data-[state=open]:border-border-strong data-[state=open]:text-foreground disabled:pointer-events-none disabled:opacity-50";

/**
 * The dashboard composer: "What do you want to build?". A comet border lights while it is focused
 * or holds text; the toolbar picks the starting template, the workspace (when there is more than one
 * you can edit) and the visibility. "Build" (Ctrl/⌘ + Enter) creates the project, queues the prompt
 * for the editor's AI chat under `codexa:initialPrompt`, and the composer grows into the Launch panel
 * whose rows tick only as the real request resolves. On failure it folds back, shakes, and the error
 * shows inline (quota errors link to plans).
 *
 * Idea passport: `initialPrompt` (from `?prompt=`) or the stashed pending idea pre-fills and focuses
 * the box with a "Carried over" chip.
 */
export function PromptBox({
  workspaceId,
  workspaces = [],
  templateId: defaultTemplateId,
  templates = [],
  presets = [],
  aiConfigured,
  initialPrompt,
  initialTemplateId,
  atLimit = null,
  align = "center",
}: {
  /** The editable workspace projects are created in (null: the user cannot create). */
  workspaceId: string | null;
  /** Every workspace the user can create in (a chip appears when there is more than one). */
  workspaces?: PromptWorkspace[];
  templateId: string;
  templates?: PromptTemplate[];
  presets?: PromptPreset[];
  aiConfigured: boolean;
  /** Set when the target workspace already uses every project its plan allows (from the plan config and a DB count). */
  atLimit?: { workspaceId: string; used: number; limit: number; plan: string } | null;
  /** The idea passport from `?prompt=` (already clamped on the server). */
  initialPrompt?: string;
  initialTemplateId?: string;
  /** "center" (dashboard hero, max 768px) or "start": left-aligned, filling its container (the New project hub's column). */
  align?: "center" | "start";
}) {
  const router = useRouter();
  const mod = usePlatformMod();
  const formRef = useRef<HTMLFormElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const typingRef = useRef(0);
  const [prompt, setPrompt] = useState(initialPrompt ?? "");
  const [templateId, setTemplateId] = useState(initialTemplateId ?? defaultTemplateId);
  const [wsId, setWsId] = useState(workspaceId);
  const [visibility, setVisibility] = useState<ProjectVisibility>("private");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<CreateError | null>(null);
  const [carried, setCarried] = useState<string | null>(initialPrompt ? SOURCE_LABEL.home : null);
  const [focused, setFocused] = useState(false);
  const launch = useLaunch({ title: "Building from your prompt" });
  const fileRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<PromptImage[]>([]);
  const [enhancing, setEnhancing] = useState(false);
  const [preEnhance, setPreEnhance] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const attach = async (files: File[]) => {
    if (!files.length) return;
    const res = await addImages(images, files);
    setImages(res.images);
    setNotice(res.error);
  };
  const enhance = async () => {
    const text = prompt.trim();
    if (text.length < 3 || enhancing) return;
    stopTyping();
    setEnhancing(true);
    setNotice(null);
    try {
      const res = await api<{ prompt: string }>("/api/v1/ai/enhance", { method: "POST", json: { prompt: text.slice(0, 2000) } });
      setPreEnhance(prompt);
      setPrompt(res.prompt.slice(0, PROMPT_MAX));
      areaRef.current?.focus({ preventScroll: true });
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Could not enhance the prompt.");
    } finally {
      setEnhancing(false);
    }
  };
  const enabled = Boolean(wsId);
  const placeholder = useTypedPlaceholder(!prompt && enabled && !carried && !focused && !busy, areaRef);
  const template = templates.find((t) => t.id === templateId);
  const workspace = workspaces.find((w) => w.id === wsId);
  const length = prompt.length;
  const start = align === "start";

  // Idea passport: focus the carried prompt, take the URL param out of the address bar, or fall back to the stashed idea.
  useEffect(() => {
    if (!enabled) return;
    if (initialPrompt) {
      const pending = readPendingIdea();
      if (pending && pending.text === initialPrompt) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of the stashed idea's source after mount
        setCarried(SOURCE_LABEL[pending.source]);
      }
      try {
        window.history.replaceState(window.history.state, "", window.location.pathname);
      } catch {
        /* ignore */
      }
    } else {
      const pending = readPendingIdea();
      if (!pending) return;
      setPrompt(clampIdea(pending.text));
      if (pending.templateId && templates.some((t) => t.id === pending.templateId)) setTemplateId(pending.templateId);
      setCarried(SOURCE_LABEL[pending.source]);
    }
    const el = areaRef.current;
    if (el) {
      el.focus({ preventScroll: true });
      const end = el.value.length;
      el.setSelectionRange(end, end);
    }
    // Mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => window.clearInterval(typingRef.current), []);

  const stopTyping = () => {
    window.clearInterval(typingRef.current);
    typingRef.current = 0;
  };

  /** Presets type themselves in (12ms a character; instantly when calm) and switch the template. */
  const applyPreset = (p: PromptPreset) => {
    stopTyping();
    setTemplateId(p.templateId);
    setError(null);
    const el = areaRef.current;
    el?.focus({ preventScroll: true });
    if (isCalm()) {
      setPrompt(p.prompt);
      return;
    }
    let i = 0;
    setPrompt("");
    typingRef.current = window.setInterval(() => {
      i = Math.min(p.prompt.length, i + 2);
      setPrompt(p.prompt.slice(0, i));
      if (i >= p.prompt.length) stopTyping();
    }, 24);
  };

  const submit = async () => {
    stopTyping();
    const text = prompt.trim() || (images.length ? "Build this from the attached image." : "");
    if (!text || !wsId || busy) return;
    setBusy(true);
    setError(null);
    launch.start(formRef.current, [{ id: "create", label: "Creating project", state: "active" }]);
    try {
      const project = await createFromPrompt({
        workspaceId: wsId,
        text,
        templateId,
        visibility,
      });
      stashInitialImages(images);
      launch.update("create", "done");
      if (template && typeof template.fileCount === "number")
        launch.add({
          id: "copy",
          label: `Copied ${template.fileCount} files from ${template.name}`,
          state: "done",
        });
      launch.add({
        id: "open",
        label: "Opening the editor",
        detail: aiConfigured ? "Your prompt goes to the AI agent" : "Your prompt waits in the chat panel",
      });
      router.push(`/projects/${project.id}?view=preview`);
    } catch (err) {
      const e = describeCreateError(err);
      setError(e);
      launch.fail("create", e.message, { collapse: true });
      setBusy(false);
      window.setTimeout(() => areaRef.current?.focus({ preventScroll: true }), 380);
    }
  };

  return (
    <section aria-label="Describe your idea" className="w-full">
      <div className={start ? "w-full" : "mx-auto max-w-3xl"}>
        <form
          ref={formRef}
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          className="rounded-[20px]"
        >
          <div data-composer data-onscreen-watch data-active={prompt.trim() ? "" : undefined} className="comet-border rounded-[20px] shadow-[var(--shadow-lg)]">
            <div className="comet-border__inner overflow-hidden rounded-[19px] bg-card shadow-[inset_0_1px_0_var(--hairline)]">
              {carried ? (
                <div className="flex items-center gap-2 px-4 pt-3.5 sm:px-5">
                  <span className="chip-in inline-flex h-6 items-center gap-1.5 rounded-full bg-selection px-2.5 text-xs font-medium text-foreground shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--signal)_30%,transparent)]">
                    <Undo2 className="size-3 -scale-x-100 text-signal-ink" aria-hidden="true" />
                    Carried over from {carried}
                    <button
                      type="button"
                      onClick={() => setCarried(null)}
                      className="-mr-1 ml-0.5 flex size-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
                      aria-label="Dismiss carried-over note"
                    >
                      <X className="size-3" aria-hidden="true" />
                    </button>
                  </span>
                </div>
              ) : null}
              <label htmlFor="idea-prompt" className="sr-only">
                What do you want to build?
              </label>
              <AutoGrowTextarea
                ref={areaRef}
                id="idea-prompt"
                data-hotkey-search
                minRows={3}
                maxRows={12}
                value={prompt}
                onChange={(e) => {
                  stopTyping();
                  setPrompt(e.target.value);
                  if (error) setError(null);
                }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onPaste={(e) => {
                  const files = imageFilesFrom(e.clipboardData);
                  if (!files.length) return;
                  e.preventDefault();
                  void attach(files);
                }}
                onDragOver={(e) => {
                  if (Array.from(e.dataTransfer.types).includes("Files")) e.preventDefault();
                }}
                onDrop={(e) => {
                  const files = imageFilesFrom(e.dataTransfer);
                  if (!files.length) return;
                  e.preventDefault();
                  void attach(files);
                }}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    e.preventDefault();
                    void submit();
                  }
                }}
                maxLength={PROMPT_MAX}
                placeholder={placeholder}
                aria-describedby="idea-hint"
                aria-invalid={error ? true : undefined}
                aria-errormessage={error ? "idea-error" : undefined}
                disabled={busy || !enabled}
                className="block min-h-[120px] w-full resize-none bg-transparent px-4 pb-2 pt-4 text-base leading-relaxed placeholder:text-muted-foreground/70 focus:outline-none disabled:opacity-60 sm:px-5"
              />
              {images.length ? (
                <ul className="flex flex-wrap gap-2 px-4 pb-2 sm:px-5" aria-label="Attached images">
                  {images.map((img) => (
                    <li key={img.id} className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element -- local data URL preview */}
                      <img src={dataUrlOf(img)} alt={img.name} className="size-16 rounded-xl object-cover shadow-[0_0_0_1px_var(--border-strong)]" />
                      <button type="button" onClick={() => setImages((list) => list.filter((i) => i.id !== img.id))} aria-label={`Remove ${img.name}`} className="absolute -right-1.5 -top-1.5 inline-flex size-5 items-center justify-center rounded-full bg-foreground text-background shadow-md hover:opacity-90">
                        <X className="size-3" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              {notice ? (
                <p role="alert" className="px-4 pb-2 text-[12.5px] text-danger sm:px-5">
                  {notice}
                </p>
              ) : null}
              <div className="flex flex-wrap items-center gap-2 px-3 pb-3 sm:flex-nowrap">
                <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto [scrollbar-width:none]">
                  <input ref={fileRef} type="file" accept={IMAGE_ACCEPT} multiple hidden onChange={(e) => {
                    void attach(Array.from(e.target.files ?? []));
                    e.target.value = "";
                  }} />
                  <button type="button" onClick={() => fileRef.current?.click()} disabled={!enabled || busy || images.length >= MAX_PROMPT_IMAGES} className={chip} aria-label="Attach a screenshot or design" title="Attach a screenshot, sketch or design. You can also paste or drop images.">
                    <ImagePlus className="size-3.5" aria-hidden="true" />
                    <span className="hidden sm:inline">Image</span>
                  </button>
                  {aiConfigured ? (
                    preEnhance !== null && !enhancing ? (
                      <button type="button" onClick={() => { setPrompt(preEnhance); setPreEnhance(null); }} className={chip} title="Put your original text back">
                        <Undo2 className="size-3.5" aria-hidden="true" />
                        <span>Undo</span>
                      </button>
                    ) : (
                      <button type="button" onClick={() => void enhance()} disabled={!enabled || busy || enhancing || prompt.trim().length < 3} className={chip} title="Turn your idea into a detailed brief before building">
                        {enhancing ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <Sparkles className="size-3.5" aria-hidden="true" />}
                        <span>{enhancing ? "Enhancing…" : "Enhance"}</span>
                      </button>
                    )
                  ) : null}
                  {templates.length ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild disabled={!enabled}>
                        <button type="button" className={cn(chip, "max-w-[144px] pl-1 sm:max-w-[220px]")} aria-label={`Template: ${template?.name ?? "React starter"}. Change template`}>
                          <ProjectThumb key={templateId} templateId={templateId} framework={template?.framework} size="lg" className="thumb-swap h-6 w-[38px] rounded-[6px]" />
                          <span className="truncate font-medium text-foreground">{template?.name ?? "React starter"}</span>
                          <ChevronDown className="hidden size-3.5 shrink-0 transition-transform duration-(--dur-2) group-data-[state=open]/chip:rotate-180 sm:block" aria-hidden="true" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="scrollbar-thin max-h-[360px] w-80 overflow-y-auto">
                        <DropdownMenuLabel>Start from</DropdownMenuLabel>
                        <DropdownMenuRadioGroup value={templateId} onValueChange={setTemplateId}>
                          {templates.map((t) => (
                            <DropdownMenuRadioItem key={t.id} value={t.id} className="gap-3 py-1.5 pl-2 [&>span:first-child]:hidden">
                              <ProjectThumb templateId={t.id} framework={t.framework} size="lg" />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-[13px] text-foreground">{t.name}</span>
                                <span className="block truncate text-[11.5px] text-muted-foreground">
                                  {t.frameworkName}
                                  {typeof t.fileCount === "number" ? ` · ${t.fileCount} files` : ""}
                                </span>
                              </span>
                              {t.id === templateId ? <Check className="size-4 shrink-0" aria-hidden="true" /> : null}
                            </DropdownMenuRadioItem>
                          ))}
                        </DropdownMenuRadioGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href="/dashboard/templates">Browse all templates</Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                  {workspaces.length > 1 && workspace ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild disabled={busy}>
                        {/* Named by content (sr-only), not aria-label, so the name contains the visible text (WCAG 2.5.3). */}
                        <button type="button" className={cn(chip, "max-w-[180px]")}>
                          <Avatar name={workspace.name} seed={workspace.id} shape="square" size="xs" />
                          <span aria-hidden="true" className="hidden truncate sm:inline">{workspace.name}</span>
                          <span className="sr-only">Workspace: {workspace.name}. Change workspace</span>
                          <ChevronDown className="size-3.5 shrink-0" aria-hidden="true" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-64">
                        <DropdownMenuLabel>Create in</DropdownMenuLabel>
                        <DropdownMenuRadioGroup value={wsId ?? ""} onValueChange={setWsId}>
                          {workspaces.map((w) => (
                            <DropdownMenuRadioItem key={w.id} value={w.id} className="gap-2.5 pl-2 [&>span:first-child]:hidden">
                              <Avatar name={w.name} seed={w.id} shape="square" size="sm" />
                              <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">{w.name}</span>
                              <span className="text-xs capitalize text-muted-foreground">{w.plan}</span>
                              {w.id === wsId ? <Check className="size-4 shrink-0" aria-hidden="true" /> : null}
                            </DropdownMenuRadioItem>
                          ))}
                        </DropdownMenuRadioGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild disabled={!enabled}>
                      <button type="button" className={chip} aria-label={`Visibility: ${VISIBILITY_LABELS[visibility]}. Change visibility`}>
                        {(() => {
                          const Icon = VIS_ICON[visibility];
                          return <Icon className="size-3.5" aria-hidden="true" />;
                        })()}
                        <span className="hidden sm:inline">{VISIBILITY_LABELS[visibility]}</span>
                        <ChevronDown className="size-3.5 shrink-0" aria-hidden="true" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-72">
                      <DropdownMenuLabel>Who can open it</DropdownMenuLabel>
                      <DropdownMenuRadioGroup value={visibility} onValueChange={(v) => setVisibility(v as ProjectVisibility)}>
                        {(["private", "unlisted", "public"] as const).map((v) => {
                          const Icon = VIS_ICON[v];
                          return (
                            <DropdownMenuRadioItem key={v} value={v} className="items-start gap-2.5 py-2 pl-2 [&>span:first-child]:hidden">
                              <Icon className="mt-0.5 size-4" aria-hidden="true" />
                              <span className="min-w-0 flex-1">
                                <span className="block text-[13px] text-foreground">{VISIBILITY_LABELS[v]}</span>
                                <span className="block text-xs text-muted-foreground">{VISIBILITY_HINTS[v]}</span>
                              </span>
                              {v === visibility ? <Check className="size-4 shrink-0" aria-hidden="true" /> : null}
                            </DropdownMenuRadioItem>
                          );
                        })}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="ml-auto flex shrink-0 items-center gap-3">
                  {length >= 1500 ? (
                    <span className={cn("text-meta", length >= PROMPT_MAX ? "text-danger" : length >= 1800 ? "text-warning" : "text-muted-foreground")} aria-live="polite">
                      {length.toLocaleString("en-US")} / {PROMPT_MAX.toLocaleString("en-US")}
                    </span>
                  ) : null}
                  <Button
                    type="submit"
                    variant="ember"
                    size="sm"
                    spark
                    disabled={(!prompt.trim() && !images.length) || !enabled || busy || enhancing}
                    aria-keyshortcuts="Control+Enter Meta+Enter"
                    aria-busy={busy || undefined}
                    className="composer-build h-9 gap-2 px-3.5 sm:px-4"
                  >
                    <span>Build</span>
                    <span data-spark-icon aria-hidden="true" className="hidden items-center gap-0.5 rounded-[6px] bg-current/12 px-1.5 py-0.5 text-[11px] font-semibold leading-none sm:inline-flex">
                      {mod}
                      <CornerDownLeft className="size-3" aria-hidden="true" />
                    </span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </form>

        {error ? (
          <p id="idea-error" role="alert" className="pop-in mt-3 flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/[0.06] px-3.5 py-2.5 text-sm text-foreground">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-danger" aria-hidden="true" />
            <span>
              {error.message}{" "}
              {error.quota ? (
                <Link href="/settings/billing" className="font-medium underline underline-offset-2">
                  View plans
                </Link>
              ) : null}
            </span>
          </p>
        ) : null}

        {atLimit && atLimit.workspaceId === wsId && !error ? (
          <p className={cn("mt-3 text-pretty text-xs text-muted-foreground", start ? "text-left" : "text-center")}>
            <span className="mr-1.5 inline-block size-1.5 rounded-full bg-warning align-middle" aria-hidden="true" />
            <span>
              All {atLimit.limit} projects on the {atLimit.plan} plan are in use in this workspace. Delete one or{" "}
              <Link href="/settings/billing" className="link-draw font-medium text-foreground">
                view plans
              </Link>
              .
            </span>
          </p>
        ) : null}

        <p id="idea-hint" className={cn("mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground", start ? "justify-start text-left" : "justify-center text-center")}>
          {!enabled ? (
            "You need a workspace with edit access before creating projects."
          ) : aiConfigured ? (
            <>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
                Agent ready
              </span>
              <span aria-hidden="true">·</span>
              <span>Paste a screenshot to build from a design</span>
            </>
          ) : (
            <>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-warning" aria-hidden="true" />
                AI is not configured on this server
              </span>
              <span aria-hidden="true">·</span>
              <Link href="/docs/ai-agent" className="link-draw font-medium text-foreground">
                How to set it up
              </Link>
            </>
          )}
        </p>
      </div>

      {presets.length ? (
        <div className={start ? "mt-5" : "mx-auto mt-5 max-w-4xl"}>
          <p className="sr-only" id="presets-label">
            Quick starts
          </p>
          <ul
            aria-labelledby="presets-label"
            className={cn(
              // Phones: one swipeable row whose right edge fades out (wide enough to read as "more this way").
              "edge-fade-x preset-row -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:[mask-image:none]",
              start ? "sm:justify-start" : "sm:justify-center",
            )}
          >
            {presets.map((p) => {
              const on = p.templateId === templateId && prompt === p.prompt;
              return (
                <li key={p.label} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => applyPreset(p)}
                    disabled={!enabled || busy}
                    aria-pressed={on}
                    title={p.prompt}
                    className={cn(
                      "flex h-8 items-center rounded-full border px-3.5 text-[13px] transition-[border-color,color,background-color] duration-(--dur-3) disabled:pointer-events-none disabled:opacity-50",
                      on ? "border-foreground/40 bg-card text-foreground" : "border-border text-muted-foreground hover:border-border-strong hover:bg-card hover:text-foreground",
                    )}
                  >
                    {p.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
      {launch.element}
    </section>
  );
}
