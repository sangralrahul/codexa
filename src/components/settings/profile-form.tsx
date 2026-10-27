"use client";

import { useRef, useState } from "react";
import { Camera, ImageUp, Trash2, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { api, ClientApiError } from "@/lib/client/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/misc";
import { Avatar } from "@/components/ui/avatar";
import { toast } from "@/components/ui/toast";
import { SettingsCard } from "./section";
import { UnsavedDock, useDirtyForm } from "./dirty-form";
import { TimezoneCombobox } from "./timezone-combobox";
import { RadioCards } from "./radio-cards";
import { LocalTime } from "./local-time";

export type ProfileValues = { name: string; email: string; timezone: string; locale: string; avatarUrl: string };

const MAX_BYTES = 2 * 1024 * 1024;
const TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];

/** Upload with progress (XHR exposes upload progress; fetch does not). Resolves to the new avatar URL. */
function uploadAvatar(file: File, onProgress: (ratio: number) => void): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/v1/account/avatar");
    xhr.withCredentials = true;
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      let data: { user?: { avatarUrl: string | null }; error?: { message?: string } } = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        /* non-JSON error page */
      }
      if (xhr.status >= 200 && xhr.status < 300 && data.user) resolve(data.user.avatarUrl ?? null);
      else reject(new Error(data.error?.message ?? "Upload failed. Try another image."));
    };
    xhr.onerror = () => reject(new Error("Upload failed. Check your connection and try again."));
    const body = new FormData();
    body.append("file", file);
    xhr.send(body);
  });
}

/** Avatar with an SVG progress ring while uploading. */
function ProgressAvatar({ name, src, progress }: { name: string; src: string; progress: number | null }) {
  const r = 41;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative flex size-[88px] items-center justify-center">
      <span key={src || "monogram"} className="avatar-fade">
        <Avatar name={name} src={src || null} size="xl" className="[&>span]:size-[76px] [&>span]:text-[24px]" />
      </span>
      <svg viewBox="0 0 88 88" className="pointer-events-none absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx="44" cy="44" r={r} fill="none" stroke="var(--border)" strokeWidth="2" />
        {progress !== null ? <circle className="upload-ring" cx="44" cy="44" r={r} fill="none" stroke="var(--signal)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - progress)} /> : null}
      </svg>
    </span>
  );
}

/** "How teammates see you": real values only, updated as you type. Decorative frames, real text. */
function TeammateMirror({ name, email, avatarUrl, timezone, role, workspaceName }: { name: string; email: string; avatarUrl: string; timezone: string; role?: string | null; workspaceName?: string | null }) {
  const display = name.trim() || email;
  const first = display.split(/\s+/)[0];
  return (
    <aside aria-labelledby="mirror-title" className="settings-card settings-mirror rounded-[16px] p-5 [--card-i:2]">
      <div className="flex items-start justify-between gap-2">
        <h2 id="mirror-title" className="text-[15px] font-semibold tracking-[-0.01em]">
          How teammates see you
        </h2>
        <span className="shrink-0 whitespace-nowrap rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">Live preview</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Your name and photo as they appear in member lists, comments and presence.</p>

      <div className="mt-4 space-y-3" aria-hidden="true">
        {/* Member row */}
        <div className="rounded-[12px] border border-border bg-background/60 p-3">
          <p className="mb-2 font-mono text-[10.5px] text-foreground-dim">Members{workspaceName ? ` · ${workspaceName}` : ""}</p>
          <div className="flex items-center gap-2.5">
            <span key={avatarUrl || "m"} className="avatar-fade">
              <Avatar name={display} src={avatarUrl || null} size="md" presence="online" />
            </span>
            <span className="min-w-0 flex-1">
              <span key={display} className="mirror-swap block truncate text-[13px] font-medium">
                {display}
              </span>
              <span className="block truncate text-[11.5px] text-muted-foreground">{email}</span>
            </span>
            {role ? <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-medium capitalize text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)]">{role}</span> : null}
          </div>
        </div>
        {/* Comment header */}
        <div className="rounded-[12px] border border-border bg-background/60 p-3">
          <div className="flex items-center gap-2">
            <Avatar name={display} src={avatarUrl || null} size="sm" />
            <span className="min-w-0 truncate text-[12.5px] font-medium">{display}</span>
            <span className="shrink-0 text-[11.5px] text-muted-foreground">
              · <LocalTime tz={timezone} />
            </span>
          </div>
          <div className="mt-2.5 space-y-1.5 pl-8">
            <span className="block h-1.5 w-11/12 rounded-full bg-border" />
            <span className="block h-1.5 w-2/3 rounded-full bg-border" />
          </div>
        </div>
        {/* Presence cursor */}
        <div className="relative h-[84px] overflow-hidden rounded-[12px] border border-border bg-[radial-gradient(color-mix(in_oklab,var(--foreground)_10%,transparent)_1px,transparent_1.4px)] bg-[length:16px_16px]">
          <div className="presence-cursor absolute left-[38%] top-[22%]">
            <svg viewBox="0 0 16 16" className="size-4 text-signal drop-shadow-sm" fill="currentColor">
              <path d="M2 1.5 14 7.2l-5.3 1.5L6.4 14z" stroke="var(--background)" strokeWidth="1" strokeLinejoin="round" />
            </svg>
            <span key={first} className="mirror-swap ml-3 mt-0.5 inline-flex items-center gap-1.5 rounded-full bg-signal py-0.5 pl-0.5 pr-2 text-[11px] font-medium text-white shadow-md">
              <Avatar name={display} src={avatarUrl || null} size="xs" />
              {first}
            </span>
          </div>
        </div>
      </div>
      <p className="sr-only">
        Teammates see you as {display}
        {role ? `, ${role}` : ""}.
      </p>
    </aside>
  );
}

