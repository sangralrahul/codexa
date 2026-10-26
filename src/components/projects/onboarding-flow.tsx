"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpen, Check, Code2, LayoutDashboard, LayoutTemplate, Megaphone, Rocket, Server, Sparkles, Users, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { accountApi, projectsApi } from "@/lib/client/workspace/api";
import { stashInitialPrompt } from "@/lib/client/workspace/storage";
import type { TemplateSummary } from "@/lib/client/workspace/types";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Alert } from "@/components/ui/misc";
import { TemplatePicker } from "./template-picker";

const GOALS = [
  { label: "A SaaS product", icon: Rocket },
  { label: "A landing page", icon: Megaphone },
  { label: "An internal tool", icon: Wrench },
  { label: "A portfolio", icon: Sparkles },
  { label: "A dashboard", icon: LayoutDashboard },
  { label: "An API / backend", icon: Server },
  { label: "Learning to code", icon: BookOpen },
  { label: "A prototype for a client", icon: Users },
];

const STEPS = [
  { label: "Profile", title: "Welcome to", accent: "Codexa", sub: "Tell us a little about you. You can change this later in Settings." },
  { label: "Goals", title: "What are you", accent: "building?", sub: "Pick anything that applies. We use it to suggest templates." },
  { label: "First project", title: "Create your first", accent: "project", sub: "Describe it and let the AI agent start, or begin from a template." },
];

const TIMEZONES = [
  "UTC",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Asia/Dubai",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "Africa/Lagos",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "Australia/Sydney",
];

const LOCALES: { id: string; name: string }[] = [
  { id: "en", name: "English" },
  { id: "en-IN", name: "English (India)" },
  { id: "hi", name: "Hindi" },
  { id: "es", name: "Spanish" },
  { id: "fr", name: "French" },
  { id: "de", name: "German" },
  { id: "pt-BR", name: "Portuguese (Brazil)" },
  { id: "ja", name: "Japanese" },
];

type Props = {
  user: { name: string; timezone: string; locale: string };
  workspaceId: string | null;
  templates: TemplateSummary[];
  defaultTemplateId: string;
};

