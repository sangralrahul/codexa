"use client";

import * as React from "react";
import { Field, Input, Select } from "@/components/ui/input";

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
 * The "About you" fields of onboarding (ob-name, ob-tz, ob-locale). Their values are saved
 * with the PATCH /api/v1/account/onboarding call when the person continues.
 */
export function ProfileFields({
  name,
  timezone,
  locale,
  detected,
  error,
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
  onName: (v: string) => void;
  onTimezone: (v: string) => void;
  onLocale: (v: string) => void;
}) {
  const zones = React.useMemo(() => allZones(timezone), [timezone]);
  return (
    <div className="space-y-5">
      <Field label="Your name" htmlFor="ob-name" error={error}>
        <Input id="ob-name" value={name} onChange={(e) => onName(e.target.value)} required maxLength={80} autoComplete="name" className="h-11 text-[15px]" />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Timezone" htmlFor="ob-tz" hint={detected && detected === timezone ? "Detected from your browser." : undefined}>
          <Select id="ob-tz" value={timezone} onChange={(e) => onTimezone(e.target.value)} className="h-11">
            {zones.map((tz) => (
              <option key={tz} value={tz}>
                {tz.replace(/_/g, " ")}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Date & number format" htmlFor="ob-locale" hint="The interface is in English.">
          <Select id="ob-locale" value={locale} onChange={(e) => onLocale(e.target.value)} className="h-11">
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
      </div>
    </div>
  );
}
