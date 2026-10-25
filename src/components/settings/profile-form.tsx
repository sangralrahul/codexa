"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ClientApiError } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { Alert } from "@/components/ui/misc";

export type ProfileValues = { name: string; email: string; timezone: string; locale: string; avatarUrl: string };

export function ProfileForm({ initial, timezones, locales }: { initial: ProfileValues; timezones: string[]; locales: { value: string; label: string }[] }) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<{ kind: "idle" | "saving" | "saved" | "error"; message?: string }>({ kind: "idle" });
  const set = (k: keyof ProfileValues, v: string) => setValues((s) => ({ ...s, [k]: v }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus({ kind: "saving" });
    setErrors({});
    try {
      await api("/api/v1/account/profile", {
        method: "PATCH",
        json: { name: values.name, timezone: values.timezone, locale: values.locale, avatarUrl: values.avatarUrl.trim() === "" ? "" : values.avatarUrl.trim() },
      });
      setStatus({ kind: "saved", message: "Profile saved." });
      router.refresh();
    } catch (err) {
      if (err instanceof ClientApiError) {
        setErrors(err.fieldErrors());
        setStatus({ kind: "error", message: err.message });
      } else setStatus({ kind: "error", message: "Could not save your profile." });
    }
  }

  const initials = (values.name || values.email).slice(0, 2).toUpperCase();
  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div className="flex items-center gap-4">
        {values.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={values.avatarUrl} alt="" className="size-14 rounded-full border border-border object-cover" />
        ) : (
          <span aria-hidden="true" className="flex size-14 items-center justify-center rounded-full bg-muted text-base font-semibold">
            {initials}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{values.email}</p>
          <p className="text-xs text-muted-foreground">Your email address is used to sign in and cannot be changed here.</p>
        </div>
      </div>
      <Field label="Name" htmlFor="name" error={errors.name}>
        <Input id="name" name="name" value={values.name} onChange={(e) => set("name", e.target.value)} required maxLength={80} autoComplete="name" aria-invalid={Boolean(errors.name)} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Time zone" htmlFor="timezone" error={errors.timezone} hint="Used for dates in activity history and emails.">
          <Select id="timezone" name="timezone" value={values.timezone} onChange={(e) => set("timezone", e.target.value)}>
            {!timezones.includes(values.timezone) ? <option value={values.timezone}>{values.timezone}</option> : null}
            {timezones.map((tz) => (
              <option key={tz} value={tz}>
                {tz.replace(/_/g, " ")}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Language" htmlFor="locale" error={errors.locale} hint="The interface is in English today; Hindi is being prepared.">
          <Select id="locale" name="locale" value={values.locale} onChange={(e) => set("locale", e.target.value)}>
            {locales.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Avatar URL" htmlFor="avatarUrl" error={errors.avatarUrl} hint="An https:// link to an image. Leave empty to use your initials.">
        <Input id="avatarUrl" name="avatarUrl" type="url" placeholder="https://" value={values.avatarUrl} onChange={(e) => set("avatarUrl", e.target.value)} aria-invalid={Boolean(errors.avatarUrl)} />
      </Field>
      {status.kind === "error" ? <Alert variant="danger">{status.message}</Alert> : null}
      {status.kind === "saved" ? <Alert variant="success">{status.message}</Alert> : null}
      <div className="flex justify-end">
        <Button type="submit" loading={status.kind === "saving"}>
          Save changes
        </Button>
      </div>
    </form>
  );
}
