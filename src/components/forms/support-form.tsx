"use client";

import Link from "next/link";
import { useId, useState, type FormEvent } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Alert } from "@/components/ui/misc";
import { api, ClientApiError } from "@/lib/client/api";
import { HONEYPOT_FIELD, fieldErrors, newsletterSchema, ticketSchema, type FormKind } from "./schemas";

export type SupportFormField =
  | { name: "name"; label?: string; required?: boolean }
  | { name: "email"; label?: string }
  | { name: "company"; label?: string; required?: boolean }
  | { name: "subject"; label?: string; placeholder?: string }
  | { name: "message"; label?: string; placeholder?: string; rows?: number }
  | { name: "pageUrl"; label?: string }
  | { name: "severity"; label?: string }
  | { name: "topic"; label?: string; options: { value: string; label: string }[] };

export type SupportFormProps = {
  kind: FormKind;
  fields?: SupportFormField[];
  /** Fixed topic recorded in ticket metadata (e.g. "careers", "affiliate"). */
  topic?: string;
  submitLabel?: string;
  successTitle?: string;
  successMessage?: string;
  /** Default subject when the subject field is omitted. */
  defaultSubject?: string;
  className?: string;
  /** Prefill from a signed-in user. Never includes secrets. */
  defaults?: { name?: string; email?: string };
};

const DEFAULT_FIELDS: SupportFormField[] = [{ name: "name" }, { name: "email" }, { name: "subject" }, { name: "message" }];

export function SupportForm({
  kind,
  fields = DEFAULT_FIELDS,
  topic,
  submitLabel = "Send message",
  successTitle = "Thanks, we received it.",
  successMessage = "We read every submission. If it needs a reply, we will answer by email.",
  defaultSubject,
  className,
  defaults,
}: SupportFormProps) {
  const id = useId();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  const has = (n: SupportFormField["name"]) => fields.some((f) => f.name === n);
  const fid = (n: string) => `${id}-${n}`;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setErrors({});
    const fd = new FormData(e.currentTarget);
    const raw: Record<string, string> = {};
    for (const [k, v] of fd.entries()) if (typeof v === "string") raw[k] = v;
    if (!has("subject") && defaultSubject) raw.subject = defaultSubject;
    if (topic) raw.topic = topic;
    if (typeof window !== "undefined" && !raw.pageUrl) raw.pageUrl = window.location.pathname;

    const schema = kind === "newsletter" ? newsletterSchema : ticketSchema;
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      setError("Please fix the highlighted fields.");
      return;
    }
    setLoading(true);
    try {
      await api(`/api/v1/forms/${kind}`, { method: "POST", json: parsed.data });
      setDone(true);
    } catch (err) {
      if (err instanceof ClientApiError) {
        setErrors(err.fieldErrors());
        setError(err.status === 429 ? "Too many submissions from your network. Please try again in a few minutes." : err.message);
      } else setError("Something went wrong. Please try again or email us directly.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div role="status" className={className}>
        <div className="flex gap-3 rounded-xl border border-success/30 bg-success/5 p-5">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" />
          <div>
            <p className="font-medium">{successTitle}</p>
            <p className="mt-1 text-sm text-muted-foreground">{successMessage}</p>
            <p className="mt-3 text-sm">
              <Link href="/" className="font-medium text-primary underline underline-offset-4">
                Back to the homepage
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className={className ?? "space-y-4"} noValidate aria-busy={loading}>
      {error ? <Alert variant="danger">{error}</Alert> : null}
      {/* Honeypot: hidden from humans and assistive tech; bots tend to fill every field. */}
      <div aria-hidden="true" className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden">
        <label htmlFor={fid(HONEYPOT_FIELD)}>Leave this field empty</label>
        <input id={fid(HONEYPOT_FIELD)} name={HONEYPOT_FIELD} type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>
      {fields.map((f) => {
        switch (f.name) {
          case "name":
            return (
              <Field key={f.name} label={f.label ?? "Name"} htmlFor={fid("name")} error={errors.name}>
                <Input id={fid("name")} name="name" autoComplete="name" maxLength={100} defaultValue={defaults?.name} required={f.required} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? `${fid("name")}-error` : undefined} />
              </Field>
            );
          case "email":
            return (
              <Field key={f.name} label={f.label ?? "Email"} htmlFor={fid("email")} error={errors.email}>
                <Input id={fid("email")} name="email" type="email" autoComplete="email" required maxLength={254} defaultValue={defaults?.email} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? `${fid("email")}-error` : undefined} />
              </Field>
            );
          case "company":
            return (
              <Field key={f.name} label={f.label ?? "Company or organization"} htmlFor={fid("company")} error={errors.company}>
                <Input id={fid("company")} name="company" autoComplete="organization" maxLength={200} required={f.required} aria-invalid={Boolean(errors.company)} />
              </Field>
            );
          case "subject":
            return (
              <Field key={f.name} label={f.label ?? "Subject"} htmlFor={fid("subject")} error={errors.subject}>
                <Input id={fid("subject")} name="subject" required maxLength={200} placeholder={f.placeholder} aria-invalid={Boolean(errors.subject)} aria-describedby={errors.subject ? `${fid("subject")}-error` : undefined} />
              </Field>
            );
          case "pageUrl":
            return (
              <Field key={f.name} label={f.label ?? "Page or project URL"} htmlFor={fid("pageUrl")} hint="Optional. Helps us reproduce the problem." error={errors.pageUrl}>
                <Input id={fid("pageUrl")} name="pageUrl" type="text" inputMode="url" maxLength={500} aria-invalid={Boolean(errors.pageUrl)} />
              </Field>
            );
          case "severity":
            return (
              <Field key={f.name} label={f.label ?? "Severity"} htmlFor={fid("severity")} error={errors.severity}>
                <Select id={fid("severity")} name="severity" defaultValue="medium">
                  <option value="low">Low: cosmetic or minor</option>
                  <option value="medium">Medium: a workaround exists</option>
                  <option value="high">High: blocks a task</option>
                  <option value="critical">Critical: data loss or security</option>
                </Select>
              </Field>
            );
          case "topic":
            return (
              <Field key={f.name} label={f.label ?? "Topic"} htmlFor={fid("topic")} error={errors.topic}>
                <Select id={fid("topic")} name="topic" defaultValue={f.options[0]?.value}>
                  {f.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </Field>
            );
          case "message":
            return (
              <Field key={f.name} label={f.label ?? "Message"} htmlFor={fid("message")} hint="Up to 5,000 characters. Please do not include passwords or API keys." error={errors.message}>
                <Textarea id={fid("message")} name="message" required minLength={10} maxLength={5000} rows={f.rows ?? 6} placeholder={f.placeholder} aria-invalid={Boolean(errors.message)} aria-describedby={errors.message ? `${fid("message")}-error` : `${fid("message")}-hint`} />
              </Field>
            );
        }
      })}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button type="submit" loading={loading}>
          {submitLabel}
        </Button>
        <p className="text-xs text-muted-foreground">
          By submitting you agree to our{" "}
          <Link href="/privacy" className="underline hover:text-foreground">
            privacy policy
          </Link>
          .
        </p>
      </div>
    </form>
  );
}
