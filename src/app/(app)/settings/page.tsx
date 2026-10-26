import Link from "next/link";
import { ArrowUpRight, CreditCard, Gauge, Plus, Plug, Settings2, ShieldCheck, UserRound, Users } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { requireUser } from "@/lib/auth/guards";
import { getCurrentWorkspace } from "@/lib/services/current-workspace";
import { getEffectivePlan } from "@/lib/services/usage";
import { PLANS } from "@/config/plans";
import { PageHeader } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/misc";

export const metadata = pageMetadata({ title: "Settings", description: "Manage your account and workspace settings.", path: "/settings", noindex: true });

const ACCOUNT = [
  { href: "/settings/profile", title: "Profile", description: "Name, time zone, language and avatar.", icon: UserRound },
  { href: "/settings/security", title: "Security", description: "Password, active sessions, data export and account deletion.", icon: ShieldCheck },
];
const WORKSPACE = [
  { href: "/settings/workspace", title: "General", description: "Workspace name, URL slug and billing currency.", icon: Settings2 },
  { href: "/settings/members", title: "Members", description: "Invite teammates, change roles and manage invitations.", icon: Users },
  { href: "/settings/billing", title: "Billing", description: "Plan, invoices, upgrades and cancellation.", icon: CreditCard },
  { href: "/settings/usage", title: "Usage", description: "AI requests, runtime minutes, deployments and storage this period.", icon: Gauge },
  { href: "/settings/integrations", title: "Integrations", description: "Workspace-level connections to third-party services.", icon: Plug },
];

function LinkCard({ href, title, description, icon: Icon }: { href: string; title: string; description: string; icon: typeof UserRound }) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-3.5 rounded-xl border border-border bg-card p-4 transition-[border-color,box-shadow,transform] duration-200 hover:border-border-strong hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.99]"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-foreground transition-colors group-hover:bg-muted">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2 text-sm font-medium">
          {title}
          <ArrowUpRight className="size-4 text-muted-foreground transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" aria-hidden="true" />
        </span>
        <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{description}</span>
      </span>
    </Link>
  );
}

function GroupHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
      {children}
    </h2>
  );
}

export default async function SettingsIndexPage() {
  const user = await requireUser("/settings");
  const { current } = await getCurrentWorkspace(user);
  const plan = current ? await getEffectivePlan(current.workspace) : null;
  return (
    <div>
      <PageHeader title="Settings" description="Your account and workspace preferences." />
      {/* Account banner: who you are, which workspace and plan you're in. */}
      <section aria-label="Your account" className="pop-in relative mb-8 overflow-hidden rounded-2xl border border-border bg-card">
        <div aria-hidden="true" className="h-20 bg-[radial-gradient(80%_120%_at_0%_0%,color-mix(in_oklab,var(--signal)_35%,transparent),transparent_60%),radial-gradient(70%_120%_at_100%_0%,color-mix(in_oklab,var(--info)_30%,transparent),transparent_60%)]" />
        <div className="flex flex-col gap-4 px-5 pb-5 sm:flex-row sm:items-end">
          <span className="-mt-9 flex size-[72px] shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-card bg-foreground text-xl font-semibold text-background shadow-lg">
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatarUrl} alt="" className="size-full object-cover" />
            ) : (
              (user.name || user.email)
                .split(/\s+/)
                .map((w) => w[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-semibold tracking-tight">{user.name || user.email}</p>
            <p className="truncate text-sm text-muted-foreground">
              {user.email} · member since {user.createdAt.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {current ? <Badge variant="outline">{current.workspace.name}</Badge> : null}
            {plan ? <Badge variant="primary">{PLANS[plan].name} plan</Badge> : null}
            <Link href="/settings/profile" className="inline-flex h-8 items-center rounded-lg border border-border px-3 text-[13px] transition-colors hover:border-border-strong hover:bg-muted/50">
              Edit profile
            </Link>
          </div>
        </div>
      </section>
      <section aria-labelledby="account-heading" className="mb-10">
        <div className="mb-3">
          <GroupHeading id="account-heading">Account</GroupHeading>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {ACCOUNT.map((c) => (
            <LinkCard key={c.href} {...c} />
          ))}
        </div>
      </section>
      <section aria-labelledby="workspace-heading">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <GroupHeading id="workspace-heading">Workspace</GroupHeading>
          {current ? (
            <>
              <span aria-hidden="true" className="text-muted-foreground">
                ·
              </span>
              <span className="text-sm font-medium">{current.workspace.name}</span>
              <Badge variant="primary">{PLANS[plan ?? "free"].name}</Badge>
              <Badge variant="outline" className="capitalize">
                {current.role}
              </Badge>
            </>
          ) : null}
        </div>
        {current ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {WORKSPACE.map((c) => (
              <LinkCard key={c.href} {...c} />
            ))}
            <Link
              href="/settings/workspaces/new"
              className="group flex items-center gap-3.5 rounded-xl border border-dashed border-border-strong p-4 text-sm text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.99]"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-dashed border-border-strong">
                <Plus className="size-4" aria-hidden="true" />
              </span>
              <span>
                <span className="block font-medium text-foreground">Create another workspace</span>
                <span className="block text-xs">For a team, a client or a side project.</span>
              </span>
            </Link>
          </div>
        ) : (
          <Alert variant="info" title="No workspace selected">
            <Link href="/settings/workspaces/new" className="underline">
              Create a workspace
            </Link>{" "}
            to manage members, billing and integrations.
          </Alert>
        )}
      </section>
    </div>
  );
}
