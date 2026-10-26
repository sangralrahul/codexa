"use client";

import { useRef, useState } from "react";
import { Camera, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { api, ClientApiError } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { Alert } from "@/components/ui/misc";
import { SettingsCard } from "./section";

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
        json: { name: values.name, timezone: values.timezone, locale: values.locale },
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

  const fileRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<{ busy: "upload" | "remove" | null; error?: string }>({ busy: null });

  async function uploadPhoto(file: File) {
    if (file.size > 2 * 1024 * 1024) return setPhoto({ busy: null, error: "The image is larger than 2 MB." });
    setPhoto({ busy: "upload" });
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/v1/account/avatar", { method: "POST", body, credentials: "same-origin" });
      const data = (await res.json().catch(() => ({}))) as { user?: { avatarUrl: string | null }; error?: { message?: string } };
      if (!res.ok || !data.user) throw new Error(data.error?.message ?? "Upload failed. Try another image.");
      set("avatarUrl", data.user.avatarUrl ?? "");
      setPhoto({ busy: null });
      router.refresh();
    } catch (err) {
      setPhoto({ busy: null, error: err instanceof Error ? err.message : "Upload failed." });
    }
  }

  async function removePhoto() {
    setPhoto({ busy: "remove" });
    try {
      await api("/api/v1/account/avatar", { method: "DELETE" });
      set("avatarUrl", "");
      setPhoto({ busy: null });
      router.refresh();
    } catch {
      setPhoto({ busy: null, error: "Could not remove the photo." });
    }
  }

  const initials = (values.name || values.email)
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <form onSubmit={onSubmit} noValidate>
      <SettingsCard
        title="Personal details"
        description="These details are visible to members of workspaces you belong to."
        bodyClassName="space-y-5"
        hint={status.kind === "saved" ? <span role="status" className="pop-in inline-block text-success">{status.message}</span> : "Changes apply to every workspace you belong to."}
        footer={
          <Button type="submit" size="sm" loading={status.kind === "saving"}>
            Save changes
          </Button>
        }
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="group relative size-20 shrink-0 overflow-hidden rounded-full border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Upload a profile photo"
          >
            {values.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={values.avatarUrl} src={values.avatarUrl} alt="" className="pop-in size-full object-cover" />
            ) : (
              <span aria-hidden="true" className="flex size-full items-center justify-center bg-gradient-to-br from-foreground to-foreground/70 text-xl font-semibold text-background">
                {initials}
              </span>
            )}
            <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100">
              {photo.busy === "upload" ? <span className="spin size-5 rounded-full border-2 border-white/40 border-t-white" /> : <Camera className="size-5" />}
            </span>
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{values.email}</p>
            <p className="text-xs text-muted-foreground">You sign in with this address. PNG, JPG, GIF or WebP photo, up to 2 MB.</p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" loading={photo.busy === "upload"} onClick={() => fileRef.current?.click()}>
                <Camera className="size-3.5" aria-hidden="true" /> {values.avatarUrl ? "Change photo" : "Upload photo"}
              </Button>
              {values.avatarUrl ? (
                <Button type="button" size="sm" variant="ghost" loading={photo.busy === "remove"} onClick={() => void removePhoto()}>
                  <Trash2 className="size-3.5" aria-hidden="true" /> Remove
                </Button>
              ) : null}
            </div>
            {photo.error ? (
              <p role="alert" className="pop-in mt-2 text-xs text-danger">
                {photo.error}
              </p>
            ) : null}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void uploadPhoto(f);
            }}
          />
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
        {status.kind === "error" ? <Alert variant="danger">{status.message}</Alert> : null}
      </SettingsCard>
    </form>
  );
}
