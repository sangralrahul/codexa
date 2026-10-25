"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/misc";
import { ClientApiError, api } from "@/lib/client/api";
import { cn } from "@/lib/utils";

type State = { status: "idle" | "submitting" | "success" | "error"; message?: string };

/**
 * Newsletter signup. Posts to /api/v1/forms/newsletter, which the website
 * module owns. A 404 (endpoint not deployed yet) is reported honestly.
 */
export function NewsletterForm({ className, compact = false, source = "newsletter" }: { className?: string; compact?: boolean; source?: string }) {
  const id = useId();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>({ status: "idle" });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setState({ status: "submitting" });
    try {
      await api("/api/v1/forms/newsletter", { method: "POST", json: { email, source } });
      setState({ status: "success", message: "Thanks. You are on the list; we will only email you about product updates." });
      setEmail("");
    } catch (err) {
      if (err instanceof ClientApiError) {
        if (err.status === 404) {
          setState({ status: "error", message: "Newsletter signups are not live yet on this deployment. Email support@codexa.app if you would like to be added manually." });
        } else if (err.status === 429) {
          setState({ status: "error", message: "Too many attempts. Please try again in a few minutes." });
        } else {
          setState({ status: "error", message: err.fieldErrors().email ?? err.message });
        }
      } else {
        setState({ status: "error", message: "Could not reach the server. Check your connection and try again." });
      }
    }
  }

  return (
    <form onSubmit={onSubmit} className={cn("space-y-3", className)} aria-describedby={`${id}-status`}>
      <div className={cn("flex gap-2", compact ? "flex-row" : "flex-col sm:flex-row")}>
        <label htmlFor={`${id}-email`} className="sr-only">
          Email address
        </label>
        <Input
          id={`${id}-email`}
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={state.status === "submitting"}
          aria-invalid={state.status === "error" || undefined}
        />
        <Button type="submit" loading={state.status === "submitting"} className="shrink-0">
          Subscribe
        </Button>
      </div>
      <div id={`${id}-status`} aria-live="polite">
        {state.status === "success" ? <Alert variant="success">{state.message}</Alert> : null}
        {state.status === "error" ? <Alert variant="warning">{state.message}</Alert> : null}
      </div>
      <p className="text-xs text-muted-foreground">Product updates only. No third-party marketing. Unsubscribe with one click from any email.</p>
    </form>
  );
}
