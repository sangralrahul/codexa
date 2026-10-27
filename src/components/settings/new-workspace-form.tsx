"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { api, ClientApiError } from "@/lib/client/api";
import { cn, slugify } from "@/lib/utils";
import { isCalm, shakeElement } from "@/lib/client/motion";
import { PLANS } from "@/config/plans";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { SettingsCard } from "./section";

const STEPS = ["Create the workspace", "Invite teammates", "Start a project"] as const;

function Steps({ done }: { done: number }) {
  return (
    <ol className="flex items-start gap-0" aria-label="Setup steps">
      {STEPS.map((s, i) => {
        const state = i < done ? "done" : i === done ? "active" : "todo";
        return (
          <li key={s} className="ws-step relative flex flex-1 flex-col items-start gap-2" data-state={state} aria-current={state === "active" ? "step" : undefined}>
            <div className="flex w-full items-center">
              <span className="ws-step__dot relative z-[1] flex size-6 shrink-0 items-center justify-center rounded-full border border-border-strong bg-card font-mono text-[11px] text-muted-foreground transition-colors duration-300">
                {state === "done" ? (
                  <svg viewBox="0 0 16 16" className="check-draw size-3.5" aria-hidden="true">
                    <path d="M3.5 8.5 6.6 11.5 12.5 5" pathLength={1} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  i + 1
                )}
              </span>
              {i < STEPS.length - 1 ? (
                <span aria-hidden="true" className="relative mx-2 h-px flex-1 bg-border">
                  <span className="ws-step__line absolute inset-0 scale-x-0 bg-foreground" />
                </span>
              ) : null}
            </div>
            <span className={cn("pr-3 text-xs", state === "todo" ? "text-muted-foreground" : "font-medium text-foreground")}>
              {s}
              <span className="sr-only">{state === "done" ? " (done)" : state === "active" ? " (current)" : ""}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Create a workspace: the form on the left; on the right, a live preview of its workspace-switcher
 * entry and what the Free plan includes (from PLANS). On success the first step draws its check,
 * then the cookie switches to the new workspace and Members opens.
 */
export function NewWorkspaceForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  const free = PLANS.free;
  const display = name.trim() || "New workspace";
  const slug = name.trim() ? slugify(name) : "new-workspace";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    if (name.trim().length < 2) {
      setError("Use at least 2 characters.");
      shakeElement(formEl.querySelector("#new-ws-name"), 4);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ workspace: { id: string } }>("/api/v1/workspaces", { method: "POST", json: { name } });
      setDone(1);
      document.cookie = `codexa_workspace=${r.workspace.id}; path=/; max-age=31536000; samesite=lax`;
      await new Promise((res) => window.setTimeout(res, isCalm() ? 0 : 650));
      router.push("/settings/members");
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? (err.fieldErrors().name ?? err.message) : "Could not create the workspace.");
      shakeElement(formEl.querySelector("#new-ws-name"), 4);
      setBusy(false);
    }
  }

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
      <form onSubmit={onSubmit} noValidate className="min-w-0">
        <SettingsCard
          id="new-workspace"
          icon={<Plus />}
          title="Create a workspace"
          description="You can rename it or change its URL slug later."
          bodyClassName="space-y-6"
          hint="Starts on the Free plan, with you as owner."
          footer={
            <Button type="submit" size="sm" state={busy && done === 0 ? "loading" : done > 0 ? "success" : "idle"} successLabel="Created" loadingLabel="Creating">
              Create workspace
            </Button>
          }
        >
          <Field label="Workspace name" htmlFor="new-ws-name" hint="For example your company, team or client name. You can invite members from the Members page next." error={error}>
            <Input id="new-ws-name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={60} autoFocus placeholder="Acme Studio" aria-invalid={Boolean(error)} />
          </Field>
          <p className="-mt-2 font-mono text-xs text-muted-foreground">
            slug <span className="text-foreground">/{slug}</span>
          </p>
          <div className="border-t border-border/70 pt-5">
            <Steps done={done} />
          </div>
        </SettingsCard>
      </form>

      <aside aria-label="Preview" className="settings-card rounded-[16px] p-5">
        <p className="text-[13px] font-medium">In the workspace switcher</p>
        <div aria-hidden="true" className="mt-3 rounded-[14px] border border-border bg-background/60 p-1.5 shadow-[inset_0_1px_0_var(--hairline)]">
          <div className="flex items-center gap-2.5 rounded-[10px] bg-card px-2.5 py-2 shadow-sm ring-1 ring-border">
            <span key={display.slice(0, 2)} className="mirror-swap">
              <Avatar name={display} seed={slug} shape="square" size="sm" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium">{display}</span>
              <span className="block text-[11px] text-muted-foreground">{free.name} plan · Owner</span>
            </span>
            <Check className="size-4 text-foreground" />
          </div>
          <div className="mt-1 flex items-center gap-2.5 px-2.5 py-2 text-[13px] text-muted-foreground">
            <span className="flex size-6 items-center justify-center rounded-[6px] border border-dashed border-border-strong">
              <Plus className="size-3" />
            </span>
            Create workspace
            <ChevronsUpDown className="ml-auto size-3.5 opacity-60" />
          </div>
        </div>
        <p className="mt-5 text-[13px] font-medium">What {free.name} includes</p>
        <ul className="mt-2.5 space-y-2 text-[13px]">
          {free.features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-muted-foreground">
              <Check className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden="true" /> {f}
            </li>
          ))}
          <li className="flex items-start gap-2 text-muted-foreground">
            <Check className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden="true" /> {free.limits.members} seat{free.limits.members === 1 ? "" : "s"}, {free.limits.storageMb} MB storage
          </li>
        </ul>
        <p className="mt-4 border-t border-border/70 pt-3 text-xs text-muted-foreground">Upgrade any time from Billing. Limits come from the plan configuration.</p>
      </aside>
    </div>
  );
}
