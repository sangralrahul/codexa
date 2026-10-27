import Link from "next/link";
import { BadgeCheck, KeyRound, Laptop, MailWarning } from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/brand/brand-mark";

type Check = { id: string; ok: boolean | null; title: string; detail: string; href?: string; icon: React.ReactNode };

/**
 * Security status: real checks only (password, verified email, other sessions, GitHub link).
 * No score and no claims about features that do not exist (there is no 2FA yet).
 */
export function SecurityStatus({ passwordSet, emailVerified, email, otherSessions, github }: { passwordSet: boolean; emailVerified: boolean; email: string; otherSessions: number; github: { linked: boolean; username: string | null } | null }) {
  const checks: Check[] = [
    {
      id: "password",
      ok: passwordSet,
      title: passwordSet ? "Password set" : github?.linked ? "GitHub sign-in only" : "No password",
      detail: passwordSet ? "Email and password sign-in is on." : "Set a password to also sign in with email.",
      href: passwordSet ? undefined : "#password",
      icon: <KeyRound />,
    },
    {
      id: "email",
      ok: emailVerified,
      title: emailVerified ? "Email verified" : "Email not verified",
      detail: emailVerified ? email : "Check your inbox for the verification link.",
      icon: emailVerified ? <BadgeCheck /> : <MailWarning />,
    },
    {
      id: "sessions",
      ok: otherSessions === 0 ? true : null,
      title: otherSessions === 0 ? "Only this device" : `${otherSessions} other session${otherSessions === 1 ? "" : "s"}`,
      detail: otherSessions === 0 ? "No other device is signed in." : "Review them below and sign out any you don't recognise.",
      href: otherSessions ? "#sessions" : undefined,
      icon: <Laptop />,
    },
  ];
  if (github) {
    checks.push({
      id: "github",
      ok: github.linked ? true : null,
      title: github.linked ? `GitHub @${github.username}` : "GitHub not linked",
      detail: github.linked ? "Used for sign-in and repository access." : "Optional: import repositories and push commits.",
      href: github.linked ? undefined : "/connect-github",
      icon: <BrandMark id="github" className="size-4" />,
    });
  }
  return (
    <section aria-label="Security status" className={cn("settings-card grid grid-cols-1 overflow-hidden rounded-[16px] sm:grid-cols-2", checks.length === 4 ? "xl:grid-cols-4" : "xl:grid-cols-3")}>
      {checks.map((c, i) => {
        const body = (
          <>
            <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-[9px] [&_svg]:size-4", c.ok === true ? "bg-success/12 text-success" : c.ok === false ? "bg-warning/12 text-warning" : "bg-muted text-muted-foreground")}>{c.icon}</span>
            <span className="min-w-0">
              <span className="flex items-center gap-1.5 text-[13.5px] font-medium">
                <span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full", c.ok === true ? "bg-success" : c.ok === false ? "bg-warning" : "bg-foreground-dim")} />
                <span className="truncate">{c.title}</span>
                <span className="sr-only">{c.ok === true ? " (good)" : c.ok === false ? " (needs attention)" : ""}</span>
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">{c.detail}</span>
            </span>
          </>
        );
        const cls = cn("flex items-start gap-3 p-4 sm:p-5", i > 0 && "border-t border-border/70 sm:border-t-0", i % 2 === 1 && "sm:border-l sm:border-border/70", i >= 2 && "sm:border-t xl:border-t-0", i > 0 && "xl:border-l xl:border-border/70");
        return c.href ? (
          <Link key={c.id} href={c.href} className={cn(cls, "outline-none transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring")}>
            {body}
          </Link>
        ) : (
          <div key={c.id} className={cls}>
            {body}
          </div>
        );
      })}
    </section>
  );
}
