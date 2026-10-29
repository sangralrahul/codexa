"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

/**
 * The client mirror of validatePassword() in src/lib/auth/flows.ts (keep them identical):
 * at least 8 characters, at most 256, at least one letter and one number. "password123" passes.
 */
export const PASSWORD_MIN = 8;
const PASSWORD_MAX = 256;
const RULES = [
  { id: "length", label: `${PASSWORD_MIN}+ characters`, test: (pw: string) => pw.length >= PASSWORD_MIN },
  { id: "letter", label: "A letter", test: (pw: string) => /[a-zA-Z]/.test(pw) },
  { id: "number", label: "A number", test: (pw: string) => /[0-9]/.test(pw) },
] as const;

/** Same messages as the server, so a client-side check reads exactly like a server one. */
export function passwordProblem(pw: string): string | null {
  if (pw.length < PASSWORD_MIN) return `Password must be at least ${PASSWORD_MIN} characters`;
  if (pw.length > PASSWORD_MAX) return "Password is too long";
  if (!/[a-zA-Z]/.test(pw) || !/[0-9]/.test(pw)) return "Use at least one letter and one number";
  return null;
}

/** Password field with a show/hide toggle. The toggle's names stay "Show" / "Hide" (e2e contract). */
export const PasswordInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { id: string }>(function PasswordInput(
  { className, ...props },
  ref,
) {
  const [shown, setShown] = React.useState(false);
  return (
    <div className="relative">
      <Input ref={ref} {...props} type={shown ? "text" : "password"} maxLength={PASSWORD_MAX} className={cn("h-11 pr-12 text-[15px]", className)} />
      <button
        type="button"
        onClick={() => setShown((v) => !v)}
        aria-label={shown ? "Hide" : "Show"}
        aria-controls={props.id}
        aria-pressed={shown}
        title={shown ? "Hide password" : "Show password"}
        data-no-ripple
        className="absolute inset-y-0 right-1.5 my-auto inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-[color,background-color] duration-200 hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
      >
        {shown ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
      </button>
    </div>
  );
});

/**
 * Live checklist under a new-password field: three short rules in one row, each ticking when
 * met. Point the input's aria-describedby at `id`. Changes in the count are announced politely
 * (not every keystroke).
 */
export function PasswordRules({ id, value, className }: { id: string; value: string; className?: string }) {
  const met = RULES.map((r) => r.test(value));
  const count = met.filter(Boolean).length;
  const all = count === RULES.length;
  return (
    <div className={cn("mt-2.5", className)}>
      <ul id={id} className="flex flex-wrap gap-x-4 gap-y-1 text-xs leading-5">
        {RULES.map((r, i) => (
          <li key={r.id} data-met={met[i] ? "" : undefined} className={cn("pw-rule flex items-center gap-1.5 transition-colors duration-200", met[i] ? "text-foreground" : "text-muted-foreground")}>
            {met[i] ? (
              <svg viewBox="0 0 16 16" aria-hidden="true" className="pw-rule__icon check-draw size-3.5 shrink-0 text-success">
                <circle cx="8" cy="8" r="7" fill="currentColor" fillOpacity="0.16" />
                <path d="M5 8.25 7.1 10.3 11 6" pathLength={1} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 16 16" aria-hidden="true" className="pw-rule__icon size-3.5 shrink-0 text-border-strong">
                <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            )}
            <span>{r.label}</span>
            <span className="sr-only">{met[i] ? "(done)" : "(not yet)"}</span>
          </li>
        ))}
      </ul>
      <p className="sr-only" aria-live="polite">
        {value ? (all ? "Password meets every requirement." : `${count} of ${RULES.length} requirements met.`) : ""}
      </p>
    </div>
  );
}

/** Inline "Passwords match" line under a confirm field (announced politely). */
export function PasswordMatch({ id, password, confirm }: { id: string; password: string; confirm: string }) {
  const match = confirm.length > 0 && password === confirm;
  return (
    <p id={id} aria-live="polite" className={cn("mt-2 flex min-h-5 items-center gap-1.5 text-xs transition-colors", match ? "text-success" : "text-muted-foreground")}>
      {confirm.length === 0 ? null : match ? (
        <>
          <svg viewBox="0 0 16 16" aria-hidden="true" className="check-draw size-3.5 shrink-0">
            <path d="M3.5 8.5 6.6 11.5 12.5 5" pathLength={1} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Passwords match
        </>
      ) : (
        "Doesn't match yet"
      )}
    </p>
  );
}
