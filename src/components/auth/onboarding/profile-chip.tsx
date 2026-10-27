"use client";

import * as React from "react";
import { ChevronDown, Globe2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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

/** Locales only change how dates and numbers are written; the interface itself is in English. */
const LOCALES: { id: string; name: string }[] = [
  { id: "en", name: "English (US)" },
  { id: "en-GB", name: "English (UK)" },
  { id: "en-IN", name: "English (India)" },
  { id: "hi", name: "Hindi" },
  { id: "es", name: "Spanish" },
  { id: "fr", name: "French" },
  { id: "de", name: "German" },
  { id: "pt-BR", name: "Portuguese (Brazil)" },
  { id: "ja", name: "Japanese" },
];

const SAMPLE_DATE = new Date(Date.UTC(2026, 9, 26, 12));

function sample(locale: string) {
  try {
    const d = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(SAMPLE_DATE);
    const n = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(1234.5);
    return `${d} · ${n}`;
  } catch {
    return "";
  }
}

function allZones(current: string): string[] {
  let list = TIMEZONES;
  try {
    const intl = Intl as typeof Intl & { supportedValuesOf?: (k: string) => string[] };
    const all = intl.supportedValuesOf?.("timeZone");
    if (all?.length) list = ["UTC", ...all.filter((z) => z !== "UTC")];
  } catch {
    /* older engines: the short list */
  }
  return list.includes(current) ? list : [current, ...list];
}

/**
 * The profile row on top of onboarding ("Rahul Sangral · Asia/Kolkata · Edit"). It opens a
 * small form (ob-name, ob-tz, ob-locale) whose values are saved with the unchanged
 * PATCH /api/v1/account/onboarding call when the person continues.
 */
export function ProfileChip({
  name,
  timezone,
  locale,
  detected,
  error,
  open,
  onOpenChange,
  onName,
  onTimezone,
  onLocale,
}: {
  name: string;
  timezone: string;
  locale: string;
  /** The zone the browser reported, when detection worked. */
  detected: string | null;
  error: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onName: (v: string) => void;
  onTimezone: (v: string) => void;
  onLocale: (v: string) => void;
}) {
  const zones = React.useMemo(() => (open ? allZones(timezone) : []), [open, timezone]);
  const shownName = name.trim() || "Add your name";
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="group inline-flex max-w-full items-center gap-2.5 rounded-full border border-border bg-card/80 py-1 pl-1 pr-3 text-[13px] shadow-[inset_0_1px_0_var(--hairline)] backdrop-blur transition-[border-color,background-color] duration-200 hover:border-border-strong hover:bg-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[state=open]:border-border-strong"
        >
          <Avatar name={shownName} size="sm" />
          <span className="min-w-0 truncate font-medium text-foreground">{shownName}</span>
          <span aria-hidden="true" className="text-border-strong">
            ·
          </span>
          <span className="hidden min-w-0 items-center gap-1 truncate text-muted-foreground sm:inline-flex">
            <Globe2 className="size-3.5 shrink-0" aria-hidden="true" />
            {timezone.replace(/_/g, " ")}
          </span>
          <span aria-hidden="true" className="hidden text-border-strong sm:inline">
            ·
          </span>
          <span className="inline-flex items-center gap-0.5 font-medium text-muted-foreground transition-colors group-hover:text-foreground">
            Edit profile
            <ChevronDown className="size-3.5 transition-transform duration-200 group-data-[state=open]:rotate-180" aria-hidden="true" />
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(22rem,calc(100vw_-_24px))] p-5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) onOpenChange(false);
          }}
          className="space-y-4"
        >
          <div>
            <p className="text-[13px] font-semibold text-foreground">Your profile</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Saved when you continue. Change it any time in Settings.</p>
          </div>
          <Field label="Your name" htmlFor="ob-name" error={error}>
            <Input id="ob-name" value={name} onChange={(e) => onName(e.target.value)} required maxLength={80} autoComplete="name" autoFocus />
          </Field>
          <Field label="Timezone" htmlFor="ob-tz" hint={detected && detected === timezone ? "Detected from your browser." : undefined}>
            <Select id="ob-tz" value={timezone} onChange={(e) => onTimezone(e.target.value)}>
              {zones.map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replace(/_/g, " ")}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Date & number format" htmlFor="ob-locale" hint="The interface is in English today.">
            <Select id="ob-locale" value={locale} onChange={(e) => onLocale(e.target.value)}>
              {(LOCALES.some((l) => l.id === locale) ? LOCALES : [{ id: locale, name: locale }, ...LOCALES]).map((l) => {
                const s = sample(l.id);
                return (
                  <option key={l.id} value={l.id}>
                    {s ? `${l.name} · ${s}` : l.name}
                  </option>
                );
              })}
            </Select>
          </Field>
          <div className="flex justify-end gap-2 pt-1">
            <PopoverClose asChild>
              <Button type="button" variant="ghost" size="sm">
                Close
              </Button>
            </PopoverClose>
            <Button type="submit" size="sm" disabled={!name.trim()}>
              Done
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
