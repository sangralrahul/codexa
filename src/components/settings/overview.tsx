import Link from "next/link";
import { ArrowUpRight, Check, CreditCard, Gauge, Mail, Plug, Plus, Settings2, ShieldCheck, UserRound, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { isUnlimited } from "@/config/plans";
import type { ChecklistItem, SettingsOverview } from "@/lib/services/settings-overview";
import { Avatar } from "@/components/ui/avatar";
import { StatusDot } from "@/components/ui/misc";
import { BrandMark } from "@/components/brand/brand-mark";
import { ResendVerificationButton } from "@/components/auth/forms";
import { LocalTime } from "./local-time";
import { utcOffset } from "./time";
import { UsageRing } from "./usage-gauge";
import { describeUsage, periodInfo, ratioOf } from "./usage-model";

const ROLE: Record<string, string> = { owner: "Owner", admin: "Admin", editor: "Editor", viewer: "Viewer" };
const date = (iso: string, opts: Intl.DateTimeFormatOptions) => new Date(iso).toLocaleDateString("en-US", { ...opts, timeZone: "UTC" });

/** 56px avatar, name and the account facts on their own lines, so nothing truncates. */
export function IdentityRow({ account, workspace }: { account: SettingsOverview["account"]; workspace: SettingsOverview["workspace"] }) {
  return (
    <section aria-label="Your account" className="settings-card flex flex-col gap-4 rounded-[18px] p-5 sm:flex-row sm:items-center sm:p-6">
      <span className="relative w-fit shrink-0 self-start rounded-full p-[3px] shadow-[0_0_0_1px_var(--border-strong)] sm:self-center">
        <Avatar name={account.name || account.email} src={account.avatarUrl} size="xl" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-balance text-[22px] font-semibold leading-tight tracking-[-0.02em] [overflow-wrap:anywhere]">{account.name || account.email}</p>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted-foreground">
          <span className="[overflow-wrap:anywhere]">{account.email}</span>
          {account.emailVerified ? (
            <span className="inline-flex items-center gap-1 text-success">
              <Check className="size-3.5" aria-hidden="true" /> Verified
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-warning">
              <StatusDot status="warn" /> Not verified
            </span>
          )}
        </p>
        <p className="mt-0.5 text-[13px] text-foreground-dim">
          Member since {date(account.memberSince, { month: "long", year: "numeric" })}
          {workspace ? (
            <>
              {" · "}
              {ROLE[workspace.role]} of <span className="text-muted-foreground">{workspace.name}</span>
            </>
          ) : null}
        </p>
      </div>
      <Link href="/settings/profile" className="inline-flex h-9 shrink-0 items-center gap-1.5 self-start rounded-[10px] border border-border-strong bg-background/60 px-3.5 text-[13px] font-medium shadow-[inset_0_1px_0_var(--hairline)] transition-colors hover:border-foreground/25 hover:bg-muted sm:self-center">
        <UserRound className="size-3.5" aria-hidden="true" /> Edit profile
      </Link>
    </section>
  );
}

function Tick({ done, i }: { done: boolean; i: number }) {
  return done ? (
    <span className="setup-tick flex size-6 shrink-0 items-center justify-center rounded-full bg-foreground text-background" style={{ "--i": i } as React.CSSProperties}>
      <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden="true">
        <path d="M3.5 8.5 6.6 11.5 12.5 5" pathLength={1} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  ) : (
    <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center rounded-full border border-dashed border-border-strong font-mono text-[10.5px] text-foreground-dim">
      {i + 1}
    </span>
  );
}

/** "Finish setting up": built only from real account state; done items draw their check. */
export function SetupChecklist({ items }: { items: ChecklistItem[] }) {
  const done = items.filter((i) => i.done).length;
  if (!items.length) return null;
  if (done === items.length) {
    return (
      <section aria-label="Setup" className="settings-card flex items-center gap-3 rounded-[16px] px-5 py-3.5">
        <span className="setup-item" data-done="">
          <Tick done i={0} />
        </span>
        <p className="text-[13px]">
          <span className="font-medium">Setup complete.</span> <span className="text-muted-foreground">Every item on the setup list is done.</span>
        </p>
      </section>
    );
  }
  return (
    <section aria-labelledby="setup-title" className="settings-card overflow-hidden rounded-[16px]">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 sm:px-6">
        <div>
          <h2 id="setup-title" className="text-[15px] font-semibold tracking-[-0.01em]">
            Finish setting up
          </h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            {done} of {items.length} done
          </p>
        </div>
        <div className="h-1.5 w-40 overflow-hidden rounded-full bg-muted shadow-[inset_0_0_0_1px_var(--border)]" role="progressbar" aria-label="Setup progress" aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={done} aria-valuetext={`${done} of ${items.length} done`}>
          <span className="setup-progress block h-full rounded-full bg-[image:var(--ember)]" style={{ width: `${(done / items.length) * 100}%` }} />
        </div>
      </div>
      <ul className="mt-4 grid border-t border-border/80 sm:grid-cols-2">
        {items.map((item, i) => {
          const body = (
            <>
              <Tick done={item.done} i={i} />
              <span className="min-w-0 flex-1">
                <span className={cn("block text-[13.5px] font-medium", item.done && "text-muted-foreground line-through decoration-border-strong")}>{item.label}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">{item.description}</span>
              </span>
            </>
          );
          const row = "setup-item flex items-start gap-3 px-5 py-3.5 sm:px-6";
          return (
            <li key={item.id} className="border-b border-border/60 last:border-b-0 sm:odd:border-r sm:[&:last-child:nth-child(odd)]:col-span-2 sm:[&:last-child:nth-child(odd)]:border-r-0 sm:[&:nth-last-child(2):nth-child(odd)]:border-b-0" style={{ "--i": i } as React.CSSProperties}>
              {!item.done && item.href ? (
                <Link href={item.href} className={cn(row, "group transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring")}>
                  {body}
                  <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-foreground-dim transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" aria-hidden="true" />
                </Link>
              ) : (
                <div className={row} data-done={item.done ? "" : undefined}>
                  <Tick done={item.done} i={i} />
                  <span className="min-w-0 flex-1">
                    <span className={cn("block text-[13.5px] font-medium", item.done && "text-muted-foreground line-through decoration-border-strong")}>{item.label}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">{item.description}</span>
                    {!item.done && item.id === "verify-email" ? <ResendVerificationButton className="mt-2.5 h-7 px-2.5 text-xs" /> : null}
                  </span>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Tile({ href, icon: Icon, label, className, children, footer }: { href: string; icon: typeof UserRound; label: string; className?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "glow-card bento-tile group flex min-h-[176px] flex-col rounded-[16px] border border-border p-5 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className,
      )}
    >
      <span className="relative z-[2] flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
        <Icon className="size-4 text-foreground-dim" aria-hidden="true" />
        {label}
        <ArrowUpRight className="bento-arrow ml-auto size-4 text-foreground-dim" aria-hidden="true" />
      </span>
      <span className="relative z-[2] mt-4 flex flex-1 flex-col">{children}</span>
      {footer ? <span className="relative z-[2] mt-4 block border-t border-border/70 pt-3 text-xs text-muted-foreground">{footer}</span> : null}
    </Link>
  );
}

function Fact({ status, children }: { status: "ok" | "warn" | "idle"; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2.5 text-[13px]">
      <StatusDot status={status} />
      <span className="min-w-0">{children}</span>
    </span>
  );
}

/** Control-centre bento: every tile is live data and a link to its page. */
export function OverviewBento({ data }: { data: SettingsOverview }) {
  const { account, workspace } = data;
  const tz = account.timezone;
  const offset = utcOffset(tz);
  const others = account.otherSessions;
  return (
    <div data-spotlight="grid" data-reveal="stagger" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
      <Tile href="/settings/profile" icon={UserRound} label="Profile" className="sm:col-span-2 lg:col-span-4" footer={<>Language: {account.locale === "hi" ? "Hindi (in preparation)" : "English"} · dates in {tz.replace(/_/g, " ")}</>}>
        <span className="flex flex-1 flex-wrap items-center justify-between gap-5">
          <span className="flex min-w-0 items-center gap-3.5">
            <Avatar name={account.name || account.email} src={account.avatarUrl} size="lg" />
            <span className="min-w-0">
              <span className="block text-base font-semibold tracking-[-0.01em] [overflow-wrap:anywhere]">{account.name || account.email}</span>
              <span className="block text-[13px] text-muted-foreground [overflow-wrap:anywhere]">{account.email}</span>
            </span>
          </span>
          <span className="text-right">
            <LocalTime tz={tz} className="block font-display text-[34px] font-semibold leading-none tracking-[-0.04em] tabular-nums" />
            <span className="mt-1.5 block font-mono text-[11px] text-foreground-dim">
              {tz.replace(/_/g, " ")}
              {offset ? ` · ${offset}` : ""}
            </span>
          </span>
        </span>
      </Tile>

      <Tile href="/settings/security" icon={ShieldCheck} label="Security" className={cn("lg:col-span-2", !workspace && "sm:col-span-2")} footer={others > 0 ? `${others} other device${others === 1 ? "" : "s"} signed in` : "Only this device is signed in"}>
        <span className="flex flex-col gap-2.5">
          <Fact status={account.passwordSet ? "ok" : "warn"}>{account.passwordSet ? "Password set" : account.github?.linked ? "GitHub sign-in only" : "No password yet"}</Fact>
          <Fact status={account.emailVerified ? "ok" : "warn"}>{account.emailVerified ? "Email verified" : "Email not verified"}</Fact>
          <Fact status={others > 0 ? "idle" : "ok"}>
            {account.sessions} active session{account.sessions === 1 ? "" : "s"}
          </Fact>
          {account.github ? <Fact status={account.github.linked ? "ok" : "idle"}>{account.github.linked ? `GitHub @${account.github.username}` : "GitHub not linked"}</Fact> : null}
        </span>
      </Tile>

      {workspace ? <WorkspaceTiles workspace={workspace} /> : null}
    </div>
  );
}

function WorkspaceTiles({ workspace: w }: { workspace: NonNullable<SettingsOverview["workspace"]> }) {
  const period = periodInfo(new Date(w.usage.periodStart));
  const resets = period.resetsAt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  const sub = w.subscription;
  const m = w.usage.closest;
  const seats = w.seats;
  const extra = Math.max(0, seats.memberCount - seats.people.length);
  return (
    <>
      <Tile
        href="/settings/billing"
        icon={CreditCard}
        label="Billing"
        className="lg:col-span-2"
        footer={sub ? `${sub.interval === "year" ? "Annual" : "Monthly"} · ${sub.provider === "stripe" ? "Stripe" : sub.provider === "razorpay" ? "Razorpay" : sub.provider}` : w.plan.id === "free" ? "No card on file" : "Assigned without an online subscription"}
      >
        <span className="text-app-display block">{w.plan.name}</span>
        <span className="mt-2 block text-[13px] text-muted-foreground">
          {sub
            ? sub.cancelAtPeriodEnd
              ? `Ends ${sub.periodEnd ? date(sub.periodEnd, { month: "short", day: "numeric" }) : "at period end"}`
              : sub.status === "past_due"
                ? "Payment overdue"
                : `Renews ${sub.periodEnd ? date(sub.periodEnd, { month: "short", day: "numeric" }) : "monthly"}`
            : w.plan.id === "free"
              ? "Free forever"
              : w.plan.tagline}
        </span>
      </Tile>

      <Tile href="/settings/usage" icon={Gauge} label="Usage" className="lg:col-span-2" footer={`Day ${period.day} of ${period.days} · resets ${resets}`}>
        {m ? (
          <span className="flex items-center gap-4">
            <UsageRing metric={m} size="md" />
            <span className="min-w-0">
              <span className="block text-[13px] text-muted-foreground">Closest to its limit</span>
              <span className="mt-0.5 block text-base font-semibold tracking-[-0.01em]">{m.label}</span>
              <span className="block text-[13px] tabular-nums text-muted-foreground">{describeUsage(m)}</span>
              <span className="sr-only">{`${Math.round(ratioOf(m) * 100)}% used`}</span>
            </span>
          </span>
        ) : (
          <span className="text-[13px] text-muted-foreground">Every limit on this plan is unlimited.</span>
        )}
      </Tile>

      <Tile
        href="/settings/members"
        icon={Users}
        label="Members"
        className="lg:col-span-2"
        footer={seats.pending ? (seats.pending === 1 ? "1 pending invitation holds a seat" : `${seats.pending} pending invitations hold seats`) : w.nextSeats && !isUnlimited(seats.limit) ? `${w.nextSeats.name} has ${isUnlimited(w.nextSeats.seats) ? "unlimited" : w.nextSeats.seats} seats` : "Pending invitations also take a seat"}
      >
        <span className="flex items-center">
          {seats.people.map((p, i) => (
            <span key={p.userId} className={cn("rounded-full ring-2 ring-card", i > 0 && "-ml-2")}>
              <Avatar name={p.name} src={p.avatarUrl} size="md" labelled />
            </span>
          ))}
          {extra > 0 ? <span className="-ml-2 flex size-8 items-center justify-center rounded-full bg-muted font-mono text-[11px] ring-2 ring-card">+{extra}</span> : null}
          {Array.from({ length: Math.min(seats.pending, 3) }).map((_, i) => (
            <span key={`p${i}`} aria-hidden="true" className="seat--pending -ml-2 flex size-8 items-center justify-center rounded-full border border-dashed border-border-strong bg-card text-foreground-dim ring-2 ring-card" style={{ "--i": i } as React.CSSProperties}>
              <Mail className="size-3.5" />
            </span>
          ))}
        </span>
        <span className="mt-3 flex items-baseline gap-1.5">
          <span className="font-display text-[28px] font-semibold leading-none tracking-[-0.03em] tabular-nums">{seats.used}</span>
          <span className="text-[13px] tabular-nums text-muted-foreground">/ {isUnlimited(seats.limit) ? "Unlimited" : seats.limit} seat{seats.limit === 1 ? "" : "s"}</span>
        </span>
      </Tile>

      <Tile
        href="/settings/integrations"
        icon={Plug}
        label="Integrations"
        className="lg:col-span-2"
        footer={w.integrations ? (w.integrations.errors ? `${w.integrations.errors} failing the last test` : "Secrets are encrypted at rest") : "Connections are not available here"}
      >
        {w.integrations ? (
          <>
            <span className="flex items-baseline gap-1.5">
              <span className="font-display text-[28px] font-semibold leading-none tracking-[-0.03em] tabular-nums">{w.integrations.total}</span>
              <span className="text-[13px] text-muted-foreground">connected</span>
            </span>
            {w.integrations.providers.length ? (
              <span className="mt-3 flex flex-wrap gap-1.5">
                {w.integrations.providers.slice(0, 6).map((p) => (
                  <span key={p} className="icon-tile flex size-8 items-center justify-center rounded-[9px]" title={p}>
                    <BrandMark id={p} className="size-4" />
                  </span>
                ))}
              </span>
            ) : (
              <span className="mt-2 text-[13px] text-muted-foreground">No connections yet. Databases, AI keys, payments and email.</span>
            )}
          </>
        ) : (
          <span className="text-[13px] text-muted-foreground">API not enabled on this deployment.</span>
        )}
      </Tile>

      <Tile href="/settings/workspace" icon={Settings2} label="General" className="lg:col-span-2" footer={`Created ${date(w.createdAt, { month: "short", day: "numeric", year: "numeric" })}`}>
        <span className="flex min-w-0 items-center gap-3">
          <Avatar name={w.name} seed={w.id} shape="square" size="lg" />
          <span className="min-w-0">
            <span className="block text-[15px] font-semibold tracking-[-0.01em] [overflow-wrap:anywhere]">{w.name}</span>
            <span className="block font-mono text-xs text-muted-foreground [overflow-wrap:anywhere]">/{w.slug}</span>
          </span>
        </span>
        <span className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)]">
          {w.currency} · {w.currency === "INR" ? "Razorpay" : "Stripe"}
        </span>
      </Tile>

      <Link
        href="/settings/workspaces/new"
        className="bento-tile group flex min-h-[176px] flex-col justify-between rounded-[16px] border border-dashed border-border-strong p-5 text-muted-foreground outline-none transition-colors hover:border-foreground/35 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:col-span-2 lg:col-span-2"
      >
        <span className="flex size-9 items-center justify-center rounded-[10px] border border-dashed border-border-strong transition-transform duration-300 group-hover:rotate-90">
          <Plus className="size-4" aria-hidden="true" />
        </span>
        <span>
          <span className="block text-[15px] font-semibold text-foreground">Create another workspace</span>
          <span className="mt-0.5 block text-[13px]">For a team, a client or a side project. Starts on Free.</span>
        </span>
      </Link>
    </>
  );
}