export function ProfileForm({
  initial,
  timezones,
  locales,
  role,
  workspaceName,
  after,
}: {
  initial: ProfileValues;
  timezones: string[];
  locales: { value: string; label: string }[];
  role?: string | null;
  workspaceName?: string | null;
  /** Rendered under the form in the main column (e.g. the Appearance card). */
  after?: React.ReactNode;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const form = useDirtyForm({ name: initial.name, timezone: initial.timezone, locale: initial.locale });
  const { values, set, dirty, flashing } = form;
  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<{ kind: "idle" | "saving" | "saved" | "error"; message?: string }>({ kind: "idle" });

  async function onSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!dirty || status.kind === "saving") return;
    setStatus({ kind: "saving" });
    setErrors({});
    const submitted = values;
    try {
      await api("/api/v1/account/profile", { method: "PATCH", json: { name: submitted.name, timezone: submitted.timezone, locale: submitted.locale } });
      form.commit(submitted);
      setStatus({ kind: "saved", message: "Profile saved." });
      router.refresh();
      window.setTimeout(() => setStatus((s) => (s.kind === "saved" ? { kind: "idle" } : s)), 2400);
    } catch (err) {
      if (err instanceof ClientApiError) {
        setErrors(err.fieldErrors());
        setStatus({ kind: "error", message: err.message });
      } else setStatus({ kind: "error", message: "Could not save your profile." });
    }
  }

  // ---- Photo: click or drop, with a progress ring and a crossfade ----
  const fileRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<{ busy: "upload" | "remove" | null; progress: number | null; error?: string }>({ busy: null, progress: null });
  const [drag, setDrag] = useState(false);

  async function uploadPhoto(file: File) {
    if (!TYPES.includes(file.type)) return setPhoto({ busy: null, progress: null, error: "Use a PNG, JPG, GIF or WebP image." });
    if (file.size > MAX_BYTES) return setPhoto({ busy: null, progress: null, error: "The image is larger than 2 MB." });
    setPhoto({ busy: "upload", progress: 0 });
    try {
      const url = await uploadAvatar(file, (p) => setPhoto((s) => ({ ...s, progress: Math.min(0.96, p) })));
      setPhoto({ busy: null, progress: 1 });
      setAvatarUrl(url ?? "");
      toast.success("Photo updated");
      router.refresh();
      window.setTimeout(() => setPhoto((s) => (s.busy ? s : { ...s, progress: null })), 700);
    } catch (err) {
      setPhoto({ busy: null, progress: null, error: err instanceof Error ? err.message : "Upload failed." });
    }
  }

  async function removePhoto() {
    setPhoto({ busy: "remove", progress: null });
    try {
      await api("/api/v1/account/avatar", { method: "DELETE" });
      setAvatarUrl("");
      setPhoto({ busy: null, progress: null });
      toast.success("Photo removed");
      router.refresh();
    } catch {
      setPhoto({ busy: null, progress: null, error: "Could not remove the photo." });
    }
  }

  const tzCity = values.timezone.split("/").pop()?.replace(/_/g, " ") ?? values.timezone;
  const hindi = locales.find((l) => l.value === "hi");

  return (
    <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="settings-sub min-w-0 space-y-5">
      <form ref={formRef} onSubmit={onSubmit} noValidate className="min-w-0">
        <SettingsCard
          id="profile-details"
          icon={<UserRound />}
          title="Personal details"
          description="Visible to members of every workspace you belong to."
          bodyClassName="space-y-6"
          dirty={dirty}
          hint={
            status.kind === "saved" ? (
              <span role="status" className="pop-in inline-block text-success">
                {status.message}
              </span>
            ) : dirty ? (
              <span className="text-foreground">
                {form.changed.length} unsaved change{form.changed.length === 1 ? "" : "s"}
              </span>
            ) : (
              "Changes apply to every workspace you belong to."
            )
          }
          footer={
            <Button type="submit" size="sm" disabled={!dirty && status.kind !== "saved"} state={status.kind === "saving" ? "loading" : status.kind === "saved" ? "success" : "idle"} successLabel="Saved">
              Save changes
            </Button>
          }
        >
          <div
            className={cn("avatar-drop flex flex-col gap-4 rounded-[14px] p-1 sm:flex-row sm:items-center", drag && "bg-signal/[0.04]")}
            data-drag={drag ? "" : undefined}
            onDragEnter={(e) => {
              if (e.dataTransfer.types.includes("Files")) {
                e.preventDefault();
                setDrag(true);
              }
            }}
            onDragOver={(e) => {
              if (e.dataTransfer.types.includes("Files")) e.preventDefault();
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDrag(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              const f = e.dataTransfer.files?.[0];
              if (f) void uploadPhoto(f);
            }}
          >
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="group relative size-[88px] shrink-0 rounded-full outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              aria-label="Upload a profile photo"
              aria-busy={photo.busy === "upload" || undefined}
            >
              <ProgressAvatar name={values.name || initial.email} src={avatarUrl} progress={photo.progress} />
              <span aria-hidden="true" className="avatar-drop__veil absolute inset-[6px] flex items-center justify-center rounded-full bg-black/45 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
                {photo.busy === "upload" ? <span className="font-mono text-xs tabular-nums">{Math.round((photo.progress ?? 0) * 100)}%</span> : <Camera className="size-5" />}
              </span>
            </button>
            <div className="min-w-0">
              <p className="text-sm font-medium">{drag ? "Drop to upload" : "Profile photo"}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Drag an image here or choose one. PNG, JPG, GIF or WebP, up to 2 MB.</p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" loading={photo.busy === "upload"} onClick={() => fileRef.current?.click()}>
                  <ImageUp className="size-3.5" aria-hidden="true" /> {avatarUrl ? "Change photo" : "Upload photo"}
                </Button>
                {avatarUrl ? (
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
              accept={TYPES.join(",")}
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

          <div className={cn(flashing("name") && "field-flash")}>
            <Field label="Name" htmlFor="name" error={errors.name} hint={`You sign in as ${initial.email}.`}>
              <Input id="name" name="name" value={values.name} onChange={(e) => set("name", e.target.value)} required maxLength={80} autoComplete="name" aria-invalid={Boolean(errors.name)} />
            </Field>
          </div>

          <div className={cn(flashing("timezone") && "field-flash")}>
            <Field
              label="Time zone"
              htmlFor="timezone"
              error={errors.timezone}
              hint={
                <>
                  <LocalTime tz={values.timezone} className="font-medium tabular-nums text-foreground" /> in {tzCity} now. Used for dates in activity history and emails.
                </>
              }
            >
              <TimezoneCombobox id="timezone" value={values.timezone} onValueChange={(tz) => set("timezone", tz)} zones={timezones} aria-invalid={Boolean(errors.timezone)} />
            </Field>
          </div>

          <div className={cn("space-y-1.5", flashing("locale") && "field-flash")}>
            <p id="locale-label" className="text-[13px] font-medium leading-none">
              Language
            </p>
            <RadioCards
              id="locale"
              labelledBy="locale-label"
              describedBy="locale-hint"
              value={values.locale}
              onValueChange={(v) => set("locale", v)}
              options={[
                { value: "en", title: "English", description: "The whole interface, emails and docs." },
                {
                  value: "hi",
                  title: "हिन्दी · Hindi",
                  description: "The translation is being prepared.",
                  badge: <span className="rounded-full bg-muted px-1.5 py-px text-[10.5px] font-medium text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)]">In preparation</span>,
                  disabled: values.locale !== "hi" && Boolean(hindi),
                },
              ]}
            />
            {errors.locale ? (
              <p role="alert" className="text-xs text-danger">
                {errors.locale}
              </p>
            ) : (
              <p id="locale-hint" className="text-xs text-muted-foreground">
                The interface is in English today; Hindi is being prepared.
              </p>
            )}
          </div>

          {status.kind === "error" ? <Alert variant="danger">{status.message}</Alert> : null}
        </SettingsCard>
      </form>
      {after}
      </div>
      <TeammateMirror name={values.name} email={initial.email} avatarUrl={avatarUrl} timezone={values.timezone} role={role} workspaceName={workspaceName} />
      <UnsavedDock
        dirty={dirty}
        saving={status.kind === "saving"}
        saved={status.kind === "saved"}
        error={status.kind === "error" ? status.message : null}
        onSave={() => formRef.current?.requestSubmit()}
        onReset={() => {
          form.reset();
          setErrors({});
          setStatus({ kind: "idle" });
        }}
      />
    </div>
  );
}