export function OnboardingFlow({ user, workspaceId, templates, defaultTemplateId }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(user.name);
  const [timezone, setTimezone] = useState(user.timezone || "UTC");
  useEffect(() => {
    if (user.timezone && user.timezone !== "UTC") return;
    // Default to the browser's own zone after mount (the server can't know it); the user can still change it.
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of a browser-only value
      if (detected) setTimezone(detected);
    } catch {
      // keep UTC
    }
  }, [user.timezone]);
  const [locale, setLocale] = useState(user.locale || "en");
  const [goals, setGoals] = useState<string[]>([]);
  const [mode, setMode] = useState<"template" | "prompt">("prompt");
  const [templateId, setTemplateId] = useState(defaultTemplateId);
  const [prompt, setPrompt] = useState("");
  const [projectName, setProjectName] = useState("My first project");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tzOptions = TIMEZONES.includes(timezone) ? TIMEZONES : [timezone, ...TIMEZONES];
  const meta = STEPS[step];

  const saveProfile = async () => {
    setBusy(true);
    setError(null);
    try {
      await accountApi.onboarding({ name: name.trim(), timezone, locale });
      setStep(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your profile");
    } finally {
      setBusy(false);
    }
  };

  const finish = async (createProject: boolean) => {
    setBusy(true);
    setError(null);
    try {
      await accountApi.onboarding({ completed: true });
      if (createProject && workspaceId) {
        const text = prompt.trim();
        const res = await projectsApi.create({
          workspaceId,
          name: projectName.trim() || "My first project",
          description: mode === "prompt" ? text.slice(0, 500) : goals.length ? `Building: ${goals.join(", ")}` : undefined,
          templateId: mode === "prompt" ? defaultTemplateId : templateId,
        });
        if (mode === "prompt" && text) stashInitialPrompt(text);
        router.push(`/projects/${res.project.id}`);
        return;
      }
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  };

  const card = "glass rounded-2xl border border-border/80 p-1.5 shadow-[0_40px_100px_-40px_rgba(0,0,0,0.55)]";
  const inner = "rounded-[14px] border border-border/60 bg-card/90 p-6 sm:p-8";
  const footer = "mt-8 flex items-center justify-between gap-3 border-t border-border pt-5";

  return (
    <div className="mx-auto w-full max-w-2xl">
      <ol className="mx-auto mb-10 flex max-w-sm items-center gap-2" aria-label="Progress">
        {STEPS.map((st, i) => (
          <li key={st.label} aria-current={step === i ? "step" : undefined} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-medium transition-all duration-500",
                step > i ? "border-foreground bg-foreground text-background" : step === i ? "border-foreground text-foreground shadow-[0_0_0_4px_color-mix(in_oklab,var(--foreground)_10%,transparent)]" : "border-border text-muted-foreground",
              )}
            >
              {step > i ? <Check className="pop-in size-3.5" aria-hidden="true" /> : i + 1}
              <span className="sr-only">{st.label}</span>
            </span>
            {i < STEPS.length - 1 ? (
              <span className="h-px flex-1 overflow-hidden bg-border">
                <span className={cn("block h-full bg-foreground transition-[width] duration-700 ease-out", step > i ? "w-full" : "w-0")} />
              </span>
            ) : null}
          </li>
        ))}
      </ol>

      <div key={step} className="pop-in text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          Step {step + 1} of 3 · {meta.label}
        </p>
        <h1 className="mt-3 text-balance text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
          {meta.title} <span className="serif-accent">{meta.accent}</span>
        </h1>
        <p className="mx-auto mt-3 max-w-md text-pretty text-sm text-muted-foreground">{meta.sub}</p>
      </div>

      {error ? (
        <Alert variant="danger" className="mt-6">
          {error}
        </Alert>
      ) : null}

      <div key={`card-${step}`} className={cn(card, "pop-in mt-8")} style={{ animationDelay: "80ms" }}>
        {step === 0 ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void saveProfile();
            }}
            className={cn(inner, "space-y-5")}
          >
            <Field label="Your name" htmlFor="ob-name">
              <Input id="ob-name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} autoFocus className="h-11" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Timezone" htmlFor="ob-tz" hint="Detected from your browser.">
                <Select id="ob-tz" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                  {tzOptions.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz.replace(/_/g, " ")}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Language" htmlFor="ob-locale">
                <Select id="ob-locale" value={locale} onChange={(e) => setLocale(e.target.value)}>
                  {LOCALES.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className={footer}>
              <span className="text-xs text-muted-foreground">Takes under a minute.</span>
              <Button type="submit" loading={busy} disabled={!name.trim()} className="rounded-lg">
                Continue <ArrowRight className="size-4" />
              </Button>
            </div>
          </form>
        ) : null}

        {step === 1 ? (
          <div className={inner}>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4" role="group" aria-label="What are you building">
              {GOALS.map((g, i) => {
                const on = goals.includes(g.label);
                return (
                  <button
                    key={g.label}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setGoals((s) => (on ? s.filter((x) => x !== g.label) : [...s, g.label]))}
                    style={{ animationDelay: `${120 + i * 40}ms` }}
                    className={cn(
                      "pop-in group relative flex flex-col items-start gap-3 rounded-xl border p-3.5 text-left text-[13px] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]",
                      on ? "border-foreground bg-foreground/[0.06] text-foreground shadow-[0_0_0_1px_var(--foreground)]" : "border-border text-muted-foreground hover:-translate-y-0.5 hover:border-border-strong hover:text-foreground",
                    )}
                  >
                    <span className={cn("flex size-8 items-center justify-center rounded-lg border transition-colors", on ? "border-foreground bg-foreground text-background" : "border-border bg-surface")}>
                      <g.icon className="size-4" aria-hidden="true" />
                    </span>
                    {g.label}
                    {on ? (
                      <span className="pop-in absolute right-2.5 top-2.5 flex size-4 items-center justify-center rounded-full bg-foreground text-background">
                        <Check className="size-3" aria-hidden="true" />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            <div className={footer}>
              <Button type="button" variant="ghost" onClick={() => setStep(0)}>
                <ArrowLeft className="size-4" /> Back
              </Button>
              <Button type="button" onClick={() => setStep(2)} className="rounded-lg">
                {goals.length ? "Continue" : "Skip this step"} <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void finish(true);
            }}
            className={cn(inner, "space-y-5")}
          >
            {!workspaceId ? <Alert variant="warning">You do not have a workspace yet, so we will take you to the dashboard instead.</Alert> : null}
            <div className="grid gap-2.5 sm:grid-cols-2" role="tablist" aria-label="How to start">
              {(
                [
                  ["prompt", "Describe it", "The AI agent builds from your words", Code2],
                  ["template", "Start from a template", "Pick a runnable starter", LayoutTemplate],
                ] as const
              ).map(([m, title, body, Icon]) => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={mode === m}
                  onClick={() => setMode(m)}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all duration-200",
                    mode === m ? "border-foreground bg-foreground/[0.05] shadow-[0_0_0_1px_var(--foreground)]" : "border-border hover:border-border-strong",
                  )}
                >
                  <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg border", mode === m ? "border-foreground bg-foreground text-background" : "border-border bg-surface")}>
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block text-sm font-medium">{title}</span>
                    <span className="block text-xs text-muted-foreground">{body}</span>
                  </span>
                </button>
              ))}
            </div>
            <Field label="Project name" htmlFor="ob-project">
              <Input id="ob-project" value={projectName} onChange={(e) => setProjectName(e.target.value)} maxLength={100} required />
            </Field>
            {mode === "template" ? (
              <TemplatePicker templates={templates} value={templateId} onChange={setTemplateId} compact />
            ) : (
              <Field label="Describe what you want to build" htmlFor="ob-prompt" hint="The AI agent picks this up as soon as your project opens.">
                <Textarea id="ob-prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4} maxLength={2000} placeholder="A recipe app where I can save and tag recipes…" />
              </Field>
            )}
            <div className={cn(footer, "flex-col-reverse sm:flex-row")}>
              <Button type="button" variant="ghost" onClick={() => setStep(1)} disabled={busy}>
                <ArrowLeft className="size-4" /> Back
              </Button>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="button" variant="outline" onClick={() => void finish(false)} disabled={busy} className="rounded-lg">
                  Skip for now
                </Button>
                <Button type="submit" loading={busy} disabled={!workspaceId || (mode === "prompt" && !prompt.trim())} className="rounded-lg">
                  Create project <ArrowRight className="size-4" />
                </Button>
              </div>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  );
}
