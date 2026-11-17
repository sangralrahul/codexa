"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown";
import type { AiModelChoice } from "./types";

const PROVIDER_NAME = { anthropic: "Claude", openai: "ChatGPT" } as const;

/**
 * The composer's model menu: the featured models first (Claude Fable, Claude Opus, GPT-6 Astra,
 * GPT-6.1 Sol), the rest under "More models". A model whose provider key is not set on the server is
 * listed but disabled, with the variable it needs, so nothing pretends to work.
 */
export function ModelPicker({ models, value, onChange, disabled }: { models: AiModelChoice[]; value: string; onChange: (id: string) => void; disabled?: boolean }) {
  const current = models.find((m) => m.id === value);
  const featured = models.filter((m) => m.featured);
  const more = models.filter((m) => !m.featured);
  const row = (m: AiModelChoice) => (
    <DropdownMenuRadioItem
      key={m.id}
      value={m.id}
      disabled={!m.available}
      className="items-start gap-2.5 py-2 pl-2 [&>span:first-child]:hidden"
      title={m.available ? undefined : `Set ${m.missingEnv} on the server to use ${m.label}.`}
    >
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-[13px] text-foreground">
          {m.label}
          <span className="rounded-[4px] px-1 font-mono text-[9.5px] uppercase tracking-wider text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)]">{PROVIDER_NAME[m.provider]}</span>
        </span>
        <span className="block text-[11.5px] leading-snug text-muted-foreground">{m.available ? m.note : `Needs ${m.missingEnv}`}</span>
      </span>
      {m.id === value ? <Check className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> : null}
    </DropdownMenuRadioItem>
  );
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        aria-label={`Model: ${current?.label ?? value}. Change model`}
        className={cn(
          "inline-flex h-6 max-w-full items-center gap-1 rounded-md px-1.5 text-[11.5px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50",
        )}
      >
        <span className="truncate">{current?.label ?? value}</span>
        <ChevronDown className="size-3 shrink-0" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="w-72">
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">Models</DropdownMenuLabel>
          {featured.map(row)}
          {more.length ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">More models</DropdownMenuLabel>
              {more.map(row)}
            </>
          ) : null}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const STORAGE_KEY = "codexa:ai-model";

/**
 * The viewer's picked model (remembered in this browser), falling back to the server default when
 * nothing is picked or the remembered model is not usable on this server.
 */
export function usePickedModel(models: AiModelChoice[] | undefined, serverDefault: string | undefined) {
  const [picked, setPicked] = React.useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  });
  const usable = (id: string | null | undefined) => Boolean(id && models?.some((m) => m.id === id && m.available));
  const value = usable(picked) ? picked! : usable(serverDefault) ? serverDefault! : (models?.find((m) => m.available)?.id ?? serverDefault ?? "");
  const pick = React.useCallback((id: string) => {
    setPicked(id);
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* storage blocked: the pick lasts for this page */
    }
  }, []);
  return [value, pick] as const;
}
