"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type FormEvent } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const examples = [
  "An invoice tracker for freelancers with GST totals and Razorpay payment links",
  "A landing page for a Bengaluru coffee subscription with a waitlist form",
  "A REST API for a library with members, books, and due-date reminders",
  "A kanban board for a small agency with drag and drop and dark mode",
];

const MAX = 2000;
const STATIC_PLACEHOLDER = "Describe what you want to build. For example: a CRM for a two-person sales team with a pipeline view and email reminders.";

/** Types the example ideas into the placeholder, one after another (static when motion is reduced). */
function useTypedPlaceholder(active: boolean) {
  const [text, setText] = useState(STATIC_PLACEHOLDER);
  useEffect(() => {
    if (!active || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let item = 0;
    let pos = 0;
    let deleting = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const full = `Build ${examples[item].charAt(0).toLowerCase()}${examples[item].slice(1)}`;
      pos += deleting ? -2 : 1;
      setText(full.slice(0, Math.max(0, pos)) || " ");
      if (!deleting && pos >= full.length) {
        deleting = true;
        timer = setTimeout(tick, 2200);
        return;
      }
      if (deleting && pos <= 0) {
        deleting = false;
        item = (item + 1) % examples.length;
      }
      timer = setTimeout(tick, deleting ? 18 : 38);
    };
    timer = setTimeout(tick, 600);
    return () => clearTimeout(timer);
  }, [active]);
  return active ? text : STATIC_PLACEHOLDER;
}

export function PromptBox({ signedIn }: { signedIn: boolean }) {
  const router = useRouter();
  const id = useId();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [focused, setFocused] = useState(false);
  const placeholder = useTypedPlaceholder(!focused && value === "");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const prompt = value.trim();
    if (prompt.length < 10) {
      setError("Describe your idea in at least a sentence so we can create a useful starting point.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const q = `?prompt=${encodeURIComponent(prompt.slice(0, MAX))}`;
    router.push(signedIn ? `/dashboard${q}` : `/signup${q}`);
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto w-full max-w-2xl text-left" aria-labelledby={`${id}-label`}>
      <div className="glow-border shadow-2xl">
        <div className="glow-border__inner p-2.5">
          <label id={`${id}-label`} htmlFor={`${id}-prompt`} className="sr-only">
            Describe the application you want to build
          </label>
          <textarea
            id={`${id}-prompt`}
            name="prompt"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={3}
            maxLength={MAX}
            placeholder={placeholder}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            aria-describedby={error ? `${id}-error` : `${id}-hint`}
            aria-invalid={Boolean(error)}
            className="w-full resize-none bg-transparent px-3 py-2 text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <div className="flex flex-col gap-2 px-2 pb-1 sm:flex-row sm:items-center sm:justify-between">
            <p id={`${id}-hint`} className="text-xs text-muted-foreground">
              {signedIn ? "Continues in your dashboard." : "Creates a free account first; your idea is carried over."}
            </p>
            <Button type="submit" loading={submitting} className="btn-glow rounded-lg">
              <Sparkles className="size-4" aria-hidden="true" />
              Build it
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
      <ul className="mt-5 flex flex-wrap justify-center gap-2" aria-label="Example ideas">
        {examples.map((ex) => (
          <li key={ex}>
            <button
              type="button"
              onClick={() => {
                setValue(ex);
                setError(null);
              }}
              className="glass rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition hover:-translate-y-0.5 hover:border-border-strong hover:text-foreground"
            >
              {ex}
            </button>
          </li>
        ))}
      </ul>
    </form>
  );
}
