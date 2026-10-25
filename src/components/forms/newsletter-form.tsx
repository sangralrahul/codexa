"use client";

import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, ClientApiError } from "@/lib/client/api";
import { HONEYPOT_FIELD, fieldErrors, newsletterSchema } from "./schemas";
import { cn } from "@/lib/utils";

export function NewsletterForm({ className }: { className?: string }) {
  const id = useId();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const raw = Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === "string")) as Record<string, string>;
    const parsed = newsletterSchema.safeParse(raw);
    if (!parsed.success) {
      setMessage({ tone: "error", text: fieldErrors(parsed.error).email ?? "Enter a valid email address." });
      return;
    }
    setLoading(true);
    try {
      const res = await api<{ ok: true; alreadySubscribed?: boolean }>("/api/v1/forms/newsletter", { method: "POST", json: parsed.data });
      setMessage({ tone: "ok", text: res.alreadySubscribed ? "You are already subscribed." : "Subscribed. We send product updates only, and you can unsubscribe at any time." });
      form.reset();
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof ClientApiError && err.status === 429 ? "Too many attempts. Try again in a few minutes." : "Could not subscribe right now. Please try again later." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className={cn("w-full max-w-md", className)} noValidate>
      <label htmlFor={`${id}-email`} className="text-sm font-medium">
        Product updates by email
      </label>
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor={`${id}-hp`}>Leave empty</label>
        <input id={`${id}-hp`} name={HONEYPOT_FIELD} type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <Input id={`${id}-email`} name="email" type="email" autoComplete="email" required placeholder="you@example.com" aria-describedby={`${id}-msg`} aria-invalid={message?.tone === "error"} />
        <Button type="submit" variant="outline" loading={loading} className="shrink-0">
          Subscribe
        </Button>
      </div>
      <p id={`${id}-msg`} role="status" className={cn("mt-2 min-h-[1.25rem] text-xs", message?.tone === "error" ? "text-danger" : "text-muted-foreground")}>
        {message?.text ?? "No marketing spam. Roughly one email a month when there is something to say."}
      </p>
    </form>
  );
}
