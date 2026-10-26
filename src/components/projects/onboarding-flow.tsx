"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { accountApi, projectsApi } from "@/lib/client/workspace/api";
import { stashInitialPrompt } from "@/lib/client/workspace/storage";
import type { TemplateSummary } from "@/lib/client/workspace/types";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Alert } from "@/components/ui/misc";
import { TemplatePicker } from "./template-picker";

const GOALS = ["A SaaS product", "A landing page", "An internal tool", "A portfolio", "A dashboard", "An API / backend", "Learning to code", "A prototype for a client"];

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
  const [timezone, setTimezone] = useState(() => (TIMEZONES.includes(user.timezone) ? user.timezone : "UTC"));
  const [locale, setLocale] = useState(user.locale || "en");
  const [goals, setGoals] = useState<string[]>([]);
  const [mode, setMode] = useState<"template" | "prompt">("template");
  const [templateId, setTemplateId] = useState(defaultTemplateId);
  const [prompt, setPrompt] = useState("");
  const [projectName, setProjectName] = useState("My first project");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tzOptions = TIMEZONES.includes(timezone) ? TIMEZONES : [timezone, ...TIMEZONES];

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

  return (
    <div className="mx-auto w-full max-w-3xl">
      <ol className="mb-8 grid grid-cols-3 gap-3 text-xs" aria-label="Progress">
        {["Profile", "Goals", "First project"].map((label, i) => (
          <li key={label} aria-current={step === i ? "step" : undefined}>
            <span className="block h-1 overflow-hidden rounded-full bg-muted">
              <span className={cn("block h-full rounded-full bg-foreground transition-[width] duration-500 ease-out", step >= i ? "w-full" : "w-0")} />
            </span>
            <span className={cn("mt-2 flex items-center gap-1.5", step === i ? "font-medium text-foreground" : "text-muted-foreground")}>
              {step > i ? <Check className="size-3.5 text-success" aria-hidden="true" /> : <span className="font-mono tabular-nums">{String(i + 1).padStart(2, "0")}</span>}
              {label}
            </span>
          </li>
        ))}
      </ol>

      {error ? (
        <Alert variant="danger" className="mb-4">
          {error}
        </Alert>
      ) : null}

      {step === 0 ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void saveProfile();
          }}
          className="pop-in space-y-5 rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8"
        >
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Welcome to Codexa</h1>
            <p className="mt-1 text-sm text-muted-foreground">Tell us a little about you. You can change this later in Settings.</p>
          </div>
          <Field label="Your name" htmlFor="ob-name">
            <Input id="ob-name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} autoFocus />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Timezone" htmlFor="ob-tz">
              <Select id="ob-tz" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                {tzOptions.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
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
          <div className="-mx-6 -mb-6 mt-6 flex justify-end border-t border-border bg-surface/60 px-6 py-3 sm:-mx-8 sm:-mb-8 sm:px-8">
            <Button type="submit" loading={busy} disabled={!name.trim()}>
              Continue <ArrowRight className="size-4" />
            </Button>
          </div>
        </form>
      ) : null}

      {step === 1 ? (
        <div className="pop-in space-y-5 rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">What are you building?</h1>
            <p className="mt-1 text-sm text-muted-foreground">Pick anything that applies. This only helps us suggest templates.</p>
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="What are you building">
            {GOALS.map((g) => {
              const on = goals.includes(g);
              return (
                <button
                  key={g}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setGoals((s) => (on ? s.filter((x) => x !== g) : [...s, g]))}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    "inline-flex items-center gap-1.5 active:scale-[0.97]",
                    on ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:border-border-strong hover:text-foreground",
                  )}
                >
                  {on ? <Check className="pop-in size-3.5" aria-hidden="true" /> : null}
                  {g}
                </button>
              );
            })}
          </div>
          <div className="-mx-6 -mb-6 mt-6 flex items-center justify-between border-t border-border bg-surface/60 px-6 py-3 sm:-mx-8 sm:-mb-8 sm:px-8">
            <Button type="button" variant="ghost" onClick={() => setStep(0)}>
              <ArrowLeft className="size-4" /> Back
            </Button>
            <Button type="button" onClick={() => setStep(2)}>
              Continue <ArrowRight className="size-4" />
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
          className="pop-in space-y-5 rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8"
        >
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Create your first project</h1>
            <p className="mt-1 text-sm text-muted-foreground">Start from a template, or describe what you want and let the AI builder take it from there.</p>
          </div>
          {!workspaceId ? <Alert variant="warning">You do not have a workspace yet, so we will take you to the dashboard instead.</Alert> : null}
          <div className="inline-flex rounded-lg border border-border bg-surface p-0.5" role="tablist" aria-label="How to start">
            {(["template", "prompt"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => setMode(m)}
                className={cn("rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200", mode === m ? "bg-background text-foreground shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground")}
              >
                {m === "template" ? "From a template" : "From a description"}
              </button>
            ))}
          </div>
          <Field label="Project name" htmlFor="ob-project">
            <Input id="ob-project" value={projectName} onChange={(e) => setProjectName(e.target.value)} maxLength={100} required />
          </Field>
          {mode === "template" ? (
            <TemplatePicker templates={templates} value={templateId} onChange={setTemplateId} compact />
          ) : (
            <Field label="Describe what you want to build" htmlFor="ob-prompt" hint="Stored for the AI chat panel in your new workspace.">
              <Textarea id="ob-prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4} maxLength={2000} placeholder="A recipe app where I can save and tag recipes…" />
            </Field>
          )}
          <div className="-mx-6 -mb-6 mt-6 flex flex-col-reverse gap-2 border-t border-border bg-surface/60 px-6 py-3 sm:-mx-8 sm:-mb-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <Button type="button" variant="ghost" onClick={() => setStep(1)} disabled={busy}>
              <ArrowLeft className="size-4" /> Back
            </Button>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" variant="outline" onClick={() => void finish(false)} disabled={busy}>
                Skip for now
              </Button>
              <Button type="submit" loading={busy} disabled={!workspaceId || (mode === "prompt" && !prompt.trim())}>
                Create project
              </Button>
            </div>
          </div>
        </form>
      ) : null}
    </div>
  );
}
